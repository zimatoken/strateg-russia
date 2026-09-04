import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface StepModalProps { isOpen: boolean; onClose: () => void; onSave: (step: { title: string; deadline: string; responsible: string }) => void; }

export default function StepModal({ isOpen, onClose, onSave }: StepModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(''); const [deadline, setDeadline] = useState(''); const [responsible, setResponsible] = useState(''); const [error, setError] = useState('');
  if (!isOpen) return null;
  const submit = () => { if (!title.trim() || !deadline || !responsible.trim()) { setError(t('plan_required')); return; } onSave({ title: title.trim(), deadline, responsible: responsible.trim() }); setTitle(''); setDeadline(''); setResponsible(''); setError(''); onClose(); };
  return <div className="plan-modal-overlay" onClick={onClose}><div className="plan-modal" onClick={(event) => event.stopPropagation()}>
    <div className="plan-modal-header"><h2>{t('plan_step_add')}</h2><button type="button" onClick={onClose} aria-label={t('plan_close')}>×</button></div>
    <label className="plan-modal-field"><span>{t('plan_step_title')}</span><input value={title} onChange={(event) => { setTitle(event.target.value); setError(''); }} autoFocus /></label>
    <label className="plan-modal-field"><span>{t('plan_step_deadline')}</span><input type="date" value={deadline} onChange={(event) => { setDeadline(event.target.value); setError(''); }} /></label>
    <label className="plan-modal-field"><span>{t('plan_step_responsible')}</span><input value={responsible} onChange={(event) => { setResponsible(event.target.value); setError(''); }} /></label>
    {error && <p className="plan-modal-error">{error}</p>}
    <div className="plan-modal-actions"><button type="button" className="strateg-secondary-btn" onClick={onClose}>{t('plan_cancel')}</button><button type="button" className="strateg-primary-btn" onClick={submit}>{t('plan_save')}</button></div>
  </div></div>;
}