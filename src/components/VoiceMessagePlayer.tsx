import { useEffect, useRef, useState } from 'react';
import type { FileAttachment } from '../core/dialogCore';

interface VoiceMessagePlayerProps {
  file: FileAttachment;
}

export function VoiceMessagePlayer({ file }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [file.data]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
  };

  return (
    <div className="voice-message">
      <button type="button" className="play-btn" onClick={togglePlay}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <div className="waveform">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <span className="duration">{formatDuration(file.meta?.duration || 0)}</span>
      <audio
        ref={audioRef}
        src={`data:${file.type};base64,${file.data}`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        }}
      />
    </div>
  );
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
