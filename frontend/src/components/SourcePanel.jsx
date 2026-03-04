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

    if (srcType === "local") {
      if (!selectedFile) return;
      setUploadProgress(0);
      try {
        const data = await uploadFile(selectedFile);
        setUploadProgress(null);
        onConnect("PIPE", kw, false, data.session_id, selectedFile, language);
      } catch (err) {
        setUploadProgress(null);
        setUploadError(err.message || "Upload failed");
      }
    } else {
      const source = urlValue.trim();
      if (!source) return;
      onConnect(source, kw, true, null, null, language);
    }
  }, [srcType, selectedFile, urlValue, parseKeywords, onConnect, uploadFile]);

  const handleUpdateKeywords = useCallback(() => {
    const kw = parseKeywords();
    onUpdateKeywords(kw);
  }, [parseKeywords, onUpdateKeywords]);

  const uploading = uploadProgress !== null;

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
          Upload File
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
        <div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: "8px 12px", whiteSpace: "nowrap" }}
              disabled={uploading}
            >
              Choose File
            </button>
            <span
              style={{
                fontSize: ".82rem",
                color: "#aaa",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {selectedFile ? selectedFile.name : "No file selected"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
          {uploading && (
            <div style={{ marginTop: "6px" }}>
              <div
                style={{
                  background: "#333",
                  borderRadius: "4px",
                  height: "6px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#2979ff",
                    height: "100%",
                    width: `${uploadProgress}%`,
                    transition: "width 0.2s",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: ".78rem",
                  color: "#aaa",
                  textAlign: "center",
                  marginTop: "2px",
                }}
              >
                Uploading... {uploadProgress}%
              </div>
            </div>
          )}
          {uploadError && (
            <div
              style={{
                fontSize: ".78rem",
                color: "#ff5252",
                marginTop: "4px",
              }}
            >
              {uploadError}
            </div>
          )}
        </div>
      ) : (
        <input
          type="text"
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          placeholder="rtmp://... or .m3u8 or YouTube"
        />
      )}

      <label>Language</label>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{
          width: "100%",
          padding: "8px",
          background: "#222",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          marginBottom: "12px",
        }}
      >
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
        disabled={connected || uploading}
        onClick={handleConnect}
      >
        {uploading ? "Uploading..." : "Connect"}
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
