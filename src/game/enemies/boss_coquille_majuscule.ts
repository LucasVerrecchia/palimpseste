/**
 * Mi-boss — la Coquille majuscule (spec §6) : "déforme la salle en la
 * mésorthographiant ; veut juste être corrigée". Combat resserré en phases
 * télégraphiées plutôt qu'un échange de coups au hasard : le joueur doit lire
 * le télégraphe et placer son dash (HÂTE) dans la fenêtre vulnérable.
 *
 * Même pattern que enemies/enemy.ts (décision D12) : types + fonctions pures,
 * pas d'ECS générique pour un boss unique.
 */
import { aabbOverlap, moveBody, type Body, type SolidQuery } from '../../engine/physics';
import { BOSS, PHYSICS, TILE_SIZE } from '../config';

export type BossPhase = 'patrol' | 'telegraph' | 'vulnerable' | 'recover' | 'defeated';

/** Bulle d'encre tirée par le boss : avance en ligne droite, sans gravité. */
export interface BossProjectile {
  x: number;
  y: number;
  vx: number;
  /** Secondes écoulées depuis le tir (expire à `BOSS.projectileLifeSeconds`). */
  age: number;
}

export interface BossState {
  body: Body;
  health: number;
  phase: BossPhase;
  /** Secondes restantes dans la phase courante. */
  phaseTimer: number;
  patrolMinX: number;
  patrolMaxX: number;
  facing: 1 | -1;
  /** Secondes avant le prochain tir de bulle d'encre. */
  rangedCooldown: number;
  projectiles: BossProjectile[];
}

function phaseDuration(phase: BossPhase): number {
  switch (phase) {
    case 'patrol':
      return BOSS.patrolSeconds;
    case 'telegraph':
      return BOSS.telegraphSeconds;
    case 'vulnerable':
      return BOSS.vulnerableSeconds;
    case 'recover':
      return BOSS.recoverSeconds;
    case 'defeated':
      return 0;
  }
}

function nextPhase(phase: BossPhase): BossPhase {
  switch (phase) {
    case 'patrol':
      return 'telegraph';
    case 'telegraph':
      return 'vulnerable';
    case 'vulnerable':
      return 'recover';
    case 'recover':
      return 'patrol';
    case 'defeated':
      return 'defeated';
  }
}

export function createBoss(x: number, y: number, patrolMinX: number, patrolMaxX: number): BossState {
  return {
    body: { x, y, w: BOSS.width, h: BOSS.height, vx: 0, vy: 0 },
    health: BOSS.health,
    phase: 'patrol',
    phaseTimer: BOSS.patrolSeconds,
    patrolMinX,
    patrolMaxX,
    facing: 1,
    rangedCooldown: BOSS.rangedCooldownSeconds,
    projectiles: [],
  };
}

function fireProjectile(boss: BossState, playerBody: Body): BossProjectile {
  const dir = playerBody.x + playerBody.w / 2 < boss.body.x + boss.body.w / 2 ? -1 : 1;
  return {
    x: boss.body.x + boss.body.w / 2,
    y: boss.body.y + boss.body.h / 2,
    vx: BOSS.projectileSpeed * dir,
    age: 0,
  };
}

/**
 * Un pas de simulation du boss. Fonction pure, testée. Pendant la patrouille,
 * le boss avance vers le joueur (IA réactive plutôt qu'un aller-retour fixe)
 * en restant dans ses bornes, et tire périodiquement une bulle d'encre lente.
 */
export function stepBoss(boss: BossState, isSolid: SolidQuery, dtSeconds: number, playerBody: Body): BossState {
  if (boss.phase === 'defeated') return boss;

  const body: Body = { ...boss.body };
  let facing = boss.facing;

  if (boss.phase === 'patrol') {
    facing = playerBody.x + playerBody.w / 2 < body.x + body.w / 2 ? -1 : 1;
    body.vx = BOSS.patrolSpeed * facing;
  } else {
    body.vx = 0;
  }
  body.vy = Math.min(body.vy + PHYSICS.gravity * dtSeconds, PHYSICS.maxFallSpeed);
  const moved = moveBody(body, dtSeconds, isSolid, TILE_SIZE);
  if (boss.phase === 'patrol') {
    moved.body.x = Math.min(Math.max(moved.body.x, boss.patrolMinX), boss.patrolMaxX);
  }

  let rangedCooldown = Math.max(0, boss.rangedCooldown - dtSeconds);
  let projectiles = boss.projectiles
    .map((p) => ({ ...p, x: p.x + p.vx * dtSeconds, age: p.age + dtSeconds }))
    .filter((p) => p.age < BOSS.projectileLifeSeconds);
  if (boss.phase === 'patrol' && rangedCooldown <= 0) {
    projectiles = [...projectiles, fireProjectile(boss, playerBody)];
    rangedCooldown = BOSS.rangedCooldownSeconds;
  }

  const phaseTimer = boss.phaseTimer - dtSeconds;
  if (phaseTimer > 0) {
    return { ...boss, body: moved.body, facing, phaseTimer, rangedCooldown, projectiles };
  }
  const phase = nextPhase(boss.phase);
  return { ...boss, body: moved.body, facing, phase, phaseTimer: phaseDuration(phase), rangedCooldown, projectiles };
}

export function bossOverlapsPlayer(boss: BossState, playerBody: Body): boolean {
  return aabbOverlap(
    playerBody.x,
    playerBody.y,
    playerBody.w,
    playerBody.h,
    boss.body.x,
    boss.body.y,
    boss.body.w,
    boss.body.h,
  );
}

/**
 * Le dash HÂTE ne fait mal que dans la fenêtre "vulnerable" (télégraphée) :
 * un coup pendant patrol/telegraph/recover ne compte pas. Un coup qui touche
 * referme immédiatement la fenêtre (passage en "recover") pour éviter de
 * vider les PV d'un coup si le dash reste actif plusieurs frames.
 */
export function resolveBossDashHit(boss: BossState, playerBody: Body, dashActive: boolean): BossState {
  if (boss.phase !== 'vulnerable' || !dashActive || !bossOverlapsPlayer(boss, playerBody)) {
    return boss;
  }
  const health = boss.health - 1;
  if (health <= 0) {
    return { ...boss, health: 0, phase: 'defeated', phaseTimer: 0 };
  }
  return { ...boss, health, phase: 'recover', phaseTimer: phaseDuration('recover') };
}

/**
 * Retire les bulles d'encre qui touchent le joueur et compte les coups reçus
 * (les dégâts eux-mêmes s'appliquent côté jeu, comme le contact du corps du
 * boss). Fonction pure et testée séparément de `stepBoss`.
 */
export function resolveProjectileHits(boss: BossState, playerBody: Body): { boss: BossState; hits: number } {
  if (boss.projectiles.length === 0) return { boss, hits: 0 };
  let hits = 0;
  const remaining: BossProjectile[] = [];
  for (const p of boss.projectiles) {
    const r = BOSS.projectileRadius;
    const overlaps = aabbOverlap(playerBody.x, playerBody.y, playerBody.w, playerBody.h, p.x - r, p.y - r, r * 2, r * 2);
    if (overlaps) hits += 1;
    else remaining.push(p);
  }
  if (hits === 0) return { boss, hits: 0 };
  return { boss: { ...boss, projectiles: remaining }, hits };
}
