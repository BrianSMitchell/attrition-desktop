/// <reference types="jest" />

import {
  parseCatalogEntry,
  normalizeCatalogs,
  fromServerProfileSnapshot,
  parseAndNormalizeBootstrap,
  ProfileCacheEntrySchema
} from '../../packages/shared/src/validation';
import { DB_FIELDS } from '../../packages/server/src/constants/database-fields';

describe('Desktop cache validation & normalization', () => {
  test('parseCatalogEntry wraps raw arrays/objects and preserves preferred form', () => {
    const raw = [{ id: 1 }, { id: 2 }];
    const wrapped = parseCatalogEntry(raw, '1.2.3');
    expect(wrapped).toEqual({ data: raw, version: '1.2.3' });

    const preferred = { data: { foo: 'bar' }, version: '9.9.9', contentHash: 'abc' };
    const parsed = parseCatalogEntry(preferred, 'ignored');
    expect(parsed).toEqual(preferred);
  });

  test('normalizeCatalogs tolerates partial presence and wraps each catalog', () => {
    const catalogs = {
      buildings: [{ key: 'solar_plants' }],
      units: { fighters: { key: 'fighters' } }
    };
    const normalized = normalizeCatalogs(catalogs, '1.0.0');
    expect(normalized.buildings?.version).toBe('1.0.0');
    expect(Array.isArray(normalized.buildings?.data)).toBe(true);
    expect(normalized.units?.version).toBe('1.0.0');
    expect(normalized.technologies).toBeUndefined();
    expect(normalized.defenses).toBeUndefined();
  });

  test('fromServerProfileSnapshot converts server snapshot into profile cache entry', () => {
    const serverProfile = {
      user: { _id: 'user-123', username: 'alice', email: 'alice@example.com' },
      empire: { _id: 'empire-1' },
      profile: { economyPerHour: 10, fleetScore: 0, technologyScore: 0, level: 1 }
    };
    const out = fromServerProfileSnapshot(serverProfile, 'device-xyz');
    const parsed = ProfileCacheEntrySchema.safeParse(out);
    expect(parsed.success).toBe(true);
    expect(out.userId).toBe('user-123');
    expect(out.deviceId).toBe('device-xyz');
    expect(out.schemaVersion).toBe(1);
  });

  test('parseAndNormalizeBootstrap supports desktop-expected form', () => {
    const payload = {
      version: '1.0.0',
      catalogs: {
        buildings: { data: { solar_plants: {} }, version: '1.0.0', contentHash: 'abc' }
      },
      profile: { userId: 'u1', deviceId: 'd1', data: { foo: 'bar' }, schemaVersion: 2 }
    };
    const out = parseAndNormalizeBootstrap(payload, { deviceId: 'ignored', fallbackVersion: 'x' });
    expect(out.version).toBe('1.0.0');
    expect(out.catalogs?.buildings.version).toBe('1.0.0');
    expect(out.profile?.userId).toBe('u1');
    expect(out.profile?.deviceId).toBe('d1');
  });

  test('parseAndNormalizeBootstrap supports server form with profileSnapshot and raw catalogs', () => {
    const payload = {
      version: { catalogs: '2.0.0', profile: '2.0.0', timestamp: new Date().toISOString() },
      catalogs: {
        technologies: [{ key: DB_FIELDS.EMPIRES.ENERGY }],
        buildings: [{ key: 'solar_plants' }]
      },
      profileSnapshot: {
        user: { _id: 'user-999', username: 'bob', email: 'bob@example.com' },
        empire: { _id: 'emp-9' },
        profile: { economyPerHour: 42, fleetScore: 0, technologyScore: 0, level: 3 }
      }
    };

    const out = parseAndNormalizeBootstrap(payload, { deviceId: 'device-123', fallbackVersion: '1.0.0' });
    expect(out.version).toBe('2.0.0'); // should pick version.catalogs when present
    expect(out.catalogs?.buildings.version).toBe('2.0.0');
    expect(Array.isArray(out.catalogs?.buildings.data as any[])).toBe(true);
    expect(out.profile?.userId).toBe('user-999');
    expect(out.profile?.deviceId).toBe('device-123');
  });

  test('parseAndNormalizeBootstrap throws on invalid profileSnapshot shape', () => {
    const bad = {
      version: '1.0.0',
      profileSnapshot: {
        user: { _id: 'u1' } // missing username/email => should fail validation
      }
    };
    expect(() => parseAndNormalizeBootstrap(bad, { deviceId: 'dev' })).toThrow();
  });
});
