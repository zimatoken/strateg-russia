import { useEffect, useState } from 'react';
import { getCompletedSolutionStepIds, getStepsByModule, SOLUTION_PROGRESS_KEY } from '../core/solutionSteps';
import { useLanguage } from '../context/LanguageContext';

interface SolutionStepsProps {
  moduleId: string;
}

export default function SolutionSteps({ moduleId }: SolutionStepsProps) {
  const { t } = useLanguage();
  const steps = getStepsByModule(moduleId);
  const [completed, setCompleted] = useState<string[]>(getCompletedSolutionStepIds);

  useEffect(() => {
    const handleStorage = () => setCompleted(getCompletedSolutionStepIds());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleStep = (stepId: string) => {
    const next = completed.includes(stepId) ? completed.filter((id) => id !== stepId) : [...completed, stepId];
    setCompleted(next);
    localStorage.setItem(SOLUTION_PROGRESS_KEY, JSON.stringify(next));
  };

  return (
    <section className="strateg-solutions" aria-labelledby={`solutions-${moduleId}`}>
      <div className="strateg-solutions-heading">
        <span className="strateg-eyebrow">{t('solutions_title')}</span>
        <h2 id={`solutions-${moduleId}`}>{t('solutions_title')}</h2>
      </div>
      <div className="strateg-solutions-list">
        {steps.map((solution) => (
          <article className={`strateg-solution-step ${completed.includes(solution.id) ? 'is-complete' : ''}`} key={solution.id}>
            <label className="strateg-solution-check">
              <input type="checkbox" checked={completed.includes(solution.id)} onChange={() => toggleStep(solution.id)} />
              <span className="strateg-solution-marker" aria-hidden="true" />
              <span className="strateg-solution-title">{solution.title}</span>
            </label>
            <span className="strateg-solution-time">{t('solutions_step_time', { time: solution.time })}</span>
            <p>{solution.description}</p>
            <ol>
              {solution.steps.map((item) => <li key={item}>{item}</li>)}
            </ol>
            <div className="strateg-solution-success">
              <strong>{t('solutions_success')}</strong>
              <ul>{solution.successCriteria.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}