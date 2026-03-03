export default function Header({ alertCount }) {
  return (
    <div className="header">
      <h1>{'\u{1F399}\uFE0F'} Live Transcription System</h1>
      <div className="badge">{alertCount}</div>
    </div>
  );
}
