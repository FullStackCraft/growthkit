import type { IUserEvent } from '../types/GrowthKit';
import type { JsonValue } from '../types/JsonValue';

/** Shared by browser and server ingestion. Returns an immutable-by-copy JSON value. */
export function validateUserEvent(input: IUserEvent): Required<IUserEvent> {
  if (!input || typeof input.name !== 'string' || !/^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(input.name)) {
    throw new Error('Event name must be 1–128 characters: letters, digits, _, ., :, or -.');
  }
  const properties = input.properties === undefined ? {} : input.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new Error('Event properties must be a JSON object.');
  }
  const ancestors = new Set<object>();
  function check(value: unknown, depth: number): void {
    if (depth > 10) throw new Error('Event properties exceed ten nesting levels.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || !value) throw new Error('Properties must contain only JSON values.');
    if (ancestors.has(value)) throw new Error('Properties must not contain circular references.');
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new Error('Properties must contain only plain JSON objects.');
    }
    if (Reflect.ownKeys(value).some(key => typeof key === 'symbol')) throw new Error('Symbol keys are not JSON.');
    ancestors.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) check(value[i], depth + 1);
    } else {
      for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor)) throw new Error('Property getters are not supported.');
        check(descriptor.value, depth + 1);
      }
    }
    ancestors.delete(value);
  }
  check(properties, 0);
  const serialized = JSON.stringify({ name: input.name, properties });
  assertEventSize(serialized);
  return JSON.parse(serialized) as { name: string; properties: Record<string, JsonValue> };
}

export function assertEventSize(serialized: string): void {
  // Count UTF-8 bytes without requiring TextEncoder in older browser/test environments.
  const bytes = encodeURIComponent(serialized).replace(/%[A-F\d]{2}/gi, 'x').length;
  if (bytes > 64 * 1024) throw new Error('Event exceeds 64 KiB.');
}
