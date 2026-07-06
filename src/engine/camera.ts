/**
 * Caméra 2D : suit une cible avec lissage exponentiel (inertie), restreinte
 * aux bords du monde. Positions en flottants — le rendu vectoriel n'a pas
 * besoin d'arrondi.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class Camera {
  x = 0;
  y = 0;

  /**
   * Avance la caméra vers la cible. `smoothing` ∈ (0,1] : proportion du
   * chemin parcourue cette frame (1 = collage immédiat). Le jeu calcule
   * typiquement `1 - exp(-rate * dt)` pour un lissage indépendant du framerate.
   */
  follow(
    targetX: number,
    targetY: number,
    viewWidth: number,
    viewHeight: number,
    worldWidth: number,
    worldHeight: number,
    smoothing = 1,
  ): void {
    const desiredX = clamp(targetX - viewWidth / 2, 0, Math.max(0, worldWidth - viewWidth));
    const desiredY = clamp(targetY - viewHeight / 2, 0, Math.max(0, worldHeight - viewHeight));
    this.x += (desiredX - this.x) * smoothing;
    this.y += (desiredY - this.y) * smoothing;
  }
}
