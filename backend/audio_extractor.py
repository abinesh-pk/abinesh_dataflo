import asyncio
import re
import shutil
import subprocess
import sys
import threading
from config import SAMPLE_RATE, CHANNELS, CHUNK_SIZE


def _is_youtube_url(source: str) -> bool:
    return bool(re.search(r"(youtube\.com|youtu\.be)", source, re.IGNORECASE))


def _detect_source_type(source: str) -> str:
    if source.startswith("rtmp://"):
        return "rtmp"
    if source.endswith(".m3u8") or "m3u8" in source:
        return "hls"
    if source in ("webcam", "0", "/dev/video0"):
        return "webcam"
    if _is_youtube_url(source):
        return "youtube"
    return "file"


def _build_ffmpeg_input_args(source: str) -> list[str]:
    source_type = _detect_source_type(source)

    if source_type == "webcam":
        if sys.platform == "win32":
            return ["-f", "dshow", "-i", "video=Integrated Camera"]
        return ["-f", "v4l2", "-i", "/dev/video0"]

    if source_type in ("rtmp", "hls"):
        return [
            "-reconnect", "1",
            "-reconnect_streamed", "1",
            "-reconnect_delay_max", "5",
            "-i", source,
        ]

    return ["-i", source]


def _drain_stderr(process: subprocess.Popen, label: str = "ffmpeg"):
    """Read and discard stderr in a background thread so the process never blocks."""
    try:
        while True:
            line = process.stderr.readline()
            if not line:
                break
            print(f"[{label}] {line.decode(errors='replace').rstrip()}")
    except Exception:
        pass


def _start_ydl_pipe(source: str) -> subprocess.Popen:
    """Launch yt-dlp streaming audio to stdout so it manages token refresh internally.
    Uses bestaudio to avoid video muxer crashes on HLS discontinuities (YouTube ad breaks)."""
    cmd = ["yt-dlp", "-f", "bestaudio/best", "--no-part", "-o", "-", source]
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=256 * 1024,
    )
    threading.Thread(target=_drain_stderr, args=(process, "yt-dlp"), daemon=True).start()
    return process


async def start_ffmpeg(source: str) -> tuple[subprocess.Popen, subprocess.Popen | None]:
    """
    Launch FFmpeg using subprocess.Popen with a large buffer.

    For YouTube sources, a yt-dlp subprocess pipes video data into FFmpeg's stdin
    so yt-dlp manages the YouTube session and token refresh internally.

    Returns (ffmpeg_process, ydl_process) — ydl_process is None for non-YouTube sources.
    """
    source_type = _detect_source_type(source)
    ydl_process = None

    if source_type == "youtube":
        ydl_process = _start_ydl_pipe(source)
        input_args = ["-i", "pipe:0"]
        stdin = ydl_process.stdout
    else:
        input_args = _build_ffmpeg_input_args(source)
        stdin = None

    cmd = [
        "ffmpeg",
        "-fflags", "nobuffer",
        "-flags", "low_delay",
        *input_args,
        "-f", "s16le",
        "-ar", str(SAMPLE_RATE),
        "-ac", str(CHANNELS),
        "-loglevel", "warning",
        "pipe:1",
    ]

    process = subprocess.Popen(
        cmd,
        stdin=stdin,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=256 * 1024,
    )

    if ydl_process:
        ydl_process.stdout.close()

    if process.poll() is not None:
        stderr_out = process.stderr.read()
        if ydl_process:
            ydl_process.kill()
        raise RuntimeError(f"FFmpeg failed to start: {stderr_out.decode()}")

    threading.Thread(target=_drain_stderr, args=(process, "ffmpeg"), daemon=True).start()

    return process, ydl_process


async def read_audio_chunks(
    process: subprocess.Popen,
    chunk_size: int = CHUNK_SIZE,
    pause_event: asyncio.Event | None = None,
    speed_factor: float = 1.0,
):
    """
    Async generator that yields fixed-size audio chunks from FFmpeg stdout.
    Uses run_in_executor for stable blocking reads on Windows.

    speed_factor controls how fast audio is emitted relative to realtime:
      1.0 = realtime, 3.0 = 3x faster, 0 = no throttle (not recommended).
    """
    bytes_per_second = SAMPLE_RATE * 2 * CHANNELS
    chunk_realtime_duration = chunk_size / bytes_per_second
    if speed_factor > 0:
        target_interval = chunk_realtime_duration / speed_factor
    else:
        target_interval = 0

    loop = asyncio.get_running_loop()
    consecutive_empty = 0

    while True:
        if pause_event is not None and pause_event.is_set():
            await asyncio.sleep(0.05)
            continue

        t0 = loop.time()

        try:
            chunk = await loop.run_in_executor(
                None, process.stdout.read, chunk_size
            )
        except Exception as e:
            print(f"[audio] Read error: {e}")
            break

        if not chunk:
            if process.poll() is None:
                consecutive_empty += 1
                if consecutive_empty > 100:
                    print("[audio] Too many empty reads while FFmpeg running — aborting.")
                    break
                await asyncio.sleep(0.01)
                continue
            break

        consecutive_empty = 0
        yield chunk

        if target_interval > 0:
            elapsed = loop.time() - t0
            remaining = target_interval - elapsed
            if remaining > 0:
                await asyncio.sleep(remaining)
