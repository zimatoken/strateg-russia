import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { getUserId, getUserProfile } from '../core/identity';
import { p2pManager } from '../core/p2p';
import { getDialogCore } from '../core/dialogCore';
import { QRShare } from '../components/QRShare';
import ChatWindow from '../modules/messenger/ChatWindow';

export const MessengerPage: React.FC = () => {
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
import MessengerChatInterface from '../modules/messenger/MessengerChatInterface';
import { useLanguage } from '../context/LanguageContext';

export default function MessengerPage({ deepLinkTargetId }: { deepLinkTargetId?: string | null }) {
  const { t } = useLanguage();
  return (
    <section className="messenger-page">
      <div className="strateg-page-heading messenger-page-heading">
        <div>
          <span className="strateg-eyebrow">{t('messenger_title')}</span>
          <h1>{t('messenger_title')}</h1>
          <p>{t('messenger_status_online')}</p>
        </div>
      </div>
      <div className="messenger-page-status"><span className="strateg-status-dot" /> P2P {t('messenger_status_online')}</div>
      <MessengerChatInterface deepLinkTargetId={deepLinkTargetId} />
    </section>
  );
}