import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [transcripts, interimText]);

  const empty = transcripts.length === 0 && !interimText;

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
    </div>
  );
}
