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

/** Salle avec un mur "ground" plein en x=1 et un filigrane (passage) dessous. */
function makeRoomWithFiligrane(): Room {
  const raw = {
    width: 4,
    height: 1,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { type: 'tilelayer', name: 'ground', data: [0, 1, 0, 0] },
      { type: 'tilelayer', name: 'filigrane', data: [0, 0, 0, 3] },
      { type: 'objectgroup', name: 'objects', objects: [] },
    ],
  };
  return new Room('test-filigrane', parseTiledMap(raw));
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

describe('Room — murs BRÈCHE et filigrane', () => {
  it('un mur BRÈCHE non révélé est solide comme un mur naturel', () => {
    const room = makeRoomWithFiligrane();
    room.registerBrecheWall(1, [{ x: 1, y: 0 }]);
    expect(room.isSolid(1, 0)).toBe(true);
    expect(room.brecheAt(1, 0)).toBe(1);
  });

  it('révéler le filigrane bascule la solidité sur la tuile filigrane', () => {
    const room = makeRoomWithFiligrane();
    room.registerBrecheWall(1, [{ x: 1, y: 0 }]);
    room.revealFiligrane(1);
    expect(room.brecheAt(1, 0)).toBeNull(); // plus une brèche à ouvrir
    expect(room.isFiligraneRevealed(1, 0)).toBe(true);
    // Le calque ground disait "mur" (gid 1) mais le filigrane dessous est vide → passage ouvert.
    expect(room.isSolid(1, 0)).toBe(false);
    expect(room.isPaintable(1, 0)).toBe(true);
  });

  it('révéler un mur dont le filigrane est lui-même solide garde la tuile bloquée', () => {
    const room = makeRoomWithFiligrane();
    room.registerBrecheWall(1, [{ x: 3, y: 0 }]); // filigrane gid=3 en x=3
    room.revealFiligrane(1);
    expect(room.isSolid(3, 0)).toBe(true);
  });

  it('révéler un mur ne touche pas les autres murs BRÈCHE', () => {
    const room = makeRoomWithFiligrane();
    room.registerBrecheWall(1, [{ x: 1, y: 0 }]);
    room.registerBrecheWall(2, [{ x: 3, y: 0 }]);
    room.revealFiligrane(1);
    expect(room.brecheAt(3, 0)).toBe(2);
  });

  it('les dalles de filigrane ne couvrent que les tuiles révélées et solides', () => {
    const room = makeRoomWithFiligrane();
    room.registerBrecheWall(1, [{ x: 1, y: 0 }]);
    room.registerBrecheWall(2, [{ x: 3, y: 0 }]);
    room.revealFiligrane(1);
    room.revealFiligrane(2);
    expect(room.filigraneSlabs()).toEqual([{ x: 3, y: 0, w: 1, h: 1 }]);
  });
});

