import pino from 'pino';

const logger = pino({ name: 'strateg-deeplink' });

export const STRATEG_ID_REGEX = /^(?:STRATEG|ZIMA)-[A-Z0-9]{9}$/;

export interface DeepLinkChat {
  action: 'chat';
  id: string;
}

export interface WebLinkParams {
  action?: string;
  id?: string;
}

export function normalizeStrategId(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (STRATEG_ID_REGEX.test(trimmed)) return trimmed;

  const withoutPrefix = trimmed.replace(/^(?:STRATEG|ZIMA)-/, '');
  if (/^[A-Z0-9]{9}$/.test(withoutPrefix)) {
    return `ZIMA-${withoutPrefix}`;
  }

  return trimmed;
}

export function isValidStrategId(id: string): boolean {
  return STRATEG_ID_REGEX.test(normalizeStrategId(id));
}

export const normalizeZimaId = normalizeStrategId;
export const isValidZimaId = isValidStrategId;

export function parseDeepLink(url: string): DeepLinkChat | null {
  try {
    const trimmed = url.trim();
    if (!trimmed.toLowerCase().startsWith('strateg://') && !trimmed.toLowerCase().startsWith('zima://')) {
      return null;
    }

    const parsed = new URL(trimmed);
    const action = parsed.hostname || parsed.pathname.replace(/^\//, '').split('/')[0];

    if (action !== 'chat') {
      logger.warn({ url: trimmed, action }, 'Unsupported deep link action');
      return null;
    }

    const id = parsed.searchParams.get('id');
    if (!id) {
      logger.warn({ url: trimmed }, 'Deep link missing id parameter');
      return null;
    }

    return { action: 'chat', id: normalizeStrategId(id) };
  } catch (error) {
    logger.error({ err: error, url }, 'Failed to parse deep link');
    return null;
  }
}

export function generateDeepLink(id: string): string {
  const normalized = normalizeStrategId(id);
  return `zima://chat?id=${encodeURIComponent(normalized)}`;
}

export function generateWebFallback(id: string): string {
  const normalized = normalizeStrategId(id);
  return `https://zima.app/?action=chat&id=${encodeURIComponent(normalized)}`;
}

export function generateLocalWebLink(id: string): string {
  const normalized = normalizeStrategId(id);
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/?action=chat&id=${encodeURIComponent(normalized)}`;
  }
  return generateWebFallback(normalized);
}

export function parseWebParams(search: string = typeof window !== 'undefined' ? window.location.search : ''): WebLinkParams {
  const params = new URLSearchParams(search);
  let action = params.get('action') ?? undefined;
  let id = params.get('id') ?? undefined;

  // PWA protocol handler: ?action=chat?id=STRATEG-XXX
  if (action && !id) {
    const nested = action.match(/^chat\?id=([^&]+)$/i) ?? action.match(/id=([^&]+)/i);
    if (nested) {
      action = 'chat';
      id = decodeURIComponent(nested[1]);
    }
  }

  const strategPayload = params.get('strateg');
  if (strategPayload) {
    const fromProtocol = parseDeepLink(`strateg://${strategPayload}`);
    if (fromProtocol) {
      return { action: fromProtocol.action, id: fromProtocol.id };
    }
  }

  return {
    action: action ?? undefined,
    id: id ? normalizeStrategId(id) : undefined,
  };
}

export function resolveIncomingDeepLink(): DeepLinkChat | null {
  if (typeof window === 'undefined') return null;

  const web = parseWebParams();
  if (web.action === 'chat' && web.id) {
    return { action: 'chat', id: web.id };
  }

  if (web.id && !web.action) {
    return { action: 'chat', id: web.id };
  }

  return null;
}

export function clearDeepLinkUrl(): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, window.location.pathname);
}
