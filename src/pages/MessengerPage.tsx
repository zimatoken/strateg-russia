import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { getUserId, getUserProfile } from '../core/identity';
import { p2pManager } from '../core/p2p';
import { getDialogCore } from '../core/dialogCore';
import { QRShare } from '../components/QRShare';
import ChatWindow from '../modules/messenger/ChatWindow';

export const MessengerPage: React.FC<{ deepLinkTargetId?: string | null }> = () => {
  const { t } = useLanguage();
  const [peerList, setPeerList] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const core = getDialogCore();
  const myProfile = getUserProfile();

  useEffect(() => {
    p2pManager.onOpen((peerId) => {
      setPeerList((p) => Array.from(new Set([...p, peerId])));
    });
  }, []);

  const qrValue = useMemo(() => `STRATEG:${myProfile?.id || getUserId()}`, [myProfile]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <aside style={{ width: 300, borderRight: '1px solid var(--border)', padding: 12 }}>
        <h3>{t('messenger_title')}</h3>
        <div style={{ margin: '12px 0' }}>
          <QRShare value={qrValue} onScan={(data) => core.acceptRemoteSignal?.(data)} />
        </div>
        <div>
          <h4>{t('messenger_contacts')}</h4>
          {peerList.length === 0 && <div>{t('messenger_no_contacts')}</div>}
          {peerList.map(p => (
            <div key={p} style={{ padding: 8, borderRadius: 6, cursor: 'pointer', background: selected === p ? 'var(--bg-selected)' : undefined }} onClick={() => setSelected(p)}>{p}</div>
          ))}
        </div>
      </aside>
      <main style={{ flex: 1 }}>
        {selected ? <ChatWindow peerId={selected} /> : <div style={{ padding: 24 }}>{t('messenger_empty')}</div>}
      </main>
    </div>
  );
};

export default MessengerPage;
 