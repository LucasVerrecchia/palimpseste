/**
 * Ennemis communs — les Coquilles (typos, patrouille simple) et les Ratures
 * (biffures qui poursuivent le joueur pour l'effacer). Décision D12 : pas
 * d'ECS générique pour 2 archétypes + 1 mi-boss, on réplique plutôt le
 * pattern type + fonction pure déjà éprouvé par narrative/deviation.ts.
 *
 * Combat : la spec (§6) assigne explicitement à HÂTE le rôle "gaps, combat".
 * Il n'y a donc pas de bouton d'attaque séparé — le dash traverse et détruit.
 */
import { aabbOverlap, moveBody, type Body, type SolidQuery } from '../../engine/physics';
import { ENEMY, PHYSICS, TILE_SIZE } from '../config';

export type EnemyKind = 'coquille' | 'rature';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  body: Body;
  health: number;
  facing: 1 | -1;
  /** Bornes de patrouille en pixels monde (le long de l'axe X). */
  patrolMinX: number;
  patrolMaxX: number;
  /** Rature uniquement : a repéré le joueur et le poursuit. */
  chasing: boolean;
  /** >0 : vient d'infliger un contact, n'en infligera pas d'autre tout de suite. */
  hitCooldown: number;
}

export function createEnemy(
  id: number,
  kind: EnemyKind,
  x: number,
  y: number,
  patrolMinX: number,
  patrolMaxX: number,
): Enemy {
  return {
    id,
    kind,
    body: { x, y, w: ENEMY.width, h: ENEMY.height, vx: 0, vy: 0 },
    health: 1,
    facing: 1,
    patrolMinX,
    patrolMaxX,
    chasing: false,
    hitCooldown: 0,
  };
}

/** Un pas de simulation d'un ennemi. Fonction pure, testée. */
export function stepEnemy(enemy: Enemy, isSolid: SolidQuery, playerBody: Body, dtSeconds: number): Enemy {
  const body: Body = { ...enemy.body };
  let facing = enemy.facing;
  let chasing = enemy.chasing;
  const hitCooldown = Math.max(0, enemy.hitCooldown - dtSeconds);

  if (enemy.kind === 'rature') {
    const dx = playerBody.x + playerBody.w / 2 - (body.x + body.w / 2);
    chasing = Math.abs(dx) <= ENEMY.ratureChaseRange;
  }

  const speed = enemy.kind === 'coquille' ? ENEMY.coquilleSpeed : ENEMY.ratureSpeed;

  if (chasing) {
    facing = playerBody.x + playerBody.w / 2 >= body.x + body.w / 2 ? 1 : -1;
  } else {
    // Patrouille : rebondit exactement sur ses bornes.
    if (body.x <= enemy.patrolMinX) facing = 1;
    else if (body.x >= enemy.patrolMaxX) facing = -1;
  }
  body.vx = speed * facing;

  body.vy = Math.min(body.vy + PHYSICS.gravity * dtSeconds, PHYSICS.maxFallSpeed);
  const moved = moveBody(body, dtSeconds, isSolid, TILE_SIZE);

  return { ...enemy, body: moved.body, facing, chasing, hitCooldown };
}

/** Le joueur chevauche-t-il cet ennemi (peu importe l'état du dash) ? */
export function overlapsPlayer(enemy: Enemy, playerBody: Body): boolean {
  return aabbOverlap(
    playerBody.x,
    playerBody.y,
    playerBody.w,
    playerBody.h,
    enemy.body.x,
    enemy.body.y,
    enemy.body.w,
    enemy.body.h,
  );
}

export interface DashHitResult {
  enemy: Enemy;
  destroyed: boolean;
}

/**
 * Le dash HÂTE traverse et détruit les ennemis communs (spec §6 : rôle
 * "combat" de HÂTE). `destroyed` à true dès que les PV tombent à 0.
 */
export function resolveDashHit(enemy: Enemy, playerBody: Body, dashActive: boolean): DashHitResult {
  if (!dashActive || !overlapsPlayer(enemy, playerBody)) {
    return { enemy, destroyed: false };
  }
  const health = enemy.health - 1;
  return { enemy: { ...enemy, health }, destroyed: health <= 0 };
}
