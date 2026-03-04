import { useState, useCallback, useRef } from "react";
import { API_BASE } from "../config.js";

export default function SourcePanel({
  status,
  connected,
  onConnect,
  onStop,
  onUpdateKeywords,
}) {
  const [srcType, setSrcType] = useState("local");
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlValue, setUrlValue] = useState("");
  const [keywords, setKeywords] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [alertEmail, setAlertEmail] = useState("");
  const [notifStatus, setNotifStatus] = useState("default");
  const fileInputRef = useRef(null);

  const handleFileChange = useCallback((e) => {
    setSelectedFile(e.target.files[0] || null);
  }, []);

  const uploadFile = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable)
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid server response"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("POST", `${API_BASE}/upload-stream`);
        const fd = new FormData();
        fd.append("file", file);
        xhr.send(fd);
      }),
    [],
  );

  const parseKeywords = useCallback(() => {
    return keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, [keywords]);

  const handleConnect = useCallback(async () => {
    const kw = parseKeywords();
    setUploadError(null);

    if ("Notification" in window) {
      if (Notification.permission === "default") {
        try {
          Notification.requestPermission().then((permission) => {
            setNotifStatus(permission);
            if (permission === "granted") {
              new Notification("Notifications Enabled", {
                body: "You will receive alerts here.",
              });
            }
          });
        } catch (e) {
          console.warn("Notification request error:", e);
        }
      } else {
        setNotifStatus(Notification.permission);
      }
    } else {
      setNotifStatus("unsupported");
    }

    if (srcType === "local") {
      if (!selectedFile) return;
      setUploadProgress(0);
      try {
        const data = await uploadFile(selectedFile);
        setUploadProgress(null);
        onConnect(
          "PIPE",
          kw,
          false,
          data.session_id,
          selectedFile,
          language,
          alertEmail,
        );
      } catch (err) {
        setUploadProgress(null);
        setUploadError(err.message || "Upload failed");
      }
    } else {
      const source = urlValue.trim();
      if (!source) return;
      onConnect(source, kw, true, null, null, language, alertEmail);
    }
  }, [
    srcType,
    selectedFile,
    urlValue,
    language,
    parseKeywords,
    uploadFile,
    alertEmail,
  ]);

  const handleUpdateKeywords = useCallback(() => {
    const kw = parseKeywords();
    onUpdateKeywords(kw);
  }, [parseKeywords, onUpdateKeywords]);

  const uploading = uploadProgress !== null;

  const ledClass =
    connected && !status.text.includes("Paused")
      ? "active"
      : status.text.includes("Paused")
        ? "paused"
        : connected
          ? "active"
          : "standby";

  const ledText =
    connected && !status.text.includes("Paused")
      ? "MONITORING ACTIVE"
      : status.text.includes("Paused")
        ? "PAUSED"
        : "STANDBY";

  return (
    <div className="panel">
      <div className="section-label">SOURCE CONFIGURATION</div>

      <div className="radio-group">
        <label>
          <input
            type="radio"
            name="srcType"
            value="local"
            checked={srcType === "local"}
            onChange={() => setSrcType("local")}
          />
          UPLOAD MEDIA
        </label>
        <label>
          <input
            type="radio"
            name="srcType"
            value="url"
            checked={srcType === "url"}
            onChange={() => setSrcType("url")}
          />
          STREAM URL
        </label>
      </div>

      {srcType === "local" ? (
        <div>
          <div
            className="drop-zone"
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{ opacity: uploading ? 0.5 : 1 }}
          >
            {selectedFile ? (
              <span className="drop-zone-text" style={{ color: "#fff" }}>
                {selectedFile.name}
              </span>
            ) : (
              <span className="drop-zone-text">
                {"\uD83D\uDCE4"} Click to upload media file
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
          {uploading && (
            <div style={{ marginTop: "8px" }}>
              <div
                style={{
                  background: "rgba(255,255,255,.1)",
                  borderRadius: "2px",
                  height: "3px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#1a56db",
                    height: "100%",
                    width: `${uploadProgress}%`,
                    transition: "width 0.2s",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: ".7rem",
                  fontFamily: "var(--font-mono)",
                  color: "rgba(255,255,255,.5)",
                  textAlign: "right",
                  marginTop: "3px",
                }}
              >
                {uploadProgress}%
              </div>
            </div>
          )}
          {uploadError && (
            <div
              style={{
                fontSize: ".7rem",
                fontFamily: "var(--font-mono)",
                color: "#f87171",
                marginTop: "4px",
              }}
            >
              {uploadError}
            </div>
          )}
        </div>
      ) : (
        <div className="input-with-icon">
          <span>{"\uD83D\uDCE1"}</span>
          <input
            type="text"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="rtmp://... or .m3u8 or YouTube URL"
          />
        </div>
      )}

      <hr className="divider" />

      <label>TARGET LANGUAGE</label>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en-US">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
        <option value="hi">Hindi</option>
        <option value="pt">Portuguese</option>
        <option value="it">Italian</option>
        <option value="ja">Japanese</option>
        <option value="ko">Korean</option>
        <option value="zh">Chinese</option>
      </select>

      <hr className="divider" />

      <label>KEYWORD TARGETS</label>
      <div className="keywords-container">
        {parseKeywords().map((kw, i) => (
          <div key={i} className="keyword-pill">
            {kw}
            <span
              className="keyword-remove"
              onClick={() => {
                const arr = parseKeywords();
                arr.splice(i, 1);
                setKeywords(arr.join(", "));
                if (connected) setTimeout(() => onUpdateKeywords(arr), 50);
              }}
            >
              &times;
            </span>
          </div>
        ))}
        <input
          type="text"
          className="keywords-input-ghost"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder={
            parseKeywords().length === 0 ? "type keyword, press Enter" : ""
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && connected) {
              e.preventDefault();
              handleUpdateKeywords();
            }
          }}
        />
      </div>

      <hr className="divider" />

      <label>ALERT NOTIFICATIONS</label>
      <div className="input-with-icon">
        <span>{"\u2709"}</span>
        <input
          type="email"
          value={alertEmail}
          onChange={(e) => setAlertEmail(e.target.value)}
          placeholder="email@example.com for alerts"
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <button
          className={`btn btn-primary ${connected ? "active" : ""}`}
          disabled={connected || uploading}
          onClick={handleConnect}
        >
          {uploading ? "UPLOADING..." : "INITIATE MONITORING"}
        </button>
        <button
          className="btn btn-danger"
          disabled={!connected}
          onClick={onStop}
        >
          TERMINATE
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <div className="status-indicator">
        <div className={`led ${ledClass}`} />
        <span>{ledText}</span>
      </div>

      {notifStatus === "granted" && (
        <div className="notif-badge enabled">● NOTIFICATIONS ON</div>
      )}
      {notifStatus === "denied" && (
        <div className="notif-badge">● NOTIFICATIONS BLOCKED</div>
      )}
      {notifStatus === "unsupported" && (
        <div className="notif-badge">● NOTIFICATIONS N/A</div>
      )}
    </div>
  );
}
