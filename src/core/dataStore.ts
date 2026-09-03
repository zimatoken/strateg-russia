// src/core/dataStore.ts
import { getDialogCore } from './dialogCore';

export interface Deal {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Barter {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Plan { id: string; title: string; createdAt: number; updatedAt?: number }
export interface Contact { id: string; name: string; createdAt: number; updatedAt?: number }

export interface AppData {
  deals: Deal[];
  barters: Barter[];
  plans: Plan[];
  contacts: Contact[];
  version?: number;
}

export interface ChangeLog {
  id: string;
  type: 'deal' | 'barter' | 'plan' | 'contact';
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  payload?: any;
}

const STORAGE_KEY = 'strateg_datastore_v1';

class DataStoreClass {
  private data: AppData;
  private listeners: ((data: AppData) => void)[] = [];
  private changes: ChangeLog[] = [];
  private syncStatus: 'idle' | 'syncing' | 'offline' | 'conflict' = 'idle';

  constructor() {
    this.data = this.load();
  }

  private load(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AppData;
    } catch (e) {
      console.warn('Failed to parse DataStore from localStorage', e);
    }
    return { deals: [], barters: [], plans: [], contacts: [], version: Date.now() };
  }

  private save() {
    this.data.version = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.getAllData()));
  }

  subscribe(cb: (data: AppData) => void) {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(x => x !== cb); };
  }

  getAllData(): AppData {
    return JSON.parse(JSON.stringify(this.data));
  }

  importData(external: AppData) {
    // Simple merge strategy: accept newer items by createdAt/updatedAt
    const mergeList = <T extends { id: string; updatedAt?: number; createdAt: number }>(local: T[], remote: T[]) => {
      const map = new Map<string, T>();
      local.forEach(i => map.set(i.id, i));
      remote.forEach(r => {
        const existing = map.get(r.id);
        if (!existing) map.set(r.id, r);
        else {
          const localTs = existing.updatedAt || existing.createdAt;
          const remoteTs = r.updatedAt || r.createdAt;
          if (remoteTs > localTs) map.set(r.id, r);
          else if (remoteTs === localTs && JSON.stringify(existing) !== JSON.stringify(r)) {
            // conflict - keep both with modified id
            const newId = r.id + '_conflict_' + Date.now();
            // @ts-ignore
            r.id = newId;
            map.set(r.id, r);
            this.syncStatus = 'conflict';
          }
        }
      });
      return Array.from(map.values());
    };

    this.data.deals = mergeList(this.data.deals, external.deals || []);
    this.data.barters = mergeList(this.data.barters, external.barters || []);
    this.data.plans = mergeList(this.data.plans, external.plans || []);
    this.data.contacts = mergeList(this.data.contacts, external.contacts || []);
    this.save();
  }

  getChanges(since: number): ChangeLog[] {
    return this.changes.filter(c => c.timestamp > since);
  }

  // CRUD deals
  getDeals(): Deal[] { return this.data.deals; }
  getDeal(id: string) { return this.data.deals.find(d => d.id === id); }
  createDeal(payload: Omit<Deal, 'id' | 'createdAt'>): Deal {
    const newDeal: Deal = { ...payload as any, id: crypto.randomUUID(), createdAt: Date.now() };
    this.data.deals.push(newDeal);
    this.recordChange({ id: newDeal.id, type: 'deal', action: 'create', timestamp: Date.now(), payload: newDeal });
    this.save();
    this.sync();
    return newDeal;
  }
  updateDeal(id: string, updates: Partial<Deal>) {
    const d = this.getDeal(id);
    if (!d) throw new Error('Not found');
    Object.assign(d, updates, { updatedAt: Date.now() });
    this.recordChange({ id, type: 'deal', action: 'update', timestamp: Date.now(), payload: d });
    this.save();
    this.sync();
    return d;
  }
  deleteDeal(id: string) {
    this.data.deals = this.data.deals.filter(d => d.id !== id);
    this.recordChange({ id, type: 'deal', action: 'delete', timestamp: Date.now() });
    this.save();
    this.sync();
  }

  // CRUD barters
  getBarters(): Barter[] { return this.data.barters; }
  getBarter(id: string) { return this.data.barters.find(b => b.id === id); }
  createBarter(payload: Omit<Barter, 'id' | 'createdAt'>): Barter {
    const item: Barter = { ...payload as any, id: crypto.randomUUID(), createdAt: Date.now() };
    this.data.barters.push(item);
    this.recordChange({ id: item.id, type: 'barter', action: 'create', timestamp: Date.now(), payload: item });
    this.save();
    this.sync();
    return item;
  }
  updateBarter(id: string, updates: Partial<Barter>) {
    const b = this.getBarter(id);
    if (!b) throw new Error('Not found');
    Object.assign(b, updates, { updatedAt: Date.now() });
    this.recordChange({ id, type: 'barter', action: 'update', timestamp: Date.now(), payload: b });
    this.save();
    this.sync();
    return b;
  }
  deleteBarter(id: string) {
    this.data.barters = this.data.barters.filter(b => b.id !== id);
    this.recordChange({ id, type: 'barter', action: 'delete', timestamp: Date.now() });
    this.save();
    this.sync();
  }

  // Plans (minimal)
  getPlans(): Plan[] { return this.data.plans; }
  getPlan(id: string) { return this.data.plans.find(p => p.id === id); }
  createPlan(payload: Omit<Plan, 'id' | 'createdAt'>): Plan {
    const item: Plan = { ...payload as any, id: crypto.randomUUID(), createdAt: Date.now() };
    this.data.plans.push(item);
    this.recordChange({ id: item.id, type: 'plan', action: 'create', timestamp: Date.now(), payload: item });
    this.save();
    this.sync();
    return item;
  }
  updatePlan(id: string, updates: Partial<Plan>) { const p = this.getPlan(id); if (!p) throw new Error('Not found'); Object.assign(p, updates); p['updatedAt'] = Date.now(); this.recordChange({ id, type: 'plan', action: 'update', timestamp: Date.now(), payload: p }); this.save(); this.sync(); return p; }
  deletePlan(id: string) { this.data.plans = this.data.plans.filter(p => p.id !== id); this.recordChange({ id, type: 'plan', action: 'delete', timestamp: Date.now() }); this.save(); this.sync(); }

  // Contacts
  getContacts(): Contact[] { return this.data.contacts; }
  getContact(id: string) { return this.data.contacts.find(c => c.id === id); }
  createContact(payload: Omit<Contact, 'id' | 'createdAt'>): Contact { const item: Contact = { ...payload as any, id: crypto.randomUUID(), createdAt: Date.now() }; this.data.contacts.push(item); this.recordChange({ id: item.id, type: 'contact', action: 'create', timestamp: Date.now(), payload: item }); this.save(); this.sync(); return item; }
  updateContact(id: string, updates: Partial<Contact>) { const c = this.getContact(id); if (!c) throw new Error('Not found'); Object.assign(c, updates); c['updatedAt'] = Date.now(); this.recordChange({ id, type: 'contact', action: 'update', timestamp: Date.now(), payload: c }); this.save(); this.sync(); return c; }
  deleteContact(id: string) { this.data.contacts = this.data.contacts.filter(c => c.id !== id); this.recordChange({ id, type: 'contact', action: 'delete', timestamp: Date.now() }); this.save(); this.sync(); }

  private recordChange(change: ChangeLog) {
    this.changes.push(change);
    // trim
    if (this.changes.length > 1000) this.changes = this.changes.slice(-1000);
  }

  getSyncStatus() { return this.syncStatus; }

  async sync() {
    try {
      this.syncStatus = 'syncing';
      const dialog = getDialogCore();
      if (dialog && typeof dialog.sendRawData === 'function') {
        dialog.sendRawData({ type: 'DATA_SYNC', data: this.getAllData(), timestamp: Date.now() });
        this.syncStatus = 'idle';
      } else {
        this.syncStatus = 'offline';
      }
    } catch (err) {
      console.error('DataStore sync failed', err);
      this.syncStatus = 'offline';
    }
  }
}

export const dataStore = new DataStoreClass();

export default dataStore;
