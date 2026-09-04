import { getEnabledModules, type BusinessModule } from '../modules/registry';
import { useLanguage } from '../context/LanguageContext';

interface BusinessNavProps {
  onModuleSelect: (module: BusinessModule) => void;
  onAuditSelect: () => void;
  isMobileOpen?: boolean;
  onClose?: () => void;
  activeModule?: BusinessModule;
}

export default function BusinessNav({ onModuleSelect, onAuditSelect, isMobileOpen = false, onClose, activeModule }: BusinessNavProps) {
  const { t } = useLanguage();
  const modules = getEnabledModules();
  // ensure unique modules by id to avoid duplicate render
  const uniqModules = Array.from(new Map(modules.map(m => [m.id, m])).values());

  const categoryNames: Record<string, string> = {
    diagnostics: t('diagnostics_category'),
    planning: t('planning_category'),
    exchange: t('exchange_category'),
    negotiation: t('negotiations_category'),
    analytics: t('analytics_category'),
    chats: t('chats_title'),
    communication: t('messenger_title'),
  };

  return (
    <nav className={`strateg-nav ${isMobileOpen ? 'is-mobile-open' : ''}`} aria-label="Бизнес-модули">
      <div className="strateg-nav-brand">
        <span className="strateg-nav-mark">S</span>
        <div><strong>{t('app_title')}</strong><small>{t('app_subtitle')}</small></div>
      </div>
      {isMobileOpen && <button type="button" className="strateg-mobile-nav-close" onClick={onClose} aria-label={t('mobile_close')}>×</button>}
      <div className="strateg-nav-list">
        {uniqModules.map((module) => (
          <button className={`strateg-nav-item ${activeModule?.id === module.id ? 'active' : ''}`} key={module.id} onClick={() => { onModuleSelect(module); onClose?.(); }}>
            <span className="strateg-nav-icon">{module.icon}</span>
            <span><strong>{module.title}</strong><small>{categoryNames[module.category]}</small></span>
          </button>
        ))}
        <button className="strateg-nav-item" onClick={() => { onAuditSelect(); onClose?.(); }}>
          <span className="strateg-nav-icon">📋</span>
          <span><strong>{t('audit_nav')}</strong><small>{t('audit_title')}</small></span>
        </button>
      </div>
      <div className="strateg-nav-footer"><span className="strateg-status-dot" /> P2P {t('status_connected')}</div>
    </nav>
  );
}
