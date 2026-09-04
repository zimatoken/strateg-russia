export type AuditCategory = 'finance' | 'clients' | 'team' | 'processes';

export interface AuditItem {
  id: string;
  category: AuditCategory;
  question: string;
  weight: number;
}

interface AuditState {
  weekId: string;
  generatedAt: number;
  itemIds: string[];
  completedIds: string[];
}

export interface AuditHistoryEntry {
  weekId: string;
  completedAt: number;
  score: number;
}

const AUDIT_STATE_KEY = 'strateg-weekly-audit';
const AUDIT_HISTORY_KEY = 'strateg-audit-history';
const AUDIT_UPDATED_EVENT = 'strateg-audit-updated';
const AUDIT_REMINDER_KEY = 'strateg-audit-reminder-week';

export const AUDIT_ITEMS: AuditItem[] = [
  { id: 'finance-cashflow', category: 'finance', question: 'Проверили ли вы движение денежных средств за неделю?', weight: 2 },
  { id: 'finance-revenue', category: 'finance', question: 'Сверили ли вы фактическую выручку с планом?', weight: 2 },
  { id: 'finance-expenses', category: 'finance', question: 'Есть ли расходы, которые требуют пересмотра или сокращения?', weight: 2 },
  { id: 'finance-reserve', category: 'finance', question: 'Достаточен ли финансовый резерв для обязательных платежей?', weight: 3 },
  { id: 'finance-debts', category: 'finance', question: 'Контролируете ли вы дебиторскую и кредиторскую задолженность?', weight: 2 },
  { id: 'finance-forecast', category: 'finance', question: 'Обновили ли вы прогноз доходов и расходов на месяц?', weight: 1 },
  { id: 'clients-feedback', category: 'clients', question: 'Собрали ли вы обратную связь хотя бы от одного клиента?', weight: 2 },
  { id: 'clients-retention', category: 'clients', question: 'Проверили ли вы риск ухода ключевых клиентов?', weight: 3 },
  { id: 'clients-satisfaction', category: 'clients', question: 'Есть ли у вас актуальная оценка удовлетворённости клиентов?', weight: 2 },
  { id: 'clients-requests', category: 'clients', question: 'Разобрали ли вы новые запросы и возражения клиентов?', weight: 1 },
  { id: 'clients-value', category: 'clients', question: 'Понимают ли клиенты ценность вашего предложения?', weight: 2 },
  { id: 'clients-support', category: 'clients', question: 'Соблюдаются ли обещанные сроки ответа и поддержки?', weight: 2 },
  { id: 'team-priorities', category: 'team', question: 'Понимает ли команда приоритеты на следующую неделю?', weight: 2 },
  { id: 'team-load', category: 'team', question: 'Равномерно ли распределена нагрузка между сотрудниками?', weight: 2 },
  { id: 'team-results', category: 'team', question: 'Обсудили ли вы результаты и препятствия команды?', weight: 2 },
  { id: 'team-motivation', category: 'team', question: 'Есть ли у сотрудников понятная мотивация и признание результата?', weight: 1 },
  { id: 'team-capacity', category: 'team', question: 'Хватает ли команде компетенций для текущих задач?', weight: 2 },
  { id: 'team-feedback', category: 'team', question: 'Дали ли вы сотрудникам полезную обратную связь?', weight: 1 },
  { id: 'processes-bottleneck', category: 'processes', question: 'Нашли ли вы главное узкое место в операционной работе?', weight: 3 },
  { id: 'processes-repetition', category: 'processes', question: 'Есть ли повторяющиеся задачи, которые можно автоматизировать?', weight: 2 },
  { id: 'processes-quality', category: 'processes', question: 'Проверили ли вы качество ключевого процесса?', weight: 2 },
  { id: 'processes-deadlines', category: 'processes', question: 'Соблюдаются ли сроки по основным задачам и поставкам?', weight: 2 },
  { id: 'processes-documentation', category: 'processes', question: 'Актуальны ли инструкции и регламенты команды?', weight: 1 },
  { id: 'processes-metrics', category: 'processes', question: 'Измеряете ли вы эффективность главных процессов?', weight: 2 },
];

function currentWeekId(): string {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function emitUpdate(): void {
  window.dispatchEvent(new Event(AUDIT_UPDATED_EVENT));
}

function saveState(state: AuditState): void {
  localStorage.setItem(AUDIT_STATE_KEY, JSON.stringify(state));
  emitUpdate();
}

function readState(): AuditState | null {
  try {
    const raw = localStorage.getItem(AUDIT_STATE_KEY);
    return raw ? JSON.parse(raw) as AuditState : null;
  } catch {
    return null;
  }
}

function createState(): AuditState {
  const pool = [...AUDIT_ITEMS];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return { weekId: currentWeekId(), generatedAt: Date.now(), itemIds: pool.slice(0, 7).map((item) => item.id), completedIds: [] };
}

function ensureState(): AuditState {
  const state = readState();
  if (state && state.weekId === currentWeekId() && Date.now() - state.generatedAt <= 7 * 24 * 60 * 60 * 1000) return state;
  const next = createState();
  saveState(next);
  return next;
}

export function getWeeklyAudit(): AuditItem[] {
  const state = ensureState();
  return state.itemIds.map((id) => AUDIT_ITEMS.find((item) => item.id === id)).filter((item): item is AuditItem => Boolean(item));
}

export function getAuditProgress(): number {
  const state = ensureState();
  return Math.round((state.completedIds.filter((id) => state.itemIds.includes(id)).length / state.itemIds.length) * 100);
}

export function getCompletedAuditItemIds(): string[] {
  return ensureState().completedIds;
}

export function toggleAuditItem(id: string): void {
  const state = ensureState();
  if (!state.itemIds.includes(id)) return;
  state.completedIds = state.completedIds.includes(id) ? state.completedIds.filter((itemId) => itemId !== id) : [...state.completedIds, id];
  saveState(state);
  if (state.completedIds.length === state.itemIds.length) {
    const history = getAuditHistory();
    if (!history.some((entry) => entry.weekId === state.weekId)) {
      localStorage.setItem(AUDIT_HISTORY_KEY, JSON.stringify([...history, { weekId: state.weekId, completedAt: Date.now(), score: 100 }]));
    }
  }
}

export function refreshWeeklyAudit(): AuditItem[] {
  const next = createState();
  saveState(next);
  return getWeeklyAudit();
}

export function getAuditHistory(): AuditHistoryEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAuditUpdatedEventName(): string {
  return AUDIT_UPDATED_EVENT;
}

export function isAuditDue(): boolean {
  const state = readState();
  return !state || state.weekId !== currentWeekId() || Date.now() - state.generatedAt > 7 * 24 * 60 * 60 * 1000;
}

export function shouldShowAuditReminder(): boolean {
  return isAuditDue() && localStorage.getItem(AUDIT_REMINDER_KEY) !== currentWeekId();
}

export function markAuditReminderShown(): void {
  localStorage.setItem(AUDIT_REMINDER_KEY, currentWeekId());
}