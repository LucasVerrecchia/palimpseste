/**
 * Contrôleur du joueur : intentions (gauche/droite/saut/dash/haut/bas) →
 * vitesse → physique. Découplé de la classe Input pour rester testable : le
 * jeu traduit l'input en `MoveIntents` avant d'appeler ce module.
 *
 * Les pouvoirs de mouvement (HÂTE, ANCRE, ALES) sont gérés ici plutôt que
 * filtrés en amont dans game.ts : le gating (`unlocked`) reste dans la
 * fonction pure, donc testable sans mocker le jeu entier.
 */
import { isTouchingWall, moveBody, type Body, type SolidQuery } from '../../engine/physics';
import { AIR_JUMP, DASH, PHYSICS, TILE_SIZE, WALL_CLIMB } from '../config';
import { hasAbility } from './abilities';

export interface MoveIntents {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  /** Front montant (appui cette frame), pas un maintien — voir Input.wasPressed. */
  dashPressed: boolean;
}

export interface PlayerState {
  body: Body;
  grounded: boolean;
  /** 1 = regarde à droite, -1 = à gauche (pour le rendu). */
  facing: 1 | -1;
  health: number;
  /** >0 tant que le dash HÂTE est en cours (secondes restantes). */
  dashTimer: number;
  /** >0 : HÂTE ne peut pas se redéclencher (secondes restantes). */
  dashCooldown: number;
  /** Sauts aériens déjà consommés depuis le dernier sol (ALES). */
  airJumpsUsed: number;
  /** Accroché à un mur ce frame (ANCRE) — pour le rendu. */
  wallGrab: boolean;
}

/** Un pas de simulation du joueur. Retourne le nouvel état (l'ancien est intact). */
export function stepPlayer(
  player: PlayerState,
  intents: MoveIntents,
  isSolid: SolidQuery,
  dtSeconds: number,
  unlocked: ReadonlySet<string>,
): PlayerState {
  const body: Body = { ...player.body };
  let dashTimer = Math.max(0, player.dashTimer - dtSeconds);
  let dashCooldown = Math.max(0, player.dashCooldown - dtSeconds);
  let airJumpsUsed = player.grounded ? 0 : player.airJumpsUsed;
  let wallGrab = false;
  let facing = player.facing;

  const canDash = hasAbility(unlocked, 'hate');
  const canClimb = hasAbility(unlocked, 'ancre');
  const canGlide = hasAbility(unlocked, 'ales');

  if (dashTimer > 0) {
    // Dash déjà en cours : la vitesse fixée au déclenchement ne change pas ;
    // aucune gravité pendant la ruade (trajectoire bien horizontale).
    body.vy = 0;
  } else if (canDash && intents.dashPressed && dashCooldown <= 0) {
    const dir = intents.left && !intents.right ? -1 : intents.right && !intents.left ? 1 : player.facing;
    facing = dir;
    body.vx = DASH.speed * dir;
    body.vy = 0;
    dashTimer = DASH.durationSeconds;
    dashCooldown = DASH.cooldownSeconds;
  } else {
    // Déplacement horizontal normal : vitesse constante, arrêt net (feel réactif).
    body.vx = 0;
    if (intents.left) body.vx -= PHYSICS.runSpeed;
    if (intents.right) body.vx += PHYSICS.runSpeed;

    if (canClimb && !player.grounded) {
      const wallDir = intents.left && !intents.right ? -1 : intents.right && !intents.left ? 1 : 0;
      if (wallDir !== 0 && isTouchingWall(body, isSolid, TILE_SIZE, wallDir)) {
        wallGrab = true;
      }
    }

    if (wallGrab) {
      body.vx = 0;
      airJumpsUsed = 0; // s'accrocher redonne le saut aérien (convention metroidvania)
      if (intents.up) body.vy = -WALL_CLIMB.climbSpeed;
      else if (intents.down) body.vy = WALL_CLIMB.climbSpeed;
      else body.vy = WALL_CLIMB.slideSpeed;
    } else {
      // Saut : depuis le sol, ou saut aérien ALES si dispo.
      if (intents.jumpPressed) {
        if (player.grounded) {
          body.vy = PHYSICS.jumpVelocity;
        } else if (canGlide && airJumpsUsed < AIR_JUMP.maxAirJumps) {
          body.vy = AIR_JUMP.jumpVelocity;
          airJumpsUsed += 1;
        }
      }

      // Gravité — renforcée si le saut est relâché en pleine montée (saut
      // variable) ; plafonnée si ALES + Espace maintenu après le saut aérien
      // (vol plané, spec §6).
      const rising = body.vy < 0;
      const gliding = canGlide && !rising && intents.jumpHeld && airJumpsUsed > 0;
      if (gliding) {
        body.vy = Math.min(body.vy + PHYSICS.gravity * dtSeconds, AIR_JUMP.glideFallSpeed);
      } else {
        const gravityFactor = rising && !intents.jumpHeld ? PHYSICS.releasedRiseGravityFactor : 1;
        body.vy = Math.min(body.vy + PHYSICS.gravity * gravityFactor * dtSeconds, PHYSICS.maxFallSpeed);
      }
    }
  }

  const moved = moveBody(body, dtSeconds, isSolid, TILE_SIZE);
  if (!wallGrab && dashTimer <= 0) {
    facing = intents.left && !intents.right ? -1 : intents.right ? 1 : facing;
  }

  return {
    body: moved.body,
    grounded: moved.grounded,
    facing,
    health: player.health,
    dashTimer,
    dashCooldown,
    airJumpsUsed: moved.grounded ? 0 : airJumpsUsed,
    wallGrab,
  };
}
