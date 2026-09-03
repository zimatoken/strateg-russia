export default function PlanPage() {
  return (
    <section className="strateg-page">
      <div className="strateg-page-heading"><div><span className="strateg-eyebrow">Планирование</span><h1>Бизнес-план</h1><p>Соберите последовательный план действий для следующего этапа развития.</p></div></div>
      <div className="strateg-module-grid">
        <article className="strateg-module-panel"><span className="strateg-panel-number">01</span><h2>Цель периода</h2><p>Зафиксируйте измеримый результат на ближайшие 90 дней.</p><button className="strateg-secondary-btn">Определить цель</button></article>
        <article className="strateg-module-panel"><span className="strateg-panel-number">02</span><h2>Ресурсы</h2><p>Оцените команду, бюджет и инструменты, доступные для движения.</p><button className="strateg-secondary-btn">Добавить ресурс</button></article>
        <article className="strateg-module-panel"><span className="strateg-panel-number">03</span><h2>Шаги</h2><p>Разложите стратегию на действия с понятными сроками и ответственными.</p><button className="strateg-secondary-btn">Создать шаг</button></article>
      </div>
    </section>
  );
}
