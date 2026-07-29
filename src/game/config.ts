/**
 * Constantes globales de Palimpseste.
 * Règle de la spec (§8) : aucun nombre magique ailleurs dans le code — tout vit ici.
 */
import type { SfxTone } from '../engine/audio';

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
  /** Étoiles, uniquement dans les salles de nuit (marge_01, D-nuit 2026-07-28). */
  starsFactor: 0.1,
  starsTileWidth: 90,
  /** Opacité du voile sombre qui assombrit tout le décor la nuit. */
  nightWashAlpha: 0.55,
} as const;

/**
 * Scène narrative "l'enfant sur la colline" (marge_01, décor de nuit,
 * décision de Lucas 2026-07-28, revue en stickman animé le même jour après
 * playtest) : silhouette articulée (pas un blob), animée même assise. Tant
 * que la phrase n'a pas changé, elle regarde la lune. Dès que la phrase
 * change, elle se lève et s'en va à pied, dans un sens ou l'autre selon la
 * voie, pour disparaître derrière une colline (jamais d'un coup).
 */
export const MARGE_CHILD_SCENE = {
  /** Durée de la marche de départ, quelle que soit la voie prise. */
  walkSeconds: 4,
  /** Amplitude/vitesse du balancement idle pendant que l'enfant regarde la lune. */
  idleSwayAmplitude: 1.2,
  idleSwayHz: 0.35,
  /** Vitesse du cycle de marche (balancement des jambes/bras). */
  walkCycleHz: 2.2,
  /** Fraction finale de la marche (0 à 1) pendant laquelle la silhouette s'estompe, en plus d'être masquée par la colline. */
  fadeOutStart: 0.8,
} as const;

/** Opacité à laquelle une couleur "devint" (chambre des mots) teinte le parchemin plutôt que de le remplacer (retour de Lucas 2026-07-28 : en couleur pleine, la page n'est plus "jolie"). */
export const PAGE_TRANSFORM_TINT_ALPHA = 0.35;

/**
 * Scène narrative "l'enfant contre le Troll d'Encre" (arène du mi-boss,
 * chapitre_01, décision de Lucas 2026-07-28, même principe que
 * `MARGE_CHILD_SCENE`) : uniquement sur la voie où le décor montre cet
 * affrontement (pas "La Marge", RATURE, décor inchangé). Dès que le vrai
 * mi-boss est vaincu, le troll s'efface, l'enfant célèbre puis marche vers
 * la sortie de la page (droite).
 */
export const CHAPITRE1_ARENA_SCENE = {
  /** Durée de la célébration avant le départ (le troll s'efface dans le premier tiers). */
  celebrateSeconds: 1.6,
  /** Durée de la marche de sortie. */
  walkSeconds: 3,
  /** Fraction finale de la marche pendant laquelle la silhouette s'estompe. */
  fadeOutStart: 0.8,
  /** Vitesse du cycle de marche/combat (balancement des membres). */
  walkCycleHz: 2.2,
  idleSwayHz: 1.8,
} as const;

/**
 * Tourelles fixes (zone 4, salle `crue_01`, demande de Lucas 2026-07-29 :
 * « comme le boss au niveau 2 ») : encastrées dans les murs, ne bougent
 * jamais, tirent une bulle visée à intervalle régulier. Détruites par HÂTE
 * (un seul coup, pas de PV) ; pas de dégât de contact. Valeurs proches de
 * `BOSS` par cohérence visuelle/de rythme, mais un peu plus fréquentes (pas
 * de phases télégraphiées ici, juste un cooldown).
 */
export const TURRET = {
  width: 12,
  height: 12,
  /** Délai avant le tout premier tir une fois le joueur entré dans sa portée. */
  initialCooldownSeconds: 1.4,
  /**
   * Cadence de tir (retour de Lucas 2026-07-29 : « un peu moins souvent »,
   * remonté depuis 2.2).
   */
  cooldownSeconds: 3.4,
  projectileSpeed: 95,
  projectileRadius: 4,
  projectileLifeSeconds: 4,
  projectileDamage: 8,
  projectileLeadSeconds: 0.3,
  /**
   * Distance (px) sous laquelle une tourelle repère le joueur et se met à
   * tirer ; au-delà, elle reste inerte (retour de Lucas : les tourelles tout
   * en haut ne doivent pas tirer dès le début du niveau).
   */
  rangeDistance: 130,
} as const;

/**
 * Liquide montant (zone 4, salle `crue_01`, décision de Lucas 2026-07-29) :
 * salle verticale où le joueur grimpe en se traçant ses propres plateformes,
 * plus vite qu'une surface qui monte en continu. Deux encriers (bas et
 * mi-parcours, plateformes non tracées par le joueur) redonnent de l'encre
 * et remettent la surface à un niveau sûr sous le joueur à chaque retour.
 * Vitesse volontairement modeste pour un premier passage : le tracé à la
 * souris n'est pas scriptable, donc pas testable automatiquement — à
 * resserrer après le playtest de Lucas comme le reste des mécaniques d'encre.
 */
