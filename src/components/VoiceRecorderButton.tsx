import { useEffect, useRef, useState } from 'react';
import { VoiceRecorder } from '../core/voiceRecorder';

interface VoiceRecorderButtonProps {
  onRecord: (blob: Blob, duration: number) => void;
  disabled?: boolean;
}

export function VoiceRecorderButton({ onRecord, disabled }: VoiceRecorderButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!VoiceRecorder.isSupported()) {
      alert('Запись голоса не поддерживается в этом браузере');
      return;
    }

    const recorder = new VoiceRecorder();
    recorderRef.current = recorder;

    recorder.onDataAvailable = (blob, dur) => {
      onRecord(blob, dur);
      setIsRecording(false);
      setDuration(0);
    };

    recorder.onError = () => {
      setIsRecording(false);
      setDuration(0);
    };

    await recorder.start();
    setIsRecording(true);
    setDuration(0);

    timerRef.current = setInterval(() => {
      setDuration((value) => value + 1);
    }, 1000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  return (
    <button
      type="button"
      className={`voice-btn ${isRecording ? 'recording' : ''}`}
      onClick={toggleRecording}
      disabled={disabled}
      title={isRecording ? 'Остановить запись' : 'Записать голосовое'}
    >
      {isRecording ? (
        <>
          <span className="recording-indicator">🔴</span>
          <span className="duration">{formatDuration(duration)}</span>
        </>
      ) : (
        '🎤'
      )}
    </button>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
