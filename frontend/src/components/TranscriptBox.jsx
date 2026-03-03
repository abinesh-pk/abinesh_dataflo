import { useEffect, useRef } from 'react';

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
      <h2>{'\uD83D\uDCDD'} Live Transcript</h2>
      <div className="transcript-box" ref={boxRef}>
        {empty && <span style={{ color: '#555' }}>Waiting for transcript...</span>}
        {transcripts.map((t, i) => (
          <div key={i} className="t-final">
            [{t.timestamp}] {t.text}
          </div>
        ))}
        {interimText && (
          <div className="t-interim">
            [{interimText.timestamp}] {interimText.text}
          </div>
        )}
      </div>
    </div>
  );
}
