import { forwardRef, useEffect, useRef, useState } from "react";
import Hls from "hls.js";

function extractYouTubeId(url) {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

function extractTwitchChannel(url) {
  const m = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
  return m ? m[1] : null;
}

function detectStreamType(url) {
  if (!url) return null;
  if (extractYouTubeId(url)) return "youtube";
  if (extractTwitchChannel(url)) return "twitch";
  if (/\.m3u8(\?|$)/i.test(url) || url.includes("m3u8")) return "hls";
  if (url.startsWith("rtmp://")) return "rtmp";
  return "unknown";
}

const YouTubePlayer = ({ videoId }) => (
  <iframe
    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`}
    title="Live Stream"
    allow="autoplay; encrypted-media; picture-in-picture"
    allowFullScreen
    style={{ width: "100%", aspectRatio: "16/9", border: "none" }}
  />
);

const TwitchPlayer = ({ channel }) => (
  <iframe
    src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=true&muted=false`}
    title="Twitch Stream"
    allowFullScreen
    style={{ width: "100%", aspectRatio: "16/9", border: "none" }}
  />
);

const HlsPlayer = forwardRef(function HlsPlayer(
  { url, onPlay, onPause, onSeeked },
  ref,
) {
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

    if (vid.canPlayType("application/vnd.apple.mpegurl")) {
      vid.src = url;
      vid.play().catch(() => {});
    }
  }, [url, ref]);

  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    vid.addEventListener("play", onPlay);
    vid.addEventListener("pause", onPause);
    vid.addEventListener("seeked", onSeeked);
    return () => {
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("pause", onPause);
      vid.removeEventListener("seeked", onSeeked);
    };
  }, [ref, onPlay, onPause, onSeeked]);

  return <video ref={ref} controls />;
});

const RtmpFallback = () => (
  <div
    style={{
      width: "100%",
      aspectRatio: "16/9",
      background: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--text-muted)",
      gap: "8px",
    }}
  >
    <span style={{ fontSize: "2rem" }}>{"\uD83C\uDF99\uFE0F"}</span>
    <span>RTMP video preview not available</span>
    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
      Audio transcription active
    </span>
  </div>
);

const LocalVideo = forwardRef(function LocalVideo(
  { onPlay, onPause, onSeeked },
  ref,
) {
  useEffect(() => {
    const vid = ref.current;
    if (!vid) return;
    vid.addEventListener("play", onPlay);
    vid.addEventListener("pause", onPause);
    vid.addEventListener("seeked", onSeeked);
    return () => {
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("pause", onPause);
      vid.removeEventListener("seeked", onSeeked);
    };
  }, [ref, onPlay, onPause, onSeeked]);

  return <video ref={ref} controls />;
});

const VideoPlayer = forwardRef(function VideoPlayer(
  { onPlay, onPause, onSeeked, streamSource },
  ref,
) {
  const streamType = detectStreamType(streamSource);
  const youtubeId =
    streamType === "youtube" ? extractYouTubeId(streamSource) : null;
  const twitchChannel =
    streamType === "twitch" ? extractTwitchChannel(streamSource) : null;

  let player;
  if (youtubeId) {
    player = <YouTubePlayer videoId={youtubeId} />;
  } else if (twitchChannel) {
    player = <TwitchPlayer channel={twitchChannel} />;
  } else if (streamType === "hls") {
    player = (
      <HlsPlayer
        ref={ref}
        url={streamSource}
        onPlay={onPlay}
        onPause={onPause}
        onSeeked={onSeeked}
      />
    );
  } else if (streamType === "rtmp") {
    player = <RtmpFallback />;
  } else {
    player = (
      <LocalVideo
        ref={ref}
        onPlay={onPlay}
        onPause={onPause}
        onSeeked={onSeeked}
      />
    );
  }

  const isFile = !streamSource || streamSource.startsWith("blob:");
  const sourceName = isFile ? "LOCAL MEDIA FILE" : streamSource || "NO SOURCE";
  const icon =
    streamType === "youtube"
      ? "\uD83D\uDCFA"
      : streamType === "twitch"
        ? "\uD83C\uDFAE"
        : streamType === "rtmp"
          ? "\uD83D\uDCE1"
          : streamType === "hls"
            ? "\uD83C\uDF10"
            : "\uD83D\uDCC1";

  return (
    <div className="video-wrapper">
      <div className="video-info-bar">
        <div className="source-label">
          <span>{icon}</span>
          <span>{sourceName}</span>
        </div>
        {isFile ? (
          <div className="file-badge">■ FILE</div>
        ) : (
          <div className="live-badge">
            <div className="live-dot" />
            LIVE
          </div>
        )}
      </div>
      {player}
    </div>
  );
});

export default VideoPlayer;
