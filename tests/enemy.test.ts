import { describe, expect, it } from 'vitest';
import type { Body, SolidQuery } from '../src/engine/physics';
import { ENEMY } from '../src/game/config';
import { createEnemy, overlapsPlayer, resolveDashHit, stepEnemy, type Enemy } from '../src/game/enemies/enemy';

const empty: SolidQuery = () => false;

function playerBody(partial: Partial<Body> = {}): Body {
  return { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 0, ...partial };
}

describe('stepEnemy — Coquille (patrouille simple)', () => {
  it('avance dans le sens courant', () => {
    const enemy = createEnemy(1, 'coquille', 20, 0, 0, 100);
    const next = stepEnemy(enemy, empty, playerBody({ x: 500 }), 1 / 60);
    expect(next.body.x).toBeGreaterThan(20);
  });

  it('rebondit exactement sur sa borne droite', () => {
    const enemy = createEnemy(1, 'coquille', 100, 0, 0, 100);
    const next = stepEnemy(enemy, empty, playerBody({ x: 500 }), 1 / 60);
    expect(next.facing).toBe(-1);
    expect(next.body.x).toBeLessThan(100);
  });

  it('rebondit exactement sur sa borne gauche', () => {
    const enemy: Enemy = { ...createEnemy(1, 'coquille', 0, 0, 0, 100), facing: -1 };
    const next = stepEnemy(enemy, empty, playerBody({ x: 500 }), 1 / 60);
    expect(next.facing).toBe(1);
    expect(next.body.x).toBeGreaterThan(0);
  });

  it('ne poursuit jamais le joueur, même très proche', () => {
    const enemy = createEnemy(1, 'coquille', 20, 0, 0, 100);
    const next = stepEnemy(enemy, empty, playerBody({ x: 21 }), 1 / 60);
    expect(next.chasing).toBe(false);
  });
});

describe('stepEnemy — Rature (poursuite)', () => {
  it('reste en patrouille si le joueur est loin', () => {
    const enemy = createEnemy(1, 'rature', 20, 0, 0, 100);
    const next = stepEnemy(enemy, empty, playerBody({ x: 20 + ENEMY.ratureChaseRange + 50 }), 1 / 60);
    expect(next.chasing).toBe(false);
  });

  it('poursuit dès que le joueur entre dans sa portée', () => {
    const enemy = createEnemy(1, 'rature', 20, 0, 0, 100);
    const next = stepEnemy(enemy, empty, playerBody({ x: 20 + ENEMY.ratureChaseRange - 1 }), 1 / 60);
    expect(next.chasing).toBe(true);
  });

  it('se tourne vers le joueur en le poursuivant', () => {
    const enemy = createEnemy(1, 'rature', 50, 0, 0, 100);
    const towardsLeft = stepEnemy(enemy, empty, playerBody({ x: 0 }), 1 / 60);
    expect(towardsLeft.facing).toBe(-1);
    const towardsRight = stepEnemy(enemy, empty, playerBody({ x: 100 }), 1 / 60);
    expect(towardsRight.facing).toBe(1);
  });
});

describe('overlapsPlayer / resolveDashHit — HÂTE détruit les ennemis communs', () => {
  it('détecte le chevauchement avec le joueur', () => {
    const enemy = createEnemy(1, 'coquille', 0, 0, 0, 100);
    expect(overlapsPlayer(enemy, playerBody({ x: 5, y: 0 }))).toBe(true);
    expect(overlapsPlayer(enemy, playerBody({ x: 500, y: 0 }))).toBe(false);
  });

  it('ne détruit pas l\'ennemi si le dash n\'est pas actif', () => {
    const enemy = createEnemy(1, 'coquille', 0, 0, 0, 100);
    const result = resolveDashHit(enemy, playerBody({ x: 5 }), false);
    expect(result.destroyed).toBe(false);
    expect(result.enemy.health).toBe(1);
  });

  it('ne détruit pas l\'ennemi si le dash est actif mais hors de portée', () => {
    const enemy = createEnemy(1, 'coquille', 0, 0, 0, 100);
    const result = resolveDashHit(enemy, playerBody({ x: 500 }), true);
    expect(result.destroyed).toBe(false);
  });

  it('détruit l\'ennemi au contact d\'un dash actif', () => {
    const enemy = createEnemy(1, 'coquille', 0, 0, 0, 100);
    const result = resolveDashHit(enemy, playerBody({ x: 5 }), true);
    expect(result.destroyed).toBe(true);
    expect(result.enemy.health).toBeLessThanOrEqual(0);
  });
});
