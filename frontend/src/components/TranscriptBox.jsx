import { useState, useEffect, useRef } from "react";

const SPEAKER_COLORS = [
  "#4fc3f7",
  "#81c784",
  "#ffb74d",
  "#e57373",
  "#ba68c8",
  "#4dd0e1",
  "#fff176",
  "#f06292",
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

export default function TranscriptBox({ transcripts, interimText }) {
  const boxRef = useRef(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [transcripts, interimText]);

  const empty = transcripts.length === 0 && !interimText;

  const handleSummarize = async () => {
    const fullText = transcripts.map((t) => t.text).join("\n");
    if (!fullText.trim()) return;

    setLoading(true);
    setError("");
    setSummary("");

    try {
      const res = await fetch("/summarize", {
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

  return (
    <div className="transcript-col">
      <h2>{"\uD83D\uDCDD"} Live Transcript</h2>
      <div className="transcript-box" ref={boxRef}>
        {empty && (
          <span style={{ color: "#555" }}>Waiting for transcript...</span>
        )}
        {transcripts.map((t, i) => (
          <div key={i} className="t-final">
            <span className="t-ts">[{t.timestamp}]</span>
            {speakerLabel(t.speaker)} {t.text}
          </div>
        ))}
        {interimText && (
          <div className="t-interim">
            <span className="t-ts">[{interimText.timestamp}]</span>
            {speakerLabel(interimText.speaker)} {interimText.text}
          </div>
        )}
      </div>

      {transcripts.length > 0 && (
        <button
          className="btn btn-summary"
          onClick={handleSummarize}
          disabled={loading}
        >
          {loading ? "⏳ Generating Summary..." : "✨ Generate Summary"}
        </button>
      )}

      {error && <div className="summary-error">{error}</div>}

      {summary && (
        <div className="summary-box">
          <h3>{"\uD83D\uDCCB"} Summary</h3>
          <div className="summary-content">{summary}</div>
        </div>
      )}
    </div>
  );
}
