import { describe, expect, it } from 'vitest';
import type { Body, SolidQuery } from '../src/engine/physics';
import { BOSS } from '../src/game/config';
import {
  bossOverlapsPlayer,
  createBoss,
  resolveBossDashHit,
  resolveProjectileHits,
  stepBoss,
  type BossState,
} from '../src/game/enemies/boss_coquille_majuscule';

const empty: SolidQuery = () => false;

function playerBody(partial: Partial<Body> = {}): Body {
  return { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 0, ...partial };
}

// Joueur loin de tout, pour les tests qui ne portent pas sur l'IA/le ciblage.
const farPlayer = playerBody({ x: 500 });
// Salle large, pour les tests qui ne portent pas sur le bornage aux murs.
const bigRoom = { width: 10000, height: 10000 };

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
    boss = stepBoss(boss, empty, BOSS.patrolSeconds + 0.01, farPlayer, bigRoom);
    expect(boss.phase).toBe('telegraph');
    boss = stepBoss(boss, empty, BOSS.telegraphSeconds + 0.01, farPlayer, bigRoom);
    expect(boss.phase).toBe('vulnerable');
    boss = stepBoss(boss, empty, BOSS.vulnerableSeconds + 0.01, farPlayer, bigRoom);
    expect(boss.phase).toBe('recover');
    boss = stepBoss(boss, empty, BOSS.recoverSeconds + 0.01, farPlayer, bigRoom);
    expect(boss.phase).toBe('patrol');
  });

  it('un boss vaincu ne bouge plus (no-op)', () => {
    const boss: BossState = { ...createBoss(0, 0, 0, 100), phase: 'defeated', health: 0 };
    const next = stepBoss(boss, empty, 5, farPlayer, bigRoom);
    expect(next).toEqual(boss);
  });
});

describe('stepBoss — IA de patrouille réactive', () => {
  it('avance vers le joueur plutôt que de suivre un aller-retour fixe', () => {
    const boss = createBoss(50, 0, 0, 100);
    const next = stepBoss(boss, empty, 1 / 60, playerBody({ x: 300 }), bigRoom);
    expect(next.facing).toBe(1);
    expect(next.body.x).toBeGreaterThan(boss.body.x);
  });

  it('change de direction si le joueur passe de l\'autre côté', () => {
    const boss = createBoss(50, 0, 0, 100);
    const next = stepBoss(boss, empty, 1 / 60, playerBody({ x: -300 }), bigRoom);
    expect(next.facing).toBe(-1);
    expect(next.body.x).toBeLessThan(boss.body.x);
  });

  it('reste dans ses bornes de patrouille même si le joueur est plus loin', () => {
    const boss = createBoss(99, 0, 0, 100);
    const next = stepBoss(boss, empty, 1, playerBody({ x: 500 }), bigRoom);
    expect(next.body.x).toBeLessThanOrEqual(100);
  });

  it('ondule la vitesse de poursuite (jamais plus vite que patrolSpeed)', () => {
    const boss = createBoss(50, 0, 0, 100);
    let b = boss;
    for (let i = 0; i < 30; i++) {
      b = stepBoss(b, empty, 1 / 60, playerBody({ x: 300 }), bigRoom);
      expect(Math.abs(b.body.vx)).toBeLessThanOrEqual(BOSS.patrolSpeed);
    }
  });

  it('tire une bulle d\'encre vers le joueur une fois le cooldown écoulé', () => {
    const boss = createBoss(50, 0, 0, 100);
    const next = stepBoss(boss, empty, BOSS.rangedCooldownSeconds + 0.01, playerBody({ x: 300 }), bigRoom);
    expect(next.projectiles).toHaveLength(1);
    expect(next.projectiles[0]?.vx).toBeGreaterThan(0); // joueur à droite
    expect(next.rangedCooldown).toBeCloseTo(BOSS.rangedCooldownSeconds);
  });

  it('vise dans n\'importe quelle direction (pas seulement horizontale)', () => {
    const boss = createBoss(50, 0, 0, 100);
    // Joueur bien au-dessus et légèrement à droite : la bulle doit monter.
    const next = stepBoss(boss, empty, BOSS.rangedCooldownSeconds + 0.01, playerBody({ x: 60, y: -300 }), bigRoom);
    expect(next.projectiles[0]?.vy).toBeLessThan(0);
  });

  it('une bulle d\'encre expire après sa durée de vie', () => {
    let boss = createBoss(50, 0, 0, 100);
    boss = stepBoss(boss, empty, BOSS.rangedCooldownSeconds + 0.01, playerBody({ x: 300 }), bigRoom);
    expect(boss.projectiles).toHaveLength(1);
    boss = stepBoss(boss, empty, BOSS.projectileLifeSeconds + 0.1, playerBody({ x: 300 }), bigRoom);
    expect(boss.projectiles).toHaveLength(0);
  });

  it('une bulle d\'encre disparaît en sortant des murs extérieurs de la salle (traverse le reste)', () => {
    let boss = createBoss(50, 0, 0, 100);
    boss = stepBoss(boss, empty, BOSS.rangedCooldownSeconds + 0.01, playerBody({ x: 300 }), bigRoom);
    expect(boss.projectiles).toHaveLength(1);
    const small = { width: 55, height: 55 };
    boss = stepBoss(boss, empty, 1, playerBody({ x: 300 }), small);
    expect(boss.projectiles).toHaveLength(0);
  });
});

describe('resolveProjectileHits', () => {
  it('retire une bulle qui touche le joueur et compte le coup', () => {
    const boss: BossState = { ...createBoss(0, 0, 0, 100), projectiles: [{ x: 5, y: 5, vx: 10, vy: 0, age: 0 }] };
    const result = resolveProjectileHits(boss, playerBody({ x: 0, y: 0 }));
    expect(result.hits).toBe(1);
    expect(result.boss.projectiles).toHaveLength(0);
  });

  it('laisse intactes les bulles hors de portée', () => {
    const boss: BossState = {
      ...createBoss(0, 0, 0, 100),
      projectiles: [{ x: 500, y: 500, vx: 10, vy: 0, age: 0 }],
    };
    const result = resolveProjectileHits(boss, playerBody({ x: 0, y: 0 }));
    expect(result.hits).toBe(0);
    expect(result.boss.projectiles).toHaveLength(1);
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
