// STAGE9: Mobile sidebar component

import { useEffect, useRef } from 'react';
import SearchBar from '../SearchBar';
import ContactList from '../ContactList';
import GroupList from '../GroupList';
import { Avatar } from '../Avatar';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  profileAvatarId: string;
  onOpenProfile: () => void;
  onOpenAddContact: () => void;
  onOpenCreateGroup: () => void;
  onSelectContact: (id: string) => void;
  onSelectGroup: (id: string) => void;
  groups: any[];
  contactRefreshKey: number;
}

export default function MobileSidebar({
  isOpen,
  onClose,
  profileName,
  profileAvatarId,
  onOpenProfile,
  onOpenAddContact,
  onOpenCreateGroup,
  onSelectContact,
  onSelectGroup,
  groups,
  contactRefreshKey
}: MobileSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // STAGE9: Close sidebar on swipe right
  useEffect(() => {
    if (!isOpen || !sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    let startX = 0;
    let currentX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      if (diff > 50) {
        onClose();
      }
    };

    sidebar.addEventListener('touchstart', handleTouchStart);
    sidebar.addEventListener('touchmove', handleTouchMove);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div className="mobile-sidebar-overlay" onClick={onClose} />
      )}
      <div
        ref={sidebarRef}
        className={`mobile-sidebar ${isOpen ? 'mobile-sidebar-open' : ''}`}
      >
        <div className="mobile-sidebar-header">
          <div className="mobile-sidebar-profile" onClick={onOpenProfile}>
            <Avatar type={profileAvatarId} size={48} color="#3b82f6" />
            <div className="mobile-sidebar-profile-info">
              <div className="mobile-sidebar-profile-name">{profileName}</div>
              <div className="mobile-sidebar-profile-status">В сети</div>
            </div>
          </div>
          <button className="mobile-sidebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mobile-sidebar-search">
          <SearchBar
            onContactSelect={(id) => {
              onSelectContact(id);
              onClose();
            }}
            onGroupSelect={(id) => {
              onSelectGroup(id);
              onClose();
            }}
            onMessageSelect={(contactId) => {
              onSelectContact(contactId);
              onClose();
            }}
          />
        </div>

        <div className="mobile-sidebar-content">
          <div className="mobile-sidebar-section">
            <div className="mobile-sidebar-section-title">Контакты</div>
            <ContactList
              activeContactId={null}
              onSelectContact={(id) => {
                onSelectContact(id);
                onClose();
              }}
              refreshKey={contactRefreshKey}
            />
            <button className="mobile-sidebar-add-btn" onClick={onOpenAddContact}>
              + Добавить контакт
            </button>
          </div>

          <div className="mobile-sidebar-section">
            <div className="mobile-sidebar-section-title">Группы</div>
            <GroupList
              groups={groups}
              selectedRoomId={null}
              onSelectRoom={(id) => {
                onSelectGroup(id);
                onClose();
              }}
              onCreateGroup={() => {
                onOpenCreateGroup();
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
