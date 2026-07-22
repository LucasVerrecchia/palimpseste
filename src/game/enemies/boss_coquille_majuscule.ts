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

export interface BossState {
  body: Body;
  health: number;
  phase: BossPhase;
  /** Secondes restantes dans la phase courante. */
  phaseTimer: number;
  patrolMinX: number;
  patrolMaxX: number;
  facing: 1 | -1;
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
  };
}

/** Un pas de simulation du boss. Fonction pure, testée. */
export function stepBoss(boss: BossState, isSolid: SolidQuery, dtSeconds: number): BossState {
  if (boss.phase === 'defeated') return boss;

  const body: Body = { ...boss.body };
  let facing = boss.facing;

  if (boss.phase === 'patrol') {
    if (body.x <= boss.patrolMinX) facing = 1;
    else if (body.x >= boss.patrolMaxX) facing = -1;
    body.vx = BOSS.patrolSpeed * facing;
  } else {
    body.vx = 0;
  }
  body.vy = Math.min(body.vy + PHYSICS.gravity * dtSeconds, PHYSICS.maxFallSpeed);
  const moved = moveBody(body, dtSeconds, isSolid, TILE_SIZE);

  const phaseTimer = boss.phaseTimer - dtSeconds;
  if (phaseTimer > 0) {
    return { ...boss, body: moved.body, facing, phaseTimer };
  }
  const phase = nextPhase(boss.phase);
  return { ...boss, body: moved.body, facing, phase, phaseTimer: phaseDuration(phase) };
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
