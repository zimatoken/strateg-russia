// Registry для бизнес-модулей "СТРАТЕГ ДЛЯ БИЗНЕСА В РОССИИ"
// Архитектура аналогична avatarRegistry.ts

export interface BusinessModule {
  id: string;
  path: string;
  title: string;
  description: string;
  icon: string;
  category: 'diagnostics' | 'planning' | 'exchange' | 'negotiation';
  enabled: boolean;
  order: number;
}

export const BUSINESS_MODULES: BusinessModule[] = [
  // Модуль диагностики курса бизнеса
  {
    id: 'course-diagnostics',
    path: '/modules/course',
    title: 'Диагностика курса',
    description: 'Квизы для оценки состояния бизнеса',
    icon: '📊',
    category: 'diagnostics',
    enabled: true,
    order: 1
  },
  // Модуль бизнес-плана
  {
    id: 'business-plan',
    path: '/modules/plan',
    title: 'Бизнес-план',
    description: 'Планирование и калькулятор',
    icon: '📋',
    category: 'planning',
    enabled: true,
    order: 2
  },
  // Модуль бартера
  {
    id: 'barter-exchange',
    path: '/modules/barter',
    title: 'Бартер',
    description: 'Объявления и обмен',
    icon: '🔄',
    category: 'exchange',
    enabled: true,
    order: 3
  },
  // Модуль сделок
  {
    id: 'deals-negotiation',
    path: '/modules/deals',
    title: 'Сделки',
    description: 'Переговоры и контракты',
    icon: '🤝',
    category: 'negotiation',
    enabled: true,
    order: 4
  }
];

export function getModuleById(id: string): BusinessModule | undefined {
  return BUSINESS_MODULES.find(m => m.id === id);
}

export function getModulesByCategory(category: BusinessModule['category']): BusinessModule[] {
  return BUSINESS_MODULES.filter(m => m.category === category);
}

export function getEnabledModules(): BusinessModule[] {
  return BUSINESS_MODULES.filter(m => m.enabled).sort((a, b) => a.order - b.order);
}

export function getModulePath(id: string): string {
  const module = getModuleById(id);
  return module?.path || '/';
}
