import { getDashboardMetrics } from '../modules/plan';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { BOOKS } from '../core/bookRecommendations';
import { getCompletedSolutionStepIds, SOLUTION_STEPS } from '../core/solutionSteps';
import MetricsWidget from '../components/MetricsWidget';
import { calculateMetrics, getStoredMetricInputs, METRICS_INPUTS_KEY } from '../core/smartMetrics';
import AIRecommendations from '../components/AIRecommendations';
import { AIRecommendation, AI_RECOMMENDATIONS_KEY } from '../core/aiRecommendations';
import AuditWidget from '../components/AuditWidget';

export default function Dashboard() {
  const { t } = useLanguage();
  const metrics = getDashboardMetrics();
  const [bookOfWeek] = useState(() => BOOKS[Math.floor(Math.random() * BOOKS.length)]);
  const [completedSolutions, setCompletedSolutions] = useState(getCompletedSolutionStepIds);
  const [metricInputs, setMetricInputs] = useState(getStoredMetricInputs);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(() => {
    try {
      const saved = localStorage.getItem(AI_RECOMMENDATIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const smartMetrics = calculateMetrics(metricInputs.revenue, metricInputs.expenses, metricInputs.fixedCosts, metricInputs.pricePerUnit, metricInputs.variableCostPerUnit);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      setCompletedSolutions(getCompletedSolutionStepIds());
      if (event.key === METRICS_INPUTS_KEY) setMetricInputs(getStoredMetricInputs());
      if (event.key === AI_RECOMMENDATIONS_KEY) {
        try { setRecommendations(event.newValue ? JSON.parse(event.newValue) : []); } catch { setRecommendations([]); }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU') + ' ₽';
  };

  return (
    <section className="strateg-dashboard">
      <div className="strateg-dashboard-hero">
        <div>
          <span className="strateg-eyebrow">{t('dashboard_title')}</span>
          <h1>{t('dashboard_metrics_title')}</h1>
          <p>{t('dashboard_metrics_description')}</p>
        </div>
      </div>

      <div className="strateg-dashboard-grid" style={{ marginTop: '30px' }}>
        <div className="strateg-dashboard-card">
          <span className="strateg-card-icon">💰</span>
          <span className="strateg-card-category">{t('dashboard_metrics_revenue')}</span>
          <h2>{formatCurrency(metrics.revenue)}</h2>
          <p>{t('dashboard_metrics_revenue_desc')}</p>
        </div>

        <div className="strateg-dashboard-card">
          <span className="strateg-card-icon">💸</span>
          <span className="strateg-card-category">{t('dashboard_metrics_expenses')}</span>
          <h2>{formatCurrency(metrics.expenses)}</h2>
          <p>{t('dashboard_metrics_expenses_desc')}</p>
        </div>

        <div className="strateg-dashboard-card">
          <span className="strateg-card-icon">📈</span>
          <span className="strateg-card-category">{t('dashboard_metrics_profit')}</span>
          <h2 style={{ color: metrics.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatCurrency(metrics.profit)}
          </h2>
          <p>{t('dashboard_metrics_profit_desc')}</p>
        </div>
      </div>

      <a className="strateg-book-week" href={bookOfWeek.url} target="_blank" rel="noreferrer">
        <div className="strateg-book-week-cover">
          {bookOfWeek.cover ? <img src={bookOfWeek.cover} alt="" /> : <span>BOOK</span>}
        </div>
        <div>
          <span className="strateg-eyebrow">{t('books_week')}</span>
          <h2>{bookOfWeek.title}</h2>
          <p>{bookOfWeek.author} · {bookOfWeek.description}</p>
          <span className="strateg-book-link">{t('books_read_more')} <span aria-hidden="true">↗</span></span>
        </div>
      </a>

      <div className="strateg-solution-progress">
        <div>
          <span className="strateg-eyebrow">{t('solutions_title')}</span>
          <h2>{t('solutions_progress', { completed: String(completedSolutions.filter((id) => SOLUTION_STEPS.some((step) => step.id === id)).length), total: String(SOLUTION_STEPS.length) })}</h2>
        </div>
        <div className="strateg-progress-bar" aria-hidden="true"><span style={{ width: `${(completedSolutions.filter((id) => SOLUTION_STEPS.some((step) => step.id === id)).length / SOLUTION_STEPS.length) * 100}%` }} /></div>
      </div>
      <MetricsWidget metrics={smartMetrics} />
      {recommendations.length > 0 && <AIRecommendations recommendations={recommendations.slice(0, 3)} />}
      <AuditWidget />
    </section>
  );
}
