import { getEnabledModules, type BusinessModule } from '../modules/registry';

interface BusinessNavProps {
  onModuleSelect: (module: BusinessModule) => void;
  activeModule?: BusinessModule;
}

const categoryNames: Record<string, string> = {
  diagnostics: 'Диагностика',
  planning: 'Планирование',
  exchange: 'Обмен',
  negotiation: 'Переговоры',
};

export default function BusinessNav({ onModuleSelect, activeModule }: BusinessNavProps) {
  const modules = getEnabledModules();

  return (
    <nav className="strateg-nav" aria-label="Бизнес-модули">
      <div className="strateg-nav-brand">
        <span className="strateg-nav-mark">S</span>
        <div><strong>СТРАТЕГ</strong><small>для бизнеса</small></div>
      </div>
      <div className="strateg-nav-list">
        {modules.map((module) => (
          <button className={`strateg-nav-item ${activeModule?.id === module.id ? 'active' : ''}`} key={module.id} onClick={() => onModuleSelect(module)}>
            <span className="strateg-nav-icon">{module.icon}</span>
            <span><strong>{module.title}</strong><small>{categoryNames[module.category]}</small></span>
          </button>
        ))}
      </div>
      <div className="strateg-nav-footer"><span className="strateg-status-dot" /> P2P подключён</div>
    </nav>
  );
}
