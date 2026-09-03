export interface FileItem {
  id: string;
  title: string;
  size: string;
  thumb?: string;
  type: 'pdf' | 'figma' | 'image' | 'document';
  lastModified: string;
}

export type FileType = 'pdf' | 'figma' | 'image' | 'document' | 'all';