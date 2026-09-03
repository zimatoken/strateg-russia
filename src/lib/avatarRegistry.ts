import { AvatarItem, AvatarCategory } from '../types/avatar';

// STAGE 5: synced from public/avatars/ (48 PNG files)
export const ALL_AVATARS: AvatarItem[] = [
  { id: 'avatar-ai', path: '/avatars/avatar-ai.png', category: 'robot', label: 'AI' },
  { id: 'avatar-boy', path: '/avatars/avatar-boy.png', category: 'character', label: 'Мальчик' },
  { id: 'avatar-boy2', path: '/avatars/avatar-boy2.png', category: 'silhouette', label: 'Силуэт мальчика' },
  { id: 'avatar-boy3', path: '/avatars/avatar-boy3.png', category: 'character', label: 'Мальчик 3' },
  { id: 'avatar-brain', path: '/avatars/avatar-brain.png', category: 'tech', label: 'Мозг' },
  { id: 'avatar-cat', path: '/avatars/avatar-cat.png', category: 'pet', label: 'Кот' },
  { id: 'avatar-cat2', path: '/avatars/avatar-cat2.png', category: 'pet', label: 'Кот 2' },
  { id: 'avatar-chip', path: '/avatars/avatar-chip.png', category: 'tech', label: 'Чип' },
  { id: 'avatar-cloud', path: '/avatars/avatar-cloud.png', category: 'tech', label: 'Облако' },
  { id: 'avatar-coder', path: '/avatars/avatar-coder.png', category: 'tech', label: 'Кодер' },
  { id: 'avatar-data', path: '/avatars/avatar-data.png', category: 'tech', label: 'Данные' },
  { id: 'avatar-dog', path: '/avatars/avatar-dog.png', category: 'pet', label: 'Собака' },
  { id: 'avatar-dog2', path: '/avatars/avatar-dog2.png', category: 'pet', label: 'Собака 2' },
  { id: 'avatar-drone', path: '/avatars/avatar-drone.png', category: 'tech', label: 'Дрон' },
  { id: 'avatar-engineer', path: '/avatars/avatar-engineer.png', category: 'tech', label: 'Инженер' },
  { id: 'avatar-gear', path: '/avatars/avatar-gear.png', category: 'tech', label: 'Шестерня' },
  { id: 'avatar-girl', path: '/avatars/avatar-girl.png', category: 'character', label: 'Девочка' },
  { id: 'avatar-girl2', path: '/avatars/avatar-girl2.png', category: 'silhouette', label: 'Силуэт девочки' },
  { id: 'avatar-girl3', path: '/avatars/avatar-girl3.png', category: 'character', label: 'Девочка 3' },
  { id: 'avatar-grandma', path: '/avatars/avatar-grandma.png', category: 'character', label: 'Бабушка' },
  { id: 'avatar-grandma2', path: '/avatars/avatar-grandma2.png', category: 'icon', label: 'Сердце' },
  { id: 'avatar-grandma3', path: '/avatars/avatar-grandma3.png', category: 'character', label: 'Бабушка 3' },
  { id: 'avatar-grandpa', path: '/avatars/avatar-grandpa.png', category: 'character', label: 'Дедушка' },
  { id: 'avatar-grandpa2', path: '/avatars/avatar-grandpa2.png', category: 'silhouette', label: 'Дедушка 2' },
  { id: 'avatar-grandpa3', path: '/avatars/avatar-grandpa3.png', category: 'character', label: 'Дедушка 3' },
  { id: 'avatar-grandpa4', path: '/avatars/avatar-grandpa4.png', category: 'character', label: 'Дедушка 4' },
  { id: 'avatar-hacker', path: '/avatars/avatar-hacker.png', category: 'tech', label: 'Хакер' },
  { id: 'avatar-lab', path: '/avatars/avatar-lab.png', category: 'tech', label: 'Лаборатория' },
  { id: 'avatar-lightbulb', path: '/avatars/avatar-lightbulb.png', category: 'tech', label: 'Лампочка' },
  { id: 'avatar-man', path: '/avatars/avatar-man.png', category: 'character', label: 'Мужчина' },
  { id: 'avatar-man2', path: '/avatars/avatar-man2.png', category: 'silhouette', label: 'Силуэт мужчины' },
  { id: 'avatar-man3', path: '/avatars/avatar-man3.png', category: 'icon', label: 'Кристалл' },
  { id: 'avatar-man4', path: '/avatars/avatar-man4.png', category: 'character', label: 'Мужчина 4' },
  { id: 'avatar-network', path: '/avatars/avatar-network.png', category: 'tech', label: 'Сеть' },
  { id: 'avatar-robot', path: '/avatars/avatar-robot.png', category: 'robot', label: 'Робот' },
  { id: 'avatar-robot2', path: '/avatars/avatar-robot2.png', category: 'robot', label: 'Робот 2' },
  { id: 'avatar-robot3', path: '/avatars/avatar-robot3.png', category: 'robot', label: 'Робот 3' },
  { id: 'avatar-robot4', path: '/avatars/avatar-robot4.png', category: 'robot', label: 'Робот 4' },
  { id: 'avatar-rocket', path: '/avatars/avatar-rocket.png', category: 'tech', label: 'Ракета' },
  { id: 'avatar-satellite', path: '/avatars/avatar-satellite.png', category: 'tech', label: 'Спутник' },
  { id: 'avatar-security', path: '/avatars/avatar-security.png', category: 'tech', label: 'Безопасность' },
  { id: 'avatar-teen', path: '/avatars/avatar-teen.png', category: 'character', label: 'Подросток' },
  { id: 'avatar-teen2', path: '/avatars/avatar-teen2.png', category: 'icon', label: 'Наушники' },
  { id: 'avatar-teen3', path: '/avatars/avatar-teen3.png', category: 'character', label: 'Подросток 3' },
  { id: 'avatar-woman', path: '/avatars/avatar-woman.png', category: 'character', label: 'Женщина' },
  { id: 'avatar-woman2', path: '/avatars/avatar-woman2.png', category: 'silhouette', label: 'Силуэт женщины' },
  { id: 'avatar-woman3', path: '/avatars/avatar-woman3.png', category: 'icon', label: 'Лотос' },
  { id: 'avatar-woman4', path: '/avatars/avatar-woman4.png', category: 'character', label: 'Женщина 4' },
];

const DEFAULT_AVATAR = '/avatars/avatar-man.png';

export function getAvatarPath(id: string): string;
export function getAvatarPath(id?: string): string {
  if (!id) return DEFAULT_AVATAR;
  const avatar = ALL_AVATARS.find(a => a.id === id);
  return avatar?.path || DEFAULT_AVATAR;
}

export function getAvatarsByCategory(category: AvatarCategory): AvatarItem[] {
  return ALL_AVATARS.filter(a => a.category === category);
}

export function getAvatarById(id: string): AvatarItem | undefined {
  return ALL_AVATARS.find(a => a.id === id);
}
