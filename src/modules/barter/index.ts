// Модуль бартера и обмена
// Объявления и бартерные сделки

export interface BarterListing {
  id: string;
  title: string;
  description: string;
  category: BarterCategory;
  offered: BarterItem[];
  wanted: BarterItem[];
  location: string;
  contact: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  expiresAt?: Date;
}

export interface BarterItem {
  type: 'product' | 'service' | 'resource';
  name: string;
  quantity: number;
  unit: string;
  estimatedValue: number;
}

export type BarterCategory = 
  | 'equipment'
  | 'services'
  | 'raw-materials'
  | 'products'
  | 'intellectual'
  | 'advertising';

export const BARTER_CATEGORIES: Record<BarterCategory, string> = {
  'equipment': 'Оборудование',
  'services': 'Услуги',
  'raw-materials': 'Сырьё',
  'products': 'Продукция',
  'intellectual': 'Интеллектуальная собственность',
  'advertising': 'Реклама'
};

export interface BarterProposal {
  id: string;
  listingId: string;
  proposerId: string;
  offeredItems: BarterItem[];
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  createdAt: Date;
}

export function createBarterListing(
  data: Omit<BarterListing, 'id' | 'status' | 'createdAt'>
): BarterListing {
  return {
    ...data,
    id: generateBarterId(),
    status: 'active',
    createdAt: new Date()
  };
}

export function generateBarterId(): string {
  return `BAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateBarterValue(
  offered: BarterItem[],
  wanted: BarterItem[]
): { offeredTotal: number; wantedTotal: number; ratio: number } {
  const offeredTotal = offered.reduce((sum, item) => sum + item.estimatedValue, 0);
  const wantedTotal = wanted.reduce((sum, item) => sum + item.estimatedValue, 0);
  const ratio = wantedTotal > 0 ? offeredTotal / wantedTotal : 0;

  return { offeredTotal, wantedTotal, ratio };
}

export function isBarterFair(ratio: number, tolerance: number = 0.2): boolean {
  return ratio >= 1 - tolerance && ratio <= 1 + tolerance;
}

export function searchListings(
  listings: BarterListing[],
  query: string,
  category?: BarterCategory
): BarterListing[] {
  return listings.filter(listing => {
    const matchesQuery = 
      listing.title.toLowerCase().includes(query.toLowerCase()) ||
      listing.description.toLowerCase().includes(query.toLowerCase());
    
    const matchesCategory = !category || listing.category === category;

    return matchesQuery && matchesCategory;
  });
}
