import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ContextChat } from '../components/ContextChat';

export default function DealsPage() {
  const { t } = useLanguage();
  const [chatContext, setChatContext] = useState<{ type: 'deal' | 'barter' | 'project'; id: string; title: string } | null>(null);

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
          <button className="strateg-secondary-btn" onClick={() => setChatContext({ type: 'deal', id: 'deal-demo-1', title: 'Демонстрационная сделка' })}>{t('chat_open')}</button>
        </div>
      </div>
      <div className="strateg-deal-columns">
        <div>
          <h2>{t('deals_in_progress')}</h2>
          <div className="strateg-empty-module compact">
            <span>◌</span>
            <p>{t('deals_no_active')}</p>
          </div>
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
