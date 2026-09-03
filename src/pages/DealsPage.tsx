import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ContextChat } from '../components/ContextChat';
import useDataStore from '../hooks/useDataStore';

export default function DealsPage() {
  const { t } = useLanguage();
  const [chatContext, setChatContext] = useState<{ type: 'deal' | 'barter' | 'project'; id: string; title: string } | null>(null);
  // Пример списка сделок — заменить реальными данными
  const data = useDataStore();
  const deals = data.deals || [];

  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const map: Record<string, number> = {};
      for (const d of deals) {
        try {
          const count = await (await import('../core/db')).getUnreadCountByContext('deal', d.id);
          if (mounted) map[d.id] = count;
        } catch {
          if (mounted) map[d.id] = 0;
        }
      }
      if (mounted) setUnreadMap(map);
    };
    load();
    return () => { mounted = false; };
  }, [deals]);

  return (
    <section className="strateg-page">
      <div className="strateg-page-heading">
        <div>
          <span className="strateg-eyebrow">{t('negotiations_category')}</span>
          <h1>{t('deals_title')}</h1>
          <p>{t('deals_heading_description')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="strateg-primary-btn">{t('deals_new')}</button>
        </div>
      </div>

      <div className="strateg-deal-columns">
        <div>
          <h2>{t('deals_in_progress')}</h2>
          {deals.length === 0 ? (
            <div className="strateg-empty-module compact">
              <span>◌</span>
              <p>{t('deals_no_active')}</p>
            </div>
          ) : (
            <div className="strateg-card-list">
              {deals.map((deal) => (
                <div key={deal.id} className="strateg-deal-card">
                  <div className="strateg-deal-card-main">
                    <h3>{deal.title}</h3>
                    <p>{deal.description}</p>
                  </div>
                  <div className="strateg-deal-card-actions">
                    <button className="strateg-icon-btn" title={t('chat_open_deal')} onClick={() => setChatContext({ type: 'deal', id: deal.id, title: deal.title })}>💬</button>
                    {unreadMap[deal.id] > 0 && <span className="strateg-badge">{unreadMap[deal.id]}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2>{t('deals_completed')}</h2>
          <div className="strateg-empty-module compact">
            <span>✓</span>
            <p>{t('deals_no_history')}</p>
          </div>
        </div>
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
