export interface Metrics {
  breakEvenPoint: number;
  roi: number;
  margin: number;
  monthlyForecast: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MetricInputs {
  revenue: number;
  expenses: number;
  fixedCosts: number;
  pricePerUnit: number;
  variableCostPerUnit: number;
}

export const METRICS_INPUTS_KEY = 'strateg-smart-metrics-inputs';

export const DEFAULT_METRIC_INPUTS: MetricInputs = {
  revenue: 0,
  expenses: 0,
  fixedCosts: 0,
  pricePerUnit: 0,
  variableCostPerUnit: 0,
};

export function calculateMetrics(
  revenue: number,
  expenses: number,
  fixedCosts: number,
  pricePerUnit: number,
  variableCostPerUnit: number,
): Metrics {
  const safeRevenue = Math.max(0, revenue);
  const safeExpenses = Math.max(0, expenses);
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  const breakEvenPoint = contributionMargin > 0 ? Math.ceil(Math.max(0, fixedCosts) / contributionMargin) : 0;
  const roi = safeExpenses > 0 ? ((safeRevenue - safeExpenses) / safeExpenses) * 100 : 0;
  const margin = safeRevenue > 0 ? ((safeRevenue - safeExpenses) / safeRevenue) * 100 : 0;
  const trend = safeRevenue > safeExpenses ? 'up' : safeRevenue < safeExpenses ? 'down' : 'stable';

  return {
    breakEvenPoint,
    roi,
    margin,
    monthlyForecast: safeRevenue,
    trend,
  };
}

export function getDefaultMetrics(): Metrics {
  return calculateMetrics(
    DEFAULT_METRIC_INPUTS.revenue,
    DEFAULT_METRIC_INPUTS.expenses,
    DEFAULT_METRIC_INPUTS.fixedCosts,
    DEFAULT_METRIC_INPUTS.pricePerUnit,
    DEFAULT_METRIC_INPUTS.variableCostPerUnit,
  );
}

export function formatCurrency(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

export function getStoredMetricInputs(): MetricInputs {
  try {
    const raw = localStorage.getItem(METRICS_INPUTS_KEY);
    if (!raw) return DEFAULT_METRIC_INPUTS;
    const parsed = JSON.parse(raw) as Partial<MetricInputs>;
    return { ...DEFAULT_METRIC_INPUTS, ...parsed };
  } catch {
    return DEFAULT_METRIC_INPUTS;
  }
}

export function saveMetricInputs(inputs: MetricInputs): void {
  localStorage.setItem(METRICS_INPUTS_KEY, JSON.stringify(inputs));
}