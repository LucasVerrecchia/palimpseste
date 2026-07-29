/**
 * Effondrement du plafond (salle_tresor, demande de Lucas 2026-07-29) : une
 * fois le trésor ramassé, des blocs tombent du plafond à intervalle régulier
 * depuis des points de chute fixes (données de salle, `debris_spawn`) ; le
 * joueur doit courir jusqu'à la sortie sans se faire écraser. Même sévérité
 * que les autres échecs du jeu (retour au dernier encrier) — pas de système
 * de dégâts partiels dédié.
 *
 * Même pattern que enemies/turret.ts (décision D12) : types + fonctions
 * pures, pas d'ECS générique. Point de chute choisi en tournant (pas
 * `Math.random()`, pour rester déterministe et testable — même esprit que
 * `seededRandom` ailleurs dans le projet, mais un simple round-robin suffit
 * ici, pas besoin de dispersion visuelle).
 */
import { aabbOverlap, type Body } from '../../engine/physics';
import { FALLING_DEBRIS } from '../config';

export interface DebrisPiece {
  id: number;
  x: number;
  y: number;
}

export interface DebrisField {
  pieces: DebrisPiece[];
  spawnTimer: number;
  nextSpawnIndex: number;
  nextId: number;
}

export function createDebrisField(): DebrisField {
  return { pieces: [], spawnTimer: FALLING_DEBRIS.initialDelaySeconds, nextSpawnIndex: 0, nextId: 1 };
}

/**
 * Avance la simulation d'un pas. `spawnPoints` : positions (x du centre, y du
 * plafond) lues depuis les objets `debris_spawn` de la salle. Un point de
 * chute déjà occupé par un bloc encore en l'air n'est pas resollicité tant
 * que ce bloc n'a pas atteint le sol (évite un empilement au même endroit).
 */
export function stepDebrisField(
  field: DebrisField,
  dtSeconds: number,
  spawnPoints: readonly { x: number; y: number }[],
  floorY: number,
): DebrisField {
  const pieces = field.pieces
    .map((p) => ({ ...p, y: p.y + FALLING_DEBRIS.fallSpeed * dtSeconds }))
    .filter((p) => p.y < floorY);

  let spawnTimer = field.spawnTimer - dtSeconds;
  let nextSpawnIndex = field.nextSpawnIndex;
  let nextId = field.nextId;
  let nextPieces = pieces;
  if (spawnTimer <= 0 && spawnPoints.length > 0) {
    const point = spawnPoints[nextSpawnIndex % spawnPoints.length];
    if (point !== undefined) {
      nextPieces = [...pieces, { id: nextId, x: point.x, y: point.y }];
      nextId += 1;
    }
    nextSpawnIndex += 1;
    spawnTimer = FALLING_DEBRIS.spawnIntervalSeconds;
  }
  return { pieces: nextPieces, spawnTimer, nextSpawnIndex, nextId };
}

/** Un bloc au contact du joueur suffit (retour au dernier encrier, même sévérité qu'ailleurs). */
export function debrisHitsPlayer(field: DebrisField, playerBody: Body): boolean {
  const size = FALLING_DEBRIS.width;
  return field.pieces.some((p) =>
    aabbOverlap(playerBody.x, playerBody.y, playerBody.w, playerBody.h, p.x - size / 2, p.y - size / 2, size, FALLING_DEBRIS.height),
  );
}
