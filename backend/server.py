import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    # suppress WinError 10054 pipe reset noise from ProactorEventLoop
    import asyncio.proactor_events
    _orig = asyncio.proactor_events._ProactorBasePipeTransport._call_connection_lost
    def _patched(self, exc):
        try:
            _orig(self, exc)
        except ConnectionResetError:
            pass
    asyncio.proactor_events._ProactorBasePipeTransport._call_connection_lost = _patched

import json
import os
import queue
import threading
import uuid
import traceback

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from transcriber import DeepgramTranscriber
from keyword_monitor import check_keywords
from alert_manager import _format_timestamp, send_email_alert
from audio_extractor import start_ffmpeg_from_pipe
from config import GROQ_API_KEY

_pipe_sessions: dict[str, dict] = {}

BASE_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

FRONTEND_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return HTMLResponse(
        "<h1>Frontend not built</h1><p>Run <code>cd frontend &amp;&amp; npm run build</code> first.</p>",
        status_code=503,
    )


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "video.mp4")[1]
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, name)
    with open(path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)
    return {"filename": name, "url": f"/videos/{name}"}


@app.get("/videos/{filename}")
async def serve_video(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(path):
        return HTMLResponse("Not found", status_code=404)
    return FileResponse(path, media_type="video/mp4")


@app.post("/upload-stream")
async def upload_stream(file: UploadFile = File(...)):
    """Read the uploaded file into memory and return a session ID.
    The actual processing happens during the WebSocket 'init' phase."""
    session_id = uuid.uuid4().hex
    content = await file.read()
    _pipe_sessions[session_id] = {"data": content}
    print(f"[server] Upload received, {len(content)} bytes, session {session_id}")
    return {"session_id": session_id}


# ---------- Email Alert Helper ----------



@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    source: str | None = None
    keywords: list[str] = []
    transcript_history: list[dict] = []
    alert_email: str | None = None
    pause_event = asyncio.Event()
    task: asyncio.Task | None = None
    transcriber: DeepgramTranscriber | None = None

    async def _send(msg: dict):
        try:
            await ws.send_json(msg)
        except Exception:
            pass

    async def on_transcript(result: dict):
        text = result["text"]
        start_time = result["start"]
        is_final = result["is_final"]
        speaker = result.get("speaker")

        msg_out = {
            "type": "transcript",
            "text": text,
            "is_final": is_final,
            "start": start_time,
            "timestamp": _format_timestamp(start_time),
        }
        if speaker is not None:
            msg_out["speaker"] = speaker
        await _send(msg_out)

        if is_final and text.strip():
            entry = {"text": text, "start": start_time}
            transcript_history.append(entry)
            
            async def _check_and_alert(target_text: str, context_text: str):
                for m in check_keywords(target_text, keywords):
                    await _send({
                        "type": "alert",
                        "keyword": m["keyword"],
                        "timestamp": _format_timestamp(start_time),
                        "start": start_time,
                        "context": context_text,
                        "match_type": m["match_type"],
                    })
                    if alert_email:
                        asyncio.create_task(send_email_alert(
                            alert_email, m["keyword"],
                            _format_timestamp(start_time),
                            context_text, m["match_type"],
                        ))

            if language and language != "en-US" and keywords:
                async def _translate_and_check():
                    try:
                        import asyncio
                        from langchain_groq import ChatGroq
                        from config import GROQ_API_KEY
                        if not GROQ_API_KEY:
                            return
                        llm = ChatGroq(
                            model="llama-3.3-70b-versatile",
                            api_key=GROQ_API_KEY,
                            temperature=0.0,
                        )
                        prompt = (
                            "Translate the following text to English. "
                            "Output ONLY the translated text, nothing else.\n\n"
                            f"Text: {text}"
                        )
                        response = await asyncio.to_thread(llm.invoke, prompt)
                        translated = response.content.strip()
                        entry["translated_text"] = translated
                        display_context = f"{translated}\n(Original: {text})"
                        await _check_and_alert(translated, display_context)
                    except Exception as e:
                        print(f"[server] RT Translation Error: {e}")
                
                asyncio.create_task(_translate_and_check())
            else:
                await _check_and_alert(text, text)

    async def run_pipeline():
        try:
            await transcriber.run()
            await _send({"type": "status", "status": "finished"})
        except asyncio.CancelledError:
            pass
        except Exception:
            traceback.print_exc()
            await _send({"type": "status", "status": "error"})

    async def _cleanup_transcriber():
        nonlocal transcriber
        if transcriber:
            await transcriber.close()
            transcriber = None

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")

            if action == "init":
                if task and not task.done():
                    task.cancel()
                    try:
                        await task
                    except (asyncio.CancelledError, Exception):
                        pass
                await _cleanup_transcriber()

                source = msg.get("source", "")
                keywords = [k.strip() for k in msg.get("keywords", []) if k.strip()]
                language = msg.get("language", "en-US")
                alert_email = msg.get("alert_email", "").strip() or None
                if alert_email:
                    print(f"[server] Email alerts will be sent to: {alert_email}")
                
                # Trust is_live if it was explicitly sent by the latest frontend.
                # If it's missing (outdated frontend cache), detect it from the source.
                is_live = msg.get("is_live")
                if is_live is None:
                    from audio_extractor import _detect_source_type
                    is_live = _detect_source_type(source) != "file" and source != "PIPE"

                from config import BATCH_SPEED_FACTOR
                speed_factor = 1.0 if is_live else BATCH_SPEED_FACTOR
                print(f"[server] Connecting... source='{source}', is_live={is_live}, speed_factor={speed_factor}, lang='{language}'")

                transcript_history.clear()
                pause_event.clear()

                pipe_data = None
                session_id = msg.get("session_id")
                if source == "PIPE" and session_id:
                    session = _pipe_sessions.pop(session_id, None)
                    if session and "data" in session:
                        pipe_data = session["data"]
                        print(f"[server] Found buffered data for session {session_id}")

                transcriber = DeepgramTranscriber(
                    source=source,
                    on_transcript=on_transcript,
                    pause_event=pause_event,
                    pipe_data=pipe_data,
                    speed_factor=speed_factor,
                    language=language,
                )
                try:
                    await transcriber.pre_connect()
                    print("[server] Deepgram pre-connected — ready for instant start.")
                except Exception as e:
                    print(f"[server] Deepgram pre-connect failed ({e}), will retry on start.")

                await _send({"type": "status", "status": "ready"})

            elif action == "start":
                if not source or not transcriber:
                    await _send({"type": "status", "status": "error", "detail": "No source set"})
                    continue
                if task and not task.done():
                    continue
                pause_event.clear()
                task = asyncio.create_task(run_pipeline())
                await _send({"type": "status", "status": "running"})

            elif action == "pause":
                pause_event.set()
                await _send({"type": "status", "status": "paused"})

            elif action == "resume":
                pause_event.clear()
                await _send({"type": "status", "status": "running"})

            elif action == "update_keywords":
                old_kw_set = {k.lower() for k in keywords}
                new_kw_list = [k.strip() for k in msg.get("keywords", []) if k.strip()]
                keywords[:] = new_kw_list
                print(f"[server] Keywords updated mid-stream: {keywords}")

                # Find keywords that are genuinely new (not in the old set)
                added = [k for k in new_kw_list if k.lower() not in old_kw_set]
                if added and transcript_history:
                    print(f"[server] Re-scanning {len(transcript_history)} past transcripts for new keywords: {added}")
                    for entry in transcript_history:
                        target_text = entry.get("translated_text", entry["text"])
                        context_text = f"{target_text}\n(Original: {entry['text']})" if "translated_text" in entry else entry["text"]

                        for m in check_keywords(target_text, added):
                            await _send({
                                "type": "alert",
                                "keyword": m["keyword"],
                                "timestamp": _format_timestamp(entry["start"]),
                                "start": entry["start"],
                                "context": context_text,
                                "match_type": m["match_type"],
                            })

                await _send({"type": "keywords_updated", "keywords": keywords})

            elif action == "stop":
                if task and not task.done():
                    task.cancel()
                    try:
                        await task
                    except (asyncio.CancelledError, Exception):
                        pass
                    task = None
                pause_event.clear()
                await _cleanup_transcriber()
                await _send({"type": "status", "status": "stopped"})

    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        if task and not task.done():
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        if transcriber:
            await transcriber.close()


# ---------- Summarize endpoint ----------

class SummarizeRequest(BaseModel):
    transcript: str


@app.post("/summarize")
async def summarize_transcript(req: SummarizeRequest):
    if not GROQ_API_KEY:
        return JSONResponse({"error": "GROQ_API_KEY not set"}, status_code=500)

    transcript = req.transcript.strip()
    if not transcript:
        return JSONResponse({"error": "No transcript provided"}, status_code=400)

    try:
        from langchain_groq import ChatGroq

        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY,
            temperature=0.3,
        )

        prompt = (
            "You are an expert analyst. Given the following transcript from a video or stream, "
            "provide a detailed, analytical summary of the content.\n\n"
            "Your response must include the following sections:\n"
            "1. **Executive Summary**: A brief, 2-3 sentence overview of the core subject matter.\n"
            "2. **Detailed Analytics**:\n"
            "   - **Sentiment & Tone**: Describe the general sentiment (e.g., formal, casual, stressed, enthusiastic) and if it changes over time.\n"
            "   - **Speaker Dynamics**: If multiple speakers are identified (e.g., [Speaker 0], [Speaker 1]), describe their interaction, roles, or relative speaking time. If only one speaker, describe their delivery style.\n"
            "   - **Key Topics & Themes**: A bulleted list of the major topics discussed.\n"
            "3. **Actionable Insights**: Any concrete decisions made, lessons learned, or actionable takeaways.\n"
            "4. **Notable Quotes**: 1-2 important quotes from the transcript that highlight a key moment.\n\n"
            "Be detailed and professional in your analysis.\n\n"
            f"--- TRANSCRIPT ---\n{transcript}\n--- END TRANSCRIPT ---\n\n"
            "Analytical Summary:"
        )

        response = llm.invoke(prompt)
        return {"summary": response.content}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/translate")
async def translate_transcript(req: SummarizeRequest):
    if not GROQ_API_KEY:
        return JSONResponse({"error": "GROQ_API_KEY not set"}, status_code=500)

    transcript = req.transcript.strip()
    if not transcript:
        return JSONResponse({"error": "No transcript provided"}, status_code=400)

    try:
        from langchain_groq import ChatGroq

        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY,
            temperature=0.1,
        )

        prompt = (
            "You are an expert, professional translator. Your sole purpose is to translate the provided text into English.\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. ONLY output the translated English text.\n"
            "2. DO NOT add any extra conversational AI fluff like 'Here is the translation' or 'Sure, I can help'.\n"
            "3. DO NOT provide analysis, sentiment matching, or descriptions of the text.\n"
            "4. If there are multiple speakers indicated by [Speaker X], maintain those tags exactly as they appear.\n\n"
            f"--- TEXT TO TRANSLATE ---\n{transcript}\n--- END TEXT ---\n\n"
        )

        response = llm.invoke(prompt)
        return {"translation": response.content.strip()}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


if os.path.isdir(os.path.join(FRONTEND_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)