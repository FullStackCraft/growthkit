export function asError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return new Error(String((err as { message?: unknown }).message ?? 'Unknown error'));
  }

  return new Error(typeof err === 'string' ? err : 'Unknown error');
}
