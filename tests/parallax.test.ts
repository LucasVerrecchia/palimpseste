import { describe, expect, it } from 'vitest';
import { seededRandom, tileIndicesCovering } from '../src/engine/parallax';

describe('tileIndicesCovering', () => {
  it('couvre toute la vue avec une marge d\'une tuile de chaque côté', () => {
    const indices = tileIndicesCovering(0, 480, 200);
    const spanStart = Math.min(...indices) * 200;
    const spanEnd = (Math.max(...indices) + 1) * 200;
    expect(spanStart).toBeLessThanOrEqual(-200);
    expect(spanEnd).toBeGreaterThanOrEqual(480 + 200);
  });

  it('suit le défilement : les indices avancent avec scrollX', () => {
    const atStart = tileIndicesCovering(0, 480, 200);
    const scrolled = tileIndicesCovering(2000, 480, 200);
    expect(Math.min(...scrolled)).toBeGreaterThan(Math.min(...atStart));
  });

  it('reste défini pour une largeur de tuile invalide', () => {
    expect(tileIndicesCovering(0, 480, 0)).toEqual([0]);
  });
});

describe('seededRandom', () => {
  it('est déterministe pour une même seed', () => {
    expect(seededRandom(42)).toBe(seededRandom(42));
  });

  it('reste dans [0, 1)', () => {
    for (const seed of [0, 1, 42, 1000, -7]) {
      const v = seededRandom(seed);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('varie selon la seed', () => {
    expect(seededRandom(1)).not.toBe(seededRandom(2));
  });
});
