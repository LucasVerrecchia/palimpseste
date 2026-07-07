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

describe('salle marge_01 (données réelles du jeu, v2)', () => {
  const map = parseTiledMap(marge01);

  it('a les dimensions attendues et un contour fermé', () => {
    expect(map.widthTiles).toBe(74);
    expect(map.heightTiles).toBe(17);
    // Fond de page plein
    for (let tx = 0; tx < 74; tx++) expect(gidAt(map, tx, 16)).toBeGreaterThan(0);
    // Marges gauche/droite pleines
    for (let ty = 0; ty < 17; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, 73, ty)).toBeGreaterThan(0);
    }
  });

  it('contient les objets requis (et plus de plateformes pré-placées)', () => {
    const types = new Set(map.objects.map((o) => o.type));
    for (const required of ['spawn', 'npc', 'word', 'fragment', 'inkwell', 'exit']) {
      expect(types.has(required), `objet manquant : ${required}`).toBe(true);
    }
    // La mécanique de tracé souris remplace les plateformes non-écrites.
    expect(types.has('unwritten')).toBe(false);
  });

  it('les deux fosses sont ouvertes et forcent le tracé (mur opposé trop haut)', () => {
    // VOID A (cols 17-28) : entièrement ouverte au niveau du sol de départ.
    for (let tx = 17; tx <= 28; tx++) expect(gidAt(map, tx, 14)).toBe(0);
    // VOID B (cols 41-51) : ouverte.
    for (let tx = 41; tx <= 51; tx++) expect(gidAt(map, tx, 14)).toBe(0);
    // Île 1 (haute) : sa surface est en rangée 12, 32 px au-dessus du sol de départ
    // (rangée 14) → infranchissable au saut depuis le fond, tracé obligatoire.
    expect(gidAt(map, 29, 12)).toBeGreaterThan(0); // surface de l'île 1
    expect(gidAt(map, 29, 13)).toBeGreaterThan(0); // île pleine (rows 12-15)
    expect(gidAt(map, 29, 11)).toBe(0); // rien au-dessus de la surface
  });

  it('la corniche de sortie est haute (montée à tracer)', () => {
    // Corniche cols 69-72 en rangée 5 (surface y=80), très au-dessus du palier (rangée 12).
    for (let tx = 69; tx <= 72; tx++) expect(gidAt(map, tx, 5)).toBeGreaterThan(0);
    expect(gidAt(map, 70, 11)).toBe(0); // vide sous la corniche → escalier d'encre
  });
});
