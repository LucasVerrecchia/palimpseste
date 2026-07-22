import { describe, expect, it } from 'vitest';
import { canAfford, createInk, reclaimInk, refillInk, spendInk } from '../src/game/player/ink';

describe('ressource d\'encre', () => {
  it('démarre pleine', () => {
    expect(createInk(100)).toEqual({ current: 100, max: 100 });
  });

  it('dépense normalement quand la réserve suffit', () => {
    const result = spendInk({ current: 100, max: 100 }, 25);
    expect(result.current).toBe(75);
  });

  it('peut se vider exactement à zéro', () => {
    const result = spendInk({ current: 25, max: 100 }, 25);
    expect(result.current).toBe(0);
  });

  it('rejette une dépense si la réserve ne suffit pas (plus de délavage, D10 retirée)', () => {
    expect(() => spendInk({ current: 10, max: 100 }, 25)).toThrow();
  });

  it('rejette un coût négatif', () => {
    expect(() => spendInk({ current: 50, max: 100 }, -5)).toThrow();
  });

  it('canAfford distingue ce qui est finançable ou non', () => {
    expect(canAfford({ current: 10, max: 100 }, 10)).toBe(true);
    expect(canAfford({ current: 9, max: 100 }, 10)).toBe(false);
    expect(() => canAfford({ current: 10, max: 100 }, -1)).toThrow();
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
    const afterDraw = spendInk(start, 4); // 76
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
