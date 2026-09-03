import { useState } from 'react';
import { COURSE_QUIZZES, calculateQuizResult } from '../modules/course';
import { useLanguage } from '../context/LanguageContext';

export default function CoursePage() {
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const questions = Object.values(COURSE_QUIZZES).flat();
  const result = calculateQuizResult('strategy', answers);

  return (
    <section className="strateg-page">
      <div className="strateg-page-heading">
        <div>
          <span className="strateg-eyebrow">{t('diagnostics_category')}</span>
          <h1>{t('course_title')}</h1>
          <p>{t('course_description')}</p>
        </div>
        <span className="strateg-page-count">{questions.length} {t('course_questions_count')}</span>
      </div>
      <div className="strateg-question-list">
        {questions.map((question) => (
          <article className="strateg-question" key={question.id}>
            <h2>{question.question}</h2>
            <div className="strateg-options">
              {question.options.map((option) => (
                <label className={`strateg-option ${answers[question.id] === option.id ? 'selected' : ''}`} key={option.id}>
                  <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers({ ...answers, [question.id]: option.id })} />
                  <span>{option.text}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
      <button className="strateg-primary-btn" onClick={() => setShowResult(true)}>{t('course_get_diagnostic')}</button>
      {showResult && <div className="strateg-result"><strong>{Math.round(result.percentage)}%</strong><span>{t('course_strategic_readiness')}</span></div>}
    </section>
  );
}
