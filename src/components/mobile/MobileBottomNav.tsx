// STAGE9: Mobile bottom navigation component

type MobileTab = 'chats' | 'contacts' | 'groups' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const tabs: Array<{ id: MobileTab; icon: string; label: string }> = [
    { id: 'chats', icon: '🏠', label: 'Дом' },
    { id: 'contacts', icon: '👥', label: 'Контакты' },
    { id: 'groups', icon: '👥', label: 'Группы' },
    { id: 'profile', icon: '👤', label: 'Профиль' },
  ];

  return (
    <div className="mobile-bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`mobile-nav-tab ${activeTab === tab.id ? 'mobile-nav-tab-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-pressed={activeTab === tab.id}
        >
          <span className="mobile-nav-icon">{tab.icon}</span>
          <span className="mobile-nav-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
