import os
import uuid
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING, DESCENDING
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
client = None
db = None
sessions_col = None
alerts_col = None

async def init_db():
    global client, db, sessions_col, alerts_col
    if not MONGODB_URL:
        print("[db] WARNING: MONGODB_URL not set. Database features will be unavailable.")
        return

    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client["transcription_db"]
        sessions_col = db["sessions"]
        alerts_col = db["alerts"]

        # Create indexes
        await sessions_col.create_index([("started_at", DESCENDING)])
        await alerts_col.create_index([("session_id", ASCENDING)])
        
        print("[db] Connected to MongoDB Atlas and indexes initialized.")
    except Exception as e:
        print(f"[db] Error connecting to MongoDB: {e}")

async def create_session(session_data: dict):
    if sessions_col is None: return
    try:
        await sessions_col.insert_one(session_data)
        print(f"[db] Session {session_data.get('session_id')} created.")
    except Exception as e:
        print(f"[db] Error creating session: {e}")

async def append_transcript(session_id: str, transcript: dict):
    if sessions_col is None: return
    try:
        await sessions_col.update_one(
            {"session_id": session_id},
            {"$push": {"transcripts": transcript}}
        )
    except Exception as e:
        print(f"[db] Error appending transcript: {e}")

async def save_alert(alert_data: dict):
    if alerts_col is None or sessions_col is None: return
    try:
        session_id = alert_data.get("session_id")
        # Insert alert
        await alerts_col.insert_one(alert_data)
        # Increment alert count in session
        await sessions_col.update_one(
            {"session_id": session_id},
            {"$inc": {"alert_count": 1}}
        )
        print(f"[db] Alert saved for session {session_id}.")
    except Exception as e:
        print(f"[db] Error saving alert: {e}")

async def close_session(session_id: str, ended_at, duration_seconds: float):
    if sessions_col is None: return
    try:
        await sessions_col.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "ended_at": ended_at,
                    "duration_seconds": duration_seconds
                }
            }
        )
        print(f"[db] Session {session_id} closed.")
    except Exception as e:
        print(f"[db] Error closing session: {e}")

async def get_all_sessions(limit: int = 50):
    if sessions_col is None: return []
    try:
        cursor = sessions_col.find({}, {"transcripts": 0}).sort("started_at", DESCENDING).limit(limit)
        sessions = await cursor.to_list(length=limit)
        # Convert ObjectId if needed or just use session_id
        for s in sessions:
            if "_id" in s: s["_id"] = str(s["_id"])
        return sessions
    except Exception as e:
        print(f"[db] Error fetching sessions: {e}")
        return []

async def get_session(session_id: str):
    if sessions_col is None or alerts_col is None: return None
    try:
        session = await sessions_col.find_one({"session_id": session_id})
        if session:
            if "_id" in session: session["_id"] = str(session["_id"])
            # Fetch alerts
            alerts_cursor = alerts_col.find({"session_id": session_id}).sort("detected_at", ASCENDING)
            alerts = await alerts_cursor.to_list(length=1000)
            for a in alerts:
                if "_id" in a: a["_id"] = str(a["_id"])
            session["alerts"] = alerts
        return session
    except Exception as e:
        print(f"[db] Error fetching session {session_id}: {e}")
        return None

async def delete_session(session_id: str):
    if sessions_col is None or alerts_col is None: return False
    try:
        await sessions_col.delete_one({"session_id": session_id})
        await alerts_col.delete_many({"session_id": session_id})
        print(f"[db] Session {session_id} deleted.")
        return True
    except Exception as e:
        print(f"[db] Error deleting session {session_id}: {e}")
        return False

async def get_transcript_text(session_id: str):
    if sessions_col is None: return ""
    try:
        session = await sessions_col.find_one({"session_id": session_id}, {"transcripts": 1})
        if not session or "transcripts" not in session:
            return ""
        
        lines = []
        for t in session["transcripts"]:
            ts = t.get("timestamp", "00:00:00")
            text = t.get("text", "")
            lines.append(f"[{ts}] {text}")
        
        return "\n".join(lines)
    except Exception as e:
        print(f"[db] Error fetching transcript text for {session_id}: {e}")
        return ""
