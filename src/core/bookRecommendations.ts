export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  cover?: string;
  url?: string;
  tags: string[];
}

const openLibraryCover = (isbn: string) => `https://covers.openlibrary.org/isbn/${isbn}-M.jpg`;
const googleBooks = (title: string) => `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(title)}`;

export const BOOKS: Book[] = [
  { id: 'good-to-great', title: 'От хорошего к великому', author: 'Джим Коллинз', description: 'Как компании достигают выдающихся результатов и удерживают их.', cover: openLibraryCover('9780066620992'), url: googleBooks('От хорошего к великому Джим Коллинз'), tags: ['course', 'strategy'] },
  { id: 'blue-ocean', title: 'Стратегия голубого океана', author: 'В. Чан Ким, Рене Моборн', description: 'Создание нового рыночного пространства вместо конкуренции в существующем.', cover: openLibraryCover('9781591396192'), url: googleBooks('Стратегия голубого океана'), tags: ['course', 'strategy', 'innovation'] },
  { id: 'innovators-dilemma', title: 'Дилемма инноватора', author: 'Клейтон Кристенсен', description: 'Почему сильные компании теряют лидерство и как управлять прорывными инновациями.', cover: openLibraryCover('9780062060242'), url: googleBooks('Дилемма инноватора Клейтон Кристенсен'), tags: ['course', 'innovation'] },
  { id: 'lean-startup', title: 'Бережливый стартап', author: 'Эрик Рис', description: 'Практический подход к запуску продуктов через быстрые эксперименты и обучение.', cover: openLibraryCover('9780307887894'), url: googleBooks('Бережливый стартап Эрик Рис'), tags: ['course', 'innovation', 'strategy'] },
  { id: 'seven-habits', title: '7 навыков высокоэффективных людей', author: 'Стивен Кови', description: 'Система личной эффективности, лидерства и осознанного принятия решений.', cover: openLibraryCover('9781982137274'), url: googleBooks('7 навыков высокоэффективных людей'), tags: ['course', 'mindset'] },
  { id: 'zero-to-one', title: 'От нуля к единице', author: 'Питер Тиль, Блейк Мастерс', description: 'О построении уникального бизнеса и создании новых рынков.', cover: openLibraryCover('9780804139298'), url: googleBooks('От нуля к единице Питер Тиль'), tags: ['course', 'innovation'] },
  { id: 'e-myth', title: 'Миф о предпринимательстве', author: 'Майкл Гербер', description: 'Как выстроить бизнес-систему, которая работает не только на усилиях владельца.', cover: openLibraryCover('9780887307287'), url: googleBooks('Миф о предпринимательстве Майкл Гербер'), tags: ['course', 'plan'] },
  { id: 'strategic-safari', title: 'Стратегическое сафари', author: 'Генри Минцберг и др.', description: 'Обзор ключевых школ стратегической мысли и способов их применения.', cover: openLibraryCover('9780743270571'), url: googleBooks('Стратегическое сафари Минцберг'), tags: ['course', 'strategy'] },
  { id: 'high-output-management', title: 'Высокоэффективный менеджмент', author: 'Эндрю Гроув', description: 'Инструменты управления командами, производительностью и результатом.', cover: openLibraryCover('9780679762881'), url: googleBooks('Высокоэффективный менеджмент Эндрю Гроув'), tags: ['plan', 'management'] },
  { id: 'scaling-up', title: 'Масштабирование бизнеса', author: 'Верн Харниш', description: 'Практическая система роста компании, команды и финансовой модели.', cover: openLibraryCover('9780986019524'), url: googleBooks('Scaling Up Verne Harnish'), tags: ['plan', 'management', 'finance'] },
  { id: 'financial-intelligence', title: 'Финансовая грамотность для менеджеров', author: 'Карен Берман, Джо Найт', description: 'Как читать финансовые показатели и принимать решения на языке цифр.', cover: openLibraryCover('9781422119150'), url: googleBooks('Financial Intelligence Berman Knight'), tags: ['plan', 'finance'] },
  { id: 'measure-what-matters', title: 'Измеряйте самое важное', author: 'Джон Дорр', description: 'Как система OKR помогает связать цели, фокус и измеримый результат.', cover: openLibraryCover('9780525536222'), url: googleBooks('Измеряйте самое важное Джон Дорр'), tags: ['plan', 'management'] },
  { id: 'essentialism', title: 'Эссенциализм', author: 'Грег МакКеон', description: 'Фокус на действительно важном и отказ от перегрузки лишними задачами.', cover: openLibraryCover('9780804137386'), url: googleBooks('Эссенциализм Грег МакКеон'), tags: ['plan', 'mindset'] },
  { id: 'personal-mba', title: 'Сам себе MBA', author: 'Джош Кауфман', description: 'Концентрированный обзор базовых принципов работы любого бизнеса.', cover: openLibraryCover('9780670919536'), url: googleBooks('Сам себе MBA Джош Кауфман'), tags: ['plan', 'finance', 'management'] },
  { id: 'never-split-difference', title: 'Никогда не разделяйте разницу', author: 'Крис Восс', description: 'Тактики переговоров, основанные на психологии и опыте кризисных переговоров.', cover: openLibraryCover('9780062407801'), url: googleBooks('Никогда не разделяйте разницу Крис Восс'), tags: ['barter', 'negotiation', 'psychology'] },
  { id: 'getting-to-yes', title: 'Переговоры без поражения', author: 'Роджер Фишер, Уильям Юри', description: 'Принципиальный метод переговоров с фокусом на интересах сторон.', cover: openLibraryCover('9780143118756'), url: googleBooks('Переговоры без поражения Фишер Юри'), tags: ['barter', 'negotiation'] },
  { id: 'how-to-win-friends', title: 'Как завоёвывать друзей и оказывать влияние', author: 'Дейл Карнеги', description: 'Классика эффективной коммуникации, доверия и влияния.', cover: openLibraryCover('9780671027032'), url: googleBooks('Как завоевывать друзей Карнеги'), tags: ['barter', 'communication', 'psychology'] },
  { id: 'influence', title: 'Психология влияния', author: 'Роберт Чалдини', description: 'Научные принципы убеждения и распознавания влияния в деловом общении.', cover: openLibraryCover('9780061241895'), url: googleBooks('Психология влияния Роберт Чалдини'), tags: ['barter', 'psychology', 'communication'] },
  { id: 'emotional-intelligence', title: 'Эмоциональный интеллект', author: 'Дэниел Гоулман', description: 'Как эмоциональная осознанность влияет на отношения, лидерство и результат.', cover: openLibraryCover('9780553383713'), url: googleBooks('Эмоциональный интеллект Дэниел Гоулман'), tags: ['barter', 'psychology'] },
  { id: 'spin-selling', title: 'SPIN-продажи', author: 'Нил Рэкхэм', description: 'Методика сложных продаж через правильные вопросы и выявление потребностей.', cover: openLibraryCover('9780070511132'), url: googleBooks('SPIN-продажи Нил Рэкхэм'), tags: ['deals', 'sales'] },
  { id: 'new-sales-simplified', title: 'Продажи без проблем', author: 'Майк Вайнберг', description: 'Системный подход к поиску клиентов, ценностному предложению и продажам.', cover: openLibraryCover('9780814436439'), url: googleBooks('New Sales Simplified Mike Weinberg'), tags: ['deals', 'sales', 'marketing'] },
  { id: 'marketing-warfare', title: 'Маркетинговые войны', author: 'Эл Райс, Джек Траут', description: 'Стратегия позиционирования и конкурентной борьбы на рынке.', cover: openLibraryCover('9780071374964'), url: googleBooks('Маркетинговые войны Райс Траут'), tags: ['deals', 'marketing'] },
  { id: 'the-mom-test', title: 'Тест мамы', author: 'Роб Фицпатрик', description: 'Как разговаривать с клиентами, чтобы находить реальные проблемы и спрос.', cover: openLibraryCover('9781492180746'), url: googleBooks('The Mom Test Rob Fitzpatrick'), tags: ['deals', 'customer', 'sales'] },
  { id: 'customer-success', title: 'Успех клиента', author: 'Линкольн Мёрфи', description: 'Как выстраивать долгосрочную ценность и удерживать клиентов.', cover: openLibraryCover('9780996216605'), url: googleBooks('Customer Success Lincoln Murphy'), tags: ['deals', 'customer'] },
];

export function getBooksByModule(moduleId: string): Book[] {
  return BOOKS.filter((book) => book.tags.includes(moduleId)).slice(0, 4);
}