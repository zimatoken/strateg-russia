import { useLanguage } from '../context/LanguageContext';
import { getModuleStats, getOverallProgress, getActivityTimeline, getKeyMetrics, type ModuleStats } from '../modules/analytics';

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const moduleStats = getModuleStats();
  const overallProgress = getOverallProgress();
  const activityTimeline = getActivityTimeline();
  const keyMetrics = getKeyMetrics();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course': return '📊';
      case 'plan': return '📈';
      case 'barter': return '🔄';
      case 'deal': return '💼';
      default: return '📌';
    }
  };

  return (
    <section className="strateg-page">
      <div className="strateg-page-heading">
        <div>
          <span className="strateg-eyebrow">📊 {t('analytics_category')}</span>
          <h1>{t('analytics_title')}</h1>
          <p>{t('analytics_description')}</p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="strateg-analytics-overview" style={{ marginTop: '30px' }}>
        <div className="strateg-progress-card">
          <h2>{t('analytics_overall_progress')}</h2>
          <div className="strateg-progress-circle">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="var(--border)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${overallProgress.percentage * 3.14} 314`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <span className="strateg-progress-text">{overallProgress.percentage}%</span>
          </div>
          <p>{t('analytics_completed_tasks')} {overallProgress.completedTasks} {t('analytics_of_tasks')} {overallProgress.totalTasks} {t('analytics_tasks')}</p>
        </div>

        {/* Key Metrics */}
        <div className="strateg-metrics-grid">
          <div className="strateg-metric-card">
            <span className="strateg-metric-icon">📊</span>
            <span className="strateg-metric-value">{keyMetrics.totalQuizzes}</span>
            <span className="strateg-metric-label">{t('analytics_quizzes_passed')}</span>
          </div>
          <div className="strateg-metric-card">
            <span className="strateg-metric-icon">📈</span>
            <span className="strateg-metric-value">{keyMetrics.totalPlans}</span>
            <span className="strateg-metric-label">{t('analytics_business_plans')}</span>
          </div>
          <div className="strateg-metric-card">
            <span className="strateg-metric-icon">🔄</span>
            <span className="strateg-metric-value">{keyMetrics.totalBarterOffers}</span>
            <span className="strateg-metric-label">{t('analytics_barter_offers')}</span>
          </div>
          <div className="strateg-metric-card">
            <span className="strateg-metric-icon">💼</span>
            <span className="strateg-metric-value">{keyMetrics.totalDeals}</span>
            <span className="strateg-metric-label">{t('analytics_deals')}</span>
          </div>
        </div>
      </div>

      {/* Module Stats */}
      <div className="strateg-module-stats" style={{ marginTop: '40px' }}>
        <h2>{t('analytics_module_stats')}</h2>
        <div className="strateg-stats-table">
          {moduleStats.map((stat: ModuleStats) => (
            <div key={stat.moduleId} className="strateg-stats-row">
              <div className="strateg-stats-cell">
                <span className="strateg-stats-icon">{stat.icon}</span>
                <span className="strateg-stats-name">{stat.moduleName}</span>
              </div>
              <div className="strateg-stats-progress">
                <div className="strateg-progress-bar">
                  <div
                    className="strateg-progress-fill"
                    style={{ width: `${stat.progress}%` }}
                  />
                </div>
                <span className="strateg-stats-percent">{stat.progress}%</span>
              </div>
              <div className="strateg-stats-count">
                {stat.completed}/{stat.total}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="strateg-activity-timeline" style={{ marginTop: '40px' }}>
        <h2>{t('analytics_recent_activity')}</h2>
        {activityTimeline.length === 0 ? (
          <div className="strateg-empty-module">
            <span>📭</span>
            <p>{t('analytics_no_activity')}</p>
          </div>
        ) : (
          <div className="strateg-timeline-list">
            {activityTimeline.map((activity) => (
              <div key={activity.id} className="strateg-timeline-item">
                <span className="strateg-timeline-icon">{getActivityIcon(activity.type)}</span>
                <div className="strateg-timeline-content">
                  <span className="strateg-timeline-desc">{activity.description}</span>
                  <span className="strateg-timeline-date">{formatDate(activity.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
