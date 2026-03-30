# Deployment Link
```
https://abinesh-dataflo.vercel.app/
```

# Live Transcription & Alerting System

A powerful, real-time transcription platform that monitors audio streams and files for specific keywords, providing instant alerts and a persistent session history.

## Live Transcript

- **Real-time Transcription**: Powered by Deepgram's Nova-2 model for high-accuracy, low-latency speech-to-text.
- **Multi-Source Support**:
  - Stream directly from URLs (HLS, m3u8, etc.) via `yt-dlp`.
  - Upload and transcribe local media files.
- **Smart Keyword Monitoring**:
  - Real-time keyword spotting with fuzzy matching (`rapidfuzz`).
  - Cross-language support: Transcribes and translates non-English audio to English for keyword matching (via Groq/Llama-3).
- **Instant Alerting**:
  - Browser push notifications.
  - Email alerts via SendGrid API.
- **Session History**:
  - Persistent storage in MongoDB Atlas.
  - View past transcripts and detected alerts in a dedicated sidebar.
  - Export transcripts as TXT files.
- **Premium UI**:
  - Modern, dark-themed dashboard built with React and Vite.
  - Real-time status indicators and interactive transcript view.

### Additional Features Implemented

- **Speaker Diarization**: Automatically identifies and labels different speakers in the audio.
- **AI-Powered Summarization**: Generates concise session summaries using the **Llama 3.3** model via **Groq’s API** (leveraging LPU for ultra-fast performance).
- **Dynamic Keyword Updates**: Add or modify monitor keywords on-the-fly without interrupting the live stream or playback.
- **Smart Seek-to-Alert**: Interactive alerts that, when clicked, jump the video playback directly to the moment the keyword was mentioned.
- **Real-Time Multilingual Support**:
  - Live translation of non-English audio for real-time keyword spotting.
  - Capability to translate the entire transcript into English or other languages.
- **Comprehensive Alerting System**:
  - **Browser Push Notifications**: Immediate pop-up alerts in the browser.
  - **Email Alerts**: Automatic email notifications for critical keyword matches.
- **Session Persistence**: Robust MongoDB database integration to store every session, transcript, and alert for future review.

## Technology Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn, WebSockets.
- **Frontend**: React, Vite, Vanilla CSS.
- **AI/ML**: Deepgram (STT), Groq (Translation/Analysis).
- **Database**: MongoDB Atlas (via Motor/PyMongo).
- **Email**: SendGrid API.
- **Processing**: FFmpeg (Audio extraction/processing).

## Prerequisites

- **Python 3.11+**
- **Node.js & npm**
- **FFmpeg** installed and added to your system PATH.

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:

```env
DEEPGRAM_API_KEY=your_deepgram_key
GROQ_API_KEY=your_groq_key
MONGODB_URL=your_mongodb_atlas_url
SENDGRID_API_KEY=your_sendgrid_key
ALERT_EMAIL_SENDER=verified_sender@example.com
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Running the Application

**Start Backend:**

```bash
cd backend
python server.py
```

**Start Frontend:**

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`.

## Project Structure

- `/backend`: FastAPI server, transcription logic, and database operations.
- `/frontend`: React application, UI components, and WebSocket hooks.
