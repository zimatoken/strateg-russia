import type { FileItem, FileType } from '../types/files';

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const filterFilesByType = (files: FileItem[], type: FileType): FileItem[] => {
  if (type === 'all') return files;
  return files.filter(file => file.type === type);
};

export const sortFilesByDate = (files: FileItem[]): FileItem[] => {
  return [...files].sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
};