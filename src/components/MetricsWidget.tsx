import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, Metrics } from '../core/smartMetrics';

interface MetricsWidgetProps {
  metrics: Metrics;
}

export default function MetricsWidget({ metrics }: MetricsWidgetProps) {
  const { t } = useLanguage();
  const trendLabel = metrics.trend === 'up' ? t('metrics_trend_up') : metrics.trend === 'down' ? t('metrics_trend_down') : t('metrics_trend_stable');
  const trendIcon = metrics.trend === 'up' ? '↑' : metrics.trend === 'down' ? '↓' : '→';
  const trendClass = metrics.trend === 'up' ? 'is-positive' : metrics.trend === 'down' ? 'is-negative' : 'is-neutral';

  const cards = [
    { icon: '⚖', label: t('metrics_break_even'), value: `${metrics.breakEvenPoint.toLocaleString('ru-RU')} ед.`, className: 'is-neutral' },
    { icon: '↗', label: t('metrics_roi'), value: `${metrics.roi.toFixed(1)}%`, className: metrics.roi >= 0 ? 'is-positive' : 'is-negative' },
    { icon: '◔', label: t('metrics_margin'), value: `${metrics.margin.toFixed(1)}%`, className: metrics.margin >= 0 ? 'is-positive' : 'is-negative' },
    { icon: '▣', label: t('metrics_forecast'), value: formatCurrency(metrics.monthlyForecast), className: trendClass },
  ];

  return (
    <section className="strateg-metrics" aria-labelledby="metrics-title">
      <div className="strateg-metrics-heading">
        <div>
          <span className="strateg-eyebrow">{t('metrics_title')}</span>
          <h2 id="metrics-title">{t('metrics_title')}</h2>
        </div>
        <span className={`strateg-metrics-trend ${trendClass}`}><strong>{trendIcon}</strong> {trendLabel}</span>
      </div>
      <div className="strateg-metrics-grid">
        {cards.map((card) => (
          <article className={`strateg-metric-card ${card.className}`} key={card.label}>
            <span className="strateg-metric-icon" aria-hidden="true">{card.icon}</span>
            <span className="strateg-card-category">{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}