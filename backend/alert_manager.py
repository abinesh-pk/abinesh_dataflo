import os
import asyncio
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


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
    """Send a keyword alert email using SendGrid API."""
    api_key = os.environ.get("SENDGRID_API_KEY")
    sender = os.environ.get("ALERT_EMAIL_SENDER")

    if not api_key:
        print("[alert_manager] SendGrid not configured, skipping email.")
        return
    
    if not sender:
        print("[alert_manager] ALERT_EMAIL_SENDER not set, skipping email alert.")
        return

    subject = f"🚨 Keyword Alert: \"{keyword}\" detected"
    
    text_content = (
        f"Keyword Alert\n\n"
        f"Keyword: {keyword}\n"
        f"Match Type: {match_type}\n"
        f"Timestamp: {timestamp}\n"
        f"Context: {context}\n\n"
        f"— Live Transcription Monitor"
    )
    
    html_content = f"""\
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #dde2ea;border-radius:6px;overflow:hidden">
      <div style="background:#0f1c2e;color:#fff;padding:14px 20px;font-size:14px;font-weight:700;letter-spacing:1px">
        🚨 KEYWORD ALERT
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

    message = Mail(
        from_email=sender,
        to_emails=to_email,
        subject=subject,
        plain_text_content=text_content,
        html_content=html_content
    )

    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        if response.status_code < 300:
            print(f"[alert_manager] SendGrid alert sent to {to_email} for keyword '{keyword}' (Status: {response.status_code})")
        else:
            print(f"[alert_manager] SendGrid failed with status {response.status_code}: {response.body}")
    except Exception as e:
        print(f"[alert_manager] SendGrid error: {e}")


async def send_email_alert(to_email: str, keyword: str, timestamp_str: str, context: str, match_type: str):
    """Non-blocking email send."""
    await asyncio.to_thread(_send_email_sync, to_email, keyword, timestamp_str, context, match_type)
