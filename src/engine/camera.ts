/**
 * Caméra 2D : suit une cible, restreinte aux bords du monde.
 * Positions arrondies à l'entier pour rester pixel-perfect au rendu.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class Camera {
  x = 0;
  y = 0;

  follow(
    targetX: number,
    targetY: number,
    viewWidth: number,
    viewHeight: number,
    worldWidth: number,
    worldHeight: number,
  ): void {
    this.x = Math.round(clamp(targetX - viewWidth / 2, 0, Math.max(0, worldWidth - viewWidth)));
    this.y = Math.round(clamp(targetY - viewHeight / 2, 0, Math.max(0, worldHeight - viewHeight)));
  }
}
