import { getEnabledModules, type BusinessModule } from '../modules/registry';
import { useLanguage } from '../context/LanguageContext';

interface BusinessNavProps {
  onModuleSelect: (module: BusinessModule) => void;
  activeModule?: BusinessModule;
}

export default function BusinessNav({ onModuleSelect, activeModule }: BusinessNavProps) {
  const { t } = useLanguage();
  const modules = getEnabledModules();

  const categoryNames: Record<string, string> = {
    diagnostics: t('diagnostics_category'),
    planning: t('planning_category'),
    exchange: t('exchange_category'),
    negotiation: t('negotiations_category'),
    analytics: t('analytics_category'),
    chats: t('chats_title'),
  };

  return (
    <nav className="strateg-nav" aria-label="Бизнес-модули">
      <div className="strateg-nav-brand">
        <span className="strateg-nav-mark">S</span>
        <div><strong>{t('app_title')}</strong><small>{t('app_subtitle')}</small></div>
      </div>
      <div className="strateg-nav-list">
        {modules.map((module) => (
          <button className={`strateg-nav-item ${activeModule?.id === module.id ? 'active' : ''}`} key={module.id} onClick={() => onModuleSelect(module)}>
            <span className="strateg-nav-icon">{module.icon}</span>
            <span><strong>{module.title}</strong><small>{categoryNames[module.category]}</small></span>
          </button>
        ))}
      </div>
      <div className="strateg-nav-footer"><span className="strateg-status-dot" /> P2P {t('status_connected')}</div>
    </nav>
  );
}
