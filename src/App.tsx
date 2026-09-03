import { useEffect, useState } from 'react';
import pino from 'pino';
import BusinessNav from './components/BusinessNav';
import ChatInterfaceNextGen from './components/strateg-russia/ChatInterfaceNextGen';
import { getEnabledModules, type BusinessModule } from './modules/registry';
import CoursePage from './pages/CoursePage';
import PlanPage from './pages/PlanPage';
import BarterPage from './pages/BarterPage';
import DealsPage from './pages/DealsPage';
import Dashboard from './pages/Dashboard';
import { getDialogCore } from './core/dialogCore';
import {
  clearDeepLinkUrl,
  isValidStrategId,
  resolveIncomingDeepLink,
} from './core/deepLink';
import { useTheme } from './hooks/useTheme';

const logger = pino({ name: 'strateg-app' });

function App() {
  const { isDark, toggleTheme } = useTheme();
  const [path, setPath] = useState(() => window.location.pathname);
  const [connectionState, setConnectionState] = useState(() => getDialogCore().getConnectionState());
  const [deepLinkTargetId] = useState<string | null>(() => {
    const link = resolveIncomingDeepLink();
    if (!link) return null;

    clearDeepLinkUrl();

    if (!isValidStrategId(link.id)) {
      logger.warn({ id: link.id }, 'Deep link id is not a valid STRATEG-ID format');
    } else {
      logger.info({ id: link.id }, 'Deep link resolved');
    }

    return link.id;
  });

  useEffect(() => {
    const core = getDialogCore();
    const unsubscribe = core.onConnectionChange(setConnectionState);
    core.connect();
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
      core.disconnect();
    };
  }, []);

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  };

  const activeModule = getEnabledModules().find((module) => module.path === path);
  const renderContent = () => {
    if (path === '/dashboard') return <Dashboard />;
    if (path === '/modules/course') return <CoursePage />;
    if (path === '/modules/plan') return <PlanPage />;
    if (path === '/modules/barter') return <BarterPage />;
    if (path === '/modules/deals') return <DealsPage />;
    if (path === '/chat') return <ChatInterfaceNextGen deepLinkTargetId={deepLinkTargetId} />;
    return (
      <section className="strateg-dashboard">
        <div className="strateg-dashboard-hero">
          <div><span className="strateg-eyebrow">Рабочее пространство</span><h1>Добрый день. Стратегия начинается с ясности.</h1><p>Инструменты для решений, планирования и деловых переговоров в одном месте.</p></div>
          <button className="strateg-primary-btn" onClick={() => navigate('/modules/course')}>Начать диагностику</button>
        </div>
        <div className="strateg-dashboard-meta"><span><i className="strateg-status-dot" /> P2P {connectionState.connectionStatus === 'connected' ? 'подключён' : 'подключение...'}</span><strong>ID: {connectionState.currentStrategId ?? 'создаётся...'}</strong></div>
        <div className="strateg-dashboard-grid">
          {getEnabledModules().map((module) => <button className="strateg-dashboard-card" key={module.id} onClick={() => navigate(module.path)}><span className="strateg-card-icon">{module.icon}</span><span className="strateg-card-category">{module.category === 'diagnostics' ? 'Диагностика' : module.category === 'planning' ? 'Планирование' : module.category === 'exchange' ? 'Обмен' : 'Переговоры'}</span><h2>{module.title}</h2><p>{module.description}</p><span className="strateg-card-arrow">Открыть <b>→</b></span></button>)}
          <button className="strateg-dashboard-card strateg-chat-card" onClick={() => navigate('/chat')}><span className="strateg-card-icon">💬</span><span className="strateg-card-category">Коммуникации</span><h2>Деловой диалог</h2><p>Связывайтесь с контактами и командами через защищённый P2P-чат.</p><span className="strateg-card-arrow">Открыть <b>→</b></span></button>
        </div>
      </section>
    );
  };

  return (
    <div className="strateg-app">
      <header className="strateg-header"><button className="strateg-brand" onClick={() => navigate('/')}><span className="strateg-brand-mark">S</span><span><strong>СТРАТЕГ</strong><small>для бизнеса в России</small></span></button><div className="strateg-header-actions"><button onClick={toggleTheme} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '18px' }} aria-label="Переключить тему">{isDark ? '☀️' : '🌙'}</button><span className="strateg-user-id">ID: {connectionState.currentStrategId ?? 'создаётся...'}</span><button className="strateg-profile-btn" onClick={() => navigate('/chat')} aria-label="Открыть диалог">◉</button></div></header>
      <div className="strateg-shell"><BusinessNav activeModule={activeModule} onModuleSelect={(module: BusinessModule) => navigate(module.path)} /><main className="strateg-content">{renderContent()}</main></div>
      <footer className="strateg-footer"><span>СТРАТЕГ ДЛЯ БИЗНЕСА В РОССИИ</span><span>v1.0 · защищённое пространство</span></footer>
    </div>
  );
}

export default App;
