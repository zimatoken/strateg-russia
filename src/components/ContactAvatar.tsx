import React from 'react';
import { getAvatarPath } from '../lib/avatarRegistry';

interface ContactAvatarProps {
  avatarId?: string;
  size?: number;
  fallback?: string;
}

export default function ContactAvatar({ 
  avatarId, 
  size = 48, 
  fallback
}: ContactAvatarProps) {
  const avatarPath = getAvatarPath(avatarId);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const nextSrc = fallback ? getAvatarPath(fallback) : getAvatarPath('avatar-man');
    e.currentTarget.src = nextSrc;
  };

  return (
    <img
      src={avatarPath}
      alt="Avatar"
      onError={handleError}
      className="contact-avatar"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'cover',
        backgroundColor: 'rgba(30, 41, 59, 0.5)'
      }}
    />
  );
}
