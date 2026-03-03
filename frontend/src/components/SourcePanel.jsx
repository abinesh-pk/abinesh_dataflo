import { useState, useCallback } from "react";
import { API_BASE } from "../config.js";

export default function SourcePanel({
  status,
  connected,
  onConnect,
  onStop,
  onUpdateKeywords,
  videoRef,
}) {
  const [srcType, setSrcType] = useState("local");
  const [pathValue, setPathValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [keywords, setKeywords] = useState("");

  const handleBrowse = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/browse`);
      const data = await res.json();
      if (data.path) {
        setPathValue(data.path);
        if (videoRef.current) {
          videoRef.current.src =
            `${API_BASE}/local-video?path=` + encodeURIComponent(data.path);
        }
      }
    } catch {
      /* browse failed */
    }
  }, [videoRef]);

  const handlePathChange = useCallback(
    (e) => {
      const p = e.target.value;
      setPathValue(p);
      if (p.trim() && videoRef.current) {
        videoRef.current.src =
          `${API_BASE}/local-video?path=` + encodeURIComponent(p.trim());
      }
    },
    [videoRef],
  );

  const parseKeywords = useCallback(() => {
    return keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, [keywords]);

  const handleConnect = useCallback(() => {
    const kw = parseKeywords();

    let source;
    let isLiveStream;

    if (srcType === "local") {
      isLiveStream = false;
      source = pathValue.trim();
      if (!source) return;
      if (videoRef.current) {
        videoRef.current.src =
          `${API_BASE}/local-video?path=` + encodeURIComponent(source);
      }
    } else {
      isLiveStream = true;
      source = urlValue.trim();
      if (!source) return;
    }

    onConnect(source, kw, isLiveStream);
  }, [srcType, pathValue, urlValue, parseKeywords, onConnect, videoRef]);

  const handleUpdateKeywords = useCallback(() => {
    const kw = parseKeywords();
    onUpdateKeywords(kw);
  }, [parseKeywords, onUpdateKeywords]);

  return (
    <div className="panel">
      <label>Source</label>
      <div className="radio-group">
        <label>
          <input
            type="radio"
            name="srcType"
            value="local"
            checked={srcType === "local"}
            onChange={() => setSrcType("local")}
          />{" "}
          Local File
        </label>
        <label>
          <input
            type="radio"
            name="srcType"
            value="url"
            checked={srcType === "url"}
            onChange={() => setSrcType("url")}
          />{" "}
          URL
        </label>
      </div>

      {srcType === "local" ? (
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            value={pathValue}
            onChange={handlePathChange}
            placeholder="C:/videos/input.mp4"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleBrowse}
            style={{ padding: "8px 12px", whiteSpace: "nowrap" }}
          >
            Browse
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          placeholder="rtmp://... or .m3u8 or YouTube"
        />
      )}

      <label>Keywords</label>
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="fire, alert, emergency"
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && connected) handleUpdateKeywords();
          }}
        />
        {connected && (
          <button
            className="btn btn-primary"
            onClick={handleUpdateKeywords}
            style={{
              padding: "8px 12px",
              whiteSpace: "nowrap",
              fontSize: ".8rem",
            }}
          >
            Update
          </button>
        )}
      </div>

      <button
        className="btn btn-primary"
        disabled={connected}
        onClick={handleConnect}
      >
        Connect
      </button>
      <button className="btn btn-danger" disabled={!connected} onClick={onStop}>
        Stop
      </button>

      <div className="status-text" style={{ color: status.color }}>
        {status.text}
      </div>
    </div>
  );
}
