import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface GoalModalProps { isOpen: boolean; initialGoal?: string; onClose: () => void; onSave: (goal: string) => void; }

export default function GoalModal({ isOpen, initialGoal = '', onClose, onSave }: GoalModalProps) {
  const { t } = useLanguage();
  const [goal, setGoal] = useState(initialGoal);
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { setGoal(initialGoal); setError(''); } }, [isOpen, initialGoal]);
  if (!isOpen) return null;
  const submit = () => { if (!goal.trim()) { setError(t('plan_required')); return; } onSave(goal.trim()); onClose(); };
  return <div className="plan-modal-overlay" onClick={onClose}><div className="plan-modal" onClick={(event) => event.stopPropagation()}>
    <div className="plan-modal-header"><h2>{initialGoal ? t('plan_goal_edit') : t('plan_goal_add')}</h2><button type="button" onClick={onClose} aria-label={t('plan_close')}>×</button></div>
    <label className="plan-modal-field"><span>{t('plan_goal_title')}</span><textarea value={goal} onChange={(event) => { setGoal(event.target.value); setError(''); }} rows={4} autoFocus /></label>
    {error && <p className="plan-modal-error">{error}</p>}
    <div className="plan-modal-actions"><button type="button" className="strateg-secondary-btn" onClick={onClose}>{t('plan_cancel')}</button><button type="button" className="strateg-primary-btn" onClick={submit}>{t('plan_save')}</button></div>
  </div></div>;
}