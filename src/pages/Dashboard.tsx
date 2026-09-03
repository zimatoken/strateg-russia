import { getDashboardMetrics } from '../modules/plan';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const { t } = useLanguage();
  const metrics = getDashboardMetrics();

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
    </section>
  );
}
