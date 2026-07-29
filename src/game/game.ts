/**
 * Orchestrateur du jeu : relie input souris/clavier, physique, salle, encre,
 * dialogues, save et rendu. Les règles métier restent dans les modules purs.
 *
 * Mécanique centrale (décision D10) : le joueur TRACE ses blocs d'encre à la
 * souris (clic gauche) dans une portée limitée autour de lui, et les EFFACE
 * (clic droit) pour récupérer l'encre. La difficulté vient du budget d'encre
 * entre deux encriers et du puzzle « effacer derrière soi pour réutiliser ».
 *
 * Rendu « manuscrit moderne » (D9) : vectoriel haute résolution, dalles
 * arrondies ombrées, particules d'encre, squash & stretch. Aucun asset.
 */
import { MusicPlayer, SfxPlayer } from '../engine/audio';
import { Camera } from '../engine/camera';
import type { Input } from '../engine/input';
import { seededRandom, tileIndicesCovering } from '../engine/parallax';
import { aabbOverlap } from '../engine/physics';
import type { Pointer } from '../engine/pointer';
import type { Viewport } from '../engine/renderer';
import { loadJson, saveJson, type StorageLike } from '../engine/save';
import {
  parseTiledMap,
  tilesBetween,
  type RoomObject,
  type TileCoord,
  type TileRect,
} from '../engine/tilemap';
import {
  BOSS,
  BOSS_INTRO_RANGE,
  CHAPITRE1_ARENA_SCENE,
  DRAW,
  ENDING_SCENE,
  ENEMY,
  FALLING_DEBRIS,
  hexAlpha,
  INK,
  INTERACT_MARGIN,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  MARGE_CHILD_SCENE,
  MUSIC,
  NARRATION_CHARS_PER_SECOND,
  PAGE_TRANSFORM_TINT_ALPHA,
  PALETTE,
  PARTICLES,
  PHYSICS,
  PLAYER,
  RENDERING,
  RISING_HAZARD,
  SFX,
  TILE_SIZE,
  TURRET,
  TOAST_SECONDS,
  TOAST_STAGGER_SECONDS,
} from './config';
import {
  bossOverlapsPlayer,
  createBoss,
  resolveBossDashHit,
  resolveProjectileHits,
  stepBoss,
  type BossState,
} from './enemies/boss_coquille_majuscule';
import { createEnemy, overlapsPlayer, resolveDashHit, stepEnemy, type Enemy } from './enemies/enemy';
import {
  createTurret,
  resolveTurretDashHit,
  resolveTurretProjectileHits,
  stepTurret,
  type TurretState,
} from './enemies/turret';
import { createGameBus, type GameEventBus } from './events';
import {
  advanceDialogue,
  currentNode,
  parseDialogueData,
  resolveDialogueStart,
  startDialogue,
  type DialogueData,
  type DialogueEffect,
  type DialogueState,
} from './narrative/dialogue';
import { allAbilities, getAbility, hasAbility } from './player/abilities';
import { stepPlayer, type PlayerState } from './player/controller';
import { canAfford, createInk, reclaimInk, refillInk, spendInk, type InkState } from './player/ink';
import { parseSave, saveKey, SAVE_SLOT_COUNT, SAVE_VERSION, type SaveData } from './save';
import { DEFAULT_SETTINGS, parseSettings, SETTINGS_KEY } from './settings';
import { drawDialogueBox, drawNarrationBox, hitTestDialogueChoices, type DialogueLayout } from './ui/dialogue_box';
import { drawEndingScreen, drawRatureEndingText } from './ui/ending_screen';
import { drawHud, drawToasts, type Toast } from './ui/hud';
import { drawOptionsMenu, hitTestOptionsMenu } from './ui/options_menu';
import {
  drawPauseMenu,
  hitTestPauseAdmin,
  hitTestPauseMenu,
  PAUSE_MENU_OPTIONS,
  type AdminRoom,
  type PauseView,
} from './ui/pause_menu';
import { drawSlotList, hitTestSlotList, type SlotDisplay } from './ui/slot_list';
import { drawTitleMain, hitTestTitleMain, TITLE_MENU_OPTIONS, type TitleView } from './ui/title_menu';
import musicUrl from '../fx/music/HackathonGameSong.mp3';
import { renderBackdrop } from './world/backdrop';
import { Room } from './world/room';
import {
  applyLeaning,
  isBlankFilled,
  isDeviationLocked,
  objectTiles,
  resolveLeaning,
  resolveSentence,
  type Leaning,
  type SentenceVariant,
} from './narrative/deviation';
import { resolveBossFlavor, type BossFlavorVariant } from './narrative/boss_flavor';
import { resolveHazardFlavor, type HazardFlavorVariant } from './narrative/hazard_flavor';
import { advanceHazard, isCaughtByHazard } from './world/rising_hazard';
import { createDebrisField, debrisHitsPlayer, stepDebrisField, type DebrisField } from './world/falling_debris';
import {
  composeTransformSentence,
  resolveTransformation,
  resolveWorldColor,
  type TransformWordDef,
  type WorldTransformation,
} from './narrative/world_transform';
import dialoguePnjMarge from '../data/dialogues/pnj_marge.json';
import dialoguePnjRatures from '../data/dialogues/pnj_ratures.json';
import dialoguePnjRaturesIndiceCiel from '../data/dialogues/pnj_ratures_indice_ciel.json';
import dialoguePnjRaturesIndiceRouge from '../data/dialogues/pnj_ratures_indice_rouge.json';
import roomMarge01 from '../data/rooms/marge_01.json';
import roomChapitre01 from '../data/rooms/chapitre_01.json';
import roomRatures01 from '../data/rooms/ratures_01.json';
import roomCrue01 from '../data/rooms/crue_01.json';
import roomSalleTresor from '../data/rooms/salle_tresor.json';
import chapterMarge01 from '../data/chapters/marge_01.json';
import chapterChapitre01 from '../data/chapters/chapitre_01.json';
import chapterRatures01 from '../data/chapters/ratures_01.json';
import chapterCrue01 from '../data/chapters/crue_01.json';

/**
 * Registre des salles chargeables (Phase 2, D13) : au lieu d'une seule salle
 * en dur, `loadRoom` pioche ici selon les portes/la sauvegarde. `unknown` car
 * `parseTiledMap` valide la forme lui-même — pas de double typage du JSON.
 */
const ROOMS: Record<string, unknown> = {
  marge_01: roomMarge01,
  chapitre_01: roomChapitre01,
  ratures_01: roomRatures01,
  crue_01: roomCrue01,
  salle_tresor: roomSalleTresor,
};

const DEFAULT_ROOM_ID = 'marge_01';

/** Salles proposées par le menu Admin (menu pause) — mêmes ids que `ROOMS`, avec un libellé lisible. */
const ADMIN_ROOMS: readonly AdminRoom[] = [
  { id: 'marge_01', label: 'La Marge (chapitre 1)' },
  { id: 'chapitre_01', label: 'Le Chapitre Premier (niveau 2)' },
  { id: 'ratures_01', label: 'Les Ratures (niveau 3)' },
  { id: 'crue_01', label: 'La Crue (niveau 4)' },
  { id: 'salle_tresor', label: 'La salle aux trésors (bonus, niveau 4)' },
];

/**
 * Texte du repère de voie narrative (menu pause) — [proposition], à valider
 * avec Lucas comme le reste du texte visible. Retour de playtest
 * 2026-07-26 : sans repère persistant, impossible de savoir a posteriori
 * dans quel axe on se trouve.
 */
const LEANING_LINES: Record<Leaning, readonly [string, string]> = {
  rature: ['Voie : RATURE', 'tu restes hors du récit'],
  point_final: ['Voie : POINT FINAL', 'tu continues le récit'],
  indecise: ['Voie : indécise', 'les deux voies restent ouvertes'],
};

/** Libellés courts pour les résumés d'emplacement de sauvegarde (écran-titre). */
const ROOM_SHORT_LABELS: Record<string, string> = {
  marge_01: 'La Marge',
  chapitre_01: 'Le Chapitre Premier',
  ratures_01: 'Les Ratures',
  crue_01: 'La Crue',
  salle_tresor: 'La salle aux trésors',
};
/**
 * Flag posé en actionnant le robinet/fermoir en haut de crue_01 (retour de
 * Lucas 2026-07-29) : arrête pour de bon la montée du liquide (`updateHazard`).
 * Nom de flag fixe (comme `boss_coquille_majuscule_vaincu`, `chapitre1_fini`)
 * plutôt que lu depuis une propriété de l'objet `valve` : un seul robinet
 * dans un seul niveau, pas besoin d'indirection.
 */
const CRUE01_VALVE_FLAG = 'crue01_eau_stoppee';
/**
 * Largeur (en tuiles) du puits vertical proprement dit dans crue_01, avant
 * l'extension "salle-trésor" ajoutée à droite (2026-07-29). Doit rester
 * synchronisée avec `SHAFT_W` de `tools/gen_room_crue01.mjs` — vérifiée par
 * un test de régression sur les données réelles (tests/tilemap.test.ts).
 */
const CRUE01_SHAFT_WIDTH = 14;

const LEANING_SHORT: Record<Leaning, string> = {
  rature: 'RATURE',
  point_final: 'POINT FINAL',
  indecise: 'indécis',
};

/** Lecture défensive des variantes de phrase (import JSON → type sûr). */
function parseSentenceVariants(raw: readonly unknown[]): SentenceVariant[] {
  const variants: SentenceVariant[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    if (typeof obj['text'] !== 'string') continue;
    const when: Record<string, boolean> = {};
    const rawWhen = obj['when'];
    if (typeof rawWhen === 'object' && rawWhen !== null) {
      for (const [flag, value] of Object.entries(rawWhen as Record<string, unknown>)) {
        if (typeof value === 'boolean') when[flag] = value;
      }
    }
    variants.push({ when, text: obj['text'] });
  }
  return variants;
}

/** Lecture défensive des variantes de peau du mi-boss (import JSON → type sûr), même principe que parseSentenceVariants. */
function parseBossFlavorVariants(raw: readonly unknown[]): BossFlavorVariant[] {
  const variants: BossFlavorVariant[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    const { name, label, introToast, defeatToast, decor } = obj;
    if (
      typeof name !== 'string' ||
      typeof label !== 'string' ||
      typeof introToast !== 'string' ||
      typeof defeatToast !== 'string' ||
      (decor !== 'hand_quill' && decor !== 'creature')
    ) {
      continue;
    }
    const when: Record<string, boolean> = {};
    const rawWhen = obj['when'];
    if (typeof rawWhen === 'object' && rawWhen !== null) {
      for (const [flag, value] of Object.entries(rawWhen as Record<string, unknown>)) {
        if (typeof value === 'boolean') when[flag] = value;
      }
    }
    variants.push({ when, name, label, introToast, defeatToast, decor });
  }
  return variants;
}

/** Lecture défensive des variantes de peau du liquide montant (import JSON → type sûr), même principe. */
function parseHazardFlavorVariants(raw: readonly unknown[]): HazardFlavorVariant[] {
  const variants: HazardFlavorVariant[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    const { name, color, introNarration, catchMessage, valveLabel, stopMessage, treasureText, collapseMessage, crushedMessage } = obj;
    if (
      typeof name !== 'string' ||
      (color !== 'ink' && color !== 'unwritten') ||
      typeof introNarration !== 'string' ||
      typeof catchMessage !== 'string' ||
      typeof valveLabel !== 'string' ||
      typeof stopMessage !== 'string' ||
      typeof treasureText !== 'string' ||
      typeof collapseMessage !== 'string' ||
      typeof crushedMessage !== 'string'
    ) {
      continue;
    }
    const when: Record<string, boolean> = {};
    const rawWhen = obj['when'];
    if (typeof rawWhen === 'object' && rawWhen !== null) {
      for (const [flag, value] of Object.entries(rawWhen as Record<string, unknown>)) {
        if (typeof value === 'boolean') when[flag] = value;
      }
    }
    variants.push({
      when, name, color, introNarration, catchMessage, valveLabel, stopMessage, treasureText, collapseMessage, crushedMessage,
    });
  }
  return variants;
}

/** Lecture défensive des transformations prévues (couple sujet/attribut → effet), même principe. */
function parseWorldTransformations(raw: readonly unknown[]): WorldTransformation[] {
  const transformations: WorldTransformation[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    const { subjectId, attributeId, flag, target, colorHex, isTempleCode } = obj;
    if (
      typeof subjectId !== 'string' ||
      typeof attributeId !== 'string' ||
      typeof flag !== 'string' ||
      typeof target !== 'string' ||
      typeof colorHex !== 'string'
    ) {
      continue;
    }
    transformations.push({
      subjectId,
      attributeId,
      flag,
      target,
      colorHex,
      ...(isTempleCode === true ? { isTempleCode: true } : {}),
    });
  }
  return transformations;
}

type Mode = 'title' | 'playing' | 'dialogue' | 'narration' | 'paused' | 'ending';

interface NarrationState {
  text: string;
  /** Secondes écoulées depuis le début de l'écriture (× NARRATION_CHARS_PER_SECOND = caractères révélés). */
  elapsedSeconds: number;
  /** Une fois cette narration refermée, bascule vers ce mode au lieu de `'playing'` (ex. écran de fin). */
  onClose?: 'ending';
}

interface ActiveDialogue {
  data: DialogueData;
  state: DialogueState;
  selected: number;
}

/** Un mot de la chambre des mots, porté par le joueur ou déposé dans un slot (game.ts + world_transform.ts). */
interface CarriedTransformWord extends TransformWordDef {
  role: 'subject' | 'attribute';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Mote {
  x: number;
  y: number;
  speed: number;
  phase: number;
  size: number;
}

interface Cursor {
  tx: number;
  ty: number;
  worldX: number;
  worldY: number;
  inReach: boolean;
}

export class Game {
  private readonly input: Input;
  private readonly pointer: Pointer;
  private readonly viewport: Viewport;
  private readonly storage: StorageLike;
  private readonly bus: GameEventBus;
  private readonly camera = new Camera();
  /**
   * Musique de fond (demande de Lucas 2026-07-29) : bouclée dès la
   * construction (`tryPlay`, avec repli sur le premier geste utilisateur si
   * l'autoplay est bloqué — géré dans `MusicPlayer` lui-même), atténuée
   * pendant le menu pause (`update()`), coupable via le menu Options.
   */
  private readonly music: MusicPlayer;
  /** Bruitages synthétisés (Web Audio, aucun fichier) : saut, double saut, dash, tir. */
  private readonly sfx = new SfxPlayer();
  private musicMuted: boolean;
  /** La salle courante ; remplacée entière par `loadRoom` à chaque porte franchie. */
  private room!: Room;
  private readonly dialogues: Record<string, DialogueData>;
  private paper!: HTMLCanvasElement;
  /** Mots-loi solides à raturer (clic droit) → déviation RATURE. */
  private canonBarriers: RoomObject[] = [];
  /** Blancs ▢ à combler d'encre → déviation POINT FINAL. */
  private canonBlanks: RoomObject[] = [];
  /** Murs BRÈCHE effaçables (clic droit + pouvoir) → révèlent le filigrane. */
  private brecheWalls: RoomObject[] = [];
  /**
   * Variantes de la phrase-loi de La Marge : n'existent que pour ce chapitre
   * (D11) — chapitre_01 (Phase 2, blockout mécanique) n'a pas de phrase-loi.
   */
  private readonly sentenceVariants = parseSentenceVariants(chapterMarge01.sentenceVariants);
  private readonly bossFlavorVariants = parseBossFlavorVariants(chapterChapitre01.bossFlavorVariants);
  /** Chambre des mots (ratures_01) : transformations prévues, voir narrative/world_transform.ts. */
  private readonly worldTransformations = parseWorldTransformations(chapterRatures01.worldTransformations);
  /** Liquide montant (crue_01) : peau narrative (temple/livre), voir narrative/hazard_flavor.ts. */
  private readonly hazardFlavorVariants = parseHazardFlavorVariants(chapterCrue01.hazardFlavorVariants);
  /**
   * Hauteur (Y monde) de la surface du liquide montant ; `null` hors de
   * crue_01 (aucune salle actuelle n'a plus d'un liquide montant, pas besoin
   * d'un registre par salle). Remise à niveau sous le joueur à chaque
   * chargement de salle et à chaque retour à l'encrier (`respawn`).
   */
  private hazardY: number | null = null;
  /** Mot actuellement porté par le joueur, et phrase en cours de composition aux consoles — état éphémère, non sauvegardé. */
  private carriedWord: CarriedTransformWord | null = null;
  private transformSlots: { subject: CarriedTransformWord | null; attribute: CarriedTransformWord | null } = {
    subject: null,
    attribute: null,
  };
  /**
   * Décor "l'enfant sur la colline" (marge_01, nuit) : `watching` tant que la
   * phrase n'a pas changé, puis `leavingRature`/`leavingPoint` selon la voie
   * prise, l'enfant se lève et s'éloigne à pied (`renderMargeChildDecor`
   * calcule l'animation depuis `marge01ChildTriggerTime`). `gone` = déjà
   * résolu avant ce chargement de salle (pas de ré-animation).
   */
  private marge01ChildState: 'watching' | 'leavingRature' | 'leavingPoint' | 'gone' = 'watching';
  private marge01ChildTriggerTime = 0;
  /**
   * Décor "l'enfant contre le Troll d'Encre" (arène du mi-boss, chapitre_01,
   * uniquement sur la voie où ce décor est affiché, pas "La Marge") :
   * `fighting` pendant le combat, `defeated` une fois le vrai mi-boss vaincu
   * (`renderCreatureDecor` calcule célébration puis départ depuis
   * `chapitre01SceneTriggerTime`). `gone` = déjà résolu avant ce chargement.
   */
  private chapitre01SceneState: 'fighting' | 'defeated' | 'gone' = 'fighting';
  private chapitre01SceneTriggerTime = 0;
  /**
   * Cinématique de fin RATURE (demande de Lucas 2026-07-29) : `walking`
   * pendant que le personnage s'éloigne (`renderEndingWalkAway`), `fadingOut`
   * pendant le fondu au noir, `done` une fois le texte de clôture affiché
   * (ou immédiatement si l'issue n'est pas RATURE : POINT FINAL/indécis n'a
   * pas cette cinématique). Posé par `updateNarration` au moment où la
   * narration de clôture se referme (pas par `finalizeEnding`, qui peut
   * tourner bien avant que le joueur ait fini de lire).
   */
  private endingSceneState: 'walking' | 'fadingOut' | 'done' = 'done';
  private endingSceneStartTime = 0;

  private player!: PlayerState;
  private enemies: Enemy[] = [];
  private boss: BossState | null = null;
  private bossContactCooldown = 0;
  private prevBossPhase: string | null = null;
  private bossHintShown = false;
  /** Audit narratif 2026-07-26 : présente la peau du mi-boss à l'approche (voir introToast). */
  private bossIntroShown = false;
  /** Tourelles fixes (crue_01 uniquement, demande de Lucas 2026-07-29). */
  private turrets: TurretState[] = [];
  private turretContactCooldown = 0;
  /**
   * Effondrement du plafond de `salle_tresor` (demande de Lucas 2026-07-29) :
   * `collapseActive` passe à `true` au ramassage du trésor (`checkPickups`),
   * jamais dérivé d'un flag persisté — retourner dans la salle une fois le
   * trésor déjà pris ne doit pas redéclencher la chute de blocs.
   */
  private debrisField: DebrisField = createDebrisField();
  private collapseActive = false;
  private ink!: InkState;
  private readonly unlocked = new Set<string>();
  private storyFlags: Record<string, boolean | number> = {};
  private endingLeaning = 0;
  private readonly visitedRooms = new Set<string>();
  private readonly collectedObjects = new Set<number>();
  /** Où renvoie la touche R (dernier encrier touché, sinon spawn). */
  private checkpoint: { x: number; y: number };
  /** Emplacement de sauvegarde de la partie en cours ; null tant qu'on est à l'écran-titre. */
  private currentSlot: number | null = null;

  private mode: Mode = 'title';
  private titleView: TitleView = 'main';
  private titleSelected = 0;
  /** Emplacements pour l'écran-titre (Charger une partie uniquement — Nouvelle partie n'en a plus besoin). */
  private titleSlots: { slot: number; save: SaveData | null }[] = [];
  private pauseView: PauseView = 'menu';
  private pauseSelected = 0;
  /** Emplacements pour le menu pause (Sauvegarder). */
  private pauseSaveSlots: { slot: number; save: SaveData | null }[] = [];
  private pausePendingOverwriteSlot: number | null = null;
  private dialogue: ActiveDialogue | null = null;
  /** Zones cliquables des choix affichés — calculées par le dernier `render()` (le tracé de texte dépend du contexte canvas). */
  private dialogueLayout: DialogueLayout | null = null;
  private narration: NarrationState | null = null;
  private readonly toasts: Toast[] = [];
  /** File d'attente des messages pas encore affichés (anti-spam, voir `toast`). */
  private readonly toastQueue: string[] = [];
  /** Temps restant avant qu'un nouveau message puisse apparaître. */
  private toastGap = 0;
  private time = 0;

  private readonly particles: Particle[] = [];
  private readonly motes: Mote[] = [];
  private prevGrounded = false;
  private landTimer = 0;
  private prevDashTimer = 0;
  /** Détecte le FRONT du double saut AILES (0→1) pour le bruitage, même principe que prevDashTimer. */
  private prevAirJumpsUsed = 0;

  // Tracé à la souris : dernière tuile peinte/effacée pour raccorder le trait.
  private lastPaint: TileCoord | null = null;
  private lastErase: TileCoord | null = null;
  private cursor: Cursor | null = null;
  private toastCooldown = 0;
  /** Anti-ping-pong : bloque `checkDoors` juste après un chargement de salle. */
  private doorCooldown = 0;

  constructor(input: Input, pointer: Pointer, viewport: Viewport, storage: StorageLike) {
    this.input = input;
    this.pointer = pointer;
    this.viewport = viewport;
    this.storage = storage;
    this.bus = createGameBus();
    this.dialogues = {
      pnj_marge: parseDialogueData(dialoguePnjMarge),
      pnj_ratures: parseDialogueData(dialoguePnjRatures),
      pnj_ratures_indice_ciel: parseDialogueData(dialoguePnjRaturesIndiceCiel),
      pnj_ratures_indice_rouge: parseDialogueData(dialoguePnjRaturesIndiceRouge),
    };
    this.checkpoint = { x: 0, y: 0 };

    // Musique (demande de Lucas 2026-07-29) : préférence persistante
    // indépendante des emplacements de sauvegarde (game/settings.ts).
    const settings = loadJson(this.storage, SETTINGS_KEY, parseSettings) ?? DEFAULT_SETTINGS;
    this.musicMuted = settings.musicMuted;
    this.music = new MusicPlayer(musicUrl, MUSIC.baseVolume, this.musicMuted);
    this.sfx.setMuted(false); // pas de bascule dédiée pour l'instant (demande = couper la musique, pas les bruitages)
    this.music.tryPlay();

    this.loadRoom(DEFAULT_ROOM_ID, true);

    this.wireToasts();
  }

