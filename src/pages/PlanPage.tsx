import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import useDataStore from '../hooks/useDataStore';
import BookSuggestion from '../components/BookSuggestion';
import SolutionSteps from '../components/SolutionSteps';
import MetricsWidget from '../components/MetricsWidget';
import { calculateMetrics, getStoredMetricInputs, MetricInputs, saveMetricInputs } from '../core/smartMetrics';
import { dataStore } from '../core/dataStore';
import GoalModal from '../components/GoalModal';
import ResourceModal from '../components/ResourceModal';
import StepModal from '../components/StepModal';

export default function PlanPage() {
  const { t } = useLanguage();
  const data = useDataStore();
  const [modal, setModal] = useState<'goal' | 'resource' | 'step' | null>(null);
  const [inputs, setInputs] = useState<MetricInputs>(getStoredMetricInputs);
  const metrics = calculateMetrics(inputs.revenue, inputs.expenses, inputs.fixedCosts, inputs.pricePerUnit, inputs.variableCostPerUnit);

  const updateInput = (field: keyof MetricInputs, value: string) => {
    const next = { ...inputs, [field]: Math.max(0, Number(value) || 0) };
    setInputs(next);
    saveMetricInputs(next);
  };

  return (
    <section className="strateg-page">
      <div className="strateg-page-heading"><div><span className="strateg-eyebrow">{t('planning_category')}</span><h1>{t('plan_title')}</h1><p>{t('plan_heading_description')}</p></div></div>
      <div className="strateg-module-grid">
        <article className="strateg-module-panel"><span className="strateg-panel-number">01</span><h2>{t('plan_goal_title')}</h2><p>{data.plan.goal || t('plan_goal_desc')}</p><button className="strateg-secondary-btn" onClick={() => setModal('goal')}>{data.plan.goal ? t('plan_goal_edit') : t('plan_goal_btn')}</button></article>
        <article className="strateg-module-panel"><span className="strateg-panel-number">02</span><h2>{t('plan_resources_title')}</h2><p>{t('plan_resources_desc')}</p><button className="strateg-secondary-btn" onClick={() => setModal('resource')}>{t('plan_resources_btn')}</button>{data.plan.resources.length > 0 && <ul className="plan-saved-list">{data.plan.resources.map((resource) => <li key={resource.id}>{resource.name}<strong>{resource.value.toLocaleString('ru-RU')} ₽</strong></li>)}</ul>}</article>
        <article className="strateg-module-panel"><span className="strateg-panel-number">03</span><h2>{t('plan_steps_title')}</h2><p>{t('plan_steps_desc')}</p><button className="strateg-secondary-btn" onClick={() => setModal('step')}>{t('plan_steps_btn')}</button>{data.plan.steps.length > 0 && <ul className="plan-saved-list plan-step-list">{data.plan.steps.map((step) => <li key={step.id}><label><input type="checkbox" checked={step.completed} onChange={() => dataStore.togglePlanStep(step.id)} /><span>{step.title}</span></label><small>{step.deadline} · {step.responsible}</small></li>)}</ul>}</article>
      </div>
      <section className="strateg-metrics-calculator">
        <div className="strateg-calculator-heading">
          <h2>{t('metrics_title')}</h2>
          <p>{t('metrics_calculator_description')}</p>
        </div>
        <div className="strateg-metrics-form">
          {([
            ['revenue', t('metrics_revenue')],
            ['expenses', t('metrics_expenses')],
            ['fixedCosts', t('metrics_fixed_costs')],
            ['pricePerUnit', t('metrics_price')],
            ['variableCostPerUnit', t('metrics_variable')],
          ] as [keyof MetricInputs, string][]).map(([field, label]) => (
            <label key={field}>
              <span>{label}</span>
              <input type="number" min="0" value={inputs[field]} onChange={(event) => updateInput(field, event.target.value)} />
            </label>
          ))}
        </div>
      </section>
      <MetricsWidget metrics={metrics} />
      <BookSuggestion moduleId="plan" />
      <SolutionSteps moduleId="plan" />
      <GoalModal isOpen={modal === 'goal'} initialGoal={data.plan.goal} onClose={() => setModal(null)} onSave={(goal) => dataStore.updatePlanGoal(goal)} />
      <ResourceModal isOpen={modal === 'resource'} onClose={() => setModal(null)} onSave={(resource) => dataStore.addPlanResource(resource)} />
      <StepModal isOpen={modal === 'step'} onClose={() => setModal(null)} onSave={(step) => dataStore.addPlanStep(step)} />
    </section>
  );
}
