export default function AlertsSection({ alerts, onAlertClick }) {
  return (
    <div className="alerts-section">
      <div className="alerts-header">
        <h2>KEYWORD MONITORING LOG</h2>
        <div className="alert-count">{alerts.length}</div>
      </div>

      {alerts.length === 0 && (
        <div className="no-alerts">
          <div className="checkmark">✓</div>
          <span>ALL CLEAR — NO KEYWORDS DETECTED</span>
        </div>
      )}

      {alerts.map((a, i) => (
        <div
          key={i}
          className={`alert-card ${i === 0 ? "latest" : ""}`}
          onClick={() => onAlertClick && onAlertClick(a.start)}
          style={{ cursor: onAlertClick ? "pointer" : "default" }}
          title="Click to jump to this point in the video"
        >
          <div>
            <span className="alert-kw">{a.keyword}</span>
            <span
              className={`match-badge ${a.match_type === "exact" ? "exact" : "fuzzy"}`}
            >
              {a.match_type.toUpperCase()}
            </span>
          </div>
          <div className="alert-right">
            <div className="alert-ts">{a.timestamp}</div>
          </div>
          <div className="alert-ctx">&ldquo;{a.context}&rdquo;</div>
        </div>
      ))}
    </div>
  );
}