  // ---------- Initialisation ----------

  /**
   * (Re)construit toute la salle courante : décor, mots-loi, murs BRÈCHE,
   * ennemis, mi-boss, texture papier — puis positionne le joueur. Appelée au
   * démarrage (`freshPlayer` = true, PlayerState neuf) et à chaque porte
   * franchie (`freshPlayer` = false : on garde vie/encre/pouvoirs, on ne
   * réinitialise que la position et l'état de mouvement transitoire).
   */
  private loadRoom(roomId: string, freshPlayer: boolean, spawnOverride?: { x: number; y: number }): void {
    const raw = ROOMS[roomId];
    this.room = new Room(roomId, parseTiledMap(raw));
    this.paper = this.createPaperTexture(
      resolveWorldColor('page', this.worldTransformations, this.storyFlags, PALETTE.parchment),
    );

    this.canonBarriers = this.room.objectsOfType('canon').filter((o) => o.properties['mode'] === 'barrier');
    this.canonBlanks = this.room.objectsOfType('canon').filter((o) => o.properties['mode'] === 'latent');
    for (const barrier of this.canonBarriers) {
      this.room.registerCanonBarrier(barrier.id, objectTiles(barrier));
    }

    this.brecheWalls = this.room.objectsOfType('breche_wall');
    for (const wall of this.brecheWalls) {
      this.room.registerBrecheWall(wall.id, objectTiles(wall));
    }

    this.enemies = this.room.objectsOfType('enemy').map((o) => {
      const kind = o.properties['kind'] === 'rature' ? 'rature' : 'coquille';
      return createEnemy(o.id, kind, o.x, o.y, o.x, Math.max(o.x, o.x + o.width - ENEMY.width));
    });

    this.turrets = this.room.objectsOfType('turret').map((o) => createTurret(o.id, o.x, o.y));
    this.turretContactCooldown = 0;

    // Effondrement de salle_tresor : jamais actif au chargement, même si le
    // trésor a déjà été ramassé avant (le danger est lié à l'ACTE de le
    // ramasser, pas à un flag permanent — revisiter la salle vide est sûr).
    this.debrisField = createDebrisField();
    this.collapseActive = false;

    const bossObj = this.room.firstObjectOfType('boss');
    this.boss =
      bossObj !== null
        ? createBoss(bossObj.x, bossObj.y, bossObj.x, Math.max(bossObj.x, bossObj.x + bossObj.width - BOSS.width))
        : null;
    this.prevBossPhase = this.boss?.phase ?? null;

    this.motes.length = 0;
    this.spawnMotes();
    this.collectedObjects.clear();
    this.doorCooldown = 0.3;

    const spawnObj = this.room.firstObjectOfType('spawn');
    const spawn = spawnOverride ?? { x: spawnObj?.x ?? TILE_SIZE * 2, y: spawnObj?.y ?? TILE_SIZE * 2 };

    if (freshPlayer) {
      this.ink = createInk(INK.max);
      this.player = {
        body: { x: spawn.x, y: spawn.y, w: PLAYER.width, h: PLAYER.height, vx: 0, vy: 0 },
        grounded: false,
        facing: 1,
        health: PLAYER.maxHealth,
        dashTimer: 0,
        dashCooldown: 0,
        airJumpsUsed: 0,
      };
    } else {
      this.player = {
        ...this.player,
        body: { ...this.player.body, x: spawn.x, y: spawn.y, vx: 0, vy: 0 },
        grounded: false,
        dashTimer: 0,
        dashCooldown: 0,
        airJumpsUsed: 0,
      };
    }
    this.checkpoint = { x: spawn.x, y: spawn.y };
    // Bug trouvé en vérifiant crue_01 (2026-07-29, capture d'écran de Lucas) :
    // un mot porté à la chambre des mots (ratures_01) n'était jamais lâché en
    // changeant de salle — rien ne consomme jamais un mot (D-round16), donc
    // rien ne le reposait non plus. Le joueur pouvait entrer dans crue_01 en
    // portant encore « CIEL » (ou tout autre mot), affiché au-dessus de sa
    // tête sans aucun sens dans cette salle. Un mot/slot ne veut rien dire
    // hors de la chambre des mots : remis à zéro à chaque changement de salle.
    this.carriedWord = null;
    this.transformSlots = { subject: null, attribute: null };
    // Liquide montant (crue_01 uniquement) : remis à niveau sous le point de
    // départ, même formule qu'au retour à l'encrier (`respawn`) — voir
    // `updateHazard`/`RISING_HAZARD.restartOffset`.
    this.hazardY = roomId === 'crue_01' ? spawn.y + PLAYER.height + RISING_HAZARD.restartOffset : null;
    // Caméra collée instantanément (pas de panoramique visible entre 2 salles).
    this.camera.follow(
      this.player.body.x + this.player.body.w / 2,
      this.player.body.y + this.player.body.h / 2,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT,
      this.room.pixelWidth,
      this.room.pixelHeight,
      1,
    );

    const firstVisit = !this.visitedRooms.has(roomId);
    this.visitedRooms.add(roomId);
    this.bus.emit('room_entered', { roomId });
    this.replayRoomState();

    // Décor "l'enfant sur la colline" (marge_01) : si la phrase a déjà été
    // changée avant ce chargement (chargement d'une sauvegarde, Admin), on
    // passe directement à l'état final sans rejouer l'animation. Sinon
    // (nouvelle partie, ou "Recommencer le niveau" qui vient de remettre ces
    // flags à false) l'enfant attend, comme au premier passage.
    if (roomId === 'marge_01') {
      this.marge01ChildState =
        this.storyFlags['rature_jamais'] === true || this.storyFlags['nom_ecrit'] === true ? 'gone' : 'watching';
    }

    // Décor "l'enfant contre le Troll d'Encre" (chapitre_01) : même principe
    // que ci-dessus, `gone` direct si le mi-boss est déjà vaincu avant ce
    // chargement (sauvegarde, Admin, ou "Recommencer le niveau" qui laisse
    // ce flag en l'état, voir `restartLevel`).
    if (roomId === 'chapitre_01') {
      this.chapitre01SceneState =
        this.storyFlags['boss_coquille_majuscule_vaincu'] === true ? 'gone' : 'fighting';
    }

    // Retour de Lucas (2026-07-27) : la chambre des mots qui suit a besoin
    // d'un cadrage narratif explicite, le joueur arrive ici juste après le
    // mi-boss de chapitre_01, quel que soit son reskin (La Marge/le Troll
    // d'Encre). [proposition]
    if (firstVisit && roomId === 'ratures_01') {
      this.showNarration(
        'Le combat fini, la page se referme derrière toi. Plus loin, les lignes du manuscrit se resserrent en colonnes de pierre, comme un temple, avec une porte au bout.',
      );
    }

    // Liquide montant (crue_01) : cadrage narratif à la première entrée,
    // reskinné selon le chemin (game/narrative/hazard_flavor.ts). [proposition]
    if (firstVisit && roomId === 'crue_01') {
      this.showNarration(resolveHazardFlavor(this.hazardFlavorVariants, this.storyFlags).introNarration);
    }
  }

  /**
   * Rejoue dans la salle qui vient d'être (re)chargée tout ce qui découle des
   * flags/pouvoirs déjà acquis : l'encre tracée n'étant pas persistée, on
   * rature à nouveau les mots-loi, on reforme les ponts des blancs, on rouvre
   * les brèches et on remet le mi-boss à plat s'il est déjà vaincu. Appelée
   * par `loadRoom` (premier chargement et chaque transition) et par
   * `restoreFromSave` une fois les flags de la sauvegarde appliqués.
   */
  private replayRoomState(): void {
    for (const fragment of this.room.objectsOfType('fragment')) {
      const flag = fragment.properties['flag'];
      if (typeof flag === 'string' && this.storyFlags[flag] === true) {
        this.collectedObjects.add(fragment.id);
      }
    }
    for (const treasure of this.room.objectsOfType('treasure')) {
      const flag = treasure.properties['flag'];
      if (typeof flag === 'string' && this.storyFlags[flag] === true) {
        this.collectedObjects.add(treasure.id);
      }
    }
    for (const word of this.room.objectsOfType('word')) {
      const ability = word.properties['ability'];
      if (typeof ability === 'string' && this.unlocked.has(ability)) {
        this.collectedObjects.add(word.id);
      }
    }
    for (const barrier of this.canonBarriers) {
      const flag = barrier.properties['flag'];
      if (typeof flag === 'string' && this.storyFlags[flag] === true) {
        this.room.eraseCanon(barrier.id);
        this.collectedObjects.add(barrier.id);
      }
    }
    for (const blank of this.canonBlanks) {
      const flag = blank.properties['flag'];
      if (typeof flag === 'string' && this.storyFlags[flag] === true) {
        for (const tile of objectTiles(blank)) this.room.paintInk(tile.x, tile.y);
        this.collectedObjects.add(blank.id);
      }
    }
    for (const wall of this.brecheWalls) {
      const flag = wall.properties['flag'];
      if (typeof flag === 'string' && this.storyFlags[flag] === true) {
        this.room.revealFiligrane(wall.id);
        this.collectedObjects.add(wall.id);
      }
    }
    for (const potion of this.room.objectsOfType('potion')) {
      const flag = potion.properties['flag'];
      if (typeof flag === 'string' && this.storyFlags[flag] === true) {
        this.collectedObjects.add(potion.id);
      }
    }
    if (this.boss !== null && this.storyFlags['boss_coquille_majuscule_vaincu'] === true) {
      this.boss = { ...this.boss, phase: 'defeated', health: 0 };
      this.prevBossPhase = 'defeated';
    }
  }

  /** `baseColor` : « La Page devint ... » (chambre des mots, ratures_01) peut recolorer le parchemin lui-même. */
  private createPaperTexture(baseColor: string = PALETTE.parchment): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.room.pixelWidth;
    canvas.height = this.room.pixelHeight;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return canvas;

    ctx.fillStyle = PALETTE.parchment;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // « La Page devint ... » (chambre des mots) teinte le parchemin plutôt
    // que de le remplacer par la couleur pleine : retour de Lucas 2026-07-28,
    // une couleur saturée en fond de page n'était plus "jolie".
    if (baseColor !== PALETTE.parchment) {
      ctx.fillStyle = hexAlpha(baseColor, PAGE_TRANSFORM_TINT_ALPHA);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < 300; i++) {
      const radius = 3 + Math.random() * 34;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      const shade = Math.random() < 0.6 ? PALETTE.parchmentShade : PALETTE.sepia;
      gradient.addColorStop(0, hexAlpha(shade, 0.05 + Math.random() * 0.05));
      gradient.addColorStop(1, hexAlpha(shade, 0));
      ctx.save();
      ctx.translate(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.07);
    ctx.lineWidth = 1;
    for (let y = 24; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = hexAlpha(PALETTE.danger, 0.1);
    ctx.beginPath();
    ctx.moveTo(52, 0);
    ctx.lineTo(52, canvas.height);
    ctx.stroke();

    return canvas;
  }

  private spawnMotes(): void {
    for (let i = 0; i < PARTICLES.ambientMotes; i++) {
      this.motes.push({
        x: Math.random() * this.room.pixelWidth,
        y: Math.random() * this.room.pixelHeight * 0.8,
        speed: 3 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        size: 0.6 + Math.random() * 1.2,
      });
    }
  }

  private wireToasts(): void {
    this.bus.on('ability_unlocked', ({ id }) => {
      const def = getAbility(id);
      if (def !== null) {
        // Bug corrigé (2026-07-22) : le message était câblé en dur sur les
        // commandes d'ÉCRIRE, affiché à l'identique pour HÂTE/AILES/BRÈCHE.
        this.toast(`Mot retrouvé : ${def.word} (${def.control}). ${def.description}`);
      }
    });
    // `reason` distingue le contexte (retour de Lucas 2026-07-28 : la sauvegarde
    // manuelle depuis le menu pause mérite son propre message, pas celui de
    // l'encrier — et les transitions de porte restent silencieuses comme avant).
    this.bus.on('game_saved', ({ reason }) => {
      if (reason === 'inkwell') this.toast('Encrier : encre pleine, place retenue (R pour y revenir).');
      else if (reason === 'manual') this.toast('Partie sauvegardée sur cet emplacement.'); // [proposition]
    });
    // Le toast de ramassage d'un fragment (avec son texte) est désormais
    // affiché en direct par checkPickups — il connaît le fragment précis,
    // contrairement à ce listener générique qui ne voit que le flag.
    this.bus.on('player_respawned', () => {
      this.toast('Le manuscrit te ramène à l\'encrier.');
    });
  }

  /** Résumé compact d'un emplacement de sauvegarde, affiché à l'écran-titre. */
  private describeSlot(save: SaveData): string {
    const room = ROOM_SHORT_LABELS[save.playerPos.room] ?? save.playerPos.room;
    const leaning = LEANING_SHORT[resolveLeaning(save.storyFlags)];
    return `${room} · ${leaning} · ${String(save.unlockedAbilities.length)}/${String(allAbilities().length)}`;
  }

  /** (Re)lit les 3 emplacements depuis le stockage. */
  private readSlots(): { slot: number; save: SaveData | null }[] {
    const slots: { slot: number; save: SaveData | null }[] = [];
    for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
      slots.push({ slot, save: loadJson(this.storage, saveKey(slot), parseSave) });
    }
    return slots;
  }

  /**
   * Position vue (480×270) de la souris, ou null si elle n'est pas encore
   * entrée sur le canvas. Utilisé pour le survol/clic des menus (demande de
   * Lucas, 2026-07-28 : sélectionner une option à la souris, pas seulement
   * au clavier) — le tracé d'encre en jeu passe par un chemin séparé
   * (`this.cursor`, en coordonnées monde).
   */
  private mouseView(): { x: number; y: number } | null {
    if (!this.pointer.inside) return null;
    return this.viewport.screenToView(this.pointer.clientX, this.pointer.clientY);
  }

  private updateTitleMenu(): void {
    const mouse = this.mouseView();

    if (this.titleView === 'main') {
      if (mouse !== null) {
        const hit = hitTestTitleMain(mouse.x, mouse.y);
        if (hit !== null) {
          this.titleSelected = hit;
          if (this.pointer.leftClicked) {
            this.activateTitleMainOption(hit);
            return;
          }
        }
      }
      if (this.input.wasPressed('up')) {
        this.titleSelected = (this.titleSelected + TITLE_MENU_OPTIONS.length - 1) % TITLE_MENU_OPTIONS.length;
      }
      if (this.input.wasPressed('down')) {
        this.titleSelected = (this.titleSelected + 1) % TITLE_MENU_OPTIONS.length;
      }
      if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
        this.activateTitleMainOption(this.titleSelected);
      }
      return;
    }

    if (this.titleView === 'options') {
      if (mouse !== null) {
        const hit = hitTestOptionsMenu(mouse.x, mouse.y);
        if (hit !== null) {
          this.titleSelected = hit;
          if (this.pointer.leftClicked) {
            this.activateOptionsMenuOption(hit, 'title');
            return;
          }
        }
      }
      if (this.input.wasPressed('up') || this.input.wasPressed('down')) {
        this.titleSelected = this.titleSelected === 0 ? 1 : 0;
      }
      if (this.input.wasPressed('pause')) {
        this.titleView = 'main';
        this.titleSelected = 2;
      }
      if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
        this.activateOptionsMenuOption(this.titleSelected, 'title');
      }
      return;
    }

