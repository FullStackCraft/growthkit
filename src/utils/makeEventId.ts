export function makeEventId(): string {
  const cryptoRef = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }

  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
