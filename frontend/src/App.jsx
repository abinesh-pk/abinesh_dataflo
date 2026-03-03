import { useRef } from 'react';
import './App.css';
import Header from './components/Header';
import SourcePanel from './components/SourcePanel';
import VideoPlayer from './components/VideoPlayer';
import TranscriptBox from './components/TranscriptBox';
import AlertsSection from './components/AlertsSection';
import useTranscription from './hooks/useTranscription';

export default function App() {
  const videoRef = useRef(null);
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
  } = useTranscription(videoRef);

  return (
    <>
      <Header alertCount={alertCount} />

      <div className="main">
        <SourcePanel
          status={status}
          connected={connected}
          onConnect={connect}
          onStop={stop}
          videoRef={videoRef}
        />
        <VideoPlayer ref={videoRef} onPlay={onPlay} onPause={onPause} onSeeked={onSeeked} />
        <TranscriptBox transcripts={transcripts} interimText={interimText} />
      </div>

      <AlertsSection alerts={alerts} />
    </>
  );
}
