import { describe, expect, it } from 'vitest';
import { gidAt, mergeSolidTiles, parseTiledMap } from '../src/engine/tilemap';
import marge01 from '../src/data/rooms/marge_01.json';

function minimalMap(): Record<string, unknown> {
  return {
    width: 2,
    height: 2,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { type: 'tilelayer', name: 'ground', data: [1, 0, 0, 1] },
      {
        type: 'objectgroup',
        name: 'objects',
        objects: [
          {
            id: 1,
            name: 'porte',
            type: 'exit',
            x: 16,
            y: 0,
            width: 16,
            height: 32,
            properties: [{ name: 'destination', type: 'string', value: 'salle_2' }],
          },
        ],
      },
    ],
  };
}

describe('parseTiledMap', () => {
  it('parse un export Tiled minimal', () => {
    const map = parseTiledMap(minimalMap());
    expect(map.widthTiles).toBe(2);
    expect(map.ground).toEqual([1, 0, 0, 1]);
    expect(map.objects).toHaveLength(1);
    expect(map.objects[0]?.type).toBe('exit');
    expect(map.objects[0]?.properties['destination']).toBe('salle_2');
  });

  it('accepte le champ "class" de Tiled 1.9+ à la place de "type"', () => {
    const raw = minimalMap();
    const layers = raw['layers'] as Record<string, unknown>[];
    const objLayer = layers[1] as { objects: Record<string, unknown>[] };
    const obj = objLayer.objects[0] as Record<string, unknown>;
    delete obj['type'];
    obj['class'] = 'exit';
    const map = parseTiledMap(raw);
    expect(map.objects[0]?.type).toBe('exit');
  });

  it('rejette une carte sans calque ground', () => {
    const raw = minimalMap();
    raw['layers'] = [];
    expect(() => parseTiledMap(raw)).toThrow(/ground/);
  });

  it('rejette un calque ground de mauvaise taille', () => {
    const raw = minimalMap();
    (raw['layers'] as Record<string, unknown>[])[0] = {
      type: 'tilelayer',
      name: 'ground',
      data: [1, 0],
    };
    expect(() => parseTiledMap(raw)).toThrow();
  });

  it('gidAt retourne 0 hors limites', () => {
    const map = parseTiledMap(minimalMap());
    expect(gidAt(map, -1, 0)).toBe(0);
    expect(gidAt(map, 0, 5)).toBe(0);
    expect(gidAt(map, 0, 0)).toBe(1);
    expect(gidAt(map, 1, 0)).toBe(0);
  });
});

describe('mergeSolidTiles — fusion des tuiles en dalles', () => {
  it('fusionne un bloc plein en un seul rectangle', () => {
    const rects = mergeSolidTiles(3, 2, () => true);
    expect(rects).toEqual([{ x: 0, y: 0, w: 3, h: 2 }]);
  });

  it('empile les séquences identiques et sépare les différentes (forme en L)', () => {
    // ##.
    // ##.
    // ###
    const grid = [
      [1, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
    ];
    const rects = mergeSolidTiles(3, 3, (x, y) => grid[y]?.[x] === 1);
    expect(rects).toEqual([
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 0, y: 2, w: 3, h: 1 },
    ]);
  });

  it('sépare les séquences non contiguës d\'une même ligne', () => {
    // #.#
    const rects = mergeSolidTiles(3, 1, (x) => x !== 1);
    expect(rects).toEqual([
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 2, y: 0, w: 1, h: 1 },
    ]);
  });

  it('retourne vide pour une grille vide', () => {
    expect(mergeSolidTiles(4, 4, () => false)).toEqual([]);
  });

  it('couvre exactement les tuiles solides de la salle réelle (ni trou ni excès)', () => {
    const map = parseTiledMap(marge01);
    const rects = mergeSolidTiles(map.widthTiles, map.heightTiles, (x, y) => gidAt(map, x, y) > 0);
    const covered = new Set<string>();
    for (const r of rects) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const key = `${String(x)},${String(y)}`;
          expect(covered.has(key), `chevauchement en ${key}`).toBe(false);
          covered.add(key);
        }
      }
    }
    for (let y = 0; y < map.heightTiles; y++) {
      for (let x = 0; x < map.widthTiles; x++) {
        expect(covered.has(`${String(x)},${String(y)}`)).toBe(gidAt(map, x, y) > 0);
      }
    }
  });
});

describe('salle marge_01 — chapitre 1 « La Marge » (données réelles, v3)', () => {
  const map = parseTiledMap(marge01);

  it('a les dimensions attendues et un contour fermé', () => {
    expect(map.widthTiles).toBe(64);
    expect(map.heightTiles).toBe(17);
    // Sol continu sur les 3 rangées du bas (pas de chute mortelle dans la marge).
    for (let tx = 1; tx <= 62; tx++) {
      expect(gidAt(map, tx, 14)).toBeGreaterThan(0);
      expect(gidAt(map, tx, 16)).toBeGreaterThan(0);
    }
    // Bord haut + marges gauche/droite pleines.
    for (let tx = 0; tx < 64; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < 17; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, 63, ty)).toBeGreaterThan(0);
    }
  });

  it('contient les objets requis, dont les mots-loi et deux sorties', () => {
    const types = new Set(map.objects.map((o) => o.type));
    for (const required of ['spawn', 'npc', 'word', 'fragment', 'inkwell', 'exit', 'canon']) {
      expect(types.has(required), `objet manquant : ${required}`).toBe(true);
    }
    expect(types.has('unwritten')).toBe(false); // plus de plateformes pré-placées

    // Deux sorties = les deux fins en miniature (rature / point final).
    const endings = map.objects
      .filter((o) => o.type === 'exit')
      .map((o) => o.properties['ending']);
    expect(new Set(endings)).toEqual(new Set(['rature', 'point']));

    // Les obstacles SONT des mots-loi : 2 barrières (enfermé, jamais) + 1 blanc.
    const canon = map.objects.filter((o) => o.type === 'canon');
    const modes = canon.map((o) => o.properties['mode']);
    expect(new Set(modes)).toEqual(new Set(['barrier', 'latent']));
    const barrierTexts = canon
      .filter((o) => o.properties['mode'] === 'barrier')
      .map((o) => o.properties['text']);
    expect(new Set(barrierTexts)).toEqual(new Set(['enfermé', 'jamais']));
  });

  it('« enfermé » : mot-cage de départ, hors décor fixe, neutre (apprentissage)', () => {
    // Objet "canon" en x14-15 : le calque ground reste vide là où il se dresse.
    for (let ty = 8; ty <= 13; ty++) {
      expect(gidAt(map, 14, ty)).toBe(0);
      expect(gidAt(map, 15, ty)).toBe(0);
    }
    const enferme = map.objects.find((o) => o.properties['text'] === 'enfermé');
    expect(enferme?.properties['mode']).toBe('barrier');
    expect(enferme?.properties['flag']).toBe('efface_enferme');
    expect(enferme?.properties['leaning']).toBeUndefined(); // neutre : ne pèse pas sur la fin
  });

  it('la passerelle POINT FINAL a un trou de 2 tuiles : le blanc ▢ à combler', () => {
    // Passerelle en rangée 9, ininterrompue sauf le trou x40-41.
    expect(gidAt(map, 39, 9)).toBeGreaterThan(0);
    expect(gidAt(map, 40, 9)).toBe(0); // ▢
    expect(gidAt(map, 41, 9)).toBe(0); // ▢
    expect(gidAt(map, 42, 9)).toBeGreaterThan(0);
  });

  it('« jamais » : barrage final effaçable qui penche vers RATURE', () => {
    // Objet "canon" en x50-51 : ground vide là où il se dresse.
    for (let ty = 8; ty <= 13; ty++) {
      expect(gidAt(map, 50, ty)).toBe(0);
      expect(gidAt(map, 51, ty)).toBe(0);
    }
    const jamais = map.objects.find((o) => o.properties['text'] === 'jamais');
    expect(jamais?.properties['mode']).toBe('barrier');
    expect(jamais?.properties['flag']).toBe('rature_jamais');
    expect(jamais?.properties['leaning']).toBe(-1);
  });
});
