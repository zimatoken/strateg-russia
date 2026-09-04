import React, { useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';

export const CameraCapture: React.FC<{ onCapture: (blob: Blob) => void }> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streaming, setStreaming] = useState(false);
  const { t } = useLanguage();

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStreaming(true);
    } catch (e) {
      console.error(e);
      alert('Не удалось получить доступ к камере');
    }
  };

  const capture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, 'image/jpeg', 0.85);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: 240, height: 180, background: '#000' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!streaming && <button onClick={start}>{t('messenger_take_photo') || 'Take photo'}</button>}
          {streaming && <button onClick={capture}>Capture</button>}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
