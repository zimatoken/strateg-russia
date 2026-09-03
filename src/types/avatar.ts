export type AvatarCategory = 'character' | 'pet' | 'robot' | 'silhouette' | 'icon' | 'tech';

export interface AvatarItem {
  id: string;
  path: string;
  category: AvatarCategory;
  label: string;
}
