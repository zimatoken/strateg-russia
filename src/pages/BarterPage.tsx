import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MessengerContextChat as ContextChat } from '../modules/messenger/MessengerContextChat';
import useDataStore from '../hooks/useDataStore';
import { onBroadcast } from '../core/broadcast';
import BookSuggestion from '../components/BookSuggestion';
import SolutionSteps from '../components/SolutionSteps';
import BarterModal from '../components/BarterModal';
import { dataStore, Barter } from '../core/dataStore';

export default function BarterPage() {
  const { t } = useLanguage();
  const [chatContext, setChatContext] = useState<{ type: 'deal' | 'barter' | 'project'; id: string; title: string } | null>(null);
  const [modalOffer, setModalOffer] = useState<Barter | null | undefined>(undefined);

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
    const unsub = onBroadcast((msg) => {
      if (msg.type === 'NEW_MESSAGE' || msg.type === 'MESSAGE_DELETED' || msg.type === 'CHAT_CLEARED' || msg.type === 'CHAT_SWITCH' || msg.type === 'MESSAGE_READ') {
        load();
      }
    });
    return () => { mounted = false; unsub(); };
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
          <button className="strateg-primary-btn" onClick={() => setModalOffer(null)}>{t('barter_create')}</button>
        </div>
      </div>

      <div className="strateg-card-list">
        {offers.map((offer) => (
          <div key={offer.id} className="strateg-barter-card">
            <div className="strateg-barter-card-main">
              <h3>{offer.title}</h3>
              {offer.category && <span className="strateg-card-category">{t(`barter_category_${offer.category}`)}</span>}
              <p>{offer.description}</p>
              {offer.offer && <p><strong>{t('barter_offer')}:</strong> {offer.offer}</p>}
              {offer.demand && <p><strong>{t('barter_demand')}:</strong> {offer.demand}</p>}
            </div>
            <div className="strateg-barter-card-actions">
              <button className="strateg-icon-btn" title={t('chat_open_barter')} onClick={() => setChatContext({ type: 'barter', id: offer.id, title: offer.title })}>💬</button>
              <button className="strateg-icon-btn" title={t('barter_edit')} onClick={() => setModalOffer(offer)}>✎</button>
              <button className="strateg-icon-btn" title={t('barter_delete')} onClick={() => dataStore.deleteBarter(offer.id)}>🗑</button>
              {unreadMap[offer.id] > 0 && <span className="strateg-badge">{unreadMap[offer.id]}</span>}
            </div>
          </div>
        ))}
      </div>

      <BookSuggestion moduleId="barter" />
      <SolutionSteps moduleId="barter" />
      <BarterModal isOpen={modalOffer !== undefined} item={modalOffer || undefined} onClose={() => setModalOffer(undefined)} onSave={() => setModalOffer(undefined)} />

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
