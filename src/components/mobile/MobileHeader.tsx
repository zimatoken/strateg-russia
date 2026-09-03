// STAGE9: Mobile header component

import { Avatar } from '../Avatar';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  avatarColor?: string;
  showBackButton: boolean;
  onBack: () => void;
  onMenu: () => void;
}

export default function MobileHeader({
  title,
  subtitle,
  avatar,
  avatarColor,
  showBackButton,
  onBack,
  onMenu
}: MobileHeaderProps) {
  return (
    <div className="mobile-header">
      {showBackButton ? (
        <button className="mobile-header-btn" onClick={onBack} aria-label="Назад">
          ←
        </button>
      ) : (
        <button className="mobile-header-btn" onClick={onMenu} aria-label="Меню">
          🍔
        </button>
      )}

      <div className="mobile-header-content">
        {avatar && (
          <div className="mobile-header-avatar">
            <Avatar type={avatar} size={32} color={avatarColor || '#3b82f6'} />
          </div>
        )}
        <div className="mobile-header-text">
          <div className="mobile-header-title">{title}</div>
          {subtitle && <div className="mobile-header-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="mobile-header-spacer" />
    </div>
  );
}
