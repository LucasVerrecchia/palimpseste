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
  /** Fraction des PV max rendue par une fiole d'encre rouge (usage unique). */
  healPotionFraction: 0.5,
} as const;

/** HÂTE — dash horizontal (traînée d'encre). Rôle spec §6 : gaps ET combat. */
export const DASH = {
  speed: 260,
  durationSeconds: 0.16,
  cooldownSeconds: 0.5,
} as const;

/** AILES — double saut / vol plané. */
export const AIR_JUMP = {
  maxAirJumps: 1,
  jumpVelocity: -300,
  /** Chute plafonnée une fois le saut aérien consommé, si on maintient Espace. */
  glideFallSpeed: 70,
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
 * Ennemis communs (spec §6). Pas d'ECS générique (décision D12) : seulement
 * 2 archétypes + 1 mi-boss, des types + fonctions pures suffisent.
 * Détruits par HÂTE (dash) — rôle "combat" explicitement assigné à HÂTE.
 */
export const ENEMY = {
  width: 12,
  height: 14,
  coquilleSpeed: 26,
  ratureSpeed: 42,
  /** Distance (px) sous laquelle une Rature abandonne sa patrouille et poursuit. */
  ratureChaseRange: 70,
  contactDamage: 8,
  /** Anti-spam de dégâts au contact prolongé (secondes). */
  hitCooldownSeconds: 0.6,
} as const;

/**
 * Mi-boss — la Coquille majuscule (spec §6). Cycle de phases télégraphiées :
 * patrouille → charge (télégraphe) → vulnérable (seule fenêtre où HÂTE fait
 * mal) → récupération → patrouille. Évite un combat "au hasard". Pendant la
 * patrouille, le boss avance vers le joueur (IA simple mais réactive, plutôt
 * qu'un aller-retour fixe) et lui tire dessus des bulles d'encre lentes,
 * esquivables — un deuxième type de menace en plus du contact.
 */
export const BOSS = {
  width: 20,
  height: 20,
  health: 3,
  patrolSpeed: 34,
  patrolSeconds: 2.2,
  telegraphSeconds: 0.6,
  vulnerableSeconds: 1,
  recoverSeconds: 1.4,
  contactDamage: 12,
  /** Délai entre deux bulles d'encre tirées (secondes). */
  rangedCooldownSeconds: 2.2,
  /** Vitesse de la bulle (px/s), dans n'importe quelle direction — volontairement lente : esquivable. */
  projectileSpeed: 85,
  projectileRadius: 5,
  /** Durée de vie d'une bulle avant qu'elle s'estompe (secondes). */
  projectileLifeSeconds: 3.5,
  projectileDamage: 8,
  /** Anticipation du tir sur la vitesse du joueur (secondes) — vise "intelligent", pas plus fort. */
  projectileLeadSeconds: 0.3,
} as const;

/** Distance (px) à laquelle le toast d'intro du mi-boss se déclenche (audit narratif 2026-07-26). */
export const BOSS_INTRO_RANGE = 260;

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

/**
 * Écart mini entre deux messages éphémères qui apparaissent (secondes).
 * Anti-spam visuel : sans ça, plusieurs événements simultanés (ex. victoire
 * du mi-boss) empilaient leurs messages d'un coup — retour de playtest
 * 2026-07-22 ("ça peut vite faire brouillon").
 */
export const TOAST_STAGGER_SECONDS = 0.6;

/**
 * Moments narratifs importants (fragment trouvé, mi-boss, déviation, fin de
 * chapitre) : retour de playtest 2026-07-27 — un toast qui s'efface tout
 * seul ne laisse pas le temps de comprendre ce qui se passe. Ces moments
 * mettent le jeu en pause (comme un dialogue) et affichent le texte comme
 * s'il s'écrivait (cohérent avec le thème : le monde EST un manuscrit).
 * Vitesse choisie pour rester lisible sans traîner ("pas trop lent").
 */
export const NARRATION_CHARS_PER_SECOND = 45;

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
  /**
   * Facteur de défilement du décor en arrière-plan (< 1 = défile plus
   * lentement que le premier plan, effet de profondeur). Retour de Lucas
   * (2026-07-22) : le décor narratif doit lire comme de l'arrière-plan, pas
   * comme des éléments calés sur les objets de jeu au premier plan.
   */
  parallaxFactor: 0.85,
} as const;

/**
 * Fond lointain en parallaxe (décision D14, 2026-07-22 ; combiné le même
 * jour après retour de Lucas — cf. `game/world/backdrop.ts`). Contrairement
 * à `RENDERING.parallaxFactor` (décor narratif ponctuel, lié à un
 * évènement), ce fond est un environnement continu présent partout dans la
 * salle : soleil, nuages, collines, traînées de vent, arbres et oiseaux, en
 * 7 plans à des facteurs croissants (plus proche = défile plus vite = plus
 * grand facteur), pour un vrai effet de profondeur ("loin derrière et
 * grand", retour de Lucas). Les plans tuilés horizontalement (tous sauf le
 * soleil, unique par salle) utilisent `engine/parallax.ts` pour couvrir tout
 * l'écran quelle que soit la position caméra.
 */
export const BACKDROP = {
  sunFactor: 0.08,
  cloudsFactor: 0.15,
  cloudsTileWidth: 340,
  mountainsFarFactor: 0.22,
  mountainsFarTileWidth: 260,
  windFactor: 0.32,
  windTileWidth: 220,
  mountainsMidFactor: 0.5,
  mountainsMidTileWidth: 200,
  treesFactor: 0.6,
  treesTileWidth: 100,
  birdsFactor: 0.72,
  birdsTileWidth: 260,
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
