import { describe, expect, it } from 'vitest';
import type { SolidQuery } from '../src/engine/physics';
import { DASH } from '../src/game/config';
import { stepPlayer, type MoveIntents, type PlayerState } from '../src/game/player/controller';

const empty: SolidQuery = () => false;

function player(partial: Partial<PlayerState> = {}): PlayerState {
  return {
    body: { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 0 },
    grounded: false,
    facing: 1,
    health: 100,
    dashTimer: 0,
    dashCooldown: 0,
    airJumpsUsed: 0,
    ...partial,
  };
}

function intents(partial: Partial<MoveIntents> = {}): MoveIntents {
  return {
    left: false,
    right: false,
    jumpPressed: false,
    jumpHeld: false,
    dashPressed: false,
    ...partial,
  };
}

const NONE = new Set<string>();
const HATE = new Set(['hate']);
const ALES = new Set(['ales']);

describe('stepPlayer — HÂTE (dash)', () => {
  it('déclenche une ruade horizontale quand débloqué', () => {
    const p = player({ facing: 1 });
    const next = stepPlayer(p, intents({ dashPressed: true }), empty, 1 / 60, HATE);
    expect(next.dashTimer).toBeCloseTo(DASH.durationSeconds);
    expect(next.body.vx).toBe(DASH.speed);
  });

  it('ignore le dash si HÂTE n\'est pas débloqué', () => {
    const p = player();
    const next = stepPlayer(p, intents({ dashPressed: true }), empty, 1 / 60, NONE);
    expect(next.dashTimer).toBe(0);
  });

  it('ne se redéclenche pas pendant le cooldown', () => {
    const p = player({ dashTimer: 0, dashCooldown: 0.3 });
    const next = stepPlayer(p, intents({ dashPressed: true }), empty, 1 / 60, HATE);
    expect(next.dashTimer).toBe(0);
  });

  it('la ruade se termine après sa durée puis le cooldown démarre', () => {
    let p = player();
    p = stepPlayer(p, intents({ dashPressed: true }), empty, 1 / 60, HATE);
    expect(p.dashTimer).toBeGreaterThan(0);
    p = stepPlayer(p, intents(), empty, DASH.durationSeconds + 0.01, HATE);
    expect(p.dashTimer).toBe(0);
    expect(p.dashCooldown).toBeGreaterThan(0);
  });
});

describe('stepPlayer — AILES (double saut / vol plané)', () => {
  it('un second saut en l\'air est possible si débloqué', () => {
    const p = player({ grounded: false, airJumpsUsed: 0, body: { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 80 } });
    const next = stepPlayer(p, intents({ jumpPressed: true }), empty, 1 / 60, ALES);
    // La gravité s'applique dès ce frame (comme le saut au sol) : on vérifie
    // l'impulsion (chute → montée), pas l'égalité exacte avec la constante.
    expect(next.body.vy).toBeLessThan(0);
    expect(next.airJumpsUsed).toBe(1);
  });

  it('pas de saut aérien sans ALES débloqué', () => {
    const p = player({ grounded: false, airJumpsUsed: 0, body: { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 50 } });
    const next = stepPlayer(p, intents({ jumpPressed: true }), empty, 1 / 60, NONE);
    expect(next.body.vy).toBeGreaterThan(0);
  });

  it('un seul saut aérien tant qu\'on ne retouche pas le sol', () => {
    const p = player({ grounded: false, airJumpsUsed: 1, body: { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 80 } });
    const next = stepPlayer(p, intents({ jumpPressed: true }), empty, 1 / 60, ALES);
    expect(next.airJumpsUsed).toBe(1);
    expect(next.body.vy).toBeGreaterThan(0); // toujours en chute, pas de second saut aérien
  });

  it('le compteur de sauts aériens se réinitialise au sol', () => {
    const p = player({ grounded: true, airJumpsUsed: 1 });
    const next = stepPlayer(p, intents(), empty, 1 / 60, ALES);
    expect(next.airJumpsUsed).toBe(0);
  });
});
