import React from 'react';
import type { FileItem } from '../../types/files';

interface FileCardProps {
  file: FileItem;
  onSelect?: (file: FileItem) => void;
  isSelected?: boolean;
}

export const FileCard: React.FC<FileCardProps> = ({ 
  file, 
  onSelect, 
  isSelected = false 
}) => {
  const getFileIcon = (type: FileItem['type']) => {
    const icons = {
      pdf: '📄',
      figma: '🎨',
      image: '🖼️',
      document: '📝'
    };
    return icons[type];
  };

  return (
    <div 
      className={`file-card ${isSelected ? 'file-card--selected' : ''}`}
      onClick={() => onSelect?.(file)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(file)}
    >
      <div className="file-card__thumb">
        {file.thumb ? (
          <img src={file.thumb} alt={file.title} />
        ) : (
          <div className="file-card__icon">
            {getFileIcon(file.type)}
          </div>
        )}
      </div>
      
      <div className="file-card__content">
        <h3 className="file-card__title">{file.title}</h3>
        <p className="file-card__meta">
          {file.size} MB • {new Date(file.lastModified).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};