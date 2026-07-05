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
