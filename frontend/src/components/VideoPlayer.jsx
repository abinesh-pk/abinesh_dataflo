import { forwardRef, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

function extractYouTubeId(url) {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

function detectStreamType(url) {
  if (!url) return null;
  if (extractYouTubeId(url)) return 'youtube';
  if (/\.m3u8(\?|$)/i.test(url) || url.includes('m3u8')) return 'hls';
  if (url.startsWith('rtmp://')) return 'rtmp';
  return 'unknown';
}

const YouTubePlayer = ({ videoId }) => (
  <iframe
    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`}
    title="Live Stream"
    allow="autoplay; encrypted-media; picture-in-picture"
    allowFullScreen
    style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: '8px' }}
  />
);

const HlsPlayer = forwardRef(function HlsPlayer({ url, onPlay, onPause, onSeeked }, ref) {
  const hlsRef = useRef(null);

  useEffect(() => {
    const vid = ref.current;
    if (!vid || !url) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(vid);
      hls.on(Hls.Events.MANIFEST_PARSED, () => vid.play().catch(() => {}));
      hlsRef.current = hls;
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (vid.canPlayType('application/vnd.apple.mpegurl')) {
      vid.src = url;
      vid.play().catch(() => {});
    }
  }, [url, ref]);

  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('seeked', onSeeked);
    return () => {
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('seeked', onSeeked);
    };
  }, [ref, onPlay, onPause, onSeeked]);

  return <video ref={ref} controls style={{ width: '100%', borderRadius: '8px' }} />;
});

const RtmpFallback = () => (
  <div
    style={{
      width: '100%',
      aspectRatio: '16/9',
      background: '#1a1a2e',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#aaa',
      gap: '8px',
    }}
  >
    <span style={{ fontSize: '2rem' }}>{'\uD83C\uDF99\uFE0F'}</span>
    <span>RTMP video preview not available in browser</span>
    <span style={{ fontSize: '0.85rem', color: '#777' }}>Audio transcription is active</span>
  </div>
);

const LocalVideo = forwardRef(function LocalVideo({ onPlay, onPause, onSeeked }, ref) {
  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('seeked', onSeeked);
    return () => {
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('seeked', onSeeked);
    };
  }, [ref, onPlay, onPause, onSeeked]);

  return <video ref={ref} controls style={{ width: '100%', borderRadius: '8px' }} />;
});

const VideoPlayer = forwardRef(function VideoPlayer(
  { onPlay, onPause, onSeeked, streamSource },
  ref,
) {
  const streamType = detectStreamType(streamSource);
  const youtubeId = streamType === 'youtube' ? extractYouTubeId(streamSource) : null;

  let player;
  if (youtubeId) {
    player = <YouTubePlayer videoId={youtubeId} />;
  } else if (streamType === 'hls') {
    player = (
      <HlsPlayer ref={ref} url={streamSource} onPlay={onPlay} onPause={onPause} onSeeked={onSeeked} />
    );
  } else if (streamType === 'rtmp') {
    player = <RtmpFallback />;
  } else {
    player = (
      <LocalVideo ref={ref} onPlay={onPlay} onPause={onPause} onSeeked={onSeeked} />
    );
  }

  return (
    <div className="video-col">
      <h2>{'\uD83C\uDFAC'} Video</h2>
      {player}
    </div>
  );
});

export default VideoPlayer;
