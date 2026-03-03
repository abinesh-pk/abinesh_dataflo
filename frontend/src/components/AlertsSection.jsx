export default function AlertsSection({ alerts, onAlertClick }) {
  return (
    <div className="alerts-section">
      <h2>{'\uD83D\uDEA8'} Alerts</h2>
      <div>
        {alerts.length === 0 && <span className="no-alerts">No alerts yet.</span>}
        {alerts.map((a, i) => (
          <div
            key={i}
            className={i === 0 ? 'alert-latest' : 'alert-past'}
            onClick={() => onAlertClick && onAlertClick(a.start)}
            style={{ cursor: onAlertClick ? 'pointer' : 'default' }}
            title="Click to jump to this point in the video"
          >
            <div className="alert-kw">{'\uD83D\uDEA8'} {a.keyword}</div>
            <div className="alert-meta">
              Time: {a.timestamp} | Match: {a.match_type}
            </div>
            <div className="alert-ctx">&ldquo;{a.context}&rdquo;</div>
          </div>
        ))}
      </div>
    </div>
  );
}
