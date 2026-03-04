import { useState, useEffect } from "react";

export default function Header({ alertCount, connected, onToggleHistory }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clock = time.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="header">
      <h1>
        <span>{"\u{1F399}\uFE0F"}</span>
        LIVE TRANSCRIPTION MONITOR
      </h1>
      <div className="header-right">
        <span className="header-clock">{clock}</span>
        <div className={`conn-pill ${connected ? "online" : "offline"}`}>
          ● {connected ? "ONLINE" : "OFFLINE"}
        </div>
        <button className="btn-history" onClick={onToggleHistory}>
          {"\uD83D\uDCDC"} HISTORY
        </button>
        <div className="badge">{alertCount}</div>
      </div>
    </div>
  );
}
