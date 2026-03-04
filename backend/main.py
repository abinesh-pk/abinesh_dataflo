import argparse
import asyncio
import signal
import sys

from transcriber import DeepgramTranscriber
from keyword_monitor import check_keywords
from alert_manager import print_alert
from config import DEEPGRAM_API_KEY


def parse_args():
    parser = argparse.ArgumentParser(
        description="Real-time video transcription and keyword alert system"
    )
    parser.add_argument(
        "--source",
        required=True,
        help="Video source: local file (mp4), RTMP URL, HLS (.m3u8), YouTube Live URL, or 'webcam'",
    )
    parser.add_argument(
        "--keywords",
        required=True,
        help='Comma-separated keywords to monitor (e.g. "fire,alert,emergency")',
    )
    parser.add_argument(
        "--email",
        help="Recipient email for alerts (optional)",
    )
    return parser.parse_args()


async def main():
    args = parse_args()
    alert_email = args.email

    if not DEEPGRAM_API_KEY or DEEPGRAM_API_KEY == "your_key_here":
        print("Error: Set a valid DEEPGRAM_API_KEY in your .env file.")
        sys.exit(1)

    keywords = [kw.strip() for kw in args.keywords.split(",") if kw.strip()]
    if not keywords:
        print("Error: Provide at least one keyword.")
        sys.exit(1)

    print(f"[main] Source: {args.source}")
    print(f"[main] Keywords: {keywords}")
    if alert_email:
        print(f"[main] Alerts will be emailed to: {alert_email}")
    print("[main] Starting transcription... Press Ctrl+C to stop.\n")

    async def on_transcript(result: dict):
        text = result["text"]
        start = result["start"]
        is_final = result["is_final"]
        label = "FINAL" if is_final else "INTERIM"
        print(f"  [{label}] {text}")

        matches = check_keywords(text, keywords)
        for m in matches:
            from alert_manager import send_email_alert, _format_timestamp
            print_alert(keyword=m["keyword"], timestamp=start, context=text)
            if alert_email and is_final:
                asyncio.create_task(send_email_alert(
                    alert_email, m["keyword"],
                    _format_timestamp(start),
                    text, m["match_type"],
                ))

    transcriber = DeepgramTranscriber(source=args.source, on_transcript=on_transcript)

    try:
        await transcriber.run()
    except KeyboardInterrupt:
        pass

    print("\n[main] Stopped.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[main] Interrupted.")
