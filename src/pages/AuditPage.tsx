import { useEffect, useState } from 'react';
import AuditWidget from '../components/AuditWidget';
import { getAuditHistory, getAuditProgress, getAuditUpdatedEventName, getWeeklyAudit, AuditCategory, AuditHistoryEntry } from '../core/auditEngine';
import { useLanguage } from '../context/LanguageContext';

const categories: Array<AuditCategory | 'all'> = ['all', 'finance', 'clients', 'team', 'processes'];

export default function AuditPage() {
  const { t } = useLanguage();
  const [category, setCategory] = useState<AuditCategory | 'all'>('all');
  const [history, setHistory] = useState<AuditHistoryEntry[]>(getAuditHistory);
  const [progress, setProgress] = useState(getAuditProgress);
  const [items] = useState(getWeeklyAudit);
  const visibleItems = category === 'all' ? items : items.filter((item) => item.category === category);
  const completedAuditsThisMonth = history.filter((entry) => {
    const date = new Date(entry.completedAt);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;

  useEffect(() => {
    const update = () => { setHistory(getAuditHistory()); setProgress(getAuditProgress()); };
    window.addEventListener(getAuditUpdatedEventName(), update);
    return () => window.removeEventListener(getAuditUpdatedEventName(), update);
  }, []);

  return (
    <section className="strateg-page">
      <div className="strateg-page-heading"><div><span className="strateg-eyebrow">{t('audit_title')}</span><h1>{t('audit_title')}</h1><p>{t('audit_progress', { completed: String(Math.round(progress * 7 / 100)), total: '7' })}</p></div></div>
      <div className="strateg-audit-page-grid">
        <div>
          <div className="strateg-audit-filters">
            {categories.map((item) => <button type="button" className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item === 'all' ? t('audit_category_all') : t(`audit_category_${item}`)}</button>)}
          </div>
          <div className="strateg-audit-filter-list">{visibleItems.map((item) => <div className="strateg-audit-question" key={item.id}><span>{t(`audit_category_${item.category}`)}</span><p>{item.question}</p></div>)}</div>
        </div>
        <aside className="strateg-audit-history"><h2>{t('audit_history')}</h2><strong>{completedAuditsThisMonth}</strong><p>{t('audit_completed_month')}</p>{history.length === 0 ? <p>{t('audit_no_history')}</p> : history.slice().reverse().map((entry) => <div key={entry.weekId}>{entry.weekId} · {entry.score}%</div>)}</aside>
      </div>
      <AuditWidget />
    </section>
  );
}