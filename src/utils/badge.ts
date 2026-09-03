// STAGE10: Favicon badge helpers
const DEFAULT_FAVICON = '/icon-192.png';
const BADGE_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAIAAeIhvAAAAAElFTkSuQmCC';
let originalFavicon: string | null = null;

function getOriginalFavicon(): string {
  if (originalFavicon) {
    return originalFavicon;
  }

  if (typeof document === 'undefined') {
    return DEFAULT_FAVICON;
  }

  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  originalFavicon = link?.getAttribute('href') || DEFAULT_FAVICON;
  return originalFavicon;
}

export function updateBadge(count: number): void {
  if (typeof document === 'undefined') {
    return;
  }

  const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  const iconUrl = getOriginalFavicon();

  if (!favicon) {
    return;
  }

  if (count <= 0) {
    favicon.href = iconUrl;
    return;
  }

  favicon.href = BADGE_PLACEHOLDER;
}
