/**
 * Contrôleur du joueur : intentions (gauche/droite/saut) → vitesse → physique.
 * Découplé de la classe Input pour rester testable : le jeu traduit l'input
 * en `MoveIntents` avant d'appeler ce module.
 */
import { moveBody, type Body, type SolidQuery } from '../../engine/physics';
import { PHYSICS, TILE_SIZE } from '../config';

export interface MoveIntents {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
}

export interface PlayerState {
  body: Body;
  grounded: boolean;
  /** 1 = regarde à droite, -1 = à gauche (pour le rendu). */
  facing: 1 | -1;
  health: number;
}

/** Un pas de simulation du joueur. Retourne le nouvel état (l'ancien est intact). */
export function stepPlayer(
  player: PlayerState,
  intents: MoveIntents,
  isSolid: SolidQuery,
  dtSeconds: number,
): PlayerState {
  const body: Body = { ...player.body };

  // Déplacement horizontal : vitesse constante, arrêt net (feel réactif).
  body.vx = 0;
  if (intents.left) body.vx -= PHYSICS.runSpeed;
  if (intents.right) body.vx += PHYSICS.runSpeed;

  // Saut : uniquement depuis le sol.
  if (intents.jumpPressed && player.grounded) {
    body.vy = PHYSICS.jumpVelocity;
  }

  // Gravité — renforcée si le saut est relâché en pleine montée (saut variable).
  const rising = body.vy < 0;
  const gravityFactor = rising && !intents.jumpHeld ? PHYSICS.releasedRiseGravityFactor : 1;
  body.vy = Math.min(body.vy + PHYSICS.gravity * gravityFactor * dtSeconds, PHYSICS.maxFallSpeed);

  const moved = moveBody(body, dtSeconds, isSolid, TILE_SIZE);

  const facing: 1 | -1 = intents.left && !intents.right ? -1 : intents.right ? 1 : player.facing;

  return {
    body: moved.body,
    grounded: moved.grounded,
    facing,
    health: player.health,
  };
}
