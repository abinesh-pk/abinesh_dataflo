import { useRef, useState, useCallback } from "react";
import "./App.css";
import Header from "./components/Header";
import SourcePanel from "./components/SourcePanel";
import VideoPlayer from "./components/VideoPlayer";
import TranscriptBox from "./components/TranscriptBox";
import AlertsSection from "./components/AlertsSection";
import useTranscription from "./hooks/useTranscription";

export default function App() {
  const videoRef = useRef(null);
  const [liveSource, setLiveSource] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState("en-US");
  const {
    transcripts,
    interimText,
    alerts,
    alertCount,
    status,
    connected,
    connect,
    stop,
    onPlay,
    onPause,
    onSeeked,
    updateKeywords,
    seekTo,
  } = useTranscription(videoRef);

  const handleConnect = useCallback(
    (source, kw, isLiveStream, sessionId, file, language) => {
      setCurrentLanguage(language || "en-US");
      setLiveSource(isLiveStream ? source : null);
      if (file && videoRef.current) {
        videoRef.current.src = URL.createObjectURL(file);
      }
      connect(source, kw, isLiveStream, sessionId, language);
    },
    [connect],
  );

  const handleStop = useCallback(() => {
    setLiveSource(null);
    stop();
  }, [stop]);

  return (
    <>
      <Header alertCount={alertCount} />

      <div className="main">
        <SourcePanel
          status={status}
          connected={connected}
          onConnect={handleConnect}
          onStop={handleStop}
          onUpdateKeywords={updateKeywords}
        />
        <div className="center-col">
          <VideoPlayer
            ref={videoRef}
            onPlay={onPlay}
            onPause={onPause}
            onSeeked={onSeeked}
            streamSource={liveSource}
          />
          <AlertsSection alerts={alerts} onAlertClick={seekTo} />
        </div>
        <TranscriptBox
          transcripts={transcripts}
          interimText={interimText}
          connected={connected}
          language={currentLanguage}
        />
      </div>
    </>
  );
}