export const RISING_HAZARD = {
  /**
   * Vitesse de montée de la surface (px/s). Remontée de 12 à 16 (2026-07-29,
   * retour de Lucas : « il faudrait que l'eau monte un petit peu plus vite »),
   * puis à 20 le jour même (« il faudrait qu'elle monte un peu plus vite
   * encore »).
   */
  riseSpeed: 20,
  /** Marge (px) laissée sous les pieds du joueur quand la surface se remet à niveau après un retour à l'encrier. */
  restartOffset: 32,
  /** Amplitude/fréquence de l'ondulation dessinée à la surface (liquide vivant, pas une ligne figée). */
  waveAmplitude: 2,
  waveHz: 0.6,
  /**
   * Opacité de la dalle/ligne de surface (retour de Lucas 2026-07-29 : « l'eau
   * devrait être un peu plus foncée » — remonté depuis 0.4/0.8 fixes en dur).
   */
  fillAlpha: 0.58,
  strokeAlpha: 0.9,
} as const;

/**
 * Effondrement du plafond de `salle_tresor` (demande de Lucas 2026-07-29,
 * en remplacement d'une première version où le trésor se trouvait au fond
 * d'un corridor du puits de `crue_01` — remplacée par une salle séparée
 * après un bug : le joueur y touchait à tort le niveau de l'eau montante,
 * qui n'existe pourtant pas dans cette salle). Une fois le trésor ramassé,
 * des blocs tombent en continu depuis des points fixes du plafond
 * (`game/world/falling_debris.ts`) : il faut courir jusqu'à la sortie sans
 * se faire toucher.
 */
export const FALLING_DEBRIS = {
  width: 16,
  height: 16,
  /** Vitesse de chute (px/s). */
  fallSpeed: 150,
  /** Délai avant la toute première chute, après le ramassage du trésor. */
  initialDelaySeconds: 0.6,
  /** Cadence des chutes suivantes. */
  spawnIntervalSeconds: 0.85,
} as const;

/**
 * Cinématique de fin RATURE (demande de Lucas 2026-07-29 : « une petite
 * cinématique de notre personnage qui s'en va, qui sort du livre doucement,
 * et qui disparaît dans un fondu au noir »). C'est le PERSONNAGE PRINCIPAL
 * (`renderPlayer`, la même forme qu'en jeu) qui marche, pas la silhouette de
 * l'enfant de `marge_01` (retour de Lucas, un essai précédent réutilisait à
 * tort ce dernier). POINT FINAL/indécis n'a pas cette cinématique (juste un
 * texte de clôture, `finalizeEnding`, puis l'écran de fin classique,
 * `ui/ending_screen.ts`).
 */
export const ENDING_SCENE = {
  /** Durée de la marche avant le fondu (secondes). */
  walkSeconds: 3,
  /** Durée du fondu au noir, une fois la marche finie (secondes). */
  fadeSeconds: 1.6,
  /** Position de départ/arrivée de la marche (espace vue, 480×270) — sort quasiment du cadre avant le fondu. */
  walkStartX: 140,
  walkEndX: 440,
  groundY: 190,
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

/**
 * Musique de fond (demande de Lucas 2026-07-29, fichier fourni dans
 * `src/fx/music`) : bouclée tant que le jeu est actif (écran-titre compris),
 * volume réduit (`duckFactor`) quand le menu pause est ouvert. Coupure totale
 * via le menu Options, réglage persistant (`game/settings.ts`).
 */
export const MUSIC = {
  baseVolume: 0.45,
  pausedDuckFactor: 0.3,
} as const;

/**
 * Bruitages synthétisés (Web Audio, `engine/audio.ts`) — pas de fichier son,
 * cohérent avec le « zéro asset » du rendu (D9). Un simple glissando de
 * fréquence par action : saut (montant), double saut AILES (plus aigu, plus
 * court), dash HÂTE (descendant, plus grave), tir de projectile (mi-boss et
 * tourelles, aigu et bref). Valeurs posées comme un premier passage
 * raisonnable, pas calibrées à l'oreille par Lucas — à ajuster après son
 * retour comme le reste des constantes de gameplay.
 */
export const SFX: Record<'jump' | 'doubleJump' | 'dash' | 'shoot', SfxTone> = {
  jump: { type: 'sine', startFreq: 340, endFreq: 620, durationSeconds: 0.12, gain: 0.18 },
  doubleJump: { type: 'triangle', startFreq: 480, endFreq: 860, durationSeconds: 0.1, gain: 0.16 },
  dash: { type: 'sawtooth', startFreq: 260, endFreq: 90, durationSeconds: 0.16, gain: 0.16 },
  shoot: { type: 'square', startFreq: 720, endFreq: 340, durationSeconds: 0.08, gain: 0.12 },
} as const;
