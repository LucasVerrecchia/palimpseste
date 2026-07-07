import { describe, expect, it } from 'vitest';
import { tilesBetween } from '../src/engine/tilemap';

/** Deux tuiles sont-elles 4-adjacentes (partagent une arête) ? */
function adjacent(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

describe('tilesBetween — rastérisation d\'un trait', () => {
  it('un point unique se réduit à lui-même', () => {
    expect(tilesBetween(3, 4, 3, 4)).toEqual([{ x: 3, y: 4 }]);
  });

  it('trace une ligne horizontale exacte', () => {
    expect(tilesBetween(0, 2, 3, 2)).toEqual([
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ]);
  });

  it('trace une ligne verticale exacte (sens décroissant)', () => {
    expect(tilesBetween(5, 5, 5, 2)).toEqual([
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 5, y: 3 },
      { x: 5, y: 2 },
    ]);
  });

  it('inclut toujours les deux extrémités', () => {
    const tiles = tilesBetween(2, 1, 9, 6);
    expect(tiles[0]).toEqual({ x: 2, y: 1 });
    expect(tiles[tiles.length - 1]).toEqual({ x: 9, y: 6 });
  });

  it('ne laisse aucun trou en diagonale (tuiles consécutives 4-adjacentes)', () => {
    // Un pont troué en diagonale rendrait le trait infranchissable : on vérifie
    // que chaque tuile touche la précédente par une arête.
    const diagonals = [
      tilesBetween(0, 0, 6, 6),
      tilesBetween(0, 0, 7, 3),
      tilesBetween(4, 9, -3, 1),
    ];
    for (const tiles of diagonals) {
      for (let i = 1; i < tiles.length; i++) {
        const prev = tiles[i - 1];
        const cur = tiles[i];
        if (prev === undefined || cur === undefined) throw new Error('tuile indéfinie');
        expect(adjacent(prev, cur), `saut entre ${JSON.stringify(prev)} et ${JSON.stringify(cur)}`).toBe(true);
      }
    }
  });

  it('gère les directions négatives', () => {
    const tiles = tilesBetween(3, 3, 0, 3);
    expect(tiles).toEqual([
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
    ]);
  });
});
