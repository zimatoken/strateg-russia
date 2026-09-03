import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ContextChat } from '../components/ContextChat';

export default function BarterPage() {
  const { t } = useLanguage();
  const [chatContext, setChatContext] = useState<{ type: 'deal' | 'barter' | 'project'; id: string; title: string } | null>(null);

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
          <button className="strateg-secondary-btn" onClick={() => setChatContext({ type: 'barter', id: 'barter-demo-1', title: 'Демонстрационное предложение' })}>{t('chat_open')}</button>
        </div>
      </div>
      <div className="strateg-empty-module">
        <span>↔</span>
        <h2>{t('barter_empty_title')}</h2>
        <p>{t('barter_empty_desc')}</p>
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
