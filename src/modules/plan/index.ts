// Модуль бизнес-плана и калькулятора
// Планирование финансов и ресурсов

export interface BusinessPlan {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  revenue: RevenueItem[];
  expenses: ExpenseItem[];
  kpis: KPI[];
}

export interface RevenueItem {
  id: string;
  source: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  growthRate: number;
}

export interface ExpenseItem {
  id: string;
  category: 'fixed' | 'variable' | 'one-time';
  name: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
}

export interface KPI {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Аренда',
  'Зарплаты',
  'Маркетинг',
  'Оборудование',
  'ПО и подписки',
  'Коммунальные услуги',
  'Логистика',
  'Прочее'
];

export function calculateProfitMargin(
  totalRevenue: number,
  totalExpenses: number
): number {
  if (totalRevenue === 0) return 0;
  return ((totalRevenue - totalExpenses) / totalRevenue) * 100;
}

export function calculateBreakEvenPoint(
  fixedCosts: number,
  pricePerUnit: number,
  variableCostPerUnit: number
): number {
  if (pricePerUnit === variableCostPerUnit) return Infinity;
  return fixedCosts / (pricePerUnit - variableCostPerUnit);
}

export function calculateROI(
  investment: number,
  profit: number
): number {
  if (investment === 0) return 0;
  return (profit / investment) * 100;
}

export function calculateNPV(
  cashFlows: number[],
  discountRate: number
): number {
  return cashFlows.reduce((npv, cashFlow, index) => {
    return npv + cashFlow / Math.pow(1 + discountRate, index);
  }, 0);
}

export function generateBusinessPlanSummary(plan: BusinessPlan): string {
  const totalRevenue = plan.revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = plan.expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const margin = calculateProfitMargin(totalRevenue, totalExpenses);

  return `
Бизнес-план: ${plan.name}
------------------------
Доход: ${totalRevenue.toLocaleString('ru-RU')} ₽
Расходы: ${totalExpenses.toLocaleString('ru-RU')} ₽
Прибыль: ${profit.toLocaleString('ru-RU')} ₽
Маржа: ${margin.toFixed(2)}%
KPI: ${plan.kpis.length} показателей
  `.trim();
}

export interface DashboardMetrics {
  revenue: number;
  expenses: number;
  profit: number;
}

export function getDashboardMetrics(): DashboardMetrics {
  try {
    const savedData = localStorage.getItem('strateg-plan-data');
    if (savedData) {
      const plan = JSON.parse(savedData) as BusinessPlan;
      const revenue = plan.revenue.reduce((sum, r) => sum + r.amount, 0);
      const expenses = plan.expenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        revenue,
        expenses,
        profit: revenue - expenses,
      };
    }
  } catch (error) {
    console.error('Error loading plan data:', error);
  }
  
  return { revenue: 0, expenses: 0, profit: 0 };
}
