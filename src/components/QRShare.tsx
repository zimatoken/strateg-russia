import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getDialogCore } from '../core/dialogCore';

interface QRShareProps {
  strategId?: string | null;
  value?: string;
  onClose?: () => void;
}

export default function QRShare({ strategId, value, onClose }: QRShareProps) {
  const [displayValue, setDisplayValue] = useState<string>(value || (strategId ? `STRATEG:${strategId}` : ''));
  const [signalData, setSignalData] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState('');

  useEffect(() => {
    // subscribe to generated SDP/QR signals from dialog core
    const core = getDialogCore();
    const unsub = core.onQRSignal((sdp) => {
      setSignalData(sdp);
      setDisplayValue(sdp);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (value) setDisplayValue(value);
    else if (strategId) setDisplayValue(`STRATEG:${strategId}`);
  }, [value, strategId]);

  const handlePasteSubmit = async () => {
    const core = getDialogCore();
    const text = pasteInput.trim();
    if (!text) return;
    try {
      // Try to accept remote SDP/signal via dialog core
      if (typeof core.acceptRemoteSignal === 'function') {
        await core.acceptRemoteSignal(text);
      }
      setPasteInput('');
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to apply remote signal:', err);
      alert('Не удалось применить сигнал. Проверьте формат.');
    }
  };

  return (
    <div className="qr-share" style={{ color: 'var(--text-primary)', background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
      <button className="modal-close" onClick={onClose} style={{ float: 'right' }}>×</button>
      <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, marginBottom: 6, color: 'var(--heading-color, var(--text-primary))' }}>Отсканируйте для подключения</div>
          <div style={{ color: 'var(--subtext-color, var(--text-secondary))' }}>QR для обмена идентификатором или сигналами P2P</div>
        </div>
        <div style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <QRCodeSVG value={displayValue || ''} size={240} bgColor="#ffffff" fgColor="#0c1426" />
        </div>

        {signalData && <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>Сгенерирован сигнал P2P (сканируйте вторым устройством)</div>}

        <div style={{ width: '100%', display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Вставьте отсканированные данные (если необходимо)</label>
          <textarea value={pasteInput} onChange={e => setPasteInput(e.target.value)} rows={4} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-qr" onClick={handlePasteSubmit} style={{ padding: '8px 12px' }}>Применить</button>
            <button onClick={() => { navigator.clipboard?.writeText(displayValue || ''); }} style={{ padding: '8px 12px' }}>Копировать</button>
          </div>
        </div>
      </div>
    </div>
  );
}

