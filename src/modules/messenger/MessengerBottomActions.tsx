import React, { useRef, useState } from "react";

interface BottomActionsProps {
  onFileAttach?: (file: File) => void;
  onVoiceMessage?: (blob: Blob) => void;
  onClearChat?: () => void;
  onSettingsClick?: () => void;
}

export const BottomActions: React.FC<BottomActionsProps> = ({ 
  onFileAttach,
  onVoiceMessage,
  onClearChat,
  onSettingsClick
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileAttach?.(file);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onVoiceMessage?.(blob);
        chunksRef.current = [];
        setIsRecording(false);
        console.log('Голосовое сообщение записано:', blob);
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log('Запись начата');
    } catch (error) {
      console.error('Ошибка доступа к микрофону:', error);
      alert('Не удалось получить доступ к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      console.log('Запись остановлена');
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="bottom-actions">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="image/jpeg,image/png,image/jpg,.txt,.pdf,.doc,.docx,.zip,audio/webm"
      />
      <div className="actions-grid actions-grid-4">
        {/* 1. Файл */}
        <button className="action-btn" onClick={handleAttachFile}>
          <span className="action-icon">📎</span>
          <span className="action-text">Файл</span>
        </button>

        {/* 2. Микрофон */}
        <button
          type="button"
          className={`action-btn action-btn-mic ${isRecording ? 'recording' : ''}`}
          onClick={handleVoiceRecord}
        >
          <span className="action-icon">{isRecording ? '🔴' : '🎤'}</span>
          <span className="action-text">{isRecording ? 'Остановить' : 'Микрофон'}</span>
        </button>

        {/* 3. Настройки */}
        <button className="action-btn" onClick={onSettingsClick}>
          <span className="action-icon">⚙️</span>
          <span className="action-text">Настройки</span>
        </button>

        {/* 4. Очистить чат */}
        <button className="action-btn action-btn-clear" onClick={onClearChat} title="Очистить чат">
          <span className="action-icon">🗑️</span>
          <span className="action-text">Очистить</span>
        </button>
      </div>
    </div>
  );
};