import { getDashboardMetrics } from '../modules/plan';

export default function Dashboard() {
  const metrics = getDashboardMetrics();

  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU') + ' ₽';
  };

  return (
    <section className="strateg-dashboard">
      <div className="strateg-dashboard-hero">
        <div>
          <span className="strateg-eyebrow">Панель управления</span>
          <h1>Финансовые показатели</h1>
          <p>Обзор ключевых метрик вашего бизнеса</p>
        </div>
      </div>

      <div className="strateg-dashboard-grid" style={{ marginTop: '30px' }}>
        <div className="strateg-dashboard-card">
          <span className="strateg-card-icon">💰</span>
          <span className="strateg-card-category">Доходы</span>
          <h2>{formatCurrency(metrics.revenue)}</h2>
          <p>Общая выручка за период</p>
        </div>

        <div className="strateg-dashboard-card">
          <span className="strateg-card-icon">💸</span>
          <span className="strateg-card-category">Расходы</span>
          <h2>{formatCurrency(metrics.expenses)}</h2>
          <p>Общие расходы за период</p>
        </div>

        <div className="strateg-dashboard-card">
          <span className="strateg-card-icon">📈</span>
          <span className="strateg-card-category">Прибыль</span>
          <h2 style={{ color: metrics.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatCurrency(metrics.profit)}
          </h2>
          <p>Чистая прибыль за период</p>
        </div>
      </div>
    </section>
  );
}
