// src/core/identity.ts
// ID-система устройства и пользователя

export class IdentityManager {
  private deviceId: string;
  private userName: string | null = null;

  constructor() {
    this.deviceId = this.getDeviceId();
    this.userName = localStorage.getItem('strateg_user_name');
  }

  getDeviceId(): string {
    let id = localStorage.getItem('strateg_device_id');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('strateg_device_id', id);
    }
    return id;
  }

  getUserName(): string | null {
    return this.userName;
  }

  setUserName(name: string): void {
    this.userName = name;
    localStorage.setItem('strateg_user_name', name);
  }

  getFullId(): string {
    return this.userName ? `${this.userName} (${this.deviceId})` : this.deviceId;
  }

  // Возвращает уникальный идентификатор пользователя (сохраняется в localStorage)
  getUserId(): string {
    const key = 'strateg_user_id';
    let id = localStorage.getItem(key);
    if (!id) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = `STRATEG-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      } else {
        id = `STRATEG-${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
      }
      localStorage.setItem(key, id);
    }
    return id;
  }

  getUserProfile(): { id: string; name: string | null; avatar?: string | null } {
    const id = this.getUserId();
    const name = this.userName || localStorage.getItem('strateg_user_name');
    const avatar = localStorage.getItem('strateg_user_avatar');
    return { id, name, avatar };
  }



  // Рейтинг и сделки (для будущих модулей)
  getRating(): number {
    return parseInt(localStorage.getItem('strateg_rating') || '0', 10);
  }

  addRating(points: number): void {
    const current = this.getRating();
    localStorage.setItem('strateg_rating', String(current + points));
  }
}

// Утилита для быстрого доступа без инстанса
export function getUserId(): string {
  try {
    const key = 'strateg_user_id';
    let id = localStorage.getItem(key);
    if (!id) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = `STRATEG-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
      } else {
        id = `STRATEG-${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
      }
      localStorage.setItem(key, id);
    }
    return id;
  } catch (err) {
    return `STRATEG-${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
  }
}

export function getUserProfile(): { id: string; name: string | null; avatar?: string | null } {
  const id = getUserId();
  const name = localStorage.getItem('strateg_user_name');
  const avatar = localStorage.getItem('strateg_user_avatar');
  return { id, name, avatar };
}
