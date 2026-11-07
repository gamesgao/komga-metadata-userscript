import { it, expect, vi } from 'vitest';
import { storage } from '../src/transport';
it('settings and scoped undo use GM storage, not page storage', () => {
  const values = new Map<string, unknown>();
  vi.stubGlobal('GM_getValue', (key: string, fallback: unknown) => values.has(key) ? values.get(key) : fallback);
  vi.stubGlobal('GM_setValue', (key: string, value: unknown) => values.set(key, value));
  const forbidden = vi.fn(() => { throw new Error('page storage is forbidden'); });
  vi.stubGlobal('localStorage', { getItem: forbidden, setItem: forbidden });
  expect(storage.get('settings-v1', {})).toEqual({});
  storage.set('settings-v1', { sources: ['bangumi'], credentials: { malClientId: 'fixture-local' } });
  expect(storage.get('settings-v1', {})).toEqual({ sources: ['bangumi'], credentials: { malClientId: 'fixture-local' } });
  storage.set('undo-v1', { seriesId: 's', result: { snapshots: [{ target: { kind: 'series', id: 's' }, before: { tags: ['old'] }, after: { tags: ['new'] } }] } });
  expect(storage.get('undo-v1', undefined)).toBeDefined();
  expect(forbidden).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
