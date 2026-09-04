import React, { useEffect, useState } from 'react';
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
import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  generateDeepLink,
  generateLocalWebLink,
} from '../core/deepLink';
import { P2PTransport } from '../core/p2p';
import { Html5Qrcode } from 'html5-qrcode';

interface QRShareProps {
  strategId: string;
  p2pTransport?: P2PTransport;
  onClose?: () => void;
}

export default function QRShare({ strategId, p2pTransport, onClose }: QRShareProps) {
  const [copied, setCopied] = useState<'deep' | 'web' | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const deepLink = generateDeepLink(strategId);
  const webLink = generateLocalWebLink(strategId);

  // Подписываемся на генерацию QR-данных от P2PTransport
  useEffect(() => {
    if (p2pTransport) {
      const handleQRGenerated = (sdpData: string) => {
        setQrData(sdpData);
        console.log('[QRShare] Получены SDP-данные для QR:', sdpData);
      };
      p2pTransport.onQRGenerated(handleQRGenerated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pTransport]);

  // Очистка сканера при размонтировании
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear();
      }
    };
  }, []);

  const copyToClipboard = async (text: string, kind: 'deep' | 'web') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const startScanning = async () => {
    setIsScanning(true);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          console.log('[QRShare] Отсканированы данные:', decodedText);
          if (p2pTransport) {
            p2pTransport.setRemoteSDP(decodedText);
          }
          stopScanning();
        },
        (_errorMessage: string) => {
          // Игнорируем ошибки сканирования (обычно при отсутствии QR в кадре)
        }
      );
      console.log('[QRShare] Запуск сканирования QR-кода');
    } catch (error) {
      console.error('[QRShare] Ошибка запуска сканера:', error);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('[QRShare] Ошибка остановки сканера:', error);
      }
    }
    setIsScanning(false);
  };

  return (
    <div className="qr-share">
      {onClose && (
        <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose} style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
          ×
        </button>
      )}

      {/* P2P QR-код для WebRTC соединения */}
      {qrData && (
        <>
          <div className="qr-code-wrap">
            <QRCodeSVG
              value={qrData}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin
            />
          </div>
          <div className="qr-hint">P2P-соединение: покажите этот QR-код другому устройству</div>
        </>
      )}

      {/* Стандартный QR-код для добавления контакта */}
      {!qrData && (
        <>
          <div className="qr-code-wrap">
            <QRCodeSVG
              value={deepLink}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin
            />
          </div>

          <div className="qr-id">{strategId}</div>
          <div className="qr-hint">Отсканируйте QR-код для добавления контакта</div>
        </>
      )}

      {/* Кнопка сканирования QR-кода */}
      {p2pTransport && !isScanning && (
        <button
          type="button"
          className="modal-btn modal-btn-secondary"
          onClick={startScanning}
          style={{ marginTop: 16, width: '100%' }}
        >
          Сканер QR-кода
        </button>
      )}

      {/* UI сканирования */}
      {isScanning && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#94a3b8' }}>
            Сканируйте QR-код с другого устройства
          </div>
          <button
            type="button"
            className="modal-btn modal-btn-secondary"
            onClick={stopScanning}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Отмена
          </button>
          <div 
            id="qr-reader" 
            style={{ 
              marginTop: 12, 
              width: '100%',
              maxWidth: 300
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8, fontSize: 13, color: '#94a3b8' }}>Ссылки</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>Deep link:</span>
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={() => copyToClipboard(deepLink, 'deep')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {copied === 'deep' ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>Веб-ссылка:</span>
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={() => copyToClipboard(webLink, 'web')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {copied === 'web' ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
