// Модуль аналитики и статистики

export interface ModuleStats {
  moduleId: string;
  moduleName: string;
  icon: string;
  total: number;
  completed: number;
  progress: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
}

export interface OverallProgress {
  percentage: number;
  totalTasks: number;
  completedTasks: number;
}

export function getModuleStats(): ModuleStats[] {
  const modules = [
    { id: 'course', name: 'Курс', icon: '📊' },
    { id: 'plan', name: 'План', icon: '📈' },
    { id: 'barter', name: 'Бартер', icon: '🔄' },
    { id: 'deals', name: 'Сделки', icon: '💼' }
  ];

  return modules.map(mod => {
    let total = 10;
    let completed = 0;

    try {
      if (mod.id === 'course') {
        const courseData = localStorage.getItem('strateg-course-progress');
        if (courseData) {
          const progress = JSON.parse(courseData);
          completed = Object.keys(progress).length;
          total = 10;
        }
      } else if (mod.id === 'plan') {
        const planData = localStorage.getItem('strateg-plan-data');
        if (planData) {
          const plan = JSON.parse(planData);
          completed = (plan.revenue?.length || 0) + (plan.expenses?.length || 0);
          total = 20;
        }
      } else if (mod.id === 'barter') {
        const barterData = localStorage.getItem('strateg-barter-offers');
        if (barterData) {
          const offers = JSON.parse(barterData);
          completed = Array.isArray(offers) ? offers.length : 0;
          total = 10;
        }
      } else if (mod.id === 'deals') {
        const dealsData = localStorage.getItem('strateg-deals-data');
        if (dealsData) {
          const deals = JSON.parse(dealsData);
          completed = Array.isArray(deals) ? deals.length : 0;
          total = 15;
        }
      }
    } catch (error) {
      console.error(`Error loading ${mod.id} data:`, error);
    }

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { moduleId: mod.id, moduleName: mod.name, icon: mod.icon, total, completed, progress };
  });
}

export function getOverallProgress(): OverallProgress {
  const moduleStats = getModuleStats();
  const totalTasks = moduleStats.reduce((sum, mod) => sum + mod.total, 0);
  const completedTasks = moduleStats.reduce((sum, mod) => sum + mod.completed, 0);
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    percentage,
    totalTasks,
    completedTasks
  };
}

export function getActivityTimeline(): ActivityItem[] {
  const activities: ActivityItem[] = [];

  try {
    // Course activities
    const courseData = localStorage.getItem('strateg-course-progress');
    if (courseData) {
      const progress = JSON.parse(courseData);
      Object.entries(progress).forEach(([key, _value]) => {
        activities.push({
          id: `course-${key}`,
          type: 'course',
          description: 'Пройден квиз',
          timestamp: new Date()
        });
      });
    }

    // Plan activities
    const planData = localStorage.getItem('strateg-plan-data');
    if (planData) {
      activities.push({
        id: 'plan-created',
        type: 'plan',
        description: 'Создан бизнес-план',
        timestamp: new Date()
      });
    }

    // Barter activities
    const barterData = localStorage.getItem('strateg-barter-offers');
    if (barterData) {
      const offers = JSON.parse(barterData);
      if (Array.isArray(offers)) {
        offers.forEach((_offer, index) => {
          activities.push({
            id: `barter-${index}`,
            type: 'barter',
            description: 'Создано бартерное предложение',
            timestamp: new Date()
          });
        });
      }
    }

    // Deals activities
    const dealsData = localStorage.getItem('strateg-deals-data');
    if (dealsData) {
      const deals = JSON.parse(dealsData);
      if (Array.isArray(deals)) {
        deals.forEach((_deal, index) => {
          activities.push({
            id: `deal-${index}`,
            type: 'deal',
            description: 'Создана сделка',
            timestamp: new Date()
          });
        });
      }
    }
  } catch (error) {
    console.error('Error loading activity data:', error);
  }

  // Sort by timestamp (newest first) and limit to 10
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);
}

export function getKeyMetrics() {
  const moduleStats = getModuleStats();
  
  const courseModule = moduleStats.find(m => m.moduleId === 'course');
  const planModule = moduleStats.find(m => m.moduleId === 'plan');
  const barterModule = moduleStats.find(m => m.moduleId === 'barter');
  const dealsModule = moduleStats.find(m => m.moduleId === 'deals');
  
  return {
    totalQuizzes: courseModule?.completed || 0,
    totalPlans: planModule?.completed ?? 0 > 0 ? 1 : 0,
    totalBarterOffers: barterModule?.completed || 0,
    totalDeals: dealsModule?.completed || 0,
    overallProgress: getOverallProgress().percentage
  };
}
