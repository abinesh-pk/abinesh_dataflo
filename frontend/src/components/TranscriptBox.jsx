import React, { useState, useEffect, useRef } from "react";
import { API_BASE } from "../config.js";

const SPEAKER_COLORS = [
  "#1a56db",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#e11d48",
];

function speakerLabel(speaker) {
  if (speaker == null) return null;
  const color = SPEAKER_COLORS[speaker % SPEAKER_COLORS.length];
  return (
    <span className="speaker-tag" style={{ color }}>
      Speaker {speaker + 1}
    </span>
  );
}

export default function TranscriptBox({
  transcripts,
  interimText,
  connected,
  language,
}) {
  const boxRef = useRef(null);
  const [summary, setSummary] = useState("");
  const [translation, setTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const [translationError, setTranslationError] = useState("");

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [transcripts, interimText]);

  useEffect(() => {
    if (!connected || transcripts.length === 0) {
      setSummary("");
      setTranslation("");
      setError("");
      setTranslationError("");
    }
  }, [connected, transcripts.length]);

  const empty = transcripts.length === 0 && !interimText;

  const handleSummarize = async () => {
    const fullText = transcripts.map((t) => t.text).join("\n");
    if (!fullText.trim()) return;

    setLoading(true);
    setError("");
    setSummary("");

    try {
      const res = await fetch(`${API_BASE}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullText }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSummary(data.summary);
      }
    } catch (e) {
      setError("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    const fullText = transcripts.map((t) => t.text).join("\n");
    if (!fullText.trim()) return;

    setTranslating(true);
    setTranslationError("");
    setTranslation("");

    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullText }),
      });
      const data = await res.json();
      if (data.error) {
        setTranslationError(data.error);
      } else {
        setTranslation(data.translation);
      }
    } catch (e) {
      setTranslationError("Failed to translate text");
    } finally {
      setTranslating(false);
    }
  };

  const wordCount = transcripts.reduce(
    (acc, t) => acc + t.text.split(/\s+/).filter(Boolean).length,
    0,
  );

  return (
    <div className="transcript-col">
      <div className="caption-header">
        <h2>CAPTION FEED</h2>
        <div className={`signal-bars ${connected ? "active" : ""}`}>
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={`status-strip ${connected ? "receiving" : "idle"}`}>
        {connected ? "● RECEIVING" : "● IDLE"}
      </div>

      <div className="transcript-box" ref={boxRef}>
        {empty && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "0.85rem",
              letterSpacing: "1px",
            }}
          >
            AWAITING SIGNAL...
          </div>
        )}
        {transcripts.map((t, i) => (
          <div key={i} className="t-final">
            <span className="t-ts">[{t.timestamp}]</span>
            <span className="t-text">
              {speakerLabel(t.speaker)} {t.text}
            </span>
          </div>
        ))}
        {interimText && <div className="t-interim">{interimText.text}</div>}
      </div>

      <div className="action-buttons">
        {transcripts.length > 0 && language !== "en-US" && (
          <button
            className="btn btn-translate"
            onClick={handleTranslate}
            disabled={translating}
          >
            {translating ? "Translating..." : "Translate to English"}
          </button>
        )}
        {transcripts.length > 0 && (
          <button
            className="btn btn-summary"
            onClick={handleSummarize}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Summary"}
          </button>
        )}
      </div>

      {translationError && (
        <div className="summary-error">{translationError}</div>
      )}
      {error && <div className="summary-error">{error}</div>}

      {translation && (
        <div className="summary-box">
          <div className="summary-header">
            <h3>ENGLISH TRANSLATION</h3>
            <button
              className="btn-close"
              onClick={() => setTranslation("")}
              title="Close"
            >
              &times;
            </button>
          </div>
          <div className="summary-content">{translation}</div>
        </div>
      )}

      {summary && (
        <div className="summary-box">
          <div className="summary-header">
            <h3>SESSION SUMMARY</h3>
            <button
              className="btn-close"
              onClick={() => setSummary("")}
              title="Close"
            >
              &times;
            </button>
          </div>
          <div className="summary-content">{summary}</div>
        </div>
      )}

      <div className="caption-footer">
        <span>{wordCount} words</span>
        <span>{transcripts.length} lines</span>
      </div>
    </div>
  );
}