    // view === 'load' : uniquement pour charger — pas de risque d'écrasement,
    // les emplacements vides sont simplement ignorés à la sélection.
    if (mouse !== null) {
      const hit = hitTestSlotList(this.titleSlots.length, mouse.x, mouse.y);
      if (hit !== null) {
        this.titleSelected = hit;
        if (this.pointer.leftClicked) {
          this.activateTitleLoadSlot();
          return;
        }
      }
    }
    if (this.input.wasPressed('up')) {
      this.titleSelected = (this.titleSelected + this.titleSlots.length - 1) % this.titleSlots.length;
    }
    if (this.input.wasPressed('down')) {
      this.titleSelected = (this.titleSelected + 1) % this.titleSlots.length;
    }
    if (this.input.wasPressed('pause')) {
      this.titleView = 'main';
      this.titleSelected = 1;
    }
    if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
      this.activateTitleLoadSlot();
    }
  }

  /**
   * « Nouvelle partie » démarre directement, sans choisir d'emplacement — le
   * choix ne se fait qu'au moment de sauvegarder/charger (retour de Lucas,
   * 2026-07-28). « Charger une partie » affiche la liste des emplacements.
   */
  private activateTitleMainOption(index: number): void {
    if (index === 0) {
      this.beginGame(null, null);
      return;
    }
    if (index === 2) {
      this.titleView = 'options';
      this.titleSelected = 0;
      return;
    }
    this.titleView = 'load';
    this.titleSelected = 0;
    this.titleSlots = this.readSlots();
  }

  private activateTitleLoadSlot(): void {
    const slotInfo = this.titleSlots[this.titleSelected];
    if (slotInfo?.save != null) this.beginGame(slotInfo.slot, slotInfo.save);
    // emplacement vide : rien à charger, ignoré.
  }

  /**
   * Démarre une partie : `slot` null → nouvelle partie, pas encore liée à un
   * emplacement (aucune sauvegarde tant que le joueur n'a pas explicitement
   * choisi « Sauvegarder » au menu pause, retour de Lucas 2026-07-28) ; sinon
   * reprend l'état sauvegardé de cet emplacement. Remet à zéro tout l'état de
   * session qui ne fait pas partie du schéma de sauvegarde (mot porté,
   * indices "déjà vu" du mi-boss, messages en attente) pour qu'une partie
   * chargée dans le même onglet ne garde rien de la précédente.
   */
  private beginGame(slot: number | null, save: SaveData | null): void {
    this.currentSlot = slot;
    this.unlocked.clear();
    this.storyFlags = {};
    this.visitedRooms.clear();
    this.carriedWord = null;
    this.transformSlots = { subject: null, attribute: null };
    this.bossHintShown = false;
    this.bossIntroShown = false;
    this.toasts.length = 0;
    this.toastQueue.length = 0;
    this.endingLeaning = save?.endingLeaning ?? 0;

    let targetRoomId = DEFAULT_ROOM_ID;
    let spawnOverride: { x: number; y: number } | undefined;

    if (save !== null) {
      for (const id of save.unlockedAbilities) this.unlocked.add(id);
      for (const room of save.visitedRooms) this.visitedRooms.add(room);
      Object.assign(this.storyFlags, save.storyFlags);
      this.ink = createInk(save.inkMax);
      if (ROOMS[save.playerPos.room] !== undefined) {
        targetRoomId = save.playerPos.room;
        spawnOverride = { x: save.playerPos.x, y: save.playerPos.y };
      }
    }

    this.loadRoom(targetRoomId, save === null, spawnOverride);
    this.player = { ...this.player, health: PLAYER.maxHealth };
    this.mode = 'playing';
    if (save !== null) this.toast('Le manuscrit se souvient de toi.');
    this.persist('auto');
  }

  /**
   * Écrit l'état courant sur `this.currentSlot` — ne fait rien tant qu'aucun
   * emplacement n'est lié (partie neuve jamais sauvegardée explicitement,
   * retour de Lucas 2026-07-28). `reason` ne change que le toast affiché
   * (voir `wireToasts`), pas le contenu sauvegardé.
   */
  private persist(reason: 'inkwell' | 'door' | 'manual' | 'auto'): void {
    if (this.currentSlot === null) return; // aucun emplacement lié pour l'instant
    const data: SaveData = {
      version: SAVE_VERSION,
      unlockedAbilities: [...this.unlocked],
      visitedRooms: [...this.visitedRooms],
      storyFlags: { ...this.storyFlags },
      endingLeaning: this.endingLeaning,
      playerPos: { room: this.room.id, x: this.player.body.x, y: this.player.body.y },
      inkMax: this.ink.max,
    };
    saveJson(this.storage, saveKey(this.currentSlot), data);
    this.bus.emit('game_saved', { roomId: this.room.id, reason });
  }

  // ---------- Update ----------

  update(dtSeconds: number): void {
    // Musique : atténuée (pas coupée) tant que le menu pause est ouvert,
    // demande de Lucas 2026-07-29 — recalculé à chaque frame plutôt que sur
    // les seules transitions de mode, pour ne jamais désynchroniser (ex.
    // retour direct à l'écran-titre depuis la pause, "Quitter").
    this.music.setDuckFactor(this.mode === 'paused' ? MUSIC.pausedDuckFactor : 1);
    if (this.mode === 'title') {
      this.updateTitleMenu();
      this.input.endFrame();
      this.pointer.endFrame();
      return; // pas de partie en cours : simulation entièrement gelée
    }
    if (this.mode === 'ending') {
      // `this.time` doit continuer d'avancer ici (contrairement à 'title'/
      // 'paused') : la cinématique RATURE (`renderEndingWalkAway`) calcule sa
      // progression depuis `endingSceneStartTime` avec `this.time`.
      this.time += dtSeconds;
      this.updateEnding();
      this.input.endFrame();
      this.pointer.endFrame();
      return; // le jeu est terminé : rien d'autre à simuler
    }
    if (this.input.wasPressed('pause') && this.mode !== 'dialogue' && this.mode !== 'narration') {
      this.mode = this.mode === 'paused' ? 'playing' : 'paused';
      this.pauseView = 'menu';
      this.pauseSelected = 0;
    }
    if (this.mode === 'paused') {
      this.updatePauseMenu();
      this.input.endFrame();
      this.pointer.endFrame();
      return; // simulation entièrement gelée pendant la pause
    }

    this.time += dtSeconds;
    this.toastCooldown = Math.max(0, this.toastCooldown - dtSeconds);
    if (this.mode === 'dialogue') {
      this.updateDialogue();
    } else if (this.mode === 'narration') {
      this.updateNarration(dtSeconds);
    } else {
      this.updatePlaying(dtSeconds);
    }
    this.updateParticles(dtSeconds);
    for (const toast of this.toasts) toast.ttl -= dtSeconds;
    while (this.toasts.length > 0 && (this.toasts[0]?.ttl ?? 0) <= 0) this.toasts.shift();
    this.toastGap = Math.max(0, this.toastGap - dtSeconds);
    if (this.toastGap <= 0 && this.toastQueue.length > 0) {
      const text = this.toastQueue.shift();
      if (text !== undefined) {
        this.toasts.push({ text, ttl: TOAST_SECONDS });
        this.toastGap = TOAST_STAGGER_SECONDS;
      }
    }
    this.input.endFrame();
    this.pointer.endFrame();
  }

  private updatePauseMenu(): void {
    const mouse = this.mouseView();

    if (this.pauseView === 'menu') {
      if (mouse !== null) {
        const hit = hitTestPauseMenu(mouse.x, mouse.y);
        if (hit !== null) {
          this.pauseSelected = hit;
          if (this.pointer.leftClicked) {
            this.activatePauseMenuOption(hit);
            return;
          }
        }
      }
      if (this.input.wasPressed('up')) {
        this.pauseSelected = (this.pauseSelected + PAUSE_MENU_OPTIONS.length - 1) % PAUSE_MENU_OPTIONS.length;
      }
      if (this.input.wasPressed('down')) {
        this.pauseSelected = (this.pauseSelected + 1) % PAUSE_MENU_OPTIONS.length;
      }
      if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
        this.activatePauseMenuOption(this.pauseSelected);
      }
    } else if (this.pauseView === 'admin') {
      if (mouse !== null) {
        const hit = hitTestPauseAdmin(ADMIN_ROOMS.length, mouse.x, mouse.y);
        if (hit !== null) {
          this.pauseSelected = hit;
          if (this.pointer.leftClicked) {
            const target = ADMIN_ROOMS[hit];
            if (target !== undefined) this.adminGoToRoom(target.id);
            return;
          }
        }
      }
      if (this.input.wasPressed('up')) {
        this.pauseSelected = (this.pauseSelected + ADMIN_ROOMS.length - 1) % ADMIN_ROOMS.length;
      }
      if (this.input.wasPressed('down')) {
        this.pauseSelected = (this.pauseSelected + 1) % ADMIN_ROOMS.length;
      }
      if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
        const target = ADMIN_ROOMS[this.pauseSelected];
        if (target !== undefined) this.adminGoToRoom(target.id);
      }
    } else if (this.pauseView === 'save') {
      if (mouse !== null) {
        const hit = hitTestSlotList(this.pauseSaveSlots.length, mouse.x, mouse.y);
        if (hit !== null) {
          if (hit !== this.pauseSelected) this.pausePendingOverwriteSlot = null;
          this.pauseSelected = hit;
          if (this.pointer.leftClicked) {
            this.activatePauseSaveSlot();
            return;
          }
        }
      }
      if (this.input.wasPressed('up')) {
        this.pauseSelected = (this.pauseSelected + this.pauseSaveSlots.length - 1) % this.pauseSaveSlots.length;
        this.pausePendingOverwriteSlot = null;
      }
      if (this.input.wasPressed('down')) {
        this.pauseSelected = (this.pauseSelected + 1) % this.pauseSaveSlots.length;
        this.pausePendingOverwriteSlot = null;
      }
      if (this.input.wasPressed('pause')) {
        this.pauseView = 'menu';
        this.pauseSelected = 1;
        this.pausePendingOverwriteSlot = null;
      }
      if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
        this.activatePauseSaveSlot();
      }
    } else if (this.pauseView === 'options') {
      if (mouse !== null) {
        const hit = hitTestOptionsMenu(mouse.x, mouse.y);
        if (hit !== null) {
          this.pauseSelected = hit;
          if (this.pointer.leftClicked) {
            this.activateOptionsMenuOption(hit, 'pause');
            return;
          }
        }
      }
      if (this.input.wasPressed('up') || this.input.wasPressed('down')) {
        this.pauseSelected = this.pauseSelected === 0 ? 1 : 0;
      }
      if (this.input.wasPressed('pause')) {
        this.pauseView = 'menu';
        this.pauseSelected = 3;
      }
      if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
        this.activateOptionsMenuOption(this.pauseSelected, 'pause');
      }
    } else if (this.input.wasPressed('interact') || this.input.wasPressed('jump') || this.pointer.leftClicked) {
      this.pauseView = 'menu';
    }
  }

  private activatePauseMenuOption(index: number): void {
    if (index === 0) {
      this.restartLevel();
    } else if (index === 1) {
      this.pauseView = 'save';
      this.pauseSaveSlots = this.readSlots();
      this.pauseSelected = this.currentSlot !== null ? this.currentSlot - 1 : 0;
      this.pausePendingOverwriteSlot = null;
    } else if (index === 2) {
      this.pauseView = 'powers';
    } else if (index === 3) {
      this.pauseView = 'options';
      this.pauseSelected = 0;
    } else if (index === 4) {
      this.pauseView = 'admin';
      this.pauseSelected = Math.max(0, ADMIN_ROOMS.findIndex((r) => r.id === this.room.id));
    } else {
      this.quitGame();
    }
  }

  /**
   * Bascule/retour du menu Options (demande de Lucas 2026-07-29 : « un menu
   * options pour couper la musique »). Partagé entre l'écran-titre et le
   * menu pause (`from`) — seul le retour diffère (vers le menu principal du
   * titre, ou vers le menu pause).
   */
  private activateOptionsMenuOption(index: number, from: 'title' | 'pause'): void {
    if (index === 0) {
      this.toggleMusicMuted();
      return;
    }
    if (from === 'title') {
      this.titleView = 'main';
      this.titleSelected = 2;
    } else {
      this.pauseView = 'menu';
      this.pauseSelected = 3;
    }
  }

  private toggleMusicMuted(): void {
    this.musicMuted = !this.musicMuted;
    this.music.setMuted(this.musicMuted);
    saveJson(this.storage, SETTINGS_KEY, { musicMuted: this.musicMuted });
  }

  /**
   * Sauvegarder (menu pause) : le joueur choisit lui-même l'emplacement à
   * chaque sauvegarde (retour de Lucas, 2026-07-28 — plus de liaison
   * automatique décidée à la création de la partie). Un emplacement déjà
   * occupé demande confirmation avant d'être écrasé, même mécanique que
   * l'ancien flux « Nouvelle partie ».
   */
  private activatePauseSaveSlot(): void {
    const slotInfo = this.pauseSaveSlots[this.pauseSelected];
    if (slotInfo === undefined) return;
    if (slotInfo.save !== null && this.pausePendingOverwriteSlot !== slotInfo.slot) {
      this.pausePendingOverwriteSlot = slotInfo.slot;
      return;
    }
    this.currentSlot = slotInfo.slot;
    this.persist('manual');
    this.pauseView = 'menu';
    this.pauseSelected = 1;
    this.pausePendingOverwriteSlot = null;
  }

  /**
   * Menu Admin (pause) : téléportation directe vers une salle, sans rejouer
   * tout le jeu depuis le début (demande de Lucas, 2026-07-27, pour
   * playtester une salle précise). Débloque tous les pouvoirs et referait
   * PV/encre au max à l'arrivée, comme `restartLevel` — sinon une salle qui
   * suppose des pouvoirs déjà acquis (ex. le gouffre AILES de ratures_01)
   * serait infranchissable.
   */
  private adminGoToRoom(roomId: string): void {
    for (const ability of allAbilities()) this.unlocked.add(ability.id);
    this.loadRoom(roomId, false);
    this.player = { ...this.player, health: PLAYER.maxHealth };
    this.ink = refillInk(this.ink);
    // Bug trouvé en vérifiant crue_01 (2026-07-29) : `loadRoom` peut avoir
    // mis le jeu en mode 'narration' (première visite d'une salle avec un
    // texte d'arrivée, ex. ratures_01/crue_01) — l'écraser sans condition
    // ici sautait silencieusement cette narration à chaque téléportation
    // Admin. Ne repasse en 'playing' que si aucune narration n'a démarré.
    if (this.mode !== 'narration') this.mode = 'playing';
  }

  /**
   * Recommence la salle courante à son point de départ (PV/encre refaits,
   * pouvoirs conservés). Réinitialise aussi tout l'état mécanique de CETTE
   * salle (retour de Lucas 2026-07-29 : « il faut vraiment reset comme si
   * qu'on venait de rentrer dans le niveau » — signalé sur le robinet de
   * crue_01, qui restait fermé après un restart ; une première version de
   * ce correctif, 2026-07-28, ne réinitialisait QUE les mots-loi de
   * marge_01, ce qui ne « réinitialisait pas vraiment » les autres salles).
   * Deux catégories de flags :
   *  - ceux portés par un objet de la salle (`properties.flag` : mots-loi
   *    canon/blancs, murs BRÈCHE, fioles/cœurs, fragments, trésors) —
   *    remis à `false` en une seule boucle générique sur tous les objets de
   *    la salle, plutôt que d'énumérer chaque type un par un.
   *  - ceux lus/écrits directement dans le code, sans objet porteur (le
   *    robinet de crue_01, la défaite du mi-boss de chapitre_01, le code du
   *    temple/les couleurs du monde de ratures_01) — remis à `false`
   *    explicitement, salle par salle.
   * Les flags posés par les DIALOGUES (ex. `pnj_ratures_rencontre`) ne sont
   * volontairement pas touchés ici : catégorie distincte (état de
   * conversation, pas obstacle mécanique), aucun retour de Lucas ne les
   * concerne pour l'instant. `false` plutôt que `delete` : évite
   * `no-dynamic-delete`, et `=== true` (partout où ces flags sont lus)
   * traite les deux de façon identique.
   */
  private restartLevel(): void {
    const roomId = this.room.id;
    for (const obj of this.room.map.objects) {
      const flag = obj.properties['flag'];
      if (typeof flag === 'string') this.storyFlags[flag] = false;
    }
    if (roomId === 'crue_01') {
      this.storyFlags[CRUE01_VALVE_FLAG] = false;
    }
    if (roomId === 'chapitre_01') {
      this.storyFlags['boss_coquille_majuscule_vaincu'] = false;
    }
    if (roomId === 'ratures_01') {
      for (const t of this.worldTransformations) this.storyFlags[t.flag] = false;
      this.storyFlags['temple_code_trouve'] = false;
    }
    if (roomId === 'marge_01') {
      this.storyFlags['chapitre1_fini'] = false;
    }
    if (roomId === 'salle_tresor') {
      this.storyFlags['jeu_termine'] = false;
    }
    // `content_fin_actuelle` volontairement épargné : simple marqueur méta
    // "tu as vu tout le contenu actuellement construit" (toast de
    // développement, pas de la fiction), pas un obstacle à rejouer — le
    // réafficher à chaque restart de test serait juste bruyant.
    this.loadRoom(roomId, false);
    this.player = { ...this.player, health: PLAYER.maxHealth };
    this.ink = refillInk(this.ink);
    this.mode = 'playing';
  }

  /** "Quitter" (menu pause) : retour à l'écran-titre — la partie reste sauvegardée sur son emplacement. */
  private quitGame(): void {
    this.currentSlot = null;
    this.mode = 'title';
    this.titleView = 'main';
    this.titleSelected = 0;
    this.pauseSaveSlots = [];
    this.pausePendingOverwriteSlot = null;
  }

  private updatePlaying(dtSeconds: number): void {
    const wasGrounded = this.player.grounded;
    const prevVy = this.player.body.vy;

    this.player = stepPlayer(
      this.player,
      {
        left: this.input.isDown('left'),
        right: this.input.isDown('right'),
        jumpPressed: this.input.wasPressed('jump'),
        jumpHeld: this.input.isDown('jump'),
        dashPressed: this.input.wasPressed('dash'),
      },
      this.room.isSolid,
      dtSeconds,
      this.unlocked,
    );

    const feet = { x: this.player.body.x + this.player.body.w / 2, y: this.player.body.y + this.player.body.h };
    if (this.input.wasPressed('jump') && wasGrounded) {
      this.burst(feet.x, feet.y, PARTICLES.jumpBurst, PALETTE.sepia, 50);
      this.sfx.play(SFX.jump);
    }
    // Double saut AILES : détecté au FRONT (0→1) de airJumpsUsed, même
    // principe que prevDashTimer ci-dessous — un seul bruitage par saut aérien.
    if (this.player.airJumpsUsed > this.prevAirJumpsUsed) {
      this.sfx.play(SFX.doubleJump);
    }
    this.prevAirJumpsUsed = this.player.airJumpsUsed;
    if (!this.prevGrounded && this.player.grounded && prevVy > 140) {
      this.landTimer = RENDERING.landSquashSeconds;
      this.burst(feet.x, feet.y, PARTICLES.landBurst, PALETTE.ink, 60);
    }
    this.prevGrounded = this.player.grounded;
    this.landTimer = Math.max(0, this.landTimer - dtSeconds);
    if (this.prevDashTimer <= 0 && this.player.dashTimer > 0) {
      this.burst(feet.x, feet.y - this.player.body.h / 2, PARTICLES.drawBurst * 2, PALETTE.ink, 70);
      this.sfx.play(SFX.dash);
    }
    this.prevDashTimer = this.player.dashTimer;

    this.updateEnemies(dtSeconds);
    this.updateBoss(dtSeconds);
    this.updateHazard(dtSeconds);
    this.updateTurrets(dtSeconds);
    this.updateDebris(dtSeconds);
    if (this.player.health <= 0) this.handleDefeat();
    else if (
      this.hazardY !== null &&
      isCaughtByHazard(this.player.body.y + this.player.body.h / 2, this.hazardY)
    ) {
      // Retour de Lucas 2026-07-29 : rattraper au premier pixel touché « fait
      // très expéditif » — on ne compte désormais rattrapé qu'à MOITIÉ
      // submergé (le centre du corps, pas les pieds).
      this.handleHazardCaught();
    } else if (this.collapseActive && debrisHitsPlayer(this.debrisField, this.player.body)) {
      this.handleCrushed();
    } else if (this.player.body.y + this.player.body.h >= this.room.pixelHeight) this.handleFall();
    this.checkPickups();
    if (this.input.wasPressed('interact')) this.handleInteract();
    if (this.input.wasPressed('respawn')) this.respawn();
    this.updateCursorAndDrawing();
    this.checkBlanks();
    this.doorCooldown = Math.max(0, this.doorCooldown - dtSeconds);
    this.checkDoors();

    const center = this.playerCenter();
    this.camera.follow(
      center.x,
      center.y,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT,
      this.room.pixelWidth,
      this.room.pixelHeight,
      1 - Math.exp(-RENDERING.cameraLerpRate * dtSeconds),
    );
  }

  /** Fait avancer les ennemis, résout les dégâts de dash et les contacts. */
  private updateEnemies(dtSeconds: number): void {
    const dashActive = this.player.dashTimer > 0;
    const next: Enemy[] = [];
    for (const enemy of this.enemies) {
      const stepped = stepEnemy(enemy, this.room.isSolid, this.player.body, dtSeconds);
      const hit = resolveDashHit(stepped, this.player.body, dashActive);
      if (hit.destroyed) {
        const cx = hit.enemy.body.x + hit.enemy.body.w / 2;
        const cy = hit.enemy.body.y + hit.enemy.body.h / 2;
        this.burst(cx, cy, 10, PALETTE.danger, 60);
        continue;
      }
      if (hit.enemy.hitCooldown <= 0 && overlapsPlayer(hit.enemy, this.player.body)) {
        this.applyEnemyContact(hit.enemy);
        next.push({ ...hit.enemy, hitCooldown: ENEMY.hitCooldownSeconds });
        continue;
      }
      next.push(hit.enemy);
    }
    this.enemies = next;
  }

  /** Effet au contact (hors dash) : dégâts pour la Coquille, encre effacée pour la Rature. */
  private applyEnemyContact(enemy: Enemy): void {
    if (enemy.kind === 'coquille') {
      this.player = { ...this.player, health: Math.max(0, this.player.health - ENEMY.contactDamage) };
    } else {
      const tx = Math.floor((this.player.body.x + this.player.body.w / 2) / TILE_SIZE);
      const ty = Math.floor((this.player.body.y + this.player.body.h / 2) / TILE_SIZE);
      if (this.room.hasInk(tx, ty)) {
        // Sabotage : contrairement au clic droit du joueur, la Rature ne rembourse pas l'encre.
        this.room.eraseInk(tx, ty);
        this.toast('Une Rature efface ton trait !');
      } else {
        this.player = { ...this.player, health: Math.max(0, this.player.health - ENEMY.contactDamage / 2) };
      }
    }
    this.burst(
      enemy.body.x + enemy.body.w / 2,
      enemy.body.y + enemy.body.h / 2,
      PARTICLES.eraseBurst,
      PALETTE.danger,
      35,
    );
  }

  /** Fait avancer le mi-boss, résout les dégâts de dash et le contact avec le joueur. */
  private updateBoss(dtSeconds: number): void {
    if (this.boss === null) return;
    this.bossContactCooldown = Math.max(0, this.bossContactCooldown - dtSeconds);

    // Toast d'intro à l'approche (audit narratif 2026-07-26) : nomme la
    // créature avant le contact, pour que son identité (La Marge / le Troll
    // d'Encre) ait un sens au moment où elle apparaît, plutôt qu'après coup
    // au seul toast de victoire.
    if (!this.bossIntroShown && this.boss.phase !== 'defeated') {
      const dxToBoss = Math.abs(this.player.body.x - this.boss.body.x);
      if (dxToBoss < BOSS_INTRO_RANGE) {
        this.bossIntroShown = true;
        // Retour de playtest 2026-07-27 : un toast fugace ne suffisait pas à
        // faire comprendre pourquoi CETTE créature est là — mis en pause.
        this.showNarration(resolveBossFlavor(this.bossFlavorVariants, this.storyFlags).introToast);
      }
    }

    const dashActive = this.player.dashTimer > 0;
    const prevProjectileCount = this.boss.projectiles.length;

    let boss = stepBoss(this.boss, this.room.isSolid, dtSeconds, this.player.body, {
      width: this.room.pixelWidth,
      height: this.room.pixelHeight,
    });
    boss = resolveBossDashHit(boss, this.player.body, dashActive);
    // Bruitage de tir (demande de Lucas 2026-07-29) : détecté par un simple
    // comptage avant/après plutôt qu'un évènement dédié dans stepBoss (pur,
    // pas d'effet de bord) — un nouveau projectile suffit à savoir qu'un tir
    // vient d'avoir lieu ce pas de temps.
    if (boss.projectiles.length > prevProjectileCount) this.sfx.play(SFX.shoot);

    if (this.prevBossPhase !== 'defeated' && boss.phase === 'defeated') {
      this.storyFlags['boss_coquille_majuscule_vaincu'] = true;
      this.bus.emit('flag_set', { flag: 'boss_coquille_majuscule_vaincu', value: true });
      this.bus.emit('boss_defeated', { bossId: 'coquille_majuscule' });
      this.burst(boss.body.x + boss.body.w / 2, boss.body.y + boss.body.h / 2, 24, PALETTE.danger, 80);
      this.showNarration(resolveBossFlavor(this.bossFlavorVariants, this.storyFlags).defeatToast);
      this.triggerTrollDefeatScene();
    } else if (boss.phase !== this.prevBossPhase && boss.phase === 'vulnerable') {
      this.burst(boss.body.x + boss.body.w / 2, boss.body.y + boss.body.h / 2, 6, PALETTE.unwritten, 40);
      if (!this.bossHintShown) {
        this.bossHintShown = true;
        this.toast('Sa lueur claire : fonce dedans (Maj) pour le blesser.');
      }
    }
    this.prevBossPhase = boss.phase;

    // Dasher ne blesse jamais le joueur (même convention que les ennemis
    // communs) : l'ancien garde-fou ne couvrait que la frame du coup, alors
    // que le dash dure plusieurs frames au contact du boss pendant qu'il
    // passe en "recover" — d'où les dégâts persistants (playtest 2026-07-22).
    if (
      boss.phase !== 'defeated' &&
      !dashActive &&
      this.bossContactCooldown <= 0 &&
      bossOverlapsPlayer(boss, this.player.body)
    ) {
      this.player = { ...this.player, health: Math.max(0, this.player.health - BOSS.contactDamage) };
      this.bossContactCooldown = ENEMY.hitCooldownSeconds;
      this.burst(boss.body.x + boss.body.w / 2, boss.body.y + boss.body.h / 2, PARTICLES.eraseBurst, PALETTE.danger, 40);
    }

    const projectileHits = resolveProjectileHits(boss, this.player.body);
    boss = projectileHits.boss;
    if (projectileHits.hits > 0 && this.bossContactCooldown <= 0) {
      this.player = {
        ...this.player,
        health: Math.max(0, this.player.health - BOSS.projectileDamage * projectileHits.hits),
      };
      this.bossContactCooldown = ENEMY.hitCooldownSeconds;
      this.burst(this.player.body.x + this.player.body.w / 2, this.player.body.y + this.player.body.h / 2, 8, PALETTE.danger, 45);
    }

    this.boss = boss;
  }

  /**
   * Fait monter la surface du liquide (crue_01 uniquement) ; ne fait rien
   * ailleurs. S'arrête pour de bon une fois le robinet/fermoir actionné
   * (`CRUE01_VALVE_FLAG`, demande de Lucas 2026-07-29).
   */
  private updateHazard(dtSeconds: number): void {
    if (this.hazardY === null || this.storyFlags[CRUE01_VALVE_FLAG] === true) return;
    this.hazardY = advanceHazard(this.hazardY, dtSeconds, RISING_HAZARD.riseSpeed, TILE_SIZE);
  }

  /**
   * Fait avancer les tourelles fixes (crue_01, demande de Lucas 2026-07-29) :
   * tir visé périodique, destruction par HÂTE (un seul coup), dégâts de
   * contact des bulles en vol — même anti-spam que le mi-boss
   * (`turretContactCooldown`, partagé entre toutes les tourelles comme
   * `bossContactCooldown`).
   */
  private updateTurrets(dtSeconds: number): void {
    if (this.turrets.length === 0) return;
    this.turretContactCooldown = Math.max(0, this.turretContactCooldown - dtSeconds);
    const dashActive = this.player.dashTimer > 0;
    const bounds = { width: this.room.pixelWidth, height: this.room.pixelHeight };
    const next: TurretState[] = [];
    for (const turret of this.turrets) {
      const prevProjectileCount = turret.projectiles.length;
      let t = stepTurret(turret, dtSeconds, this.player.body, bounds);
      if (t.projectiles.length > prevProjectileCount) this.sfx.play(SFX.shoot);
      const wasDestroyed = t.destroyed;
      t = resolveTurretDashHit(t, this.player.body, dashActive);
      if (!wasDestroyed && t.destroyed) {
        this.burst(t.body.x + t.body.w / 2, t.body.y + t.body.h / 2, 10, PALETTE.danger, 60);
      }
      const hitResult = resolveTurretProjectileHits(t, this.player.body);
      t = hitResult.turret;
      if (hitResult.hits > 0 && this.turretContactCooldown <= 0) {
        this.player = { ...this.player, health: Math.max(0, this.player.health - TURRET.projectileDamage * hitResult.hits) };
        this.turretContactCooldown = ENEMY.hitCooldownSeconds;
        this.burst(this.player.body.x + this.player.body.w / 2, this.player.body.y + this.player.body.h / 2, 8, PALETTE.danger, 45);
      }
      next.push(t);
    }
    this.turrets = next;
  }

  /**
   * Fait avancer l'effondrement du plafond de `salle_tresor` (demande de
   * Lucas 2026-07-29) : rien tant que le trésor n'a pas été ramassé
   * (`collapseActive`, posé par `checkPickups`). Points de chute lus depuis
   * les objets `debris_spawn` de la salle (données de salle, pas en dur).
   */
  private updateDebris(dtSeconds: number): void {
    if (!this.collapseActive) return;
    const spawnPoints = this.room.objectsOfType('debris_spawn').map((o) => ({ x: o.x, y: o.y }));
    this.debrisField = stepDebrisField(this.debrisField, dtSeconds, spawnPoints, this.room.pixelHeight);
  }

  private updateDialogue(): void {
    const active = this.dialogue;
    if (active === null) {
      this.mode = 'playing';
      return;
    }
    const node = currentNode(active.data, active.state);
    if (node === null) {
      this.closeDialogue();
      return;
    }
    const choices = node.choices ?? [];

    const mouse = this.mouseView();
    if (choices.length > 0 && mouse !== null && this.dialogueLayout !== null) {
      const hit = hitTestDialogueChoices(this.dialogueLayout, mouse.x, mouse.y);
      if (hit !== null) {
        active.selected = hit;
        if (this.pointer.leftClicked) {
          this.confirmDialogue(active);
          return;
        }
      }
    } else if (choices.length === 0 && this.pointer.leftClicked) {
      // Pas de choix : cliquer n'importe où sur la boîte fait avancer, comme E.
      this.confirmDialogue(active);
      return;
    }

    if (choices.length > 0) {
      if (this.input.wasPressed('up')) active.selected = Math.max(0, active.selected - 1);
      if (this.input.wasPressed('down')) {
        active.selected = Math.min(choices.length - 1, active.selected + 1);
      }
    }
    if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
      this.confirmDialogue(active);
    }
  }

  private confirmDialogue(active: ActiveDialogue): void {
    const node = currentNode(active.data, active.state);
    const choices = node?.choices ?? [];
    const step = advanceDialogue(active.data, active.state, choices.length > 0 ? active.selected : undefined);
    this.applyEffects(step.effects);
    active.state = step.state;
    active.selected = 0;
    if (step.state.nodeId === null) this.closeDialogue();
  }

  private closeDialogue(): void {
    this.dialogue = null;
    this.mode = 'playing';
  }

  /**
   * Met le jeu en pause sur un texte narratif qui s'écrit progressivement
   * (retour de playtest 2026-07-27) : les moments qui comptent (fragment
   * trouvé, mi-boss, déviation, fin de chapitre) avaient un simple toast
   * éphémère, trop vite effacé pour être lu ou compris. Même mécanique de
   * pause que le dialogue, sans locuteur ni choix — `drawNarrationBox`.
   * N'écrase pas une narration déjà en cours (le premier texte va au bout).
   */
  private showNarration(text: string, onClose?: 'ending'): void {
    if (this.mode === 'narration') return;
    this.narration = { text, elapsedSeconds: 0, ...(onClose !== undefined ? { onClose } : {}) };
    this.mode = 'narration';
  }

  private updateNarration(dtSeconds: number): void {
    const active = this.narration;
    if (active === null) {
      this.mode = 'playing';
      return;
    }
    active.elapsedSeconds += dtSeconds;
    const revealed = Math.floor(active.elapsedSeconds * NARRATION_CHARS_PER_SECOND);
    // Cliquer n'importe où sur la boîte fait avancer, comme E (pas besoin de viser).
    if (this.input.wasPressed('interact') || this.input.wasPressed('jump') || this.pointer.leftClicked) {
      if (revealed < active.text.length) {
        // Premier appui pendant l'écriture : affiche tout d'un coup plutôt
        // que de forcer à attendre (convention standard des boîtes de texte).
        active.elapsedSeconds = active.text.length / NARRATION_CHARS_PER_SECOND;
      } else {
        const onClose = active.onClose;
        this.narration = null;
        if (onClose === 'ending') {
          this.mode = 'ending';
          // La cinématique (personnage qui s'éloigne, fondu au noir) n'existe
          // que sur RATURE (demande de Lucas 2026-07-29) ; POINT FINAL/indécis
          // passe directement à l'écran de fin classique.
          this.endingSceneState = this.storyFlags['rature_jamais'] === true ? 'walking' : 'done';
          this.endingSceneStartTime = this.time;
          // `landTimer` (squash à l'atterrissage) ne se décrémente que dans
          // `updatePlaying`, jamais appelée en mode 'ending' : sans ce reset,
          // un atterrissage juste avant la porte resterait figé (squash
          // visible) pendant toute la marche.
          this.landTimer = 0;
        } else {
          this.mode = 'playing';
        }
      }
    }
  }

  /**
   * Écran de fin. Sur POINT FINAL/indécis (`endingSceneState` déjà `'done'`),
   * un seul geste possible : retour à l'écran-titre. Sur RATURE, la
   * cinématique joue d'abord (aucune interaction possible sinon la sauter
   * d'un geste, comme un texte qu'on affiche d'un coup) avant d'accepter ce
   * même geste de retour.
   */
  private updateEnding(): void {
    const pressed = this.input.wasPressed('interact') || this.input.wasPressed('jump') || this.pointer.leftClicked;
    if (this.endingSceneState !== 'done') {
      if (pressed) {
        this.endingSceneState = 'done';
        return;
      }
      const elapsed = this.time - this.endingSceneStartTime;
      if (this.endingSceneState === 'walking') {
        // Le personnage PRINCIPAL (renderPlayer, pas la silhouette de
        // l'enfant de marge_01, retour de Lucas 2026-07-29) traverse l'écran
        // à pied — la simulation est gelée en mode 'ending', donc rien
        // d'autre ne touche `this.player.body` pendant ce temps.
        const walkT = Math.min(1, elapsed / ENDING_SCENE.walkSeconds);
        const cx = ENDING_SCENE.walkStartX + (ENDING_SCENE.walkEndX - ENDING_SCENE.walkStartX) * walkT;
        this.player = {
          ...this.player,
          body: {
            ...this.player.body,
            x: cx - this.player.body.w / 2,
            y: ENDING_SCENE.groundY - this.player.body.h,
            vx: 0,
            vy: 0,
          },
          facing: 1,
          grounded: true,
        };
        if (elapsed >= ENDING_SCENE.walkSeconds) this.endingSceneState = 'fadingOut';
      } else if (elapsed >= ENDING_SCENE.walkSeconds + ENDING_SCENE.fadeSeconds) {
        // Seul l'autre état possible ici (l'état `!== 'done'` englobant est
        // déjà vérifié plus haut) : forcément 'fadingOut'.
        this.endingSceneState = 'done';
      }
      return;
    }
    if (pressed) this.quitGame();
  }

  /**
   * Bug d'audit narratif (2026-07-26) : rien n'empêchait de reparler à un PNJ
   * pour rejouer le même nœud terminal et réappliquer son `set_leaning` à
   * l'infini (les dialogues n'ont pas de garde "déjà vu", contrairement aux
   * objets ramassables qui utilisent `collectedObjects`) — on pouvait donc
   * forcer une fin en boucle sur un seul PNJ, ce qui vide de sens le système
   * des 2 fins. Un nœud terminal pose toujours son propre flag "rencontre"
   * (ex. `pnj_ratures_rencontre`) dans le même lot d'effets que son
   * `set_leaning` (`advanceDialogue` fusionne effets du choix + du
   * nœud d'arrivée en un seul appel) : si ce flag est DÉJÀ vrai avant cet
   * appel, on est en train de rejouer un nœud déjà atteint — les `set_flag`
   * restent appliqués (idempotents, sans effet), mais les `set_leaning` sont
   * ignorés cette fois-ci.
   */
  private applyEffects(effects: readonly DialogueEffect[]): void {
    const alreadySeen = effects.some(
      (e) => e.type === 'set_flag' && e.value === true && this.storyFlags[e.flag] === true,
    );
    for (const effect of effects) {
      if (effect.type === 'set_flag') {
        this.storyFlags[effect.flag] = effect.value;
        this.bus.emit('flag_set', { flag: effect.flag, value: effect.value });
      } else if (!alreadySeen) {
        this.endingLeaning = applyLeaning(this.endingLeaning, effect.delta);
      }
    }
  }

  private updateParticles(dtSeconds: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p === undefined) continue;
      p.life -= dtSeconds;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += PARTICLES.gravity * dtSeconds;
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
    }
    for (const mote of this.motes) {
      mote.x += mote.speed * dtSeconds;
      if (mote.x > this.room.pixelWidth) mote.x = 0;
    }
  }

  private burst(x: number, y: number, count: number, color: string, speed: number): void {
    for (let i = 0; i < count && this.particles.length < PARTICLES.maxCount; i++) {
      const angle = Math.PI + Math.random() * Math.PI;
      const velocity = speed * (0.4 + Math.random() * 0.9);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle + Math.PI / 2) * velocity * (Math.random() < 0.5 ? 1 : -1),
        vy: Math.sin(angle) * velocity,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        size: 1 + Math.random() * 2,
        color,
      });
    }
  }

  // ---------- Tracé d'encre à la souris ----------

  private updateCursorAndDrawing(): void {
    // Position monde du curseur (écran → vue → monde).
    const view = this.viewport.screenToView(this.pointer.clientX, this.pointer.clientY);
    const worldX = view.x + this.camera.x;
    const worldY = view.y + this.camera.y;
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    this.cursor = { tx, ty, worldX, worldY, inReach: this.tileInReach(tx, ty) };

    if (!hasAbility(this.unlocked, 'ecrire')) {
      this.lastPaint = null;
      this.lastErase = null;
      return;
    }

    if (this.pointer.drawing) {
      this.strokePaint(tx, ty);
    } else {
      this.lastPaint = null;
    }

    if (this.pointer.erasing) {
      this.tryRatureCanon(tx, ty);
      this.tryOpenBreche(tx, ty);
      this.strokeErase(tx, ty);
    } else {
      this.lastErase = null;
    }
  }

  /** Ouvre un mur BRÈCHE (si débloqué, à portée) : révèle le filigrane dessous. */
  private tryOpenBreche(tx: number, ty: number): void {
    if (!hasAbility(this.unlocked, 'breche')) return;
    const objectId = this.room.brecheAt(tx, ty);
    if (objectId === null) return;
    const wall = this.brecheWalls.find((o) => o.id === objectId);
    if (wall === undefined || this.collectedObjects.has(wall.id)) return;
    if (!this.tileInReach(tx, ty)) return;
    this.collectedObjects.add(wall.id);
    this.room.revealFiligrane(objectId);
    const flag = wall.properties['flag'];
    const flagName = typeof flag === 'string' ? flag : '';
    if (flagName !== '') {
      this.storyFlags[flagName] = true;
      this.bus.emit('flag_set', { flag: flagName, value: true });
    }
    this.bus.emit('breche_opened', { objectId: wall.id, flag: flagName });
    for (const tile of objectTiles(wall)) {
      this.burst(tile.x * TILE_SIZE + 8, tile.y * TILE_SIZE + 8, 4, PALETTE.sepia, 45);
    }
    this.toast('La brèche s\'ouvre : le brouillon transparaît.');
  }

  /** Rature un mot-loi solide (déviation RATURE) si le curseur est dessus et à portée. */
  private tryRatureCanon(tx: number, ty: number): void {
    const objectId = this.room.canonAt(tx, ty);
    if (objectId === null) return;
    const barrier = this.canonBarriers.find((o) => o.id === objectId);
    if (barrier === undefined || this.collectedObjects.has(barrier.id)) return;
    const exclusiveWith = barrier.properties['exclusiveWith'];
    if (isDeviationLocked(typeof exclusiveWith === 'string' ? exclusiveWith : undefined, this.storyFlags)) {
      if (this.toastCooldown <= 0) {
        this.toast("Cette voie s'est refermée : tu as déjà choisi."); // [proposition]
        this.toastCooldown = 1.4;
      }
      return;
    }
    if (!this.tileInReach(tx, ty)) {
      if (this.toastCooldown <= 0) {
        this.toast('Trop loin pour raturer, approche-toi du mot.');
        this.toastCooldown = 1.4;
      }
      return;
    }
    this.collectedObjects.add(barrier.id);
    this.room.eraseCanon(barrier.id);
    this.applyDeviation(barrier);
    const text = barrier.properties['text'];
    this.bus.emit('canon_erased', {
      objectId: barrier.id,
      flag: typeof barrier.properties['flag'] === 'string' ? barrier.properties['flag'] : '',
    });
    for (const tile of objectTiles(barrier)) {
      this.burst(tile.x * TILE_SIZE + 8, tile.y * TILE_SIZE + 8, 3, PALETTE.danger, 45);
    }
    // [proposition] Rendre explicite le sens du choix, mais seulement pour
    // une déviation qui pèse réellement sur la fin (leaning défini) — pas
    // pour « enfermé », obstacle neutre d'apprentissage (retour de playtest
    // 2026-07-26, symétrique au toast de checkBlanks).
    const stakes =
      typeof barrier.properties['leaning'] === 'number' ? " Tu choisis de rester en dehors de l'histoire." : '';
    // Retour de playtest 2026-07-27 : un choix qui pèse sur la fin mérite
    // mieux qu'un toast fugace — mis en pause, écrit progressivement.
    this.showNarration(`Tu ratures « ${typeof text === 'string' ? text : '???'} » : le mot n'a plus de prise sur toi.${stakes}`);
  }

  /** Un blanc ▢ entièrement recouvert d'encre complète la phrase (déviation POINT FINAL). */
  private checkBlanks(): void {
    for (const blank of this.canonBlanks) {
      if (this.collectedObjects.has(blank.id)) continue;
      if (!isBlankFilled(objectTiles(blank), (x, y) => this.room.hasInk(x, y))) continue;
      const exclusiveWith = blank.properties['exclusiveWith'];
      if (isDeviationLocked(typeof exclusiveWith === 'string' ? exclusiveWith : undefined, this.storyFlags)) {
        this.collectedObjects.add(blank.id);
        this.toast("Cette voie s'est refermée : tu as déjà choisi."); // [proposition]
        continue;
      }
      this.collectedObjects.add(blank.id);
      this.applyDeviation(blank);
      const reveal = blank.properties['text'];
      this.bus.emit('canon_completed', {
        objectId: blank.id,
        flag: typeof blank.properties['flag'] === 'string' ? blank.properties['flag'] : '',
      });
      this.burst(blank.x + blank.width / 2, blank.y + blank.height / 2, 14, PALETTE.unwritten, 50);
      // [proposition] Même garde que tryRatureCanon : seulement si la
      // déviation pèse réellement sur la fin (leaning défini).
      const stakes = typeof blank.properties['leaning'] === 'number' ? ' Tu choisis de continuer l\'histoire.' : '';
      this.showNarration(
        `Tu t'écris dans la phrase : le blanc devient « ${typeof reveal === 'string' ? reveal : 'toi'} ».${stakes}`,
      );
    }
  }

  /** Pose le flag et le penchant de fin d'une déviation (une seule fois). */
  private applyDeviation(obj: RoomObject): void {
    const flag = obj.properties['flag'];
    if (typeof flag === 'string') {
      this.storyFlags[flag] = true;
      this.bus.emit('flag_set', { flag, value: true });
      this.triggerMargeChildScene(flag);
    }
    const leaning = obj.properties['leaning'];
    if (typeof leaning === 'number') {
      this.endingLeaning = applyLeaning(this.endingLeaning, leaning);
    }
  }

  /**
   * Démarre l'animation de l'enfant sur la colline (marge_01, décor de
   * nuit) dès que la phrase change réellement en jeu, une seule fois : une
   * fois `watching` quitté, `renderMargeChildDecor` calcule tout le reste
   * (progression, disparition) à partir du temps écoulé depuis ce
   * déclenchement, sans nouvelle mutation d'état nécessaire.
   */
  private triggerMargeChildScene(flag: string): void {
    if (this.room.id !== 'marge_01' || this.marge01ChildState !== 'watching') return;
    if (flag === 'rature_jamais') this.marge01ChildState = 'leavingRature';
    else if (flag === 'nom_ecrit') this.marge01ChildState = 'leavingPoint';
    if (this.marge01ChildState !== 'watching') this.marge01ChildTriggerTime = this.time;
  }

  /**
   * Démarre la scène de fin de combat (arène de chapitre_01) dès que le vrai
   * mi-boss est vaincu, une seule fois, et seulement sur la voie où le décor
   * montre l'enfant contre le Troll d'Encre (pas "La Marge" : RATURE garde
   * son décor inchangé, demande de Lucas 2026-07-28). Même principe que
   * `triggerMargeChildScene` : `renderCreatureDecor` calcule tout le reste
   * depuis le temps écoulé.
   */
  private triggerTrollDefeatScene(): void {
    if (this.room.id !== 'chapitre_01' || this.chapitre01SceneState !== 'fighting') return;
    if (resolveBossFlavor(this.bossFlavorVariants, this.storyFlags).decor === 'hand_quill') return;
    this.chapitre01SceneState = 'defeated';
    this.chapitre01SceneTriggerTime = this.time;
  }

  private tileInReach(tx: number, ty: number): boolean {
    const center = this.playerCenter();
    const cx = tx * TILE_SIZE + TILE_SIZE / 2;
    const cy = ty * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(cx - center.x, cy - center.y) <= INK.reach;
  }

  private tileOverlapsPlayer(tx: number, ty: number): boolean {
    const { body } = this.player;
    return aabbOverlap(body.x, body.y, body.w, body.h, tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  private strokePaint(tx: number, ty: number): void {
    const from = this.lastPaint ?? { x: tx, y: ty };
    for (const tile of tilesBetween(from.x, from.y, tx, ty)) this.tryPaint(tile.x, tile.y);
    this.lastPaint = { x: tx, y: ty };
  }

  private strokeErase(tx: number, ty: number): void {
    const from = this.lastErase ?? { x: tx, y: ty };
    for (const tile of tilesBetween(from.x, from.y, tx, ty)) this.tryErase(tile.x, tile.y);
    this.lastErase = { x: tx, y: ty };
  }

  private tryPaint(tx: number, ty: number): void {
    if (!this.room.isPaintable(tx, ty)) return;
    if (!this.tileInReach(tx, ty)) return;
    if (this.tileOverlapsPlayer(tx, ty)) return;
    if (!canAfford(this.ink, INK.costPerTile)) {
      if (this.toastCooldown <= 0) {
        this.toast('Encre épuisée, efface un tracé (clic droit) ou reviens à l\'encrier.');
        this.toastCooldown = 1.4;
      }
      return;
    }

    this.ink = spendInk(this.ink, INK.costPerTile);
    this.room.paintInk(tx, ty);
    this.burst(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, PARTICLES.drawBurst, PALETTE.ink, 35);
  }

  private tryErase(tx: number, ty: number): void {
    if (!this.room.hasInk(tx, ty)) return;
    if (!this.tileInReach(tx, ty)) return;
    this.room.eraseInk(tx, ty);
    this.ink = reclaimInk(this.ink, INK.costPerTile);
    this.bus.emit('ink_reclaimed', { amount: INK.costPerTile });
    this.burst(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, PARTICLES.eraseBurst, PALETTE.unwritten, 40);
  }

  private respawn(): void {
    this.player = {
      ...this.player,
      body: { ...this.player.body, x: this.checkpoint.x, y: this.checkpoint.y, vx: 0, vy: 0 },
      grounded: false,
      dashTimer: 0,
      dashCooldown: 0,
      airJumpsUsed: 0,
    };
    this.ink = refillInk(this.ink);
    // Retour de Lucas 2026-07-29 : une mort doit remettre le puzzle d'encre
    // à zéro, pas seulement recharger la réserve — sans ça, un escalier déjà
    // tracé avant une chute reste utilisable indéfiniment (contourne la
    // difficulté, surtout dans crue_01 où la course contre la montée en
    // dépend). Les murs BRÈCHE/canon déjà résolus, eux, restent acquis (pas
    // touchés ici) : seule l'encre du JOUEUR disparaît.
    this.room.clearInk();
    // Liquide montant (crue_01) : remis à niveau sous le point de retour,
    // quel que soit l'encrier (bas ou mi-parcours) — même formule qu'au
    // chargement de la salle (`loadRoom`).
    if (this.hazardY !== null) {
      this.hazardY = this.checkpoint.y + PLAYER.height + RISING_HAZARD.restartOffset;
    }
    // Effondrement de salle_tresor : un échec pendant la course vers la
    // sortie donne un essai frais (blocs déjà tombés effacés), pas la
    // continuation d'une chute déjà bien avancée — le trésor reste acquis
    // (storyFlags non touché ici), seul le défi physique recommence.
    if (this.room.id === 'salle_tresor' && this.collapseActive) {
      this.debrisField = createDebrisField();
    }
    this.bus.emit('player_respawned', { x: this.checkpoint.x, y: this.checkpoint.y });
  }

  /**
   * Défaite (PV à 0, contact ennemi/boss) : retour au dernier encrier, PV et
   * encre refaits à neuf — comme R, en plus sévère. Retour de playtest
   * 2026-07-22 : il n'existait avant aucune condition d'échec.
   */
  private handleDefeat(): void {
    this.failAndRespawn('Trop délavé, le manuscrit te ramène à l\'encrier.');
  }

  /**
   * Chute dans un vrai gouffre (pas de sol en dessous, contrairement au blanc
   * ▢ de La Marge qui a toujours un filet) : même sanction qu'à 0 PV, retour
   * de playtest 2026-07-22 — avant, on tombait jusqu'au bord invisible de la
   * carte sans conséquence.
   */
  private handleFall(): void {
    this.failAndRespawn('Le vide du gouffre t\'engloutit : le manuscrit te ramène à l\'encrier.');
  }

  /**
   * Rattrapé par le liquide montant (crue_01) : même sévérité que les autres
   * échecs (retour au dernier encrier), message reskinné selon le chemin
   * narratif (narrative/hazard_flavor.ts).
   */
  private handleHazardCaught(): void {
    this.failAndRespawn(resolveHazardFlavor(this.hazardFlavorVariants, this.storyFlags).catchMessage);
  }

  /**
   * Écrasé par un bloc du plafond effondré de `salle_tresor` (demande de
   * Lucas 2026-07-29). PAS `failAndRespawn()`/`respawn()` : ceux-ci
   * replacent le joueur au dernier `this.checkpoint`, qui est forcément dans
   * `crue_01` (aucun encrier dans `salle_tresor`) sans jamais changer
   * `this.room` — le joueur se retrouvait donc téléporté aux coordonnées du
   * puits tout en restant dans la petite salle-trésor, hors de tout sol
   * solide, ce qui déclenchait aussitôt `handleFall()` en boucle (bug
   * signalé par Lucas : « ça nous fait tomber en boucle »). Ici : réapparition
   * locale au point de départ DE CETTE SALLE, effondrement arrêté et trésor
   * remis en place (retour de Lucas : « avec le trésor remis en place ») —
   * il faut recommencer la course depuis le début plutôt que de continuer
   * une chute déjà entamée.
   */
  private handleCrushed(): void {
    const spawn = this.room.firstObjectOfType('spawn');
    const x = spawn?.x ?? this.player.body.x;
    const y = spawn?.y ?? this.player.body.y;
    this.player = {
      ...this.player,
      body: { ...this.player.body, x, y, vx: 0, vy: 0 },
      grounded: false,
      health: PLAYER.maxHealth,
      dashTimer: 0,
      dashCooldown: 0,
      airJumpsUsed: 0,
    };
    this.ink = refillInk(this.ink);
    this.collapseActive = false;
    this.debrisField = createDebrisField();
    const treasure = this.room.firstObjectOfType('treasure');
    const flag = treasure?.properties['flag'];
    if (treasure !== null && typeof flag === 'string') {
      this.collectedObjects.delete(treasure.id);
      this.storyFlags[flag] = false;
    }
    this.bus.emit('player_respawned', { x, y });
    this.toast(resolveHazardFlavor(this.hazardFlavorVariants, this.storyFlags).crushedMessage);
  }

  private failAndRespawn(message: string): void {
    this.respawn();
    this.player = { ...this.player, health: PLAYER.maxHealth };
    this.toast(message);
  }

  // ---------- Interactions ----------

  private playerCenter(): { x: number; y: number } {
    const { body } = this.player;
    return { x: body.x + body.w / 2, y: body.y + body.h / 2 };
  }

  private playerOverlaps(obj: RoomObject, margin = 0): boolean {
    const { body } = this.player;
    return aabbOverlap(
      body.x - margin,
      body.y - margin,
      body.w + margin * 2,
      body.h + margin * 2,
      obj.x,
      obj.y,
      obj.width,
      obj.height,
    );
  }

  private checkPickups(): void {
    for (const word of this.room.objectsOfType('word')) {
      if (this.collectedObjects.has(word.id) || !this.playerOverlaps(word)) continue;
      const ability = word.properties['ability'];
      if (typeof ability !== 'string') continue;
      this.collectedObjects.add(word.id);
      this.unlocked.add(ability);
      this.burst(word.x + word.width / 2, word.y + word.height / 2, 12, PALETTE.danger, 55);
      this.bus.emit('ability_unlocked', { id: ability });
    }
    for (const fragment of this.room.objectsOfType('fragment')) {
      if (this.collectedObjects.has(fragment.id) || !this.playerOverlaps(fragment)) continue;
      const flag = fragment.properties['flag'];
      if (typeof flag !== 'string') continue;
      this.collectedObjects.add(fragment.id);
      this.storyFlags[flag] = true;
      this.burst(fragment.x + fragment.width / 2, fragment.y + fragment.height / 2, 16, PALETTE.unwritten, 50);
      this.bus.emit('flag_set', { flag, value: true });
      // Retour de Lucas (audit narratif) : un fragment sans texte affiché ne
      // dit rien de ce qu'on vient de trouver ni pourquoi. Chaque fragment
      // porte désormais sa propre ligne de lore (`text`, données de salle).
      // Retour de playtest 2026-07-27 : un toast s'efface trop vite pour un
      // texte de lore qu'on découvre — mis en pause, écrit progressivement
      // (showNarration), comme un dialogue.
      const text = fragment.properties['text'];
      this.showNarration(typeof text === 'string' ? `Fragment retrouvé : ${text}` : 'Fragment de page recueilli.');
    }
    // Trésor de `salle_tresor` (retour de Lucas 2026-07-29, derrière le mur
    // BRÈCHE tout en haut de crue_01, accessible via porte) : même mécanique
    // qu'un fragment (ramassage unique, texte affiché en narration), mais un
    // type dédié plutôt que réutiliser 'fragment' tel quel — le préfixe
    // « Fragment retrouvé » n'aurait pas de sens pour un trésor, et le texte
    // change selon le chemin narratif (resolveHazardFlavor) plutôt que
    // d'être fixe par salle. Dans `salle_tresor` spécifiquement, ramasser le
    // trésor déclenche aussi l'effondrement du plafond (« le temple
    // tremble » — retour de Lucas, il faut courir vers la sortie).
    for (const treasure of this.room.objectsOfType('treasure')) {
      if (this.collectedObjects.has(treasure.id) || !this.playerOverlaps(treasure)) continue;
      const flag = treasure.properties['flag'];
      if (typeof flag !== 'string') continue;
      this.collectedObjects.add(treasure.id);
      this.storyFlags[flag] = true;
      this.burst(treasure.x + treasure.width / 2, treasure.y + treasure.height / 2, 20, PALETTE.danger, 55);
      this.bus.emit('flag_set', { flag, value: true });
      const flavor = resolveHazardFlavor(this.hazardFlavorVariants, this.storyFlags);
      if (this.room.id === 'salle_tresor') {
        this.collapseActive = true;
        this.debrisField = createDebrisField();
        this.showNarration(`${flavor.treasureText} ${flavor.collapseMessage}`);
      } else {
        this.showNarration(flavor.treasureText);
      }
    }
    for (const potion of this.room.objectsOfType('potion')) {
      if (this.collectedObjects.has(potion.id) || !this.playerOverlaps(potion)) continue;
      const flag = potion.properties['flag'];
      if (typeof flag !== 'string') continue;
      this.collectedObjects.add(potion.id);
      this.storyFlags[flag] = true;
      this.player = {
        ...this.player,
        health: Math.min(PLAYER.maxHealth, this.player.health + PLAYER.maxHealth * PLAYER.healPotionFraction),
      };
      this.burst(potion.x + potion.width / 2, potion.y + potion.height / 2, 14, PALETTE.danger, 55);
      this.bus.emit('flag_set', { flag, value: true });
      this.toast('Fiole d\'encre rouge bue : PV restaurés.');
    }
  }

  private handleInteract(): void {
    const npc = this.room
      .objectsOfType('npc')
      .find((o) => !this.isNpcHidden(o) && this.playerOverlaps(o, INTERACT_MARGIN));
    if (npc !== undefined) {
      const dialogueId = npc.properties['dialogue'];
      const data = typeof dialogueId === 'string' ? this.dialogues[dialogueId] : undefined;
      if (data !== undefined) {
        const step = startDialogue(data, resolveDialogueStart(data, this.storyFlags));
        this.applyEffects(step.effects);
        this.dialogue = { data, state: step.state, selected: 0 };
        this.mode = 'dialogue';
        this.bus.emit('npc_talked', { npcId: npc.name });
        return;
      }
    }
    const inkwell = this.room
      .objectsOfType('inkwell')
      .find((o) => this.playerOverlaps(o, INTERACT_MARGIN));
    if (inkwell !== undefined) {
      this.ink = refillInk(this.ink);
      this.checkpoint = { x: this.player.body.x, y: this.player.body.y };
      this.burst(inkwell.x + inkwell.width / 2, inkwell.y, 10, PALETTE.ink, 40);
      if (this.currentSlot === null) {
        // Retour de Lucas (2026-07-28) : plus de sauvegarde automatique liée
        // à un emplacement dès la création de la partie — sans indice, rien
        // ne montre que la progression ne sera pas gardée tant qu'on n'a pas
        // explicitement sauvegardé une fois.
        this.toast('Repère posé. Échap puis Sauvegarder pour garder ta progression.'); // [proposition]
      } else {
        this.persist('inkwell');
      }
      return;
    }

    // Robinet/fermoir en haut de crue_01 (demande de Lucas 2026-07-29) :
    // arrête pour de bon la montée du liquide. Message et nom reskinnés
    // selon le chemin narratif (narrative/hazard_flavor.ts), même mécanique.
    const valve = this.room.objectsOfType('valve').find((o) => this.playerOverlaps(o, INTERACT_MARGIN));
    if (valve !== undefined) {
      if (this.storyFlags[CRUE01_VALVE_FLAG] !== true) {
        this.storyFlags[CRUE01_VALVE_FLAG] = true;
        this.bus.emit('flag_set', { flag: CRUE01_VALVE_FLAG, value: true });
        this.burst(valve.x + valve.width / 2, valve.y + valve.height / 2, 12, PALETTE.unwritten, 45);
        this.showNarration(resolveHazardFlavor(this.hazardFlavorVariants, this.storyFlags).stopMessage);
        // Pas de porte de sortie ici (retour de Lucas 2026-07-29) : le
        // robinet/fermoir EST le point d'arrivée, donc aussi celui où la fin
        // du contenu actuellement construit se marque (déplacé depuis
        // l'ancienne porte_suite).
        this.finalizeAvailableContent();
      }
      return;
    }

    // Chambre des mots (ratures_01) : porter un mot n'est possible que les
    // mains vides — rien n'est jamais consommé, un mot reste toujours
    // disponible sur son pédestal (contrairement aux mots-pouvoir).
    if (this.carriedWord === null) {
      const word = this.room
        .objectsOfType('transform_word')
        .find((o) => this.playerOverlaps(o, INTERACT_MARGIN));
      if (word !== undefined) {
        const role = word.properties['role'];
        const wordId = word.properties['wordId'];
        const label = word.properties['label'];
        const gender = word.properties['gender'];
        if ((role === 'subject' || role === 'attribute') && typeof wordId === 'string' && typeof label === 'string') {
          this.carriedWord =
            gender === 'm' || gender === 'f'
              ? { role, id: wordId, label, gender }
              : { role, id: wordId, label };
          this.burst(word.x + word.width / 2, word.y + word.height / 2, 8, PALETTE.unwritten, 45);
        }
        return;
      }
    }

    const panel = this.room.objectsOfType('console').find((o) => this.playerOverlaps(o, INTERACT_MARGIN));
    if (panel !== undefined) {
      const role = panel.properties['role'];
      if (role === 'cancel') {
        this.transformSlots = { subject: null, attribute: null };
      } else if (role === 'validate' && this.carriedWord !== null) {
        if (this.carriedWord.role === 'subject') this.transformSlots.subject = this.carriedWord;
        else this.transformSlots.attribute = this.carriedWord;
        this.carriedWord = null;
        this.resolveTransformAttempt();
      }
    }
  }

  /**
   * Une fois les 2 slots remplis, vérifie si la phrase composée est prévue
   * (`worldTransformations` — les 12 combinaisons des 4 sujets × 3 attributs
   * sont toutes prévues, retour de Lucas 2026-07-27). Le flag `monde_<sujet>_
   * <attribut>` se pose sur les deux chemins, mais un seul est actif à la
   * fois par sujet (recolorier écrase les flags des autres attributs du même
   * sujet, 2026-07-28) : seul le chemin RATURE le rend visible
   * (`resolveWorldColor`, au rendu). Le code du temple (`temple_code_trouve`,
   * séparé, jamais effacé) est posé en plus quand la combinaison trouvée est
   * « soleil devient jaune » — c'est lui, pas `monde_soleil_jaune`, qui ouvre
   * `porte_temple` sur le chemin POINT FINAL/indécis (un code retrouvé plutôt
   * qu'inventé) ; les 11 autres combinaisons n'ont aucun effet sur la porte.
   * [proposition]
   */
  private resolveTransformAttempt(): void {
    const { subject, attribute } = this.transformSlots;
    if (subject === null || attribute === null) return;
    const transformation = resolveTransformation(this.worldTransformations, subject.id, attribute.id);
    const sentence = composeTransformSentence(subject, attribute);
    if (transformation === null) {
      this.toast('Cette phrase-là n\'est pas encore prévue par le livre.'); // [proposition]
      return;
    }
    // Un seul attribut actif à la fois par sujet (retour de Lucas
    // 2026-07-28 : « soleil jaune » marchait, mais recolorier ensuite en
    // bleu ne changeait plus rien) : `resolveWorldColor` prend le premier
    // flag vrai qu'il trouve pour la cible, donc sans ce nettoyage l'attribut
    // le plus ANCIEN gagnait pour toujours. On efface les flags des autres
    // attributs du même sujet avant de poser le nouveau.
    for (const t of this.worldTransformations) {
      if (t.target === transformation.target && t.flag !== transformation.flag) {
        this.storyFlags[t.flag] = false;
      }
    }
    this.storyFlags[transformation.flag] = true;
    this.bus.emit('flag_set', { flag: transformation.flag, value: true });
    // Code du temple : flag séparé et permanent (jamais effacé par le
    // nettoyage ci-dessus), pour que recolorier le sujet autrement après
    // coup ne reverrouille jamais `porte_temple` une fois trouvé. La
    // combinaison qui fait foi est une donnée (`isTempleCode`,
    // data/chapters/ratures_01.json), pas un couple sujet/attribut en dur.
    if (transformation.isTempleCode === true) {
      this.storyFlags['temple_code_trouve'] = true;
      this.bus.emit('flag_set', { flag: 'temple_code_trouve', value: true });
    }
    this.transformSlots = { subject: null, attribute: null };
    // La texture papier est peinte une fois par salle (pas par frame) : si
    // « La Page devint ... » vient d'être validée, il faut la regénérer pour
    // que le changement de couleur soit visible immédiatement.
    if (transformation.target === 'page' && this.storyFlags['rature_jamais'] === true) {
      this.paper = this.createPaperTexture(
        resolveWorldColor('page', this.worldTransformations, this.storyFlags, PALETTE.parchment),
      );
    }
    if (this.storyFlags['rature_jamais'] === true) {
      this.showNarration(`${sentence} Tu l'as écrit, et c'est devenu vrai.`); // [proposition]
    } else if (transformation.isTempleCode === true) {
      this.showNarration(`${sentence} La phrase était déjà juste : elle n'attendait que d'être retrouvée. La porte s'ouvre.`); // [proposition]
    } else {
      this.showNarration(`${sentence} Une phrase vraie, mais pas celle que la porte attend.`); // [proposition]
    }
  }

  /**
   * Marque le chapitre 1 comme achevé, avec l'issue déduite des flags déjà
   * posés par le joueur (raturer « jamais » et/ou combler le blanc ▢).
   * Retour de playtest 2026-07-22 : il n'y a plus de sortie séparée à
   * toucher (les deux "fausses portes" qui ne menaient nulle part sont
   * supprimées) — atteindre la vraie porte, au bout du niveau, EST la fin.
   */
  private finalizeChapter1(): void {
    if (this.storyFlags['chapitre1_fini'] === true) return;
    const kind = this.storyFlags['rature_jamais'] === true ? 'rature' : 'point';
    this.storyFlags['chapitre1_fini'] = true;
    this.bus.emit('chapter_ended', { ending: kind });
    // Retour de playtest 2026-07-27 : mis en pause (showNarration) comme les
    // autres moments qui comptent ; texte nettoyé de la note de développement
    // (« la suite arrive en Phase 2 ») qui n'a rien à faire dans la fiction.
    if (kind === 'rature') {
      this.showNarration('Tu quittes la Marge en la raturant. Un vide s\'ouvre devant toi, la suite du livre attend encore d\'être trouvée.');
    } else {
      this.showNarration('Tu quittes la Marge en t\'y écrivant. La phrase s\'achève, mais l\'histoire, elle, continue.');
    }
  }

  /**
   * Marque le contenu actuellement construit comme achevé, une fois la porte
   * qui le porte franchie (`showsCompletionToast`, propriété Tiled générique
   * lue par `checkDoors` — désormais la sortie de crue_01, plus porte_temple
   * de ratures_01 depuis que la zone 4 existe, 2026-07-29).
   */
  private finalizeAvailableContent(): void {
    if (this.storyFlags['content_fin_actuelle'] === true) return;
    this.storyFlags['content_fin_actuelle'] = true;
    this.toast('Fin du contenu actuel : les zones 5 et 6 arriveront dans une prochaine passe.');
  }

  /**
   * Termine le jeu : la 2e porte de `salle_tresor` (`endsGame`, propriété
   * Tiled générique lue par `checkDoors`) menait auparavant en boucle vers
   * `crue_01` ; demande de Lucas (2026-07-29) qu'elle mène plutôt « à
   * l'extérieur du temple », la vraie fin du contenu construit jusqu'ici.
   * Même principe que `finalizeChapter1` : l'issue (RATURE/POINT FINAL) se
   * déduit du flag déjà posé par le joueur en `marge_01`, pas un nouveau
   * choix. La narration se referme sur l'écran de fin (`showNarration(...,
   * 'ending')`) plutôt que de rendre la main en jeu — il n'y a plus rien
   * après cette porte. `jeu_termine` (idempotent) est remis à `false` par
   * `restartLevel()` dans `salle_tresor`, comme le reste de l'état
   * mécanique de cette salle.
   */
  private finalizeEnding(): void {
    if (this.storyFlags['jeu_termine'] === true) return;
    const kind = this.storyFlags['rature_jamais'] === true ? 'rature' : 'point';
    this.storyFlags['jeu_termine'] = true;
    this.bus.emit('game_ended', { ending: kind });
    if (kind === 'rature') {
      this.showNarration(
        'Le trésor libère le mot prisonnier du livre. Il n\'appartient plus à personne : libre, il peut enfin écrire sa propre histoire.', // [proposition]
        'ending',
      );
    } else {
      this.showNarration(
        'L\'enfant rentre à son village et offre le trésor à son peuple, qui n\'en manque plus jamais. On le couronne bientôt : il devient un roi juste et aimé, et l\'histoire, longtemps incertaine, se termine enfin bien.', // [proposition]
        'ending',
      );
    }
  }

  /**
   * Portes entre salles (Phase 2, D13). `doorCooldown` (posé par `loadRoom`)
   * empêche un aller-retour immédiat si le point d'arrivée chevauchait la
   * porte de destination. Une porte à `endsChapter` termine d'abord le
   * chapitre correspondant (voir `finalizeChapter1`) avant de transiter.
   * `requiresFlag` (retour de playtest 2026-07-26) : reste fermée tant que
   * ce flag n'est pas posé (ex. mi-boss vaincu) — pas de transition, un
   * toast explique pourquoi.
   */
  /**
   * Une porte `requiresFlag` reste verrouillée tant que ce flag n'est pas
   * posé — sauf si `requiresFlagUnless` (propriété Tiled optionnelle) est
   * lui-même posé, auquel cas la porte est déjà ouverte sans condition.
   * Ajouté pour la porte du temple de `ratures_01` (retour de Lucas
   * 2026-07-27) : déjà ouverte sur RATURE (`requiresFlagUnless:
   * 'rature_jamais'`), il faut composer la bonne phrase sur POINT
   * FINAL/indécis (`requiresFlag: 'temple_code_trouve'`, flag permanent
   * distinct de `monde_soleil_jaune` depuis le 2026-07-28 pour que
   * recolorier le soleil autrement après coup ne reverrouille jamais la
   * porte). Partagée entre `checkDoors` (mécanique) et le rendu (indicateur
   * visuel verrouillé).
   */
  private isDoorLocked(door: RoomObject): boolean {
    const requiresFlag = door.properties['requiresFlag'];
    if (typeof requiresFlag !== 'string' || this.storyFlags[requiresFlag] === true) return false;
    const requiresFlagUnless = door.properties['requiresFlagUnless'];
    return !(typeof requiresFlagUnless === 'string' && this.storyFlags[requiresFlagUnless] === true);
  }

  /**
   * Un PNJ `hiddenIfFlag` disparaît entièrement (rendu ET interaction) une
   * fois ce flag posé — contrairement aux portes (`isDoorLocked`), il n'y a
   * pas de version « verrouillée mais visible » pour un PNJ : soit il est
   * là, soit il n'y est pas. Ajouté pour les 2 PNJ-indice de ratures_01
   * (retour de Lucas 2026-07-29, « un seul pnj dans cette version [RATURE] »)
   * — leurs indices ne servent à rien une fois la porte du temple déjà
   * ouverte, autant ne pas les proposer du tout.
   */
  private isNpcHidden(npc: RoomObject): boolean {
    const hiddenIfFlag = npc.properties['hiddenIfFlag'];
    return typeof hiddenIfFlag === 'string' && this.storyFlags[hiddenIfFlag] === true;
  }

  private checkDoors(): void {
    if (this.doorCooldown > 0) return;
    const door = this.room.objectsOfType('door').find((o) => this.playerOverlaps(o));
    if (door === undefined) return;
    if (this.isDoorLocked(door)) {
      if (this.toastCooldown <= 0) {
        // `lockedMessage` (propriété Tiled optionnelle) permet à chaque porte
        // verrouillée d'expliquer sa propre condition ; repli sur le message
        // historique (seule porte requiresFlag jusqu'ici : le mi-boss).
        const lockedMessage = door.properties['lockedMessage'];
        this.toast(
          typeof lockedMessage === 'string'
            ? lockedMessage
            : 'La porte reste close : il faut d\'abord vaincre le mi-boss.', // [proposition]
        );
        this.toastCooldown = 1.4;
      }
      return;
    }
    if (door.properties['endsChapter'] === 'chapitre1') this.finalizeChapter1();
    if (door.properties['showsCompletionToast'] === true) this.finalizeAvailableContent();
    if (door.properties['endsGame'] === true) {
      this.finalizeEnding();
      return; // pas de salle cible : cette porte termine le jeu, elle ne mène nulle part
    }
    const targetRoom = door.properties['targetRoom'];
    const targetX = door.properties['targetX'];
    const targetY = door.properties['targetY'];
    if (typeof targetRoom !== 'string' || typeof targetX !== 'number' || typeof targetY !== 'number') return;
    if (ROOMS[targetRoom] === undefined) return;
    this.loadRoom(targetRoom, false, { x: targetX, y: targetY });
    this.persist('door');
  }

  /** Met un message en file plutôt que de l'afficher tout de suite : `update` les fait défiler avec un écart mini. */
  private toast(text: string): void {
    this.toastQueue.push(text);
  }

  // ---------- Rendu ----------

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    ctx.drawImage(this.paper, 0, 0);
    ctx.restore();

    renderBackdrop(
      ctx,
      this.room.id,
      this.camera.x,
      this.camera.y,
      this.room.pixelWidth,
      this.room.pixelHeight,
      this.time,
      resolveWorldColor('soleil', this.worldTransformations, this.storyFlags, PALETTE.sepia),
      resolveWorldColor('ciel', this.worldTransformations, this.storyFlags, '') || null,
    );

    // Écran-titre (retour de Lucas 2026-07-28 : "un niveau en arrière-plan
    // c'est pas très joli") : seuls le parchemin + le fond atmosphérique
    // (soleil/lune, collines, oiseaux...) ci-dessus restent visibles derrière
    // le menu — ni la géométrie du niveau (murs, PNJ, mots-loi...) ni le
    // décor narratif ponctuel (l'enfant sur la colline, "Il était une
    // fois"...) qui exposeraient un niveau précis plutôt qu'un simple fond.
    // Même gating pour l'écran de fin ('ending') : conclusion propre plutôt
    // que le joueur planté dans la salle aux trésors vide, HUD affiché.
    if (this.mode !== 'title' && this.mode !== 'ending') {
      this.renderParallaxDecor(ctx);

      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);
      // Décor de l'arène du mi-boss (chapitre_01) : au défilement complet
      // (facteur 1, comme le joueur/le boss), pas en parallaxe — voir
      // `renderParallaxDecor` pour pourquoi (bug de dérive verticale dans
      // les salles hautes, corrigé le 2026-07-29).
      this.renderBossArenaDecor(ctx);
      this.renderMotes(ctx);
      this.renderSlabs(ctx);
      // Décor mural du puits (crue_01) : APRÈS `renderSlabs` — bug trouvé en
      // vérifiant visuellement (2026-07-29) : dessiné avant, les dalles de
      // mur (peintes juste après) le recouvraient entièrement, invisible.
      this.renderCrueWallDecor(ctx);
      this.renderFiligrane(ctx);
      this.renderInk(ctx);
      this.renderCanon(ctx);
      this.renderBrecheWalls(ctx);
      this.renderObjects(ctx);
      this.renderHazard(ctx);
      this.renderEnemies(ctx);
      this.renderBoss(ctx);
      this.renderTurrets(ctx);
      this.renderDebris(ctx);
      this.renderPlayer(ctx);
      this.renderCarriedWord(ctx);
      this.renderParticles(ctx);
      this.renderCursor(ctx);

      ctx.restore();

      this.drawSentenceBanner(ctx);
      this.drawTransformBanner(ctx);
      drawHud(
        ctx,
        this.ink,
        this.player.health,
        [...this.unlocked].map((id) => {
          const def = getAbility(id);
          return { word: def?.word ?? id, control: def?.control ?? '' };
        }),
      );
      drawToasts(ctx, this.toasts);
    }

    if (this.mode === 'dialogue' && this.dialogue !== null) {
      const node = currentNode(this.dialogue.data, this.dialogue.state);
      // Le layout retourné (zones cliquables) est mis en cache pour le clic
      // souris de la frame suivante — le tracé du texte dépend du contexte
      // canvas (mesure de police), indisponible depuis `update()`.
      this.dialogueLayout = node !== null ? drawDialogueBox(ctx, node, this.dialogue.selected) : null;
    } else {
      this.dialogueLayout = null;
    }

    if (this.mode === 'narration' && this.narration !== null) {
      const revealed = Math.floor(this.narration.elapsedSeconds * NARRATION_CHARS_PER_SECOND);
      drawNarrationBox(ctx, this.narration.text, revealed);
    }

    if (this.mode === 'paused') {
      if (this.pauseView === 'options') {
        drawOptionsMenu(ctx, this.pauseSelected, this.musicMuted);
      } else {
        drawPauseMenu(
          ctx,
          this.pauseView,
          this.pauseSelected,
          allAbilities(),
          this.unlocked,
          LEANING_LINES[resolveLeaning(this.storyFlags)],
          ADMIN_ROOMS,
          this.room.id,
          this.slotDisplays(this.pauseSaveSlots),
          this.pausePendingOverwriteSlot,
        );
      }
    }

    if (this.mode === 'title') {
      if (this.titleView === 'main') {
        drawTitleMain(ctx, this.titleSelected);
      } else if (this.titleView === 'options') {
        drawOptionsMenu(ctx, this.titleSelected, this.musicMuted);
      } else {
        drawSlotList(
          ctx,
          'Charger une partie',
          this.titleSelected,
          this.slotDisplays(this.titleSlots),
          null,
          true,
          'Échap : retour',
        );
      }
    }

    if (this.mode === 'ending') {
      const isRature = this.storyFlags['rature_jamais'] === true;
      if (isRature && this.endingSceneState !== 'done') {
        this.renderEndingWalkAway(ctx);
      } else if (isRature) {
        drawRatureEndingText(ctx);
      } else {
        drawEndingScreen(ctx);
      }
    }
  }

  /**
   * Cinématique de fin RATURE (demande de Lucas 2026-07-29, corrigée le jour
   * même : « c'est notre personnage principal, pas l'enfant stickman qui
   * doit disparaître ») : `renderPlayer` (la même forme qu'en jeu, déjà
   * repositionnée par `updateEnding` pendant l'état `'walking'`) traverse
   * l'écran, puis un fondu au noir (`PALETTE.ink`, aucune couleur inventée)
   * recouvre la scène avant le texte de clôture (`drawRatureEndingText`,
   * affiché une fois `endingSceneState` à `'done'`, voir `updateEnding`).
   * Coordonnées en espace vue (pas de `ctx.translate` de caméra actif ici,
   * contrairement au décor en jeu). Le parchemin peint plus haut dans
   * `render()` (`this.paper`) est dimensionné à la salle courante
   * (`salle_tresor` : 416×160) et ne couvre donc pas toute la vue (480×270),
   * ce qui laissait un bord non peint visible pendant la marche (retour de
   * Lucas 2026-07-29, « il faut élargir sur toute la surface le fond de page
   * qu'il y a déjà ») : redessiné ici en l'étirant explicitement sur toute la
   * vue plutôt que de recréer une texture dédiée à la cinématique. Décor
   * (« remets le même fond qu'au niveau 1 : soleil, montagne, arbres »,
   * même jour) : réutilise directement `renderBackdrop` avec un `roomId`
   * arbitraire non nocturne (`'chapitre_01'`, `NIGHT_ROOMS` ne contient que
   * `marge_01`) et une caméra fixe à (0,0) — un décor de fond n'a pas besoin
   * d'être lié à la vraie salle ni à une caméra mobile pour ce plan fixe.
   */
  private renderEndingWalkAway(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.paper, 0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    renderBackdrop(ctx, 'chapitre_01', 0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT, this.time);
    this.renderPlayer(ctx);

    if (this.endingSceneState === 'fadingOut') {
      const elapsed = this.time - this.endingSceneStartTime;
      const fadeT = Math.min(1, Math.max(0, (elapsed - ENDING_SCENE.walkSeconds) / ENDING_SCENE.fadeSeconds));
      ctx.fillStyle = hexAlpha(PALETTE.ink, fadeT);
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    }
  }

  /** Convertit les emplacements bruts (lus du stockage) en résumés affichables. */
  private slotDisplays(slots: readonly { slot: number; save: SaveData | null }[]): SlotDisplay[] {
    return slots.map((s) => ({ slot: s.slot, summary: s.save === null ? null : this.describeSlot(s.save) }));
  }

  /**
   * Décor narratif ponctuel en parallaxe : défile plus lentement que le
   * premier plan (facteur `RENDERING.parallaxFactor` < 1), pour lire comme
   * de l'arrière-plan plutôt que comme des éléments calés pile sur un objet
   * de jeu. Ne reste ici que le décor de marge_01 (salle courte, un seul
   * écran de haut : le décalage de parallaxe y reste discret).
   *
   * Le décor de l'arène du mi-boss (chapitre_01) N'EST PLUS ici depuis le
   * 2026-07-29 (voir `renderBossArenaDecor`, appelée séparément au défilement
   * complet) : bug trouvé en playtest — chapitre_01 est une salle TRÈS haute
   * (arène verticale, D16) où la caméra défile beaucoup en Y ; à un facteur
   * de parallaxe < 1, l'écart entre la position à l'écran du décor et celle
   * du sol réel grandit avec le défilement vertical, au point que le combat
   * semblait passer sous la carte une fois la caméra proche du bas de la
   * salle (même famille de bug que le masquage de l'enfant/colline dans
   * marge_01, mais sur l'axe vertical cette fois).
   */
  private renderParallaxDecor(ctx: CanvasRenderingContext2D): void {
    const f = RENDERING.parallaxFactor;
    ctx.save();
    ctx.translate(-this.camera.x * f, -this.camera.y * f);
    this.renderMargeIntroDecor(ctx);
    this.renderMargeChildDecor(ctx);
    ctx.restore();
  }

  /**
   * « Il était une fois… » : décor purement visuel au-dessus du parcours
   * d'intro de marge_01 (retour de Lucas, 2026-07-28) — PAS la phrase-loi
   * interactive (`drawSentenceBanner`/`resolveSentence`, qui affiche « Un
   * enfant qui avait soif d'aventure » et réagit aux choix) : un simple
   * horizon de fond, jamais raturé ni complété, qui plante le ton avant que
   * le joueur ne rencontre la vraie phrase du chapitre. [proposition]
   * Couleur claire (`PALETTE.unwritten`, même famille que la lune/les
   * étoiles) plutôt que sépia sombre : marge_01 est une salle de nuit
   * depuis la même session, un texte sépia à faible opacité devenait
   * illisible sur le voile sombre (retour de Lucas 2026-07-28).
   */
  private renderMargeIntroDecor(ctx: CanvasRenderingContext2D): void {
    if (this.room.id !== 'marge_01') return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillStyle = hexAlpha(PALETTE.unwritten, 0.4);
    ctx.fillText('Il était une fois…', 8 * TILE_SIZE, 3 * TILE_SIZE + 12);
    ctx.restore();
  }

  /**
   * L'enfant sur la colline (marge_01, décor de nuit, demande de Lucas
   * 2026-07-28) : silhouette articulée (stickman) qui regarde la lune tant
   * que la phrase n'a pas changé, animée même assise (léger balancement) —
   * retour de Lucas le même jour : la silhouette pleine d'origine ne
   * "bougeait" pas assez et son évaporation en place ne se lisait pas comme
   * un vrai départ. Dès que la phrase change, l'enfant se lève et s'éloigne
   * À PIED (cycle de marche animé) vers une colline voisine, plutôt que de
   * s'évaporer sur place : RATURE part vers la gauche (colline `hill0`,
   * retour en arrière, cohérent avec "on efface") ; POINT FINAL part vers
   * la droite (colline `hill2`, cohérent avec "l'histoire continue"). Les
   * deux collines de destination sont dessinées APRÈS la silhouette, donc
   * la masquent progressivement en s'approchant ; un fondu supplémentaire
   * sur le dernier `fadeOutStart` de la marche (config) évite que la
   * disparition finale semble instantanée si le chevauchement ne suffit pas.
   *
   * `hill1Cx` (colline de départ, où l'enfant est assis) bien AVANT le
   * mot-loi « enfant » (x≈736 en monde) : bug trouvé en vérifiant
   * visuellement (headless) — cette colline défile en parallaxe (facteur
   * `RENDERING.parallaxFactor` = 0.85) alors que la barrière est au premier
   * plan (facteur 1) ; en s'approchant de la barrière, les deux positions à
   * l'écran finissaient par converger et la dalle opaque de la barrière
   * (dessinée après, `renderCanon`) masquait complètement la silhouette.
   * Marge de sécurité large pour rester séparé même une fois le joueur
   * arrivé au mot-loi.
   */
  private renderMargeChildDecor(ctx: CanvasRenderingContext2D): void {
    if (this.room.id !== 'marge_01') return;

    const hillBaseY = 196;
    const hill0Cx = 400;
    const hill1Cx = 480;
    const hill2Cx = 560;
    const sitGroundY = hillBaseY - 20;

    this.drawSceneHill(ctx, hill1Cx, hillBaseY, 90, 46, 0.5);

    const walkPhase = (this.time * MARGE_CHILD_SCENE.walkCycleHz) % 1;
    if (this.marge01ChildState === 'watching') {
      const idlePhase = (this.time * MARGE_CHILD_SCENE.idleSwayHz) % 1;
      this.drawMargeChildFigure(ctx, hill1Cx, sitGroundY, 1, 'sit', idlePhase);
    } else if (this.marge01ChildState === 'leavingRature' || this.marge01ChildState === 'leavingPoint') {
      const destCx = this.marge01ChildState === 'leavingRature' ? hill0Cx : hill2Cx;
      const t = Math.min(1, (this.time - this.marge01ChildTriggerTime) / MARGE_CHILD_SCENE.walkSeconds);
      if (t < 1) {
        const cx = hill1Cx + (destCx - hill1Cx) * t;
        const groundY = sitGroundY + (hillBaseY - sitGroundY) * t;
        const fadeStart = MARGE_CHILD_SCENE.fadeOutStart;
        const alpha = t <= fadeStart ? 1 : 1 - (t - fadeStart) / (1 - fadeStart);
        this.drawMargeChildFigure(ctx, cx, groundY, alpha, 'walk', walkPhase);
      }
    }
    // 'gone' : ni figure ni animation, juste les collines ci-dessous.

    this.drawSceneHill(ctx, hill0Cx, hillBaseY, 90, 44, 0.46);
    this.drawSceneHill(ctx, hill2Cx, hillBaseY, 100, 54, 0.58);
  }

  /** Colline en lavis, un seul motif fixe (pas tuilé, contrairement à celles de `world/backdrop.ts`). */
  private drawSceneHill(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseline: number,
    width: number,
    height: number,
    alpha: number,
  ): void {
    ctx.fillStyle = hexAlpha(PALETTE.sepia, alpha);
    ctx.beginPath();
    ctx.moveTo(cx - width / 2, baseline + 20);
    ctx.quadraticCurveTo(cx - width / 2, baseline, cx - width * 0.15, baseline - height);
    ctx.quadraticCurveTo(cx + width * 0.1, baseline - height * 1.05, cx + width / 2, baseline);
    ctx.lineTo(cx + width / 2, baseline + 20);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Silhouette articulée (stickman) de l'enfant, tracée au trait (ink à
   * faible opacité, lisible comme une ombre de nuit) plutôt qu'en silhouette
   * pleine. `groundY` est le niveau des pieds. En pose `sit` (assis, genoux
   * relevés), `phase` (0 à 1, cycle continu) pilote un léger balancement
   * idle pour rester visiblement vivant même immobile. En pose `walk`,
   * `phase` pilote un cycle de marche (jambes/bras en balancier opposé).
   * `alpha` porte le fondu de fin de marche (voir `renderMargeChildDecor`).
   */
  private drawMargeChildFigure(
    ctx: CanvasRenderingContext2D,
    cx: number,
    groundY: number,
    alpha: number,
    pose: 'sit' | 'walk',
    phase: number,
  ): void {
    if (alpha <= 0.01) return;
    const sway = Math.sin(phase * Math.PI * 2);
    const hipY = groundY - (pose === 'sit' ? 9 : 15);
    const shoulderY = hipY - 8;
    const leanX = pose === 'sit' ? sway * MARGE_CHILD_SCENE.idleSwayAmplitude : 0;
    const hipX = cx;
    const shoulderX = cx + leanX * 0.6;
    const headR = 3.2;
    const headX = shoulderX + leanX;
    const headY = shoulderY - headR - 1.5;

    ctx.save();
    ctx.strokeStyle = hexAlpha(PALETTE.ink, 0.6 * alpha);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(headX, headY + headR);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    if (pose === 'sit') {
      // Genoux/bras pliés vers la GAUCHE (pas vers la droite comme au
      // premier essai) : la lune est toujours du côté gauche de l'écran
      // dans cette scène (facteur de parallaxe du soleil/lune très lent),
      // alors que le fragment de lore ramassable traîne à droite — sans ce
      // sens, la posture assise se lisait comme tournée vers le fragment
      // plutôt que vers la lune (retour de Lucas 2026-07-28).
      const kneeX = hipX - 6;
      const kneeY = hipY - 6;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(kneeX + 1, groundY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(kneeX + 2, kneeY + 3);
      ctx.stroke();
    } else {
      const legSwing = sway * 6;
      const armSwing = sway * 4.5;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(hipX + legSwing, groundY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(hipX - legSwing, groundY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - armSwing, shoulderY + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + armSwing, shoulderY + 6);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Décor d'arrière-plan de l'arène du mi-boss (chapitre_01) : choisit entre
   * les deux peaux narratives selon le penchant du joueur (retour de
   * playtest 2026-07-26, `resolveBossFlavor`) — même mi-boss mécanique,
   * seul le décor change.
   */
  private renderBossArenaDecor(ctx: CanvasRenderingContext2D): void {
    if (this.room.id !== 'chapitre_01') return;
    const flavor = resolveBossFlavor(this.bossFlavorVariants, this.storyFlags);
    if (flavor.decor === 'hand_quill') this.renderHandQuillDecor(ctx);
    else this.renderCreatureDecor(ctx);
  }

  /**
   * Décor mural du puits (crue_01, demande de Lucas 2026-07-29) : motifs
   * répétés verticalement sur les deux parois du puits PLUS la paroi
   * lointaine de la salle-trésor en arrière-plan (troisième colonne, ajoutée
   * au round suivant pour donner un vrai fond, pas seulement des murs),
   * tuilage vertical (`engine/parallax.ts` — déjà utilisé horizontalement
   * pour le fond des autres salles, réutilisé ici sur l'axe Y, générique par
   * construction). Reskinné selon le chemin narratif (même `color` que le liquide,
   * `hazard_flavor.ts`) : POINT FINAL/indécis → murs de temple égyptien
   * (hiéroglyphes, silhouette de profil, torches) ; RATURE → marge de
   * manuscrit ancien (tache d'encre, plume, ligne d'écriture). Défilement
   * complet (facteur 1, pas de parallaxe) : ces motifs sont sur les VRAIS
   * murs de la salle, ils doivent bouger avec eux à l'identique (même
   * raison que `renderBossArenaDecor` ci-dessus, round 27 : la parallaxe
   * dérive dans les salles hautes).
   */
  private renderCrueWallDecor(ctx: CanvasRenderingContext2D): void {
    if (this.room.id !== 'crue_01') return;
    const book = resolveHazardFlavor(this.hazardFlavorVariants, this.storyFlags).color === 'ink';
    const period = 56;
    const leftX = 8;
    // Mur de droite du PUITS (pas du fichier de salle entier) : depuis
    // l'ajout de la salle-trésor (2026-07-29, extension à droite du même
    // fichier), `this.room.pixelWidth` couvre aussi cette extension et ne
    // désigne plus le vrai mur du puits. `CRUE01_SHAFT_WIDTH` doit rester
    // synchronisé avec `SHAFT_W` de `tools/gen_room_crue01.mjs` (même
    // principe que `groundY = 496` pour l'arène de chapitre_01 : constante
    // dédiée à cette salle, vérifiée par un test sur les données réelles).
    const rightX = CRUE01_SHAFT_WIDTH * TILE_SIZE - 8;
    // Retour de Lucas 2026-07-29 : « les décos sur les murs très bien mais je
    // voyais aussi le fond, l'arrière-plan ». Depuis que la salle-trésor est
    // visible en permanence à droite du puits (le monde entier tient dans la
    // largeur de vue, la caméra ne défile jamais horizontalement), sa paroi
    // extérieure lointaine (`this.room.pixelWidth`, qui désigne maintenant
    // bien le bord du fichier de salle) sert de troisième plan de motifs, vu
    // en continu pendant toute la montée — plus profond que les deux colonnes
    // du puits, il donne enfin un vrai arrière-plan plutôt que des murs seuls.
    const farX = this.room.pixelWidth - 8;
    for (const i of tileIndicesCovering(this.camera.y, INTERNAL_HEIGHT, period)) {
      const y = i * period + period / 2;
      this.drawCrueWallMotif(ctx, leftX, y, i * 2, book);
      this.drawCrueWallMotif(ctx, rightX, y, i * 2 + 1, book);
      this.drawCrueWallMotif(ctx, farX, y, i * 2 + 101, book);
    }
    // Deux torches fixes encadrant le robinet : marquent l'arrivée (« cœur
    // du temple/livre », demande de Lucas), indépendantes du tuilage seedé.
    const valve = this.room.firstObjectOfType('valve');
    if (valve !== null) {
      const vy = valve.y + valve.height / 2;
      this.drawCrueTorch(ctx, valve.x - 10, vy);
      this.drawCrueTorch(ctx, valve.x + valve.width + 10, vy);
    }
  }

  /** Un motif mural parmi 3 (par seed), tiré au sort une fois pour toutes (déterministe, pas de random par frame). */
  private drawCrueWallMotif(ctx: CanvasRenderingContext2D, cx: number, cy: number, seed: number, book: boolean): void {
    const r = seededRandom(seed);
    if (r < 0.18) {
      this.drawCrueTorch(ctx, cx, cy);
      return;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = hexAlpha(PALETTE.ink, 0.3);
    ctx.fillStyle = hexAlpha(PALETTE.ink, 0.22);
    ctx.lineWidth = 1;
    if (book) {
      if (r < 0.55) {
        // Tache d'encre : 3 ronds superposés, irréguliers.
        for (const [ox, oy, rad] of [
          [0, 0, 3.4],
          [-2, 1.4, 2],
          [2, -1, 2.1],
        ] as const) {
          ctx.beginPath();
          ctx.arc(ox, oy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (r < 0.8) {
        // Plume : hampe oblique + 2 barbes + goutte d'encre à la pointe.
        ctx.beginPath();
        ctx.moveTo(-4, 4);
        ctx.lineTo(4, -4);
        ctx.stroke();
        for (let i = 0; i < 2; i++) {
          const t = -2 + i * 2.6;
          ctx.beginPath();
          ctx.moveTo(t, 2 - i * 2.6);
          ctx.lineTo(t - 1.6, 2 - i * 2.6 + 1.6);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(4, -4, 1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ligne d'écriture, un seul trait ondulé.
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.quadraticCurveTo(-2, -2.4, 0, 0);
        ctx.quadraticCurveTo(2, 2.4, 5, 0);
        ctx.stroke();
      }
    } else {
      if (r < 0.5) {
        // Ankh : boucle + croix.
        ctx.beginPath();
        ctx.arc(0, -3, 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(0, 5);
        ctx.moveTo(-3, 1);
        ctx.lineTo(3, 1);
        ctx.stroke();
      } else if (r < 0.8) {
        // Silhouette de profil : tête, torse, un bras plié, deux jambes.
        ctx.beginPath();
        ctx.arc(0, -4, 1.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -2.4);
        ctx.lineTo(0, 3);
        ctx.moveTo(0, -1);
        ctx.lineTo(2.6, -2.6);
        ctx.moveTo(0, 3);
        ctx.lineTo(-2, 6);
        ctx.moveTo(0, 3);
        ctx.lineTo(2, 6);
        ctx.stroke();
      } else {
        // Hiéroglyphe de l'eau : 3 lignes ondulées empilées.
        for (let i = 0; i < 3; i++) {
          const y0 = -3 + i * 2.6;
          ctx.beginPath();
          ctx.moveTo(-4, y0);
          ctx.quadraticCurveTo(-1, y0 - 1.4, 2, y0);
          ctx.quadraticCurveTo(3, y0 + 0.6, 4, y0);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /** Torche murale (ou bougie côté livre) : hampe fixe + flamme qui vacille avec `this.time`. */
  private drawCrueTorch(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = hexAlpha(PALETTE.ink, 0.4);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, 6);
    ctx.stroke();
    const flicker = 0.6 + 0.4 * Math.sin(this.time * 5 + cx * 0.3);
    ctx.fillStyle = hexAlpha(PALETTE.danger, 0.3 * flicker + 0.2);
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.quadraticCurveTo(2.6, -6 - flicker * 1.5, 0, -9 - flicker * 2);
    ctx.quadraticCurveTo(-2.6, -6 - flicker * 1.5, 0, -3);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Variante "La Marge" : une grande main tenant une plume raturée —
   * rappelle que le boss est la main de l'Auteur qui « corrige » le texte,
   * sans ajouter de PNJ ni de texte (chapitre_01 reste un blockout
   * mécanique, D13 : c'est une illustration, pas de la narration écrite).
   * Idée validée avec Lucas (2026-07-22) : un-line, fixe, teinte sépia à
   * faible opacité pour rester lisiblement de l'arrière-plan.
   */
  private renderHandQuillDecor(ctx: CanvasRenderingContext2D): void {
    const cx = 62 * TILE_SIZE;
    const cy = 92;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.3);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Paume, vue de dos, arrondie.
    ctx.beginPath();
    ctx.moveTo(-26, 30);
    ctx.quadraticCurveTo(-30, 4, -14, -6);
    ctx.quadraticCurveTo(0, -14, 14, -6);
    ctx.quadraticCurveTo(30, 4, 26, 30);
    ctx.stroke();

    // Doigts repliés autour de la hampe (4 courts traits courbes).
    for (let i = -1.5; i <= 1.5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 9, -6);
      ctx.quadraticCurveTo(i * 9 + 2, -16, i * 9 - 2, -22);
      ctx.stroke();
    }

    // Plume tenue entre les doigts, hampe qui dépasse.
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.quadraticCurveTo(10, -34, 22, -52);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, -30);
    ctx.quadraticCurveTo(20, -26, 24, -32);
    ctx.stroke();

    // Rature : un trait rouge en travers de la plume.
    ctx.strokeStyle = hexAlpha(PALETTE.danger, 0.45);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(20, -22);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Variante "monstre de conte" (le Troll d'Encre) : plus une simple
   * illustration fixe, mais l'affrontement lui-même, en arrière-plan
   * (demande de Lucas 2026-07-28 — l'ancien museau statique ne montrait
   * rien du combat). `fighting` : l'enfant armé (épée, bouclier) et le
   * troll échangent des coups mimés (balancement continu, sans lien avec
   * les phases réelles du mi-boss, qui reste l'illustration symbolique de
   * fond — même convention que l'ancien décor statique). `defeated` :
   * calcule célébration puis départ depuis `chapitre01SceneTriggerTime`,
   * même principe que `renderMargeChildDecor`.
   *
   * `groundY = 496` : sol réel de l'arène (`Y(14*TILE)` côté générateur,
   * `tools/gen_room_chapitre01.mjs`). Bug trouvé en playtest (2026-07-29) :
   * la première version utilisait `92 + 30`, une valeur héritée de l'ancien
   * décor statique datant d'avant le doublement de hauteur de la salle
   * (D16) — le combat flottait donc tout en haut de l'arène désormais bien
   * plus haute, au lieu d'être au sol comme un vrai duel.
   */
  private renderCreatureDecor(ctx: CanvasRenderingContext2D): void {
    const cx = 62 * TILE_SIZE;
    const groundY = 496;
    const { celebrateSeconds, walkSeconds, fadeOutStart, walkCycleHz, idleSwayHz } = CHAPITRE1_ARENA_SCENE;

    if (this.chapitre01SceneState === 'gone') return;

    if (this.chapitre01SceneState === 'fighting') {
      const phase = this.time * idleSwayHz;
      this.drawTroll(ctx, cx + 22, groundY, 1, phase);
      this.drawArenaChild(ctx, cx - 30, groundY, 1, 'fight', phase);
      return;
    }

    const elapsed = this.time - this.chapitre01SceneTriggerTime;
    if (elapsed < celebrateSeconds) {
      const trollAlpha = 1 - Math.min(1, elapsed / (celebrateSeconds * 0.4));
      if (trollAlpha > 0.01) this.drawTroll(ctx, cx + 22, groundY, trollAlpha, this.time * idleSwayHz);
      this.drawArenaChild(ctx, cx - 30, groundY, 1, 'celebrate', this.time * idleSwayHz);
      return;
    }

    const walkT = Math.min(1, (elapsed - celebrateSeconds) / walkSeconds);
    if (walkT >= 1) return;
    const walkX = cx - 30 + 210 * walkT;
    const alpha = walkT <= fadeOutStart ? 1 : 1 - (walkT - fadeOutStart) / (1 - fadeOutStart);
    this.drawArenaChild(ctx, walkX, groundY, alpha, 'walk', this.time * walkCycleHz);
  }

  /**
   * Enfant armé (épée, bouclier) de l'arène de chapitre_01 : même vocabulaire
   * de silhouette articulée que `drawMargeChildFigure`, avec une arme/un
   * bouclier en plus. `phase` (0 à 1, cycle continu) pilote le balancier du
   * bras armé (`fight`), le rebond de victoire (`celebrate`) ou le cycle de
   * marche (`walk`) — un seul paramètre de temps, pas de mutation d'état.
   */
  private drawArenaChild(
    ctx: CanvasRenderingContext2D,
    cx: number,
    groundY: number,
    alpha: number,
    pose: 'fight' | 'celebrate' | 'walk',
    phase: number,
  ): void {
    if (alpha <= 0.01) return;
    const sway = Math.sin(phase * Math.PI * 2);
    const hipY = groundY - 15;
    const shoulderY = hipY - 8;
    const headR = 3.2;

    ctx.save();
    ctx.strokeStyle = hexAlpha(PALETTE.ink, 0.6 * alpha);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(cx, shoulderY - headR - 1.5, headR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY - 1.5);
    ctx.lineTo(cx, shoulderY);
    ctx.lineTo(cx, hipY);
    ctx.stroke();

    if (pose === 'walk') {
      const legSwing = sway * 6;
      const armSwing = sway * 4.5;
      ctx.beginPath();
      ctx.moveTo(cx, hipY);
      ctx.lineTo(cx + legSwing, groundY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, hipY);
      ctx.lineTo(cx - legSwing, groundY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx - armSwing, shoulderY + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + armSwing, shoulderY + 6);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Jambes écartées, ancrées : posture de combat/victoire.
    ctx.beginPath();
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx + 5, groundY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx - 5, groundY);
    ctx.stroke();

    // Bouclier : bras gauche tendu, ovale tenu devant.
    const shieldX = cx - 7;
    const shieldY = shoulderY + 4;
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY);
    ctx.lineTo(shieldX, shieldY);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(shieldX, shieldY, 2.6, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (pose === 'fight') {
      // Bras armé : balancier d'attaque continu.
      const swingAngle = -0.3 + sway * 0.5;
      const handX = cx + Math.cos(swingAngle) * 8;
      const handY = shoulderY + Math.sin(swingAngle) * 8;
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX + Math.cos(swingAngle - 0.4) * 9, handY + Math.sin(swingAngle - 0.4) * 9);
      ctx.stroke();
    } else {
      // 'celebrate' : épée levée au-dessus de la tête, léger rebond.
      const bounce = Math.abs(sway) * 1.5;
      const handX = cx + 3;
      const handY = shoulderY - 8 - bounce;
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX + 1, handY - 9);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Le Troll d'Encre : corps ovale hérissé de touffes (silhouette "poilue"
   * sans texture détaillée, cohérent avec le reste du décor un-line) + 2
   * bras épais qui se balancent + la tête (cornes/mâchoire de l'ancien
   * décor statique, reprise à cette échelle) — délibérément plus grand que
   * l'enfant pour se lire comme la menace de l'arène.
   */
  private drawTroll(ctx: CanvasRenderingContext2D, cx: number, groundY: number, alpha: number, phase: number): void {
    if (alpha <= 0.01) return;
    const bodyY = groundY - 20;
    const armSway = Math.sin(phase * Math.PI * 2) * 3;

    ctx.save();
    ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.32 * alpha);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.ellipse(cx, bodyY, 20, 26, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Touffes de poil sur le contour : courts traits radiaux.
    const tufts = 10;
    for (let i = 0; i < tufts; i++) {
      const a = (i / tufts) * Math.PI * 2;
      const px = cx + Math.cos(a) * 20;
      const py = bodyY + Math.sin(a) * 26;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5);
      ctx.stroke();
    }

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 18, bodyY - 10);
    ctx.lineTo(cx - 30 + armSway, groundY - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 18, bodyY - 10);
    ctx.lineTo(cx + 30 - armSway, groundY - 6);
    ctx.stroke();
    ctx.lineWidth = 1.6;

    // Tête : cornes + mâchoire (motif de l'ancien décor statique, réduit).
    ctx.save();
    ctx.translate(cx, bodyY - 46);
    ctx.beginPath();
    ctx.moveTo(-15, 20);
    ctx.quadraticCurveTo(-19, -3, -7, -11);
    ctx.quadraticCurveTo(0, -14, 7, -11);
    ctx.quadraticCurveTo(19, -3, 15, 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.quadraticCurveTo(-11, -24, -6, -35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, -10);
    ctx.quadraticCurveTo(11, -24, 6, -35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 7);
    for (let x = -8; x <= 12; x += 4) ctx.lineTo(x, x % 8 === 0 ? 11 : 7);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private renderMotes(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.18);
    for (const mote of this.motes) {
      const y = mote.y + Math.sin(this.time * 0.7 + mote.phase) * 6;
      ctx.beginPath();
      ctx.arc(mote.x, y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private roundedSlab(ctx: CanvasRenderingContext2D, rect: TileRect, radius: number): void {
    ctx.beginPath();
    ctx.roundRect(rect.x * TILE_SIZE, rect.y * TILE_SIZE, rect.w * TILE_SIZE, rect.h * TILE_SIZE, radius);
    ctx.fill();
  }

  private renderSlabs(ctx: CanvasRenderingContext2D): void {
    const viewLeft = this.camera.x - TILE_SIZE;
    const viewRight = this.camera.x + INTERNAL_WIDTH + TILE_SIZE;
    const slabs = this.room.groundSlabs();
    const visible = slabs.filter((s) => s.x * TILE_SIZE <= viewRight && (s.x + s.w) * TILE_SIZE >= viewLeft);

    ctx.shadowColor = RENDERING.shadowColor;
    ctx.shadowBlur = RENDERING.shadowBlur;
    ctx.shadowOffsetY = RENDERING.shadowOffsetY;
    ctx.fillStyle = PALETTE.parchmentShade;
    for (const slab of visible) this.roundedSlab(ctx, slab, RENDERING.slabCornerRadius);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    for (const slab of visible) {
      const x = slab.x * TILE_SIZE;
      const y = slab.y * TILE_SIZE;
      const w = slab.w * TILE_SIZE;
      const h = slab.h * TILE_SIZE;
      ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, RENDERING.slabCornerRadius);
      ctx.stroke();
      ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.55);
      ctx.fillRect(x + RENDERING.slabCornerRadius, y + 1, w - RENDERING.slabCornerRadius * 2, 1.5);
    }
  }

  private renderInk(ctx: CanvasRenderingContext2D): void {
    const inkSlabs = this.room.inkSlabs();
    ctx.shadowColor = RENDERING.shadowColor;
    ctx.shadowBlur = RENDERING.shadowBlur;
    ctx.shadowOffsetY = RENDERING.shadowOffsetY;
    ctx.fillStyle = PALETTE.ink;
    for (const slab of inkSlabs) this.roundedSlab(ctx, slab, 5);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // Reflet clair sur la face supérieure de chaque dalle d'encre.
    ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.22);
    for (const slab of inkSlabs) {
      ctx.fillRect(slab.x * TILE_SIZE + 4, slab.y * TILE_SIZE + 1.5, slab.w * TILE_SIZE - 8, 1.5);
    }
  }

  /** Le brouillon en filigrane, révélé là où un mur BRÈCHE a été effacé. */
  private renderFiligrane(ctx: CanvasRenderingContext2D): void {
    const slabs = this.room.filigraneSlabs();
    ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.35);
    for (const slab of slabs) this.roundedSlab(ctx, slab, RENDERING.slabCornerRadius);
    ctx.strokeStyle = hexAlpha(PALETTE.unwritten, 0.5);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    for (const slab of slabs) {
      ctx.beginPath();
      ctx.roundRect(
        slab.x * TILE_SIZE + 0.5,
        slab.y * TILE_SIZE + 0.5,
        slab.w * TILE_SIZE - 1,
        slab.h * TILE_SIZE - 1,
        RENDERING.slabCornerRadius,
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  /** Murs BRÈCHE encore fermés : indice d'interaction quand le pouvoir est là. */
  private renderBrecheWalls(ctx: CanvasRenderingContext2D): void {
    for (const wall of this.brecheWalls) {
      if (this.collectedObjects.has(wall.id)) continue;
      // Fissure toujours visible (pas seulement à portée) : sans elle, le mur
      // était indiscernable d'un mur normal — retour de playtest 2026-07-22.
      this.renderCrack(ctx, wall, this.crackRectOf(wall));
      if (hasAbility(this.unlocked, 'breche')) {
        this.renderCanonHint(ctx, wall, 'clic droit : brèche');
      }
    }
  }

  /**
   * Rectangle où dessiner la fissure : par défaut le mur entier (premier mur
   * BRÈCHE du jeu, entièrement cassable — la fissure doit couvrir tout pour
   * enseigner le principe, retour de playtest 2026-07-26). `crackY`/
   * `crackHeight` (optionnels) restreignent la fissure à un « point faible »
   * plus étroit qu'un mur d'arène par ailleurs plein — mais casser ce point
   * faible ouvre quand même TOUT le mur (même objet BRÈCHE, tout-ou-rien,
   * mécanique inchangée depuis toujours) : seul l'endroit où grimper pour
   * l'atteindre est visuellement plus précis.
   */
  private crackRectOf(wall: RoomObject): { x: number; y: number; width: number; height: number } {
    const crackY = wall.properties['crackY'];
    const crackHeight = wall.properties['crackHeight'];
    if (typeof crackY === 'number' && typeof crackHeight === 'number') {
      return { x: wall.x, y: crackY, width: wall.width, height: crackHeight };
    }
    return wall;
  }

  /** Lézarde en zigzag sur `rect` ; forme stable (seed = id du mur). */
  /**
   * Lézarde en zigzag sur `rect`. Suit le grand côté du rectangle (mur
   * vertical → zigzag le long de la hauteur, mur horizontal → le long de la
   * largeur) : le second point faible de l'arène de chapitre_01 est devenu
   * un mur horizontal (retour de Lucas 2026-07-29), une lézarde qui zigzague
   * verticalement dans une bande large et fine ne s'y lisait plus.
   */
  private renderCrack(
    ctx: CanvasRenderingContext2D,
    obj: RoomObject,
    rect: { x: number; y: number; width: number; height: number },
  ): void {
    const seed = obj.id * 97;
    const rand = (i: number) => {
      const v = Math.sin(seed + i * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    const horizontal = rect.width > rect.height;
    const steps = Math.max(3, Math.round((horizontal ? rect.width : rect.height) / 18));
    ctx.strokeStyle = hexAlpha(PALETTE.danger, 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (horizontal) {
      const cy = rect.y + rect.height / 2;
      ctx.moveTo(rect.x + 2, cy + (rand(0) - 0.5) * rect.height * 0.4);
      for (let i = 1; i <= steps; i++) {
        const x = rect.x + (rect.width * i) / steps;
        const y = cy + (rand(i) - 0.5) * rect.height * 0.7;
        ctx.lineTo(x, y);
      }
    } else {
      const cx = rect.x + rect.width / 2;
      ctx.moveTo(cx + (rand(0) - 0.5) * rect.width * 0.4, rect.y + 2);
      for (let i = 1; i <= steps; i++) {
        const y = rect.y + (rect.height * i) / steps;
        const x = cx + (rand(i) - 0.5) * rect.width * 0.7;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  /** Mots-loi : barrières solides (à raturer) et blancs ▢ (à combler). */
  private renderCanon(ctx: CanvasRenderingContext2D): void {
    // Barrières encore en place : dalle d'encre sépia « gravée » + le mot.
    for (const barrier of this.canonBarriers) {
      if (this.collectedObjects.has(barrier.id)) continue;
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.shadowOffsetY = RENDERING.shadowOffsetY;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(barrier.x, barrier.y, barrier.width, barrier.height, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      // Le mot gravé, en travers de la barrière.
      const text = barrier.properties['text'];
      if (typeof text === 'string') {
        ctx.save();
        ctx.translate(barrier.x + barrier.width / 2, barrier.y + barrier.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.85);
        ctx.font = 'italic bold 13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
        ctx.textBaseline = 'alphabetic';
      }
      this.renderCanonHint(ctx, barrier, 'clic droit : raturer');
    }

    // Blancs ▢ non comblés : cadre pointillé pulsant, invite à écrire dedans.
    for (const blank of this.canonBlanks) {
      if (this.collectedObjects.has(blank.id)) continue;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);
      ctx.strokeStyle = hexAlpha(PALETTE.danger, 0.4 + pulse * 0.4);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.roundRect(blank.x + 1, blank.y + 1, blank.width - 2, blank.height - 2, 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = hexAlpha(PALETTE.danger, 0.5 + pulse * 0.3);
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▢', blank.x + blank.width / 2, blank.y + blank.height / 2);
      ctx.textBaseline = 'alphabetic';
      this.renderCanonHint(ctx, blank, 'trace ton encre ici pour valider la phrase');
    }
  }

  /** Étiquette d'action au-dessus d'un mot-loi, seulement quand il est à portée. */
  private renderCanonHint(ctx: CanvasRenderingContext2D, obj: RoomObject, label: string): void {
    if (this.mode !== 'playing' || !hasAbility(this.unlocked, 'ecrire')) return;
    const center = this.playerCenter();
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    if (Math.hypot(cx - center.x, cy - center.y) > INK.reach + TILE_SIZE) return;

    ctx.font = 'italic 8px Georgia, serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(label).width + 10;
    const y = obj.y - 6 + Math.sin(this.time * 4) * 1.2;
    ctx.fillStyle = hexAlpha(PALETTE.ink, 0.85);
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, y - 9, w, 12, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.parchment;
    ctx.fillText(label, cx, y);
  }

  /**
   * Bandeau de la phrase-loi (haut de l'écran). Au lieu de rayer des mots isolés
   * (grammaire cassée), on affiche une phrase ENTIÈRE recomposée selon l'état de
   * l'histoire — chaque choix produit une ligne cohérente qui montre le choix.
   * Le texte s'assombrit une fois que le joueur a commencé à réécrire.
   */
  private drawSentenceBanner(ctx: CanvasRenderingContext2D): void {
    // La phrase-loi (D11) est spécifique à La Marge — sans ce garde-fou, elle
    // restait affichée après une porte vers chapitre_01 (retour playtest
    // 07-22). Comparaison à 'marge_01' en dur (pas DEFAULT_ROOM_ID, qui n'est
    // qu'une commodité de chargement sans lien avec cette règle narrative —
    // bug découvert en playtest visuel 2026-07-26 en changeant temporairement
    // DEFAULT_ROOM_ID pour capturer chapitre_01).
    if (this.room.id !== 'marge_01') return;
    const text = resolveSentence(this.sentenceVariants, this.storyFlags);
    if (text === '') return;
    const rewritten =
      this.storyFlags['nom_ecrit'] === true || this.storyFlags['rature_jamais'] === true;

    ctx.font = 'italic 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const width = ctx.measureText(text).width;
    const cx = INTERNAL_WIDTH / 2;
    // Sous la jauge d'encre/PV (haut-gauche, y jusqu'à ~32) : le bandeau est
    // centré mais assez large pour empiéter sur ce coin si on le met à y=20.
    const y = 38;

    ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.55);
    ctx.beginPath();
    ctx.roundRect(cx - width / 2 - 8, y - 12, width + 16, 18, 9);
    ctx.fill();

    ctx.fillStyle = rewritten ? PALETTE.ink : hexAlpha(PALETTE.sepia, 0.9);
    ctx.fillText(text, cx, y);
  }

  /**
   * Bandeau de la phrase en cours dans la chambre des mots (ratures_01) :
   * même style que `drawSentenceBanner`, mais composée en direct depuis les
   * slots (`composeTransformSentence`) et visible seulement dans la zone de
   * la chambre (bornes dérivées des objets eux-mêmes, pas de tuiles en
   * dur) — pas dans tout `ratures_01`, pour ne pas polluer le reste du
   * niveau (gouffre, ennemis, PNJ, fragments).
   */
  private drawTransformBanner(ctx: CanvasRenderingContext2D): void {
    if (this.room.id !== 'ratures_01') return;
    const chamberObjects = [...this.room.objectsOfType('transform_word'), ...this.room.objectsOfType('console')];
    if (chamberObjects.length === 0) return;
    const minX = Math.min(...chamberObjects.map((o) => o.x)) - 40;
    const maxX = Math.max(...chamberObjects.map((o) => o.x + o.width)) + 40;
    const playerCx = this.player.body.x + this.player.body.w / 2;
    if (playerCx < minX || playerCx > maxX) return;

    const text = composeTransformSentence(this.transformSlots.subject, this.transformSlots.attribute);
    ctx.font = 'italic 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const width = ctx.measureText(text).width;
    const cx = INTERNAL_WIDTH / 2;
    const y = 38;

    ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.55);
    ctx.beginPath();
    ctx.roundRect(cx - width / 2 - 8, y - 12, width + 16, 18, 9);
    ctx.fill();

    ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.9);
    ctx.fillText(text, cx, y);
  }

  /**
   * Icône vectorielle d'un mot-pouvoir (au lieu d'épeler le mot en toutes
   * lettres — retour de playtest 2026-07-22 : les mots flottants n'étaient
   * pas clairs). Petits pictogrammes cohérents avec le thème : plume pour
   * ÉCRIRE, chevrons pour AILES, etc.
   */
  private renderAbilityIcon(ctx: CanvasRenderingContext2D, ability: string, cx: number, cy: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = PALETTE.danger;
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    switch (ability) {
      case 'ecrire':
        // Plume d'oie : hampe fine, barbe courbe, pointe en biais.
        ctx.rotate(-0.5);
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.quadraticCurveTo(6, -6, 5, 2);
        ctx.quadraticCurveTo(4, 7, 0, 9);
        ctx.quadraticCurveTo(2, 3, -1, -2);
        ctx.quadraticCurveTo(-3, -6, 0, -9);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.lineTo(-3, 12);
        ctx.stroke();
        break;
      case 'breche':
        // Fissure en zigzag dans un cadre : le mur qui se fend.
        ctx.beginPath();
        ctx.roundRect(-8, -8, 16, 16, 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-4, -7);
        ctx.lineTo(1, -1);
        ctx.lineTo(-2, 2);
        ctx.lineTo(4, 7);
        ctx.stroke();
        break;
      case 'hate':
        // Traînée de vitesse : traits obliques parallèles.
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(-8, i * 4 + 4);
          ctx.lineTo(4, i * 4 - 2);
          ctx.stroke();
        }
        break;
      case 'ales':
        // Double chevron : double saut / envol (AILES).
        ctx.beginPath();
        ctx.moveTo(-7, 2);
        ctx.lineTo(0, -5);
        ctx.lineTo(7, 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, 8);
        ctx.lineTo(0, 1);
        ctx.lineTo(7, 8);
        ctx.stroke();
        break;
      default:
        ctx.font = 'italic bold 12px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', 0, 4);
    }
    ctx.restore();
  }

  /**
   * Surface du liquide montant (crue_01 uniquement) : dalle translucide du
   * niveau jusqu'au bas de la salle, ligne du dessus ondulée en continu
   * (`this.time`, pas un zigzag figé comme `renderCrack` — un liquide bouge
   * sans cesse). Couleur reskinnée selon le chemin narratif (encre = RATURE,
   * non-écrit = POINT FINAL/indécis, narrative/hazard_flavor.ts) — aucune
   * couleur inventée, les deux viennent de la palette existante.
   */
  private renderHazard(ctx: CanvasRenderingContext2D): void {
    if (this.hazardY === null) return;
    const color = resolveHazardFlavor(this.hazardFlavorVariants, this.storyFlags).color === 'ink'
      ? PALETTE.ink
      : PALETTE.unwritten;
    const top = this.hazardY;
    // Bornée à la largeur du PUITS (pas `this.room.pixelWidth`, qui couvre
    // aussi le corridor de la salle-trésor depuis son ajout, 2026-07-29) :
    // ce corridor est un compartiment séparé du puits (mur plein entre les
    // deux hors du point faible BRÈCHE), l'eau n'a pas à s'y afficher.
    const width = CRUE01_SHAFT_WIDTH * TILE_SIZE;
    ctx.fillStyle = hexAlpha(color, RISING_HAZARD.fillAlpha);
    ctx.fillRect(0, top, width, this.room.pixelHeight - top);

    ctx.strokeStyle = hexAlpha(color, RISING_HAZARD.strokeAlpha);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const step = 8;
    for (let x = 0; x <= width; x += step) {
      const wave = Math.sin(x * 0.05 + this.time * RISING_HAZARD.waveHz * Math.PI * 2) * RISING_HAZARD.waveAmplitude;
      if (x === 0) ctx.moveTo(x, top + wave);
      else ctx.lineTo(x, top + wave);
    }
    ctx.stroke();
  }

  private renderObjects(ctx: CanvasRenderingContext2D): void {
    for (const word of this.room.objectsOfType('word')) {
      if (this.collectedObjects.has(word.id)) continue;
      const ability = word.properties['ability'];
      const cx = word.x + word.width / 2;
      const cy = word.y + word.height / 2 + Math.sin(this.time * 2.2) * 3;
      ctx.fillStyle = hexAlpha(PALETTE.danger, 0.08 + 0.04 * Math.sin(this.time * 3));
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = PALETTE.danger;
      ctx.shadowBlur = 10;
      this.renderAbilityIcon(ctx, typeof ability === 'string' ? ability : '', cx, cy - 3);
      ctx.shadowBlur = 0;
    }

    for (const fragment of this.room.objectsOfType('fragment')) {
      if (this.collectedObjects.has(fragment.id)) continue;
      this.renderFragment(ctx, fragment);
    }

    // Trésor de crue_01 : même rendu générique que `renderFragment` (halo +
    // losange pulsant), rien de spécifique à dessiner en plus.
    for (const treasure of this.room.objectsOfType('treasure')) {
      if (this.collectedObjects.has(treasure.id)) continue;
      this.renderFragment(ctx, treasure);
    }

    for (const potion of this.room.objectsOfType('potion')) {
      if (this.collectedObjects.has(potion.id)) continue;
      this.renderPotion(ctx, potion);
    }

    for (const inkwell of this.room.objectsOfType('inkwell')) {
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(inkwell.x - 1, inkwell.y + 7, inkwell.width + 2, inkwell.height - 7, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.sepia;
      ctx.fillRect(inkwell.x + 2, inkwell.y + 2, inkwell.width - 4, 6);
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.ellipse(
        inkwell.x + inkwell.width / 2,
        inkwell.y + 3,
        inkwell.width / 2 - 2.5,
        2 + Math.sin(this.time * 2) * 0.4,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      this.renderInteractHint(ctx, inkwell);
    }

    // Robinet/fermoir (crue_01) : arrête pour de bon la montée du liquide.
    // Une seule forme (levier + molette), quel que soit le chemin — seul le
    // texte affiché à l'interaction change (narrative/hazard_flavor.ts).
    // Grisé une fois actionné, pour que ce soit visuellement réglé.
    for (const valve of this.room.objectsOfType('valve')) {
      const used = this.storyFlags[CRUE01_VALVE_FLAG] === true;
      const cx = valve.x + valve.width / 2;
      const cy = valve.y + valve.height / 2;
      ctx.strokeStyle = used ? hexAlpha(PALETTE.sepia, 0.4) : PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, valve.width / 2 - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - valve.width / 2 + 2, cy);
      ctx.lineTo(cx + valve.width / 2 - 2, cy);
      ctx.moveTo(cx, cy - valve.width / 2 + 2);
      ctx.lineTo(cx, cy + valve.width / 2 - 2);
      ctx.stroke();
      if (!used) this.renderInteractHint(ctx, valve);
    }

    // Portes entre salles : dalle pleine + baie en dégradé "non-écrit". Une
    // porte verrouillée (`requiresFlag` non satisfait, retour de playtest
    // 2026-07-26) reste sépia pleine au lieu de la baie accueillante : elle
    // se distingue visuellement d'une porte franchissable.
    for (const door of this.room.objectsOfType('door')) {
      const locked = this.isDoorLocked(door);
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(door.x - 2, door.y, door.width + 4, door.height, [8, 8, 0, 0]);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (locked) {
        ctx.fillStyle = hexAlpha(PALETTE.ink, 0.55);
      } else {
        const doorway = ctx.createLinearGradient(door.x, door.y, door.x, door.y + door.height);
        doorway.addColorStop(0, hexAlpha(PALETTE.unwritten, 0.75));
        doorway.addColorStop(1, hexAlpha(PALETTE.unwritten, 0.35));
        ctx.fillStyle = doorway;
      }
      ctx.beginPath();
      ctx.roundRect(door.x + 1, door.y + 3, door.width - 2, door.height - 3, [6, 6, 0, 0]);
      ctx.fill();
    }

    for (const npc of this.room.objectsOfType('npc')) {
      if (this.isNpcHidden(npc)) continue;
      const bob = Math.sin(this.time * 1.6) * 1.2;
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(npc.x, npc.y + bob, npc.width, npc.height - bob, [6, 6, 3, 3]);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.parchment;
      ctx.beginPath();
      ctx.arc(npc.x + 3.5, npc.y + 6 + bob, 1.2, 0, Math.PI * 2);
      ctx.arc(npc.x + npc.width - 3.5, npc.y + 6 + bob, 1.2, 0, Math.PI * 2);
      ctx.fill();
      this.renderInteractHint(ctx, npc);
    }

    // Chambre des mots (ratures_01) : contrairement aux mots-pouvoir (icône),
    // ces pédestales affichent le mot en toutes lettres — la phrase doit se
    // lire littéralement. Un mot déjà porté par le joueur reste affiché sur
    // son pédestal (rien n'est jamais consommé).
    for (const word of this.room.objectsOfType('transform_word')) {
      const cx = word.x + word.width / 2;
      const cy = word.y + word.height / 2 + Math.sin(this.time * 2) * 2;
      const label = word.properties['label'];
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.parchmentShade;
      ctx.beginPath();
      ctx.roundRect(word.x - 6, cy - 8, word.width + 12, 16, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = PALETTE.ink;
      ctx.font = 'italic bold 8px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(typeof label === 'string' ? label : '?', cx, cy + 3);
      this.renderInteractHint(ctx, word);
    }

    // Consoles : petit lutrin sépia, étiquette « valider »/« annuler »
    // toujours visible (Lucas : « indiqué clairement »).
    for (const panel of this.room.objectsOfType('console')) {
      const role = panel.properties['role'];
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(panel.x - 2, panel.y + 6, panel.width + 4, panel.height - 6, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = role === 'cancel' ? hexAlpha(PALETTE.danger, 0.7) : hexAlpha(PALETTE.unwritten, 0.85);
      ctx.beginPath();
      ctx.roundRect(panel.x + 1, panel.y + 9, panel.width - 2, 8, 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.parchment;
      ctx.font = 'italic 7px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(role === 'cancel' ? 'annuler' : 'valider', panel.x + panel.width / 2, panel.y + panel.height + 9);
      this.renderInteractHint(ctx, panel);
    }
  }

  /** Étiquette du mot porté par le joueur, tant qu'il en tient un (chambre des mots). */
  private renderCarriedWord(ctx: CanvasRenderingContext2D): void {
    const carried = this.carriedWord;
    if (carried === null) return;
    const cx = this.player.body.x + this.player.body.w / 2;
    const y = this.player.body.y - 12 + Math.sin(this.time * 3) * 1.5;
    ctx.font = 'italic bold 8px Georgia, serif';
    const w = ctx.measureText(carried.label).width + 10;
    ctx.fillStyle = hexAlpha(PALETTE.danger, 0.9);
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, y - 8, w, 12, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.parchment;
    ctx.textAlign = 'center';
    ctx.fillText(carried.label, cx, y + 1);
  }

  /** Fragment secret : contraste fort + halo pulsant + éclat, pour être bien visible. */
  private renderFragment(ctx: CanvasRenderingContext2D, fragment: RoomObject): void {
    const cx = fragment.x + fragment.width / 2;
    const cy = fragment.y + fragment.height / 2 + Math.sin(this.time * 1.8) * 3;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);

    // Halo lumineux
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
    halo.addColorStop(0, hexAlpha(PALETTE.unwritten, 0.5));
    halo.addColorStop(1, hexAlpha(PALETTE.unwritten, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Anneau pulsant
    ctx.strokeStyle = hexAlpha(PALETTE.unwritten, 0.4 + pulse * 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();

    // Cœur : losange d'encre (fort contraste sur le parchemin) liseré clair
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.time * 0.9);
    ctx.shadowColor = PALETTE.unwritten;
    ctx.shadowBlur = 12;
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.roundRect(-5, -5, 10, 10, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hexAlpha(PALETTE.unwritten, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-5, -5, 10, 10, 2);
    ctx.stroke();
    ctx.restore();

    // Étincelle occasionnelle
    if (Math.sin(this.time * 3) > 0.9) {
      ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.9);
      ctx.beginPath();
      ctx.arc(cx + 5, cy - 6, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Fiole d'encre rouge (usage unique, +PV) : goutte d'encre en forme de
   * cœur, teinte danger — se distingue du fragment (teinte non-écrit) pour
   * qu'on comprenne au premier coup d'œil qu'elle sert à la survie, pas à la
   * narration (retour de playtest 2026-07-22 : les ramassages n'étaient pas
   * assez lisibles).
   */
  private renderPotion(ctx: CanvasRenderingContext2D, potion: RoomObject): void {
    const cx = potion.x + potion.width / 2;
    const cy = potion.y + potion.height / 2 + Math.sin(this.time * 1.8) * 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);

    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
    halo.addColorStop(0, hexAlpha(PALETTE.danger, 0.45));
    halo.addColorStop(1, hexAlpha(PALETTE.danger, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexAlpha(PALETTE.danger, 0.4 + pulse * 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 7 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();

    // Petit cœur (dessin vectoriel simple), pour lire "vie" au premier coup d'œil.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = PALETTE.danger;
    ctx.shadowColor = PALETTE.danger;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-6, -2, -4, -7, 0, -3);
    ctx.bezierCurveTo(4, -7, 6, -2, 0, 4);
    ctx.fill();
    ctx.restore();
  }

  private renderInteractHint(ctx: CanvasRenderingContext2D, obj: RoomObject): void {
    if (this.mode !== 'playing' || !this.playerOverlaps(obj, INTERACT_MARGIN)) return;
    const cx = obj.x + obj.width / 2;
    const y = obj.y - 12 + Math.sin(this.time * 4) * 1.5;
    ctx.fillStyle = hexAlpha(PALETTE.ink, 0.85);
    ctx.beginPath();
    ctx.roundRect(cx - 6, y - 8, 12, 11, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 8px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('E', cx, y);
  }

  /** Coquille : coquille sépia ovale ; Rature : tache rouge-encre irrégulière. */
  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      const cx = enemy.body.x + enemy.body.w / 2;
      const cy = enemy.body.y + enemy.body.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(enemy.facing, 1);
      if (enemy.kind === 'coquille') {
        ctx.shadowColor = RENDERING.shadowColor;
        ctx.shadowBlur = RENDERING.shadowBlur;
        ctx.fillStyle = PALETTE.sepia;
        ctx.beginPath();
        ctx.ellipse(0, 0, enemy.body.w / 2, enemy.body.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = PALETTE.parchment;
        ctx.beginPath();
        ctx.arc(enemy.body.w * 0.2, -2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = hexAlpha(PALETTE.danger, enemy.chasing ? 0.95 : 0.75);
        ctx.beginPath();
        ctx.moveTo(-enemy.body.w / 2, 0);
        ctx.quadraticCurveTo(-2, -enemy.body.h / 2, enemy.body.w / 2, -2);
        ctx.quadraticCurveTo(4, 2, enemy.body.w / 2 - 2, enemy.body.h / 2);
        ctx.quadraticCurveTo(-2, enemy.body.h / 2 - 1, -enemy.body.w / 2, 0);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /** Mi-boss : couleur/halo selon la phase — le télégraphe doit se lire d'un coup d'œil. */
  private renderBoss(ctx: CanvasRenderingContext2D): void {
    const boss = this.boss;
    if (boss === null || boss.phase === 'defeated') return;
    const cx = boss.body.x + boss.body.w / 2;
    const cy = boss.body.y + boss.body.h / 2;

    const flavor = resolveBossFlavor(this.bossFlavorVariants, this.storyFlags);
    const haloColor = boss.phase === 'vulnerable' ? PALETTE.unwritten : boss.phase === 'telegraph' ? PALETTE.danger : null;
    if (haloColor !== null) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 8);
      ctx.fillStyle = hexAlpha(haloColor, 0.25 + pulse * 0.2);
      ctx.beginPath();
      ctx.arc(cx, cy, boss.body.w * 0.8 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(boss.facing, 1);
    ctx.shadowColor = RENDERING.shadowColor;
    ctx.shadowBlur = RENDERING.shadowBlur;
    ctx.fillStyle = boss.phase === 'vulnerable' ? hexAlpha(PALETTE.sepia, 0.6) : PALETTE.sepia;
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.body.w / 2, boss.body.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.danger;
    ctx.font = 'italic bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(flavor.label, 0, 0);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();

    // Points de vie restants, en pastilles au-dessus.
    const pipsWidth = BOSS.health * 8;
    for (let i = 0; i < BOSS.health; i++) {
      ctx.fillStyle = i < boss.health ? PALETTE.danger : hexAlpha(PALETTE.sepia, 0.3);
      ctx.beginPath();
      ctx.arc(cx - pipsWidth / 2 + i * 8 + 4, boss.body.y - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bulles d'encre en vol : lentes et esquivables, teinte danger comme les
    // autres projectiles/menaces du boss.
    for (const p of boss.projectiles) {
      const wobble = Math.sin(this.time * 6 + p.x * 0.1) * 1.2;
      ctx.fillStyle = hexAlpha(PALETTE.danger, 0.35);
      ctx.beginPath();
      ctx.arc(p.x, p.y + wobble, BOSS.projectileRadius + 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.danger;
      ctx.beginPath();
      ctx.arc(p.x, p.y + wobble, BOSS.projectileRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.5);
      ctx.beginPath();
      ctx.arc(p.x - 1.5, p.y + wobble - 1.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Tourelles fixes (crue_01) : socle encastré dans le mur + une lentille qui
   * s'éclaire juste avant le tir (télégraphe minimal, `cooldown` déjà connu,
   * pas de nouvel état). Détruite : rendue grisée, silencieuse. Bulles en vol
   * dans le même style que celles du mi-boss (halo + cœur + reflet).
   */
  private renderTurrets(ctx: CanvasRenderingContext2D): void {
    for (const turret of this.turrets) {
      const cx = turret.body.x + turret.body.w / 2;
      const cy = turret.body.y + turret.body.h / 2;
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = turret.destroyed ? hexAlpha(PALETTE.sepia, 0.35) : PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(turret.body.x, turret.body.y, turret.body.w, turret.body.h, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (!turret.destroyed) {
        const charging = turret.cooldown < 0.3;
        const pulse = charging ? 0.6 + 0.4 * Math.sin(this.time * 20) : 0.4;
        ctx.fillStyle = hexAlpha(PALETTE.danger, pulse);
        ctx.beginPath();
        ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of turret.projectiles) {
        const wobble = Math.sin(this.time * 6 + p.x * 0.1) * 1.2;
        ctx.fillStyle = hexAlpha(PALETTE.danger, 0.35);
        ctx.beginPath();
        ctx.arc(p.x, p.y + wobble, TURRET.projectileRadius + 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.danger;
        ctx.beginPath();
        ctx.arc(p.x, p.y + wobble, TURRET.projectileRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.5);
        ctx.beginPath();
        ctx.arc(p.x - 1.5, p.y + wobble - 1.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** Blocs de plafond en chute (salle_tresor, demande de Lucas 2026-07-29) : silhouette anguleuse simple, pas de forme inventée fantaisiste. */
  private renderDebris(ctx: CanvasRenderingContext2D): void {
    const r = FALLING_DEBRIS.width / 2;
    for (const piece of this.debrisField.pieces) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.id * 0.7);
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.4);
      ctx.lineTo(-r * 0.3, -r);
      ctx.lineTo(r * 0.6, -r * 0.7);
      ctx.lineTo(r, r * 0.2);
      ctx.lineTo(r * 0.4, r);
      ctx.lineTo(-r * 0.6, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hexAlpha(PALETTE.ink, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const { body, facing, grounded } = this.player;
    // « Le Personnage devint ... » (chambre des mots, ratures_01) : recolore
    // l'encre du joueur lui-même, effet global (toutes les salles).
    const inkColor = resolveWorldColor('personnage', this.worldTransformations, this.storyFlags, PALETTE.ink);

    let stretch = 1;
    if (!grounded) {
      stretch = 1 + Math.min(Math.abs(body.vy) / PHYSICS.maxFallSpeed, 1) * 0.16;
    }
    if (this.landTimer > 0) {
      stretch = 1 - 0.22 * (this.landTimer / RENDERING.landSquashSeconds);
    }
    const h = body.h * stretch;
    const w = body.w / stretch;
    const footX = body.x + body.w / 2;
    const footY = body.y + body.h;

    if (grounded) {
      ctx.fillStyle = hexAlpha(inkColor, 0.15);
      ctx.beginPath();
      ctx.ellipse(footX, footY + 1.5, w * 0.55, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = RENDERING.shadowColor;
    ctx.shadowBlur = 4;
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.roundRect(footX - w / 2, footY - h, w, h, [w * 0.5, w * 0.5, w * 0.28, w * 0.28]);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = PALETTE.parchment;
    ctx.beginPath();
    ctx.arc(footX + facing * w * 0.18, footY - h + 5.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.fillStyle = hexAlpha(p.color, Math.max(0, p.life / p.maxLife));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Curseur de tracé : anneau de portée autour du joueur + case sous la souris. */
  private renderCursor(ctx: CanvasRenderingContext2D): void {
    const cursor = this.cursor;
    if (cursor === null || this.mode !== 'playing') return;
    if (!hasAbility(this.unlocked, 'ecrire') || !this.pointer.inside) return;

    // Anneau de portée (discret), visible surtout quand on trace/efface.
    const active = this.pointer.drawing || this.pointer.erasing;
    const center = this.playerCenter();
    ctx.strokeStyle = active ? hexAlpha(PALETTE.ink, 0.14) : DRAW.reachRingColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, INK.reach, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Case sous le curseur : couleur selon l'action possible.
    let color: string;
    if (this.pointer.erasing) {
      const erasable =
        this.room.hasInk(cursor.tx, cursor.ty) ||
        this.room.canonAt(cursor.tx, cursor.ty) !== null ||
        (hasAbility(this.unlocked, 'breche') && this.room.brecheAt(cursor.tx, cursor.ty) !== null);
      color = erasable && cursor.inReach ? DRAW.cursorEraseColor : DRAW.cursorBlockedColor;
    } else {
      const paintable = this.room.isPaintable(cursor.tx, cursor.ty) && cursor.inReach && !this.tileOverlapsPlayer(cursor.tx, cursor.ty);
      color = paintable ? DRAW.cursorPaintColor : DRAW.cursorBlockedColor;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cursor.tx * TILE_SIZE + 1, cursor.ty * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2, 3);
    ctx.stroke();
  }
}
