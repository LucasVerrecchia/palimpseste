import { describe, expect, it } from 'vitest';
import { loadJson, saveJson, type StorageLike } from '../src/engine/save';
import { parseSave, SAVE_VERSION, type SaveData } from '../src/game/save';

/** Faux localStorage en mémoire pour les tests. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

const validSave: SaveData = {
  version: SAVE_VERSION,
  unlockedAbilities: ['ecrire'],
  visitedRooms: ['marge_01'],
  storyFlags: { pnj_marge_rencontre: true, fragments: 2 },
  endingLeaning: 0,
  playerPos: { room: 'marge_01', x: 640, y: 202 },
  inkMax: 100,
};

describe('sauvegarde versionnée', () => {
  it('fait l\'aller-retour save → load sans perte', () => {
    const storage = fakeStorage();
    saveJson(storage, 'save', validSave);
    expect(loadJson(storage, 'save', parseSave)).toEqual(validSave);
  });

  it('retourne null si aucune sauvegarde', () => {
    expect(loadJson(fakeStorage(), 'save', parseSave)).toBeNull();
  });

  it('retourne null (pas d\'exception) sur un JSON corrompu', () => {
    const storage = fakeStorage({ save: '{oops' });
    expect(loadJson(storage, 'save', parseSave)).toBeNull();
  });

  it('retourne null sur une version inconnue (fallback nouvelle partie)', () => {
    const storage = fakeStorage({ save: JSON.stringify({ ...validSave, version: 999 }) });
    expect(loadJson(storage, 'save', parseSave)).toBeNull();
  });

  it('retourne null sur une structure invalide', () => {
    expect(parseSave({ version: SAVE_VERSION })).toBeNull();
    expect(parseSave({ ...validSave, unlockedAbilities: 'ecrire' })).toBeNull();
    expect(parseSave({ ...validSave, playerPos: { room: 'x' } })).toBeNull();
    expect(parseSave({ ...validSave, storyFlags: { a: 'texte' } })).toBeNull();
    expect(parseSave(null)).toBeNull();
  });
});
