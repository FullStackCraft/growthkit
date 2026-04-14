export function normalizeValue(value: string | null): string | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}
