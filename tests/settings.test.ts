import { describe, expect, it } from 'vitest';
import { loadJson, saveJson, type StorageLike } from '../src/engine/save';
import { DEFAULT_SETTINGS, parseSettings, SETTINGS_KEY, type Settings } from '../src/game/settings';

function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

describe('réglages persistants (musique)', () => {
  it('fait l\'aller-retour save → load sans perte', () => {
    const storage = fakeStorage();
    const settings: Settings = { musicMuted: true };
    saveJson(storage, SETTINGS_KEY, settings);
    expect(loadJson(storage, SETTINGS_KEY, parseSettings)).toEqual(settings);
  });

  it('retourne null si aucun réglage sauvegardé (l\'appelant retombe sur DEFAULT_SETTINGS)', () => {
    expect(loadJson(fakeStorage(), SETTINGS_KEY, parseSettings)).toBeNull();
  });

  it('retourne null sur un JSON corrompu, pas d\'exception', () => {
    const storage = fakeStorage({ [SETTINGS_KEY]: '{oops' });
    expect(loadJson(storage, SETTINGS_KEY, parseSettings)).toBeNull();
  });

  it('retourne null sur une structure invalide', () => {
    expect(parseSettings({ musicMuted: 'oui' })).toBeNull();
    expect(parseSettings(null)).toBeNull();
    expect(parseSettings(42)).toBeNull();
  });

  it('DEFAULT_SETTINGS : musique activée par défaut', () => {
    expect(DEFAULT_SETTINGS.musicMuted).toBe(false);
  });
});
