import { LIB_VERSION } from '../constants/constants';

export function storageKey(productName: string): string {
  return `growthkit:${productName}:landing:${LIB_VERSION}`;
}

export function alreadyTracked(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function markTracked(key: string): void {
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    // no-op
  }
}
