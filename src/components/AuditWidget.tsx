import { useEffect, useState } from 'react';
import { getAuditProgress, getAuditUpdatedEventName, getCompletedAuditItemIds, getWeeklyAudit, refreshWeeklyAudit, toggleAuditItem, AuditItem } from '../core/auditEngine';
import { useLanguage } from '../context/LanguageContext';

export default function AuditWidget() {
  const { t } = useLanguage();
  const [items, setItems] = useState<AuditItem[]>(getWeeklyAudit);
  const [progress, setProgress] = useState(getAuditProgress);
  const [completedIds, setCompletedIds] = useState(getCompletedAuditItemIds);

  useEffect(() => {
    const update = () => { setItems(getWeeklyAudit()); setProgress(getAuditProgress()); setCompletedIds(getCompletedAuditItemIds()); };
    window.addEventListener(getAuditUpdatedEventName(), update);
    return () => window.removeEventListener(getAuditUpdatedEventName(), update);
  }, []);

  const toggle = (id: string) => { toggleAuditItem(id); setProgress(getAuditProgress()); setCompletedIds(getCompletedAuditItemIds()); };
  const refresh = () => { setItems(refreshWeeklyAudit()); setProgress(getAuditProgress()); setCompletedIds(getCompletedAuditItemIds()); };

  return (
    <section className="strateg-audit-widget" aria-labelledby="audit-widget-title">
      <div className="strateg-audit-heading">
        <div><span className="strateg-eyebrow">{t('audit_title')}</span><h2 id="audit-widget-title">{t('audit_title')}</h2></div>
        <button type="button" className="strateg-secondary-btn" onClick={refresh}>{t('audit_refresh')}</button>
      </div>
      <div className="strateg-audit-progress"><span style={{ width: `${progress}%` }} /><strong>{t('audit_progress', { completed: String(items.filter((item) => completedIds.includes(item.id)).length), total: String(items.length) })}</strong></div>
      <div className="strateg-audit-list">
        {items.map((item) => <label className={`strateg-audit-item ${completedIds.includes(item.id) ? 'is-complete' : ''}`} key={item.id}><input type="checkbox" checked={completedIds.includes(item.id)} onChange={() => toggle(item.id)} /><span>{item.question}</span></label>)}
      </div>
    </section>
  );
}