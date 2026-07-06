/**
 * Constantes globales de Palimpseste.
 * Règle de la spec (§8) : aucun nombre magique ailleurs dans le code — tout vit ici.
 */

/**
 * Taille de la vue en unités monde (16:9). Le renderer l'affiche en vectoriel
 * à la résolution native de l'écran (voir engine/renderer.ts).
 */
export const INTERNAL_WIDTH = 480;
export const INTERNAL_HEIGHT = 270;

/** Taille d'une tuile de tilemap, en pixels. */
export const TILE_SIZE = 16;

/** Palette « manuscrit » (spec §5). Toute couleur affichée doit venir d'ici. */
export const PALETTE = {
  parchment: '#EDE4D3',
  parchmentShade: '#D8CBB0',
  ink: '#1F1B16',
  sepia: '#5B4A38',
  danger: '#C1362B',
  unwritten: '#CFE3E8',
} as const;

export type PaletteColor = (typeof PALETTE)[keyof typeof PALETTE];

/** Physique du joueur (px, px/s, px/s²). Réglée pour un saut d'environ 3,5 tuiles. */
export const PHYSICS = {
  gravity: 950,
  /** Gravité multipliée quand le saut est relâché en pleine montée (saut variable). */
  releasedRiseGravityFactor: 2.4,
  maxFallSpeed: 480,
  runSpeed: 110,
  jumpVelocity: -330,
} as const;

/** Hitbox du joueur (sprite cible ~16×24, hitbox légèrement plus étroite). */
export const PLAYER = {
  width: 12,
  height: 22,
  maxHealth: 100,
} as const;

/** Ressource d'encre. */
export const INK = {
  max: 100,
} as const;

/** Distance max (px, centre à centre) pour écrire une plateforme non-écrite. */
export const WRITE_RANGE = 80;

/** Marge (px) autour du joueur pour détecter les interactions (PNJ, encrier). */
export const INTERACT_MARGIN = 10;

/** Durée d'affichage des messages éphémères (secondes). */
export const TOAST_SECONDS = 3;

/** Direction artistique « manuscrit moderne » (décision D9, 2026-07-06). */
export const RENDERING = {
  /** Vitesse du lissage de caméra (facteur exponentiel, 1/s). */
  cameraLerpRate: 6,
  /** Rayon d'arrondi des dalles de décor (px monde). */
  slabCornerRadius: 5,
  /** Ombre portée des éléments solides. */
  shadowBlur: 6,
  shadowOffsetY: 3,
  shadowColor: 'rgba(31, 27, 22, 0.28)',
  /** Durée de l'écrasement du joueur à l'atterrissage (s). */
  landSquashSeconds: 0.12,
} as const;

/** Particules d'encre et ambiance. */
export const PARTICLES = {
  maxCount: 220,
  ambientMotes: 18,
  jumpBurst: 6,
  landBurst: 8,
  writeBurst: 18,
  gravity: 260,
} as const;

/** Convertit une couleur hex de la palette en rgba avec alpha. */
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}
