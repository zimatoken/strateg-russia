export type QuizAnswers = Record<string, string | number | boolean | undefined>;

export interface AIRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  actionSteps: string[];
  resources: string[];
}

const revenueGrowingProfitFalling = (answers: QuizAnswers): boolean => {
  const revenueTrend = String(answers.revenueTrend ?? answers.revenue_growth ?? '').toLowerCase();
  const profitTrend = String(answers.profitTrend ?? answers.profit_growth ?? '').toLowerCase();
  return ['up', 'growing', 'рост', 'растёт', 'растет'].includes(revenueTrend)
    && ['down', 'falling', 'падение', 'падает'].includes(profitTrend);
};

export function generateRecommendations(answers: QuizAnswers): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];
  const lowMargin = ['f1-1', 'f1-2'].includes(String(answers.f1 ?? answers.margin));
  const noReserve = ['f2-1', 'f2-2'].includes(String(answers.f2 ?? answers.reserve));
  const processesNeedWork = ['o1-1', 'o1-2'].includes(String(answers.o1 ?? answers.processes));

  if (lowMargin) {
    recommendations.push({
      id: 'improve-margin', category: 'finance', title: 'Повысить маржинальность',
      description: 'Текущая маржинальность ограничивает запас прочности и возможности роста бизнеса.', priority: 'high',
      impact: 'рост прибыли с каждой продажи',
      actionSteps: ['Разберите себестоимость каждого продукта.', 'Проверьте цены и ценность для клиента.', 'Уберите или пересмотрите убыточные позиции.'],
      resources: ['Отчёт по себестоимости', 'Интервью с клиентами'],
    });
  }

  if (revenueGrowingProfitFalling(answers)) {
    recommendations.push({
      id: 'control-expenses', category: 'finance', title: 'Взять расходы под контроль',
      description: 'Выручка растёт, но прибыль снижается: рост продаж не превращается в финансовый результат.', priority: 'high',
      impact: 'восстановление операционной прибыли',
      actionSteps: ['Сравните расходы по месяцам и категориям.', 'Найдите расходы, растущие быстрее выручки.', 'Установите лимиты и еженедельный контроль.'],
      resources: ['Движение денежных средств', 'Бюджет подразделений'],
    });
  }

  if (noReserve) {
    recommendations.push({
      id: 'build-reserve', category: 'finance', title: 'Создать финансовый резерв',
      description: 'Без финансовой подушки бизнес уязвим к просадкам спроса и внеплановым расходам.', priority: 'high',
      impact: 'устойчивость бизнеса на 3 месяца',
      actionSteps: ['Рассчитайте обязательные расходы за месяц.', 'Определите целевой резерв на 3 месяца.', 'Настройте регулярное пополнение отдельного счёта.'],
      resources: ['Финансовая модель', 'Календарь платежей'],
    });
  }

  if (processesNeedWork) {
    recommendations.push({
      id: 'automate-processes', category: 'operations', title: 'Автоматизировать процессы',
      description: 'Неоптимизированные процессы забирают время команды и увеличивают количество ошибок.', priority: 'medium',
      impact: 'экономия времени команды и меньше ошибок',
      actionSteps: ['Опишите повторяющиеся операции.', 'Выберите процесс с наибольшими потерями.', 'Запустите автоматизацию и сравните результат.'],
      resources: ['Карта бизнес-процессов', 'Реестр ручных операций'],
    });
  }

  return recommendations;
}

export const AI_RECOMMENDATIONS_KEY = 'strateg-ai-recommendations';
export const AI_PLAN_KEY = 'strateg-ai-plan';