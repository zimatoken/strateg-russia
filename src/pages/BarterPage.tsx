import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ContextChat } from '../components/ContextChat';
import useDataStore from '../hooks/useDataStore';

export default function BarterPage() {
  const { t } = useLanguage();
  const [chatContext, setChatContext] = useState<{ type: 'deal' | 'barter' | 'project'; id: string; title: string } | null>(null);

  const data = useDataStore();
  const offers = data.barters || [];

  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const map: Record<string, number> = {};
      for (const o of offers) {
        try {
          const count = await (await import('../core/db')).getUnreadCountByContext('barter', o.id);
          if (mounted) map[o.id] = count;
        } catch {
          if (mounted) map[o.id] = 0;
        }
      }
      if (mounted) setUnreadMap(map);
    };
    load();
    return () => { mounted = false; };
  }, [offers]);

  return (
    <section className="strateg-page">
      <div className="strateg-page-heading">
        <div>
          <span className="strateg-eyebrow">{t('exchange_category')}</span>
          <h1>{t('barter_title')}</h1>
          <p>{t('barter_heading_description')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="strateg-primary-btn">{t('barter_create')}</button>
        </div>
      </div>

      <div className="strateg-card-list">
        {offers.map((offer) => (
          <div key={offer.id} className="strateg-barter-card">
            <div className="strateg-barter-card-main">
              <h3>{offer.title}</h3>
              <p>{offer.description}</p>
            </div>
            <div className="strateg-barter-card-actions">
              <button className="strateg-icon-btn" title={t('chat_open_barter')} onClick={() => setChatContext({ type: 'barter', id: offer.id, title: offer.title })}>💬</button>
              {unreadMap[offer.id] > 0 && <span className="strateg-badge">{unreadMap[offer.id]}</span>}
            </div>
          </div>
        ))}
      </div>

      {chatContext && (
        <div className="strateg-modal-overlay">
          <div className="strateg-modal-content">
            <ContextChat
              context={chatContext}
              onClose={() => setChatContext(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
