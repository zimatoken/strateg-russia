import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dataStore, Deal } from '../core/dataStore';

interface DealModalProps { isOpen: boolean; item?: Deal; onClose: () => void; onSave: (item: Deal) => void; }

export default function DealModal({ isOpen, item, onClose, onSave }: DealModalProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ title: '', partner: '', value: '', stage: 'lead' }); const [error, setError] = useState('');
  useEffect(() => { if (isOpen) setForm({ title: item?.title || '', partner: item?.partner || '', value: item?.value?.toString() || '', stage: item?.stage || 'lead' }); }, [isOpen, item]);
  if (!isOpen) return null;
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = () => { const value = Number(form.value); if (!form.title.trim() || !form.partner.trim() || !Number.isFinite(value) || value < 0) { setError(t('form_required')); return; } const payload = { title: form.title.trim(), partner: form.partner.trim(), value, stage: form.stage as Deal['stage'] }; const saved = item ? dataStore.updateDeal(item.id, payload) : dataStore.createDeal(payload); onSave(saved); onClose(); };
  return <div className="plan-modal-overlay" onClick={onClose}><div className="plan-modal" onClick={(event) => event.stopPropagation()}>
    <div className="plan-modal-header"><h2>{item ? t('deal_edit') : t('deal_create_title')}</h2><button type="button" onClick={onClose}>×</button></div>
    <label className="plan-modal-field"><span>{t('deal_title_field')}</span><input value={form.title} onChange={(event) => update('title', event.target.value)} autoFocus /></label>
    <label className="plan-modal-field"><span>{t('deal_partner')}</span><input value={form.partner} onChange={(event) => update('partner', event.target.value)} /></label>
    <label className="plan-modal-field"><span>{t('deal_value')}</span><input type="number" min="0" value={form.value} onChange={(event) => update('value', event.target.value)} /></label>
    <label className="plan-modal-field"><span>{t('deal_stage')}</span><select value={form.stage} onChange={(event) => update('stage', event.target.value)}>{['lead', 'qualification', 'proposal', 'negotiation', 'closed'].map((value) => <option key={value} value={value}>{t(`deal_stage_${value}`)}</option>)}</select></label>
    {error && <p className="plan-modal-error">{error}</p>}<div className="plan-modal-actions"><button type="button" className="strateg-secondary-btn" onClick={onClose}>{t('plan_cancel')}</button><button type="button" className="strateg-primary-btn" onClick={submit}>{t('plan_save')}</button></div>
  </div></div>;
}