import { useLanguage } from '../context/LanguageContext';

export default function BarterPage() {
  const { t } = useLanguage();
  return <section className="strateg-page"><div className="strateg-page-heading"><div><span className="strateg-eyebrow">{t('exchange_category')}</span><h1>{t('barter_title')}</h1><p>{t('barter_heading_description')}</p></div><button className="strateg-primary-btn">{t('barter_create')}</button></div><div className="strateg-empty-module"><span>↔</span><h2>{t('barter_empty_title')}</h2><p>{t('barter_empty_desc')}</p></div></section>;
}
