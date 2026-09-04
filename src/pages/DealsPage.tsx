import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MessengerContextChat as ContextChat } from '../modules/messenger/MessengerContextChat';
import useDataStore from '../hooks/useDataStore';
import { onBroadcast } from '../core/broadcast';
import BookSuggestion from '../components/BookSuggestion';
import SolutionSteps from '../components/SolutionSteps';
import DealModal from '../components/DealModal';
import { dataStore, Deal } from '../core/dataStore';

export default function DealsPage() {
  const { t } = useLanguage();
  const [chatContext, setChatContext] = useState<{ type: 'deal' | 'barter' | 'project'; id: string; title: string } | null>(null);
  const [modalDeal, setModalDeal] = useState<Deal | null | undefined>(undefined);
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
    const unsub = onBroadcast((msg) => {
      // Пересчитываем бейджи при изменениях, связанных с сообщениями
      if (msg.type === 'NEW_MESSAGE' || msg.type === 'MESSAGE_DELETED' || msg.type === 'CHAT_CLEARED' || msg.type === 'CHAT_SWITCH' || msg.type === 'MESSAGE_READ') {
        load();
      }
    });
    return () => { mounted = false; unsub(); };
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
          <button className="strateg-primary-btn" onClick={() => setModalDeal(null)}>{t('deals_new')}</button>
        </div>
      </div>

      <div className="strateg-deal-columns">
        <div>
          <h2>{t('deals_in_progress')}</h2>
          {deals.filter((deal) => deal.stage !== 'closed').length === 0 ? (
            <div className="strateg-empty-module compact">
              <span>◌</span>
              <p>{t('deals_no_active')}</p>
            </div>
          ) : (
            <div className="strateg-card-list">
              {deals.filter((deal) => deal.stage !== 'closed').map((deal) => (
                <div key={deal.id} className="strateg-deal-card">
                  <div className="strateg-deal-card-main">
                    <h3>{deal.title}</h3>
                    {deal.partner && <p><strong>{t('deal_partner')}:</strong> {deal.partner}</p>}
                    {deal.value !== undefined && <p><strong>{t('deal_value')}:</strong> {deal.value.toLocaleString('ru-RU')} ₽</p>}
                    <p>{deal.description}</p>
                  </div>
                  <div className="strateg-deal-card-actions">
                    <button className="strateg-icon-btn" title={t('chat_open_deal')} onClick={() => setChatContext({ type: 'deal', id: deal.id, title: deal.title })}>💬</button>
                    <button className="strateg-icon-btn" title={t('deal_edit')} onClick={() => setModalDeal(deal)}>✎</button>
                    <button className="strateg-icon-btn" title={t('deal_delete')} onClick={() => dataStore.deleteDeal(deal.id)}>🗑</button>
                    {unreadMap[deal.id] > 0 && <span className="strateg-badge">{unreadMap[deal.id]}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2>{t('deals_completed')}</h2>
          {deals.filter((deal) => deal.stage === 'closed').length === 0 ? <div className="strateg-empty-module compact"><span>✓</span><p>{t('deals_no_history')}</p></div> : <div className="strateg-card-list">{deals.filter((deal) => deal.stage === 'closed').map((deal) => <div key={deal.id} className="strateg-deal-card"><div className="strateg-deal-card-main"><h3>{deal.title}</h3><p>{deal.partner}</p></div><div className="strateg-deal-card-actions"><button className="strateg-icon-btn" title={t('deal_edit')} onClick={() => setModalDeal(deal)}>✎</button><button className="strateg-icon-btn" title={t('deal_delete')} onClick={() => dataStore.deleteDeal(deal.id)}>🗑</button></div></div>)}</div>}
        </div>
      </div>

      <BookSuggestion moduleId="deals" />
      <SolutionSteps moduleId="deals" />
      <DealModal isOpen={modalDeal !== undefined} item={modalDeal || undefined} onClose={() => setModalDeal(undefined)} onSave={() => setModalDeal(undefined)} />

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
