import { useLanguage } from '../context/LanguageContext';

export default function PlanPage() {
  const { t } = useLanguage();
  return (
    <section className="strateg-page">
      <div className="strateg-page-heading"><div><span className="strateg-eyebrow">{t('planning_category')}</span><h1>{t('plan_title')}</h1><p>{t('plan_heading_description')}</p></div></div>
      <div className="strateg-module-grid">
        <article className="strateg-module-panel"><span className="strateg-panel-number">01</span><h2>{t('plan_goal_title')}</h2><p>{t('plan_goal_desc')}</p><button className="strateg-secondary-btn">{t('plan_goal_btn')}</button></article>
        <article className="strateg-module-panel"><span className="strateg-panel-number">02</span><h2>{t('plan_resources_title')}</h2><p>{t('plan_resources_desc')}</p><button className="strateg-secondary-btn">{t('plan_resources_btn')}</button></article>
        <article className="strateg-module-panel"><span className="strateg-panel-number">03</span><h2>{t('plan_steps_title')}</h2><p>{t('plan_steps_desc')}</p><button className="strateg-secondary-btn">{t('plan_steps_btn')}</button></article>
      </div>
    </section>
  );
}
