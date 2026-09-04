import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ResourceModalProps { isOpen: boolean; onClose: () => void; onSave: (resource: { name: string; value: number }) => void; }

export default function ResourceModal({ isOpen, onClose, onSave }: ResourceModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(''); const [value, setValue] = useState(''); const [error, setError] = useState('');
  if (!isOpen) return null;
  const submit = () => { const amount = Number(value); if (!name.trim() || !Number.isFinite(amount) || amount < 0) { setError(t('plan_required')); return; } onSave({ name: name.trim(), value: amount }); setName(''); setValue(''); setError(''); onClose(); };
  return <div className="plan-modal-overlay" onClick={onClose}><div className="plan-modal" onClick={(event) => event.stopPropagation()}>
    <div className="plan-modal-header"><h2>{t('plan_resource_add')}</h2><button type="button" onClick={onClose} aria-label={t('plan_close')}>×</button></div>
    <label className="plan-modal-field"><span>{t('plan_resource_name')}</span><input value={name} onChange={(event) => { setName(event.target.value); setError(''); }} autoFocus /></label>
    <label className="plan-modal-field"><span>{t('plan_resource_value')}</span><input type="number" min="0" value={value} onChange={(event) => { setValue(event.target.value); setError(''); }} /></label>
    {error && <p className="plan-modal-error">{error}</p>}
    <div className="plan-modal-actions"><button type="button" className="strateg-secondary-btn" onClick={onClose}>{t('plan_cancel')}</button><button type="button" className="strateg-primary-btn" onClick={submit}>{t('plan_save')}</button></div>
  </div></div>;
}