import { describe, expect, it } from 'vitest';
import { createInk, reclaimInk, refillInk, spendInk } from '../src/game/player/ink';

describe('ressource d\'encre', () => {
  it('démarre pleine', () => {
    expect(createInk(100)).toEqual({ current: 100, max: 100 });
  });

  it('dépense normalement quand la réserve suffit', () => {
    const result = spendInk({ current: 100, max: 100 }, 25);
    expect(result.ink.current).toBe(75);
    expect(result.healthCost).toBe(0);
  });

  it('peut se vider exactement à zéro sans coût de PV', () => {
    const result = spendInk({ current: 25, max: 100 }, 25);
    expect(result.ink.current).toBe(0);
    expect(result.healthCost).toBe(0);
  });

  it('à sec, le manque est converti en coût de PV (délavage)', () => {
    const result = spendInk({ current: 10, max: 100 }, 25);
    expect(result.ink.current).toBe(0);
    expect(result.healthCost).toBe(15);
  });

  it('complètement à sec, tout le coût passe en PV', () => {
    const result = spendInk({ current: 0, max: 100 }, 25);
    expect(result.ink.current).toBe(0);
    expect(result.healthCost).toBe(25);
  });

  it('rejette un coût négatif', () => {
    expect(() => spendInk({ current: 50, max: 100 }, -5)).toThrow();
  });

  it('se recharge complètement à l\'encrier', () => {
    expect(refillInk({ current: 3, max: 100 })).toEqual({ current: 100, max: 100 });
  });

  it('rembourse l\'encre à l\'effacement, plafonné au max', () => {
    expect(reclaimInk({ current: 40, max: 80 }, 4)).toEqual({ current: 44, max: 80 });
    // Ne dépasse jamais le max, même en effaçant beaucoup.
    expect(reclaimInk({ current: 78, max: 80 }, 4)).toEqual({ current: 80, max: 80 });
  });

  it('un tracé puis son effacement rendent l\'encre neutre (aller-retour)', () => {
    const start = { current: 80, max: 80 };
    const afterDraw = spendInk(start, 4).ink; // 76
    const afterErase = reclaimInk(afterDraw, 4); // 80
    expect(afterErase).toEqual(start);
  });

  it('rejette un remboursement négatif', () => {
    expect(() => reclaimInk({ current: 10, max: 80 }, -4)).toThrow();
  });

  it('ne modifie jamais l\'état d\'entrée (pureté)', () => {
    const ink = { current: 50, max: 100 };
    spendInk(ink, 20);
    refillInk(ink);
    expect(ink).toEqual({ current: 50, max: 100 });
  });
});
