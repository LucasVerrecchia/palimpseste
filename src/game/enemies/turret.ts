/**
 * Tourelles fixes (zone 4, crue_01, demande de Lucas 2026-07-29 : « comme le
 * boss au niveau 2 ») : encastrées dans les murs latéraux du puits, elles ne
 * se déplacent jamais mais tirent périodiquement une bulle visée sur le
 * joueur (même anticipation que `boss_coquille_majuscule.ts` :
 * `fireProjectile`). Détruites par HÂTE (rôle "combat" du dash, spec §6,
 * même mécanique que `enemies/enemy.ts`) ; pas de dégât de contact — fixes
 * dans le mur, seul le tir est une menace.
 *
 * Même pattern que enemy.ts/boss_coquille_majuscule.ts (décision D12) :
 * types + fonctions pures, pas d'ECS générique.
 */
import { aabbOverlap, type Body } from '../../engine/physics';
import { TURRET } from '../config';
import type { RoomBounds } from './boss_coquille_majuscule';

export interface TurretProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Secondes écoulées depuis le tir (expire à `TURRET.projectileLifeSeconds`). */
  age: number;
}

export interface TurretState {
  id: number;
  body: Body;
  destroyed: boolean;
  /** Secondes avant le prochain tir ; ignoré une fois `destroyed`. */
  cooldown: number;
  projectiles: TurretProjectile[];
}

export function createTurret(id: number, x: number, y: number): TurretState {
  return {
    id,
    body: { x, y, w: TURRET.width, h: TURRET.height, vx: 0, vy: 0 },
    destroyed: false,
    cooldown: TURRET.initialCooldownSeconds,
    projectiles: [],
  };
}

/** Vise le joueur avec une légère anticipation, même principe que le mi-boss. */
function fireProjectile(turret: TurretState, playerBody: Body): TurretProjectile {
  const originX = turret.body.x + turret.body.w / 2;
  const originY = turret.body.y + turret.body.h / 2;
  const targetX = playerBody.x + playerBody.w / 2 + playerBody.vx * TURRET.projectileLeadSeconds;
  const targetY = playerBody.y + playerBody.h / 2 + playerBody.vy * TURRET.projectileLeadSeconds;
  const dx = targetX - originX;
  const dy = targetY - originY;
  const dist = Math.hypot(dx, dy) || 1;
  return {
    x: originX,
    y: originY,
    vx: (dx / dist) * TURRET.projectileSpeed,
    vy: (dy / dist) * TURRET.projectileSpeed,
    age: 0,
  };
}

/** Distance (centre à centre) entre la tourelle et le joueur. */
function distanceToPlayer(turret: TurretState, playerBody: Body): number {
  const dx = playerBody.x + playerBody.w / 2 - (turret.body.x + turret.body.w / 2);
  const dy = playerBody.y + playerBody.h / 2 - (turret.body.y + turret.body.h / 2);
  return Math.hypot(dx, dy);
}

/**
 * Un pas de simulation d'une tourelle. Fonction pure, testée. Une tourelle
 * détruite ne tire plus mais ses bulles déjà en vol continuent leur course
 * (cohérent avec le mi-boss : détruire la source n'efface pas ce qui vole déjà).
 *
 * Retour de Lucas 2026-07-29 (deuxième playtest) : les tourelles tout en haut
 * tiraient dès l'entrée dans la salle, avant même d'être visibles/à portée.
 * Hors de `TURRET.rangeDistance`, le compte à rebours reste gelé (ni tir, ni
 * décompte) — entrer dans la portée démarre le premier tir normalement,
 * comme si la tourelle venait de repérer le joueur.
 */
export function stepTurret(
  turret: TurretState,
  dtSeconds: number,
  playerBody: Body,
  roomBounds: RoomBounds,
): TurretState {
  let projectiles = turret.projectiles
    .map((p) => ({ ...p, x: p.x + p.vx * dtSeconds, y: p.y + p.vy * dtSeconds, age: p.age + dtSeconds }))
    .filter(
      (p) =>
        p.age < TURRET.projectileLifeSeconds &&
        p.x >= 0 &&
        p.x <= roomBounds.width &&
        p.y >= 0 &&
        p.y <= roomBounds.height,
    );

  if (turret.destroyed) return { ...turret, projectiles };
  if (distanceToPlayer(turret, playerBody) > TURRET.rangeDistance) return { ...turret, projectiles };

  let cooldown = Math.max(0, turret.cooldown - dtSeconds);
  if (cooldown <= 0) {
    projectiles = [...projectiles, fireProjectile(turret, playerBody)];
    cooldown = TURRET.cooldownSeconds;
  }
  return { ...turret, cooldown, projectiles };
}

export function turretOverlapsPlayer(turret: TurretState, playerBody: Body): boolean {
  return aabbOverlap(
    playerBody.x,
    playerBody.y,
    playerBody.w,
    playerBody.h,
    turret.body.x,
    turret.body.y,
    turret.body.w,
    turret.body.h,
  );
}

/** Le dash HÂTE détruit une tourelle en un seul coup (pas de PV à gérer, contrairement au mi-boss). */
export function resolveTurretDashHit(turret: TurretState, playerBody: Body, dashActive: boolean): TurretState {
  if (turret.destroyed || !dashActive || !turretOverlapsPlayer(turret, playerBody)) return turret;
  return { ...turret, destroyed: true };
}

/**
 * Retire les bulles qui touchent le joueur et compte les coups reçus (les
 * dégâts eux-mêmes s'appliquent côté jeu, comme pour le mi-boss). Fonction
 * pure, testée séparément de `stepTurret`.
 */
export function resolveTurretProjectileHits(turret: TurretState, playerBody: Body): { turret: TurretState; hits: number } {
  if (turret.projectiles.length === 0) return { turret, hits: 0 };
  let hits = 0;
  const remaining: TurretProjectile[] = [];
  for (const p of turret.projectiles) {
    const r = TURRET.projectileRadius;
    const overlaps = aabbOverlap(playerBody.x, playerBody.y, playerBody.w, playerBody.h, p.x - r, p.y - r, r * 2, r * 2);
    if (overlaps) hits += 1;
    else remaining.push(p);
  }
  if (hits === 0) return { turret, hits: 0 };
  return { turret: { ...turret, projectiles: remaining }, hits };
}
