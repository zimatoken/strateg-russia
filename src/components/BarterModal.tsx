import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dataStore, Barter } from '../core/dataStore';

interface BarterModalProps { isOpen: boolean; item?: Barter; onClose: () => void; onSave: (item: Barter) => void; }

export default function BarterModal({ isOpen, item, onClose, onSave }: BarterModalProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ title: '', category: 'equipment', description: '', offer: '', demand: '' });
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) setForm({ title: item?.title || '', category: item?.category || 'equipment', description: item?.description || '', offer: item?.offer || '', demand: item?.demand || '' }); }, [isOpen, item]);
  if (!isOpen) return null;
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = () => {
    if (!form.title.trim() || !form.description.trim() || !form.offer.trim() || !form.demand.trim()) { setError(t('form_required')); return; }
    const payload = { title: form.title.trim(), description: form.description.trim(), category: form.category, offer: form.offer.trim(), demand: form.demand.trim() };
    const saved = item ? dataStore.updateBarter(item.id, payload) : dataStore.createBarter(payload);
    onSave(saved); onClose();
  };
  return <div className="plan-modal-overlay" onClick={onClose}><div className="plan-modal" onClick={(event) => event.stopPropagation()}>
    <div className="plan-modal-header"><h2>{item ? t('barter_edit') : t('barter_create_title')}</h2><button type="button" onClick={onClose}>×</button></div>
    <label className="plan-modal-field"><span>{t('barter_title_field')}</span><input value={form.title} onChange={(event) => update('title', event.target.value)} autoFocus /></label>
    <label className="plan-modal-field"><span>{t('barter_category')}</span><select value={form.category} onChange={(event) => update('category', event.target.value)}>{['equipment', 'services', 'raw', 'products', 'ip', 'advertising'].map((value) => <option key={value} value={value}>{t(`barter_category_${value}`)}</option>)}</select></label>
    <label className="plan-modal-field"><span>{t('barter_offer_description')}</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} /></label>
    <label className="plan-modal-field"><span>{t('barter_offer')}</span><input value={form.offer} onChange={(event) => update('offer', event.target.value)} /></label>
    <label className="plan-modal-field"><span>{t('barter_demand')}</span><input value={form.demand} onChange={(event) => update('demand', event.target.value)} /></label>
    {error && <p className="plan-modal-error">{error}</p>}<div className="plan-modal-actions"><button type="button" className="strateg-secondary-btn" onClick={onClose}>{t('plan_cancel')}</button><button type="button" className="strateg-primary-btn" onClick={submit}>{t('plan_save')}</button></div>
  </div></div>;
}