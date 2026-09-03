// Модуль диагностики курса бизнеса
// Квизы для оценки состояния бизнеса

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  category: 'finance' | 'operations' | 'marketing' | 'team' | 'strategy';
}

export interface QuizOption {
  id: string;
  text: string;
  score: number;
}

export interface QuizResult {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  recommendations: string[];
}

export const COURSE_QUIZZES: Record<string, QuizQuestion[]> = {
  'finance': [
    {
      id: 'f1',
      question: 'Какова ваша текущая маржинальность?',
      category: 'finance',
      options: [
        { id: 'f1-1', text: 'Менее 10%', score: 1 },
        { id: 'f1-2', text: '10-20%', score: 2 },
        { id: 'f1-3', text: '20-30%', score: 3 },
        { id: 'f1-4', text: 'Более 30%', score: 4 }
      ]
    },
    {
      id: 'f2',
      question: 'Есть ли у вас финансовый запас на 3 месяца?',
      category: 'finance',
      options: [
        { id: 'f2-1', text: 'Нет', score: 1 },
        { id: 'f2-2', text: 'На 1 месяц', score: 2 },
        { id: 'f2-3', text: 'На 2-3 месяца', score: 3 },
        { id: 'f2-4', text: 'Более 3 месяцев', score: 4 }
      ]
    }
  ],
  'operations': [
    {
      id: 'o1',
      question: 'Насколько оптимизированы ваши бизнес-процессы?',
      category: 'operations',
      options: [
        { id: 'o1-1', text: 'Полный хаос', score: 1 },
        { id: 'o1-2', text: 'Частично оптимизированы', score: 2 },
        { id: 'o1-3', text: 'Хорошо оптимизированы', score: 3 },
        { id: 'o1-4', text: 'Полностью автоматизированы', score: 4 }
      ]
    }
  ],
  'marketing': [
    {
      id: 'm1',
      question: 'Какова эффективность ваших маркетинговых каналов?',
      category: 'marketing',
      options: [
        { id: 'm1-1', text: 'Не измеряем', score: 1 },
        { id: 'm1-2', text: 'Низкая', score: 2 },
        { id: 'm1-3', text: 'Средняя', score: 3 },
        { id: 'm1-4', text: 'Высокая', score: 4 }
      ]
    }
  ],
  'team': [
    {
      id: 't1',
      question: 'Насколько мотивирована ваша команда?',
      category: 'team',
      options: [
        { id: 't1-1', text: 'Низкая мотивация', score: 1 },
        { id: 't1-2', text: 'Средняя мотивация', score: 2 },
        { id: 't1-3', text: 'Высокая мотивация', score: 3 },
        { id: 't1-4', text: 'Очень высокая мотивация', score: 4 }
      ]
    }
  ],
  'strategy': [
    {
      id: 's1',
      question: 'Есть ли у вас чёткая стратегия развития на 1 год?',
      category: 'strategy',
      options: [
        { id: 's1-1', text: 'Нет стратегии', score: 1 },
        { id: 's1-2', text: 'Есть общие идеи', score: 2 },
        { id: 's1-3', text: 'Есть план', score: 3 },
        { id: 's1-4', text: 'Есть детальная стратегия', score: 4 }
      ]
    }
  ]
};

export function calculateQuizResult(quizId: string, answers: Record<string, string>): QuizResult {
  const questions = COURSE_QUIZZES[quizId];
  if (!questions) {
    throw new Error(`Quiz ${quizId} not found`);
  }

  let totalScore = 0;
  let maxScore = 0;

  questions.forEach(q => {
    const answerId = answers[q.id];
    const option = q.options.find(o => o.id === answerId);
    if (option) {
      totalScore += option.score;
    }
    maxScore += 4; // Максимальный балл за вопрос
  });

  const percentage = (totalScore / maxScore) * 100;

  const recommendations = generateRecommendations(percentage);

  return {
    category: quizId,
    score: totalScore,
    maxScore,
    percentage,
    recommendations
  };
}

function generateRecommendations(percentage: number): string[] {
  const recommendations: string[] = [];

  if (percentage < 50) {
    recommendations.push('Требуется срочная оптимизация в этой области');
    recommendations.push('Рекомендуется привлечь консультанта');
  } else if (percentage < 75) {
    recommendations.push('Есть потенциал для улучшения');
    recommendations.push('Рекомендуется внедрить лучшие практики');
  } else {
    recommendations.push('Хороший результат, продолжайте в том же духе');
    recommendations.push('Рассмотрите возможности для масштабирования');
  }

  return recommendations;
}
