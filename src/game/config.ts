/**
 * Constantes globales de Palimpseste.
 * Règle de la spec (§8) : aucun nombre magique ailleurs dans le code — tout vit ici.
 */

/** Résolution interne de rendu (16:9), mise à l'échelle par facteur entier vers l'écran. */
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
