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