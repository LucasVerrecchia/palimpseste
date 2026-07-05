import { describe, expect, it } from 'vitest';
import { computeIntegerScale } from '../src/engine/scaling';

describe('computeIntegerScale', () => {
  it('retourne le plus grand facteur entier qui tient dans le conteneur', () => {
    // 1920×1080 = exactement 4× la résolution interne 480×270.
    expect(computeIntegerScale(1920, 1080, 480, 270)).toBe(4);
    // 1366×768 : 2,84× dans les deux dimensions → arrondi à 2.
    expect(computeIntegerScale(1366, 768, 480, 270)).toBe(2);
  });

  it('est limité par la dimension la plus contrainte', () => {
    // Largeur permettrait ×10, mais la hauteur ne permet que ×1.
    expect(computeIntegerScale(4800, 271, 480, 270)).toBe(1);
  });

  it('ne descend jamais sous 1, même si le conteneur est plus petit', () => {
    expect(computeIntegerScale(320, 200, 480, 270)).toBe(1);
  });
});
