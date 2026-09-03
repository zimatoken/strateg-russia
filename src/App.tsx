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
import { useLanguage } from './context/LanguageContext';

const logger = pino({ name: 'strateg-app' });

function App() {
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
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
          <div><span className="strateg-eyebrow">{t('dashboard_title')}</span><h1>{t('dashboard_subtitle')}</h1><p>{t('dashboard_description')}</p></div>
          <button className="strateg-primary-btn" onClick={() => navigate('/modules/course')}>{t('dashboard_start_diagnostic')}</button>
        </div>
        <div className="strateg-dashboard-meta"><span><i className="strateg-status-dot" /> P2P {connectionState.connectionStatus === 'connected' ? t('status_connected') : t('status_connecting')}</span><strong>{t('id_label')} {connectionState.currentStrategId ?? t('status_creating')}</strong></div>
        <div className="strateg-dashboard-grid">
          {getEnabledModules().map((module) => <button className="strateg-dashboard-card" key={module.id} onClick={() => navigate(module.path)}><span className="strateg-card-icon">{module.icon}</span><span className="strateg-card-category">{module.category === 'diagnostics' ? t('diagnostics_category') : module.category === 'planning' ? t('planning_category') : module.category === 'exchange' ? t('exchange_category') : t('negotiations_category')}</span><h2>{module.title}</h2><p>{module.description}</p><span className="strateg-card-arrow">{t('dashboard_card_open')} <b>→</b></span></button>)}
          <button className="strateg-dashboard-card strateg-chat-card" onClick={() => navigate('/chat')}><span className="strateg-card-icon">💬</span><span className="strateg-card-category">{t('dashboard_chat_card_category')}</span><h2>{t('dashboard_chat_card_title')}</h2><p>{t('dashboard_chat_card_description')}</p><span className="strateg-card-arrow">{t('dashboard_card_open')} <b>→</b></span></button>
        </div>
      </section>
    );
  };

  return (
    <div className="strateg-app">
      <header className="strateg-header"><button className="strateg-brand" onClick={() => navigate('/')}><span className="strateg-brand-mark">S</span><span><strong>{t('app_title')}</strong><small>{t('app_subtitle')}</small></span></button><div className="strateg-header-actions"><button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', marginRight: '8px' }}>{lang === 'ru' ? 'RU' : 'EN'}</button><button onClick={toggleTheme} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '18px' }} aria-label={t('theme_toggle')}>{isDark ? '☀️' : '🌙'}</button><span className="strateg-user-id">{t('id_label')} {connectionState.currentStrategId ?? t('status_creating')}</span><button className="strateg-profile-btn" onClick={() => navigate('/chat')} aria-label="Открыть диалог">◉</button></div></header>
      <div className="strateg-shell"><BusinessNav activeModule={activeModule} onModuleSelect={(module: BusinessModule) => navigate(module.path)} /><main className="strateg-content">{renderContent()}</main></div>
      <footer className="strateg-footer"><span>{t('footer_title')}</span><span>{t('footer_version')}</span></footer>
    </div>
  );
}

export default App;
