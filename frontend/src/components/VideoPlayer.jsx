import { forwardRef, useEffect } from 'react';

const VideoPlayer = forwardRef(function VideoPlayer({ onPlay, onPause, onSeeked }, ref) {
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

  return (
    <div className="video-col">
      <h2>{'\uD83C\uDFAC'} Video</h2>
      <video ref={ref} controls />
    </div>
  );
});

export default VideoPlayer;
