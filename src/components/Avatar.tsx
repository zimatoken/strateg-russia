import { useMemo, useState, type FC } from 'react';
import type { AvatarType } from '../core/contact';

interface AvatarProps {
  type: AvatarType | string;
  size?: 32 | 40 | 48 | 64;
  color?: string;
  className?: string;
}

const FALLBACK_EMOJIS: Record<string, string> = {
  'avatar-boy': '👦',
  'avatar-girl': '👧',
  'avatar-man': '👨',
  'avatar-woman': '👩',
  'avatar-grandma': '👵',
  'avatar-grandpa': '👴',
  'avatar-teen': '🧑‍🎓',
  'avatar-cat': '🐱',
  'avatar-dog': '🐶',
  'avatar-robot': '🤖',
};

export const Avatar: FC<AvatarProps> = ({ type, size = 40, color = '#3b82f6', className }) => {
  const normalizedType = useMemo(() => ((type as AvatarType) || 'avatar-robot').toString(), [type]);
  const [imageError, setImageError] = useState(false);
  const fallbackEmoji = FALLBACK_EMOJIS[normalizedType] ?? '🤖';

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#334155',
        color,
        flexShrink: 0,
      }}
    >
      {!imageError ? (
        <img
          src={`/avatars/${normalizedType}.png`}
          alt={normalizedType}
          onError={() => setImageError(true)}
          style={{ width: size - 8, height: size - 8, objectFit: 'contain' }}
        />
      ) : (
        <span style={{ fontSize: size >= 64 ? 36 : size >= 40 ? 24 : 18 }}>{fallbackEmoji}</span>
      )}
    </div>
  );
};
