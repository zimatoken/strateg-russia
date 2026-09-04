import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { AIRecommendation, AI_PLAN_KEY } from '../core/aiRecommendations';

interface AIRecommendationsProps {
  recommendations: AIRecommendation[];
}

export default function AIRecommendations({ recommendations }: AIRecommendationsProps) {
  const { t } = useLanguage();
  const [appliedIds, setAppliedIds] = useState<string[]>([]);

  const applyRecommendation = (recommendation: AIRecommendation) => {
    const saved = localStorage.getItem(AI_PLAN_KEY);
    const plan: AIRecommendation[] = saved ? JSON.parse(saved) : [];
    if (!plan.some((item) => item.id === recommendation.id)) {
      localStorage.setItem(AI_PLAN_KEY, JSON.stringify([...plan, recommendation]));
    }
    setAppliedIds((ids) => ids.includes(recommendation.id) ? ids : [...ids, recommendation.id]);
  };

  if (recommendations.length === 0) return null;

  return (
    <section className="strateg-ai-recommendations" aria-labelledby="ai-recommendations-title">
      <div className="strateg-ai-heading">
        <span className="strateg-eyebrow">AI</span>
        <h2 id="ai-recommendations-title">{t('ai_title')}</h2>
      </div>
      <div className="strateg-ai-grid">
        {recommendations.map((recommendation) => (
          <article className={`strateg-ai-card priority-${recommendation.priority}`} key={recommendation.id}>
            <div className="strateg-ai-card-top">
              <span className="strateg-ai-priority">{t(`ai_priority_${recommendation.priority}`)}</span>
              <button type="button" className="strateg-secondary-btn" onClick={() => applyRecommendation(recommendation)}>{appliedIds.includes(recommendation.id) ? t('ai_applied') : t('ai_apply')}</button>
            </div>
            <h3>{recommendation.title}</h3>
            <p>{recommendation.description}</p>
            <strong className="strateg-ai-impact">{t('ai_impact', { impact: recommendation.impact })}</strong>
            <ol>{recommendation.actionSteps.map((step) => <li key={step}>{step}</li>)}</ol>
          </article>
        ))}
      </div>
    </section>
  );
}