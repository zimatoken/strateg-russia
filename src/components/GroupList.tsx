import { useMemo } from 'react';
import type { GroupChat } from '../core/groupChat';
import { getAvatarPath } from '../lib/avatarRegistry';

interface GroupListProps {
  groups: GroupChat[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onCreateGroup: () => void;
}

export default function GroupList({ groups, selectedRoomId, onSelectRoom, onCreateGroup }: GroupListProps) {
  const sortedGroups = useMemo(() => [...groups].sort((a, b) => b.createdAt - a.createdAt), [groups]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button type="button" className="btn-add-contact" onClick={onCreateGroup}>
        + Создать группу
      </button>

      {sortedGroups.length === 0 ? (
        <div style={{ color: 'rgba(200,230,255,0.4)', fontSize: 14, textAlign: 'center', padding: 20 }}>
          Группы пока не созданы
        </div>
      ) : (
        sortedGroups.map((group) => {
          const isActive = group.id === selectedRoomId;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectRoom(group.id)}
              className={`contact-item ${isActive ? 'active' : ''}`}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                padding: 0
              }}
            >
              <img
                src={getAvatarPath(group.avatarId || 'avatar-robot')}
                alt=""
                className="contact-avatar"
              />
              <div className="contact-info">
                <div className="contact-name-row">
                  <div className="contact-name">{group.name}</div>
                </div>
                <div className="contact-preview">{group.members.length} участников</div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
