import { normalizeValue } from './normalizeValue';

export function getHostname(url: string | null): string | null {
  if (!url) return null;

  try {
    return normalizeValue(new URL(url).hostname);
  } catch {
    return null;
  }
}
