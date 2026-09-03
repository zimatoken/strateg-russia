// Модуль сделок и переговоров
// Управление сделками, контрактами и переговорами

export interface Deal {
  id: string;
  title: string;
  description: string;
  counterparty: string;
  value: number;
  currency: 'RUB' | 'USD' | 'EUR';
  status: DealStatus;
  stage: DealStage;
  probability: number;
  createdAt: Date;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  negotiations: Negotiation[];
  documents: Document[];
}

export type DealStatus = 
  | 'draft'
  | 'active'
  | 'won'
  | 'lost'
  | 'on-hold'
  | 'cancelled';

export type DealStage = 
  | 'lead'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closing'
  | 'closed';

export const DEAL_STAGES: Record<DealStage, string> = {
  'lead': 'Лид',
  'qualification': 'Квалификация',
  'proposal': 'Предложение',
  'negotiation': 'Переговоры',
  'closing': 'Закрытие',
  'closed': 'Завершено'
};

export const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  'draft': '#94a3b8',
  'active': '#3b82f6',
  'won': '#22c55e',
  'lost': '#ef4444',
  'on-hold': '#f59e0b',
  'cancelled': '#64748b'
};

export interface Negotiation {
  id: string;
  date: Date;
  type: 'meeting' | 'call' | 'email' | 'document';
  summary: string;
  nextSteps: string[];
  participants: string[];
  outcome?: 'positive' | 'neutral' | 'negative';
}

export interface Document {
  id: string;
  name: string;
  type: 'contract' | 'proposal' | 'invoice' | 'nda' | 'other';
  url: string;
  uploadedAt: Date;
  status: 'draft' | 'sent' | 'signed' | 'rejected';
}

export function createDeal(
  data: Omit<Deal, 'id' | 'status' | 'createdAt' | 'negotiations' | 'documents'>
): Deal {
  return {
    ...data,
    id: generateDealId(),
    status: 'draft',
    createdAt: new Date(),
    negotiations: [],
    documents: []
  };
}

export function generateDealId(): string {
  return `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateDealValue(
  deals: Deal[],
  status?: DealStatus
): number {
  const filteredDeals = status 
    ? deals.filter(d => d.status === status)
    : deals;
  
  return filteredDeals.reduce((sum, deal) => sum + deal.value, 0);
}

export function calculateWinRate(deals: Deal[]): number {
  const closedDeals = deals.filter(d => d.status === 'won' || d.status === 'lost');
  if (closedDeals.length === 0) return 0;
  
  const wonDeals = closedDeals.filter(d => d.status === 'won');
  return (wonDeals.length / closedDeals.length) * 100;
}

export function calculateAverageDealCycle(deals: Deal[]): number {
  const completedDeals = deals.filter(d => 
    d.status === 'won' || d.status === 'lost'
  ).filter(d => d.actualCloseDate && d.createdAt);
  
  if (completedDeals.length === 0) return 0;
  
  const totalDays = completedDeals.reduce((sum, deal) => {
    const days = deal.actualCloseDate!.getTime() - deal.createdAt.getTime();
    return sum + days / (1000 * 60 * 60 * 24);
  }, 0);
  
  return totalDays / completedDeals.length;
}

export function advanceDealStage(deal: Deal, newStage: DealStage): Deal {
  const stageOrder = ['lead', 'qualification', 'proposal', 'negotiation', 'closing', 'closed'];
  const currentIndex = stageOrder.indexOf(deal.stage);
  const newIndex = stageOrder.indexOf(newStage);
  
  if (newIndex <= currentIndex) {
    throw new Error('Cannot move deal to previous stage');
  }
  
  return {
    ...deal,
    stage: newStage,
    status: newStage === 'closed' ? 'active' : deal.status
  };
}

export function addNegotiation(
  deal: Deal,
  negotiation: Omit<Negotiation, 'id'>
): Deal {
  return {
    ...deal,
    negotiations: [
      ...deal.negotiations,
      {
        ...negotiation,
        id: generateNegotiationId()
      }
    ]
  };
}

export function generateNegotiationId(): string {
  return `NEG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getDealsByStage(deals: Deal[]): Record<DealStage, Deal[]> {
  const result: Record<DealStage, Deal[]> = {
    'lead': [],
    'qualification': [],
    'proposal': [],
    'negotiation': [],
    'closing': [],
    'closed': []
  };
  
  deals.forEach(deal => {
    result[deal.stage].push(deal);
  });
  
  return result;
}
