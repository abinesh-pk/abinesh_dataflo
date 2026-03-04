import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../config.js";

export default function HistoryDrawer({ isOpen, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/history`);
      if (!resp.ok) throw new Error("Failed to fetch history");
      const data = await resp.json();
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  const handleView = async (sessionId) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setSessionDetails(null);
      return;
    }
    setExpandedSessionId(sessionId);
    setSessionDetails(null);
    try {
      const resp = await fetch(`${API_BASE}/history/${sessionId}`);
      if (!resp.ok) throw new Error("Failed to fetch session details");
      const data = await resp.json();
      setSessionDetails(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this session?"))
      return;
    try {
      const resp = await fetch(`${API_BASE}/history/${sessionId}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        if (expandedSessionId === sessionId) {
          setExpandedSessionId(null);
          setSessionDetails(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = (sessionId) => {
    window.location.href = `${API_BASE}/history/${sessionId}/export`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d
      .toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", " —");
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className={`history-drawer ${isOpen ? "open" : ""}`}>
      <div className="drawer-header">
        <h2>SESSION HISTORY</h2>
        <div className="drawer-actions">
          <button
            className="btn-refresh"
            onClick={fetchHistory}
            title="Refresh"
          >
            {"\u21BB"}
          </button>
          <button className="btn-close-drawer" onClick={onClose}>
            &times;
          </button>
        </div>
      </div>

      <div className="drawer-content">
        {loading && (
          <div className="history-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        )}

        {error && (
          <div className="history-error">
            <p>Failed to load history</p>
            <button onClick={fetchHistory}>Retry</button>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="history-empty">
            <span>{"\uD83D\uDCDD"}</span>
            <p>No sessions recorded yet</p>
          </div>
        )}

        {!loading &&
          !error &&
          sessions.map((s) => (
            <div
              key={s.session_id}
              className={`history-card ${expandedSessionId === s.session_id ? "expanded" : ""}`}
            >
              <div className="card-top">
                <div className="card-title">
                  {s.source_type === "file" ? "\uD83D\uDCC1 " : "\uD83D\uDCE1 "}
                  <strong>{s.source_name || "Unknown Source"}</strong>
                </div>
                <div className="card-meta">
                  <span>{formatDate(s.started_at)}</span>
                  <span>{formatDuration(s.duration_seconds)}</span>
                </div>
              </div>

              <div className="card-badges">
                <span className="badge-lang">{s.language || "en"}</span>
                {(s.keywords || []).map((k, i) => (
                  <span key={i} className="badge-kw">
                    {k}
                  </span>
                ))}
                <span
                  className={`badge-alerts ${s.alert_count > 0 ? "red" : "green"}`}
                >
                  {s.alert_count > 0
                    ? `${s.alert_count} alerts`
                    : "\u2713 0 alerts"}
                </span>
              </div>

              <div className="card-actions">
                <button onClick={() => handleView(s.session_id)}>
                  {expandedSessionId === s.session_id ? "CLOSE" : "VIEW"}
                </button>
                <button onClick={() => handleExport(s.session_id)}>
                  EXPORT
                </button>
                <button
                  className="delete"
                  onClick={() => handleDelete(s.session_id)}
                >
                  DELETE
                </button>
              </div>

              {expandedSessionId === s.session_id && (
                <div className="card-details">
                  {!sessionDetails ? (
                    <div className="details-loading">Loading details...</div>
                  ) : (
                    <>
                      <div className="transcript-viewport">
                        {(sessionDetails.transcripts || []).map((t, i) => (
                          <div key={i} className="t-line">
                            <span className="t-ts">{t.timestamp}</span>
                            <span className="t-val">{t.text}</span>
                          </div>
                        ))}
                        {(!sessionDetails.transcripts ||
                          sessionDetails.transcripts.length === 0) && (
                          <div className="empty-details">
                            No transcript data
                          </div>
                        )}
                      </div>
                      <div className="alerts-viewport">
                        {(sessionDetails.alerts || []).map((a, i) => (
                          <div key={i} className="alert-mini-card">
                            <div className="alert-mini-top">
                              <strong>{a.keyword}</strong>
                              <span>{a.timestamp}</span>
                            </div>
                            <div className="alert-mini-ctx">{a.context}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="btn-close-details"
                        onClick={() => setExpandedSessionId(null)}
                      >
                        CLOSE
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
