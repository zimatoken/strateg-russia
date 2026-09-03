import { useLanguage } from '../context/LanguageContext';

export default function DealsPage() {
  const { t } = useLanguage();
  return <section className="strateg-page"><div className="strateg-page-heading"><div><span className="strateg-eyebrow">{t('negotiations_category')}</span><h1>{t('deals_title')}</h1><p>{t('deals_heading_description')}</p></div><button className="strateg-primary-btn">{t('deals_new')}</button></div><div className="strateg-deal-columns"><div><h2>{t('deals_in_progress')}</h2><div className="strateg-empty-module compact"><span>◌</span><p>{t('deals_no_active')}</p></div></div><div><h2>{t('deals_completed')}</h2><div className="strateg-empty-module compact"><span>✓</span><p>{t('deals_no_history')}</p></div></div></div></section>;
}
