import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dataStore } from '../core/dataStore';
import { getDialogCore } from '../core/dialogCore';

export function SyncStatus() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<string>(dataStore.getSyncStatus());
  const [connected, setConnected] = useState<boolean>(getDialogCore().getConnectionState().isConnected);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(dataStore.getSyncStatus());
      setConnected(getDialogCore().getConnectionState().isConnected);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  let emoji = '🔴';
  let text = t('sync_offline');
  if (status === 'syncing') { emoji = '🟡'; text = t('sync_syncing'); }
  else if (status === 'idle' && connected) { emoji = '🟢'; text = t('sync_online'); }
  else if (status === 'conflict') { emoji = '⚠️'; text = t('sync_conflict'); }

  return (
    <div className="sync-status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}

export default SyncStatus;
