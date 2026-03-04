import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM


def _format_timestamp(seconds: float) -> str:
    """Convert seconds to HH:MM:SS format."""
    total = int(seconds)
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def print_alert(keyword: str, timestamp: float, context: str):
    ts = _format_timestamp(timestamp)
    print(f'\U0001f6a8 ALERT | Time: {ts} | Keyword: "{keyword}" | Context: "{context}"')


def _send_email_sync(to_email: str, keyword: str, timestamp: str, context: str, match_type: str):
    """Send a keyword alert email (blocking — run in a thread)."""
    if not SMTP_USER or not SMTP_PASS:
        print("[alert_manager] SMTP credentials not set, skipping email alert")
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = f"\U0001F6A8 Keyword Alert: \"{keyword}\" detected"

    text = (
        f"Keyword Alert\n\n"
        f"Keyword: {keyword}\n"
        f"Match Type: {match_type}\n"
        f"Timestamp: {timestamp}\n"
        f"Context: {context}\n\n"
        f"— Live Transcription Monitor"
    )
    html = f"""\
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #dde2ea;border-radius:6px;overflow:hidden">
      <div style="background:#0f1c2e;color:#fff;padding:14px 20px;font-size:14px;font-weight:700;letter-spacing:1px">
        \U0001F6A8 KEYWORD ALERT
      </div>
      <div style="padding:20px">
        <div style="font-size:22px;font-weight:700;color:#0f1c2e;margin-bottom:8px">{keyword.upper()}</div>
        <table style="font-size:13px;color:#4b5563;border-collapse:collapse;width:100%">
          <tr><td style="padding:4px 0;font-weight:600;width:100px">Match Type</td><td>{match_type.upper()}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600">Timestamp</td><td style="font-family:monospace">{timestamp}</td></tr>
        </table>
        <div style="margin-top:12px;padding:10px;background:#f8fafc;border-left:3px solid #dc2626;font-style:italic;font-size:13px;color:#4b5563">
          &ldquo;{context[:300]}&rdquo;
        </div>
      </div>
      <div style="background:#f4f6f9;padding:10px 20px;font-size:11px;color:#9ca3af;text-align:center">
        Live Transcription Monitor &mdash; Automated Alert
      </div>
    </div>
    """
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        print(f"[alert_manager] Email alert sent to {to_email} for keyword '{keyword}'")
    except Exception as e:
        print(f"[alert_manager] Email alert failed: {e}")


async def send_email_alert(to_email: str, keyword: str, timestamp_str: str, context: str, match_type: str):
    """Non-blocking email send."""
    await asyncio.to_thread(_send_email_sync, to_email, keyword, timestamp_str, context, match_type)
