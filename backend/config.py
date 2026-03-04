import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# SMTP email config (optional — if not set, email alerts are skipped)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or os.getenv("SMTP_USER", "")

SAMPLE_RATE = 16000
CHANNELS = 1
ENCODING = "linear16"
CHUNK_SIZE = 8000  # ~250ms of 16kHz 16-bit mono audio

DEEPGRAM_WS_URL = (
    "wss://api.deepgram.com/v1/listen"
    f"?encoding={ENCODING}"
    f"&sample_rate={SAMPLE_RATE}"
    f"&channels={CHANNELS}"
    "&interim_results=true"
    "&punctuate=true"
    "&word_timestamps=true"
    "&endpointing=300"
    "&utterance_end_ms=1500"
    "&model=nova-2"
    "&smart_format=true"
    "&vad_events=true"
    "&diarize=true"
)

BATCH_SPEED_FACTOR = 3.0
RECEIVE_TIMEOUT = 30

FUZZY_THRESHOLD = 85

MAX_RECONNECT_ATTEMPTS = 5
RECONNECT_BASE_DELAY = 1  # seconds
