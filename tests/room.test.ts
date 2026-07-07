import { describe, expect, it } from 'vitest';
import { parseTiledMap } from '../src/engine/tilemap';
import { Room } from '../src/game/world/room';

/** Petite salle : sol plein sur la rangée du bas, vide au-dessus. */
function makeRoom(): Room {
  const raw = {
    width: 4,
    height: 3,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      {
        type: 'tilelayer',
        name: 'ground',
        // rangées 0 et 1 vides, rangée 2 pleine
        data: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
      },
      { type: 'objectgroup', name: 'objects', objects: [] },
    ],
  };
  return new Room('test', parseTiledMap(raw));
}

describe('Room — couche d\'encre tracée', () => {
  it('une tuile vide est traçable, pas une tuile de décor', () => {
    const room = makeRoom();
    expect(room.isPaintable(1, 0)).toBe(true); // vide
    expect(room.isPaintable(1, 2)).toBe(false); // sol naturel
    expect(room.isPaintable(-1, 0)).toBe(false); // hors carte
  });

  it('tracer rend la tuile solide et non re-traçable ; effacer la libère', () => {
    const room = makeRoom();
    expect(room.isSolid(1, 0)).toBe(false);

    room.paintInk(1, 0);
    expect(room.hasInk(1, 0)).toBe(true);
    expect(room.isSolid(1, 0)).toBe(true);
    expect(room.isPaintable(1, 0)).toBe(false); // déjà de l'encre

    room.eraseInk(1, 0);
    expect(room.hasInk(1, 0)).toBe(false);
    expect(room.isSolid(1, 0)).toBe(false);
    expect(room.isPaintable(1, 0)).toBe(true);
  });

  it('effacer ne touche pas au décor naturel', () => {
    const room = makeRoom();
    room.eraseInk(1, 2); // rangée de sol
    expect(room.isSolid(1, 2)).toBe(true); // toujours solide
  });

  it('les dalles d\'encre fusionnées couvrent exactement les tuiles tracées', () => {
    const room = makeRoom();
    room.paintInk(0, 0);
    room.paintInk(1, 0);
    room.paintInk(2, 0);
    const slabs = room.inkSlabs();
    expect(slabs).toEqual([{ x: 0, y: 0, w: 3, h: 1 }]);
  });
});
