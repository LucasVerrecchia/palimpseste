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

/**
 * Ressource d'encre. Le joueur trace des blocs d'encre à la souris (clic
 * gauche) ; le clic droit les efface et rembourse l'encre. La difficulté vient
 * du budget limité entre deux encriers + du puzzle « effacer pour réutiliser ».
 */
export const INK = {
  max: 80,
  /** Coût d'encre par tuile tracée (remboursé à l'identique à l'effacement). */
  costPerTile: 4,
  /** Portée max (px, centre joueur → centre tuile) pour tracer/effacer. */
  reach: 96,
} as const;

/** Marge (px) autour du joueur pour détecter les interactions (PNJ, encrier). */
export const INTERACT_MARGIN = 10;

/**
 * Reprendre la sauvegarde au démarrage ? `false` pendant le développement :
 * relancer le jeu repart proprement du début du chapitre (au spawn), au lieu
 * de réapparaître au dernier encrier. L'encrier reste un checkpoint en cours de
 * partie (touche R) et le système de save continue d'écrire — on rebranchera la
 * reprise via un menu « Continuer » plus tard. Typé `boolean` volontairement
 * (et non littéral) pour rester un vrai interrupteur.
 */
export const AUTO_RESUME: boolean = false;

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
  maxCount: 260,
  ambientMotes: 18,
  jumpBurst: 6,
  landBurst: 8,
  drawBurst: 2,
  eraseBurst: 3,
  gravity: 260,
} as const;

/** Rendu du curseur de tracé et de la portée. */
export const DRAW = {
  reachRingColor: 'rgba(31, 27, 22, 0.05)',
  cursorPaintColor: 'rgba(31, 27, 22, 0.55)',
  cursorEraseColor: 'rgba(193, 54, 43, 0.6)',
  cursorBlockedColor: 'rgba(193, 54, 43, 0.25)',
} as const;

/** Convertit une couleur hex de la palette en rgba avec alpha. */
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}
