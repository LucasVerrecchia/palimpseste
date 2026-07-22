import { describe, expect, it } from 'vitest';
import type { Body, SolidQuery } from '../src/engine/physics';
import { BOSS } from '../src/game/config';
import {
  bossOverlapsPlayer,
  createBoss,
  resolveBossDashHit,
  stepBoss,
  type BossState,
} from '../src/game/enemies/boss_coquille_majuscule';

const empty: SolidQuery = () => false;

function playerBody(partial: Partial<Body> = {}): Body {
  return { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 0, ...partial };
}

describe('createBoss', () => {
  it('démarre en patrouille, à pleine vie', () => {
    const boss = createBoss(0, 0, 0, 100);
    expect(boss.phase).toBe('patrol');
    expect(boss.health).toBe(BOSS.health);
  });
});

describe('stepBoss — cycle de phases télégraphié', () => {
  it('enchaîne patrol → telegraph → vulnerable → recover → patrol', () => {
    let boss = createBoss(0, 0, 0, 100);
    boss = stepBoss(boss, empty, BOSS.patrolSeconds + 0.01);
    expect(boss.phase).toBe('telegraph');
    boss = stepBoss(boss, empty, BOSS.telegraphSeconds + 0.01);
    expect(boss.phase).toBe('vulnerable');
    boss = stepBoss(boss, empty, BOSS.vulnerableSeconds + 0.01);
    expect(boss.phase).toBe('recover');
    boss = stepBoss(boss, empty, BOSS.recoverSeconds + 0.01);
    expect(boss.phase).toBe('patrol');
  });

  it('rebondit sur ses bornes de patrouille', () => {
    const boss: BossState = { ...createBoss(100, 0, 0, 100) };
    const next = stepBoss(boss, empty, 1 / 60);
    expect(next.facing).toBe(-1);
  });

  it('un boss vaincu ne bouge plus (no-op)', () => {
    const boss: BossState = { ...createBoss(0, 0, 0, 100), phase: 'defeated', health: 0 };
    const next = stepBoss(boss, empty, 5);
    expect(next).toEqual(boss);
  });
});

describe('resolveBossDashHit — vulnérable uniquement', () => {
  it('un dash pendant la patrouille ne fait rien', () => {
    const boss = createBoss(0, 0, 0, 100);
    const next = resolveBossDashHit(boss, playerBody({ x: 5 }), true);
    expect(next.health).toBe(BOSS.health);
    expect(next.phase).toBe('patrol');
  });

  it('un dash pendant la fenêtre vulnérable retire un point de vie et referme la fenêtre', () => {
    const boss: BossState = { ...createBoss(0, 0, 0, 100), phase: 'vulnerable', phaseTimer: BOSS.vulnerableSeconds };
    const next = resolveBossDashHit(boss, playerBody({ x: 5 }), true);
    expect(next.health).toBe(BOSS.health - 1);
    expect(next.phase).toBe('recover');
  });

  it('hors de portée, le dash ne touche pas même en fenêtre vulnérable', () => {
    const boss: BossState = { ...createBoss(0, 0, 0, 100), phase: 'vulnerable', phaseTimer: BOSS.vulnerableSeconds };
    const next = resolveBossDashHit(boss, playerBody({ x: 500 }), true);
    expect(next.health).toBe(BOSS.health);
  });

  it('vide les PV vainc le boss', () => {
    let boss: BossState = { ...createBoss(0, 0, 0, 100), phase: 'vulnerable', health: 1 };
    boss = resolveBossDashHit(boss, playerBody({ x: 5 }), true);
    expect(boss.phase).toBe('defeated');
    expect(boss.health).toBe(0);
  });
});

describe('bossOverlapsPlayer', () => {
  it('détecte le chevauchement', () => {
    const boss = createBoss(0, 0, 0, 100);
    expect(bossOverlapsPlayer(boss, playerBody({ x: 5 }))).toBe(true);
    expect(bossOverlapsPlayer(boss, playerBody({ x: 500 }))).toBe(false);
  });
});
