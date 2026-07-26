/**
 * Générateur de la salle chapitre_01 (blockout « Le Chapitre Premier »).
 *
 * Décision de calibrage Phase 2 (voir docs/architecture.md D13) : cette salle
 * est un terrain d'essai MÉCANIQUE — aucun PNJ, aucune phrase-loi, aucun texte
 * narratif (les choix narratifs se décident avec Lucas, pas dans cette passe).
 *
 * Retour de playtest 2026-07-26 (D16) : AILES retiré d'ici (migre au niveau
 * 3) ; l'arène du mi-boss est agrandie et rehaussée (H doublé). La caméra
 * (`engine/camera.ts`) suit déjà l'axe Y génériquement, elle n'a simplement
 * jamais été exercée verticalement car toutes les salles précédentes
 * tenaient dans une hauteur d'écran (17 tuiles) : aucun changement moteur
 * nécessaire, juste une salle plus haute. Le mi-boss lui-même reste
 * identique (même mécanique, même stats) — seule sa peau narrative change
 * selon le penchant du joueur (`narrative/boss_flavor.ts`).
 *
 * Deuxième retour de playtest, même jour (D16-bis) : le premier mur BRÈCHE
 * (juste après le pouvoir) redevient un mur SIMPLE, entièrement cassable dès
 * le sol, comme avant — sa fissure doit couvrir tout le mur pour enseigner
 * le principe sans ambiguïté, pas de grimpe obligatoire pour LUI. En
 * revanche, les murs de l'arène (les « points faibles ») restent chacun un
 * seul mur BRÈCHE plein (même mécanique tout-ou-rien) mais leur fissure ne
 * marque qu'une bande étroite en hauteur : il faut grimper jusqu'à cette
 * bande pour l'atteindre, et une fois cassée, TOUT le mur s'ouvre d'un coup
 * (`crackY`/`crackHeight`, propriétés Tiled qui ne restreignent QUE le
 * dessin de la fissure — `registerBrecheWall`/`revealFiligrane`, room.ts,
 * restent inchangés, tout-ou-rien par objet comme depuis toujours).
 *
 *   porte (retour La Marge) → mur à franchir en s'y traçant des plateformes
 *   d'encre (PLUME) → Coquille + Rature → mur BRÈCHE simple (la salle
 *   s'ouvre en hauteur juste avant lui, pour l'arène plus loin) → puits
 *   d'escalade → 2 murs BRÈCHE « points faibles » de l'arène (fissure en
 *   hauteur, mais tout le mur s'ouvre une fois cassé) → arène du mi-boss
 *   (avec fiole de secours) → porte vers ratures_01 (zone 3 « Les Ratures »,
 *   D15), verrouillée tant que le mi-boss n'est pas vaincu.
 *
 * Même convention que gen_room_marge01.mjs (D7) : géométrie décrite par des
 * rectangles nommés, JSON compatible Tiled en sortie.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// W = 84 (élargi de 74 à 84, retour de playtest 2026-07-26) : place pour 2
// murs BRÈCHE « points faibles » dans l'arène, assez loin des zones de
// patrouille des ennemis (voir plus bas), avant le mi-boss et la porte.
const W = 84;
// OFFSET = ancien H (17, une hauteur d'écran) : tout le corridor d'origine
// est translaté de cette valeur vers le bas, et la même quantité de rangées
// est ajoutée AU-DESSUS pour l'arène verticale du mi-boss (D16).
const OFFSET = 17;
const H = OFFSET + 17; // 34
const TILE = 16;

const ROW = (n) => n + OFFSET; // translate une ancienne rangée (tuiles) vers le bas
const Y = (v) => v + OFFSET * TILE; // translate une ancienne coordonnée y (px) vers le bas

// x où le couloir s'ouvre en puits d'escalade avant le mur BRÈCHE (x=38).
const WELL_START = 34;

const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => 0));
const solid = (x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
};

// --- Décor solide (calque "ground") ---------------------------------------
solid(0, 0, W - 1, 0); // bord haut de la page (plafond réel, tout en haut de l'arène)
solid(0, 0, 0, H - 1); // marge gauche
solid(W - 1, 0, W - 1, H - 1); // marge droite
solid(1, ROW(14), W - 2, ROW(16)); // sol continu (translaté)

// Plafond du corridor : ne recouvre que la partie avant le puits d'escalade,
// pour que le début du niveau se lise comme avant (une hauteur d'écran).
// Au-delà (puits, mur BRÈCHE, arène), aucun plafond : la salle s'ouvre
// jusqu'au bord haut réel pour le défilement vertical de la caméra.
solid(1, OFFSET, WELL_START - 1, OFFSET);

// Mur à franchir (x=14) : bloque le couloir au sol, mais laisse 3 tuiles de
// vide au-dessus — trop haut pour un simple saut, ça exige de se tracer des
// plateformes d'encre (ÉCRIRE) pour grimper.
solid(14, ROW(4), 14, ROW(16));

// (Gouffre AILES retiré, D16 — le double-saut migre au niveau 3.)

// Mur BRÈCHE (x=38) : solide sur toute la hauteur dans le calque ground, et
// entièrement enregistré comme `breche_wall` (mur simple, retour de
// playtest 2026-07-26 D16-bis) — cassable directement depuis le sol, sans
// grimper. La salle s'ouvre en hauteur juste avant lui (voir plus haut) pour
// que l'arène plus loin ait déjà commencé à s'élargir visuellement.
solid(38, 0, 38, H - 1);

// Arène du mi-boss (x=40 à W-2) : corridor large. Petite plateforme
// surélevée (x=68-72) pour la fiole de secours, accessible en s'y traçant un
// escalier d'encre.
solid(68, ROW(9), 72, ROW(9));

// Murs BRÈCHE « points faibles » (retour de playtest 2026-07-26) : après les
// ennemis communs (Coquille patrouille tuiles 40-45, Rature 47-52 — voir
// game.ts pour le calcul des bornes), deux colonnes pleines du sol au
// plafond réel de la salle, à x=56 et x=61 (large marge après les
// patrouilles, pour ne jamais bloquer un rebond d'ennemi contre le mur).
// Chacune est UN SEUL mur BRÈCHE plein (comme le mur simple ci-dessus) :
// casser n'importe quelle tuile ouvre tout le mur d'un coup. Seule la
// fissure dessinée est restreinte à une bande étroite en hauteur
// (`crackY`/`crackHeight` sur l'objet, voir plus bas) — il faut grimper
// jusque-là pour la voir et l'atteindre. Hauteurs différentes pour varier
// l'escalade et donner un usage à la partie haute, autrement vide, de l'arène.
solid(56, 0, 56, H - 1);
solid(61, 0, 61, H - 1);

// --- Calque "filigrane" (le brouillon d'en dessous, D11/§4) ---------------
// Entièrement vide : une fois la bande haute du mur BRÈCHE effacée, le
// passage s'ouvre complètement.
const filigrane = Array.from({ length: H * W }, () => 0);

// --- Objets (calque "objects") --------------------------------------------
let nextId = 1;
const id = () => nextId++;
const prop = (name, type, value) => ({ name, type, value });

const objects = [
  // Point d'apparition par défaut (si la salle est chargée hors transition).
  { id: id(), name: 'spawn', type: 'spawn', x: 3 * TILE, y: Y(202), width: 0, height: 0, point: true },

  // Porte de retour vers La Marge — cible décalée de la porte d'arrivée côté
  // marge_01 (x=20*16=320) pour ne jamais se re-déclencher au ré-atterrissage.
  {
    id: id(), name: 'porte_marge', type: 'door', x: 2 * TILE, y: Y(192), width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'marge_01'),
      prop('targetX', 'int', 360),
      prop('targetY', 'int', 202),
    ],
  },

  // Mots-pouvoir : chacun juste avant l'obstacle qu'il permet de franchir.
  // HÂTE tôt, pour le combat contre les ennemis/le mi-boss plus loin.
  {
    id: id(), name: 'mot_hate', type: 'word', x: 6 * TILE, y: Y(200), width: 16, height: 16,
    properties: [prop('ability', 'string', 'hate')],
  },
  // Encrier, juste après le premier mur (celui qu'on franchit en s'y traçant
  // des plateformes d'encre).
  { id: id(), name: 'encrier_chapitre1', type: 'inkwell', x: 16 * TILE, y: Y(200), width: 16, height: 24 },

  {
    id: id(), name: 'mot_breche', type: 'word', x: 33 * TILE, y: Y(200), width: 16, height: 16,
    properties: [prop('ability', 'string', 'breche')],
  },

  // Second encrier, juste avant le puits d'escalade (D16) : la séquence la
  // plus coûteuse en encre (escalier jusqu'aux points faibles + arène plus
  // haute).
  { id: id(), name: 'encrier_chapitre1_puits', type: 'inkwell', x: (WELL_START - 2) * TILE, y: Y(200), width: 16, height: 24 },

  // Mur BRÈCHE : entièrement cassable (mur simple, D16-bis, retour de
  // playtest 2026-07-26) — pas de `crackY`/`crackHeight` donc la fissure
  // (voir `crackRectOf`, game.ts) couvre tout le mur par défaut. Premier mur
  // BRÈCHE du jeu, volontairement lisible et cassable en entier pour
  // enseigner le principe avant les points faibles de l'arène.
  {
    id: id(), name: 'mur_breche', type: 'breche_wall', x: 38 * TILE, y: 0, width: 16, height: H * TILE,
    properties: [prop('flag', 'string', 'breche_chapitre1_ouverte')],
  },

  // Ennemis communs : une Coquille en patrouille, une Rature qui poursuit.
  {
    id: id(), name: 'coquille_1', type: 'enemy', x: 40 * TILE, y: Y(14 * TILE - 14), width: 6 * TILE, height: 14,
    properties: [prop('kind', 'string', 'coquille')],
  },
  {
    id: id(), name: 'rature_1', type: 'enemy', x: 47 * TILE, y: Y(14 * TILE - 14), width: 6 * TILE, height: 14,
    properties: [prop('kind', 'string', 'rature')],
  },

  // Murs BRÈCHE « points faibles » (retour de playtest 2026-07-26, précisé
  // D16-bis) : chacun est UN SEUL mur BRÈCHE plein (`y`/`height` couvrent
  // toute la salle, comme `mur_breche` ci-dessus) — casser n'importe quelle
  // tuile ouvre TOUT le mur d'un coup, mécanique inchangée. Seule la fissure
  // dessinée (`crackY`/`crackHeight`, lues par `crackRectOf`, game.ts) est
  // restreinte à une bande étroite : il faut grimper jusque-là pour la voir
  // et l'atteindre. Le premier (juste après les ennemis) est à hauteur
  // modérée ; le second (juste avant le combat) est haut, près du plafond
  // réel de la salle, pour donner un objectif dramatique au sommet de
  // l'arène avant le mi-boss.
  {
    id: id(), name: 'mur_breche_gauntlet_1', type: 'breche_wall', x: 56 * TILE, y: 0, width: 16, height: H * TILE,
    properties: [
      prop('flag', 'string', 'breche_gauntlet1_ouverte'),
      prop('crackY', 'int', 18 * TILE),
      prop('crackHeight', 'int', 4 * TILE),
    ],
  },
  {
    id: id(), name: 'mur_breche_gauntlet_2', type: 'breche_wall', x: 61 * TILE, y: 0, width: 16, height: H * TILE,
    properties: [
      prop('flag', 'string', 'breche_gauntlet2_ouverte'),
      prop('crackY', 'int', 5 * TILE),
      prop('crackHeight', 'int', 4 * TILE),
    ],
  },

  // Fiole d'encre rouge : usage unique, restaure une partie des PV. Posée en
  // hauteur au-dessus de l'arène, accessible en s'y traçant un escalier
  // d'encre — filet de sécurité avant le mi-boss pour un joueur entamé.
  {
    id: id(), name: 'potion_pv', type: 'potion', x: 70 * TILE, y: Y(9 * TILE - 12), width: 12, height: 12,
    properties: [prop('flag', 'string', 'potion_chapitre1_pv')],
  },

  // Mi-boss : la Coquille majuscule, en bout d'arène. Même mécanique quelle
  // que soit la peau narrative (`resolveBossFlavor`, game.ts).
  {
    id: id(), name: 'boss_coquille_majuscule', type: 'boss', x: 66 * TILE, y: Y(14 * TILE - 20), width: 4 * TILE, height: 20,
  },

  // Porte vers ratures_01 (zone 3, D15) — au-delà de l'arène. Cible loin de
  // la porte de retour côté ratures_01 (x=2*16) et de porte_marge ci-dessus
  // (autre salle) : pas de risque d'aller-retour immédiat. `requiresFlag`
  // (retour de playtest 2026-07-26) : reste verrouillée tant que le mi-boss
  // n'est pas vaincu (`storyFlags.boss_coquille_majuscule_vaincu`, posé dans
  // `updateBoss`, game.ts) — avant, elle ne menait déjà nulle part
  // d'intéressant, mais rien n'empêchait de la franchir en la contournant.
  {
    id: id(), name: 'porte_ratures', type: 'door', x: 78 * TILE, y: Y(192), width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'ratures_01'),
      prop('targetX', 'int', 6 * TILE),
      prop('targetY', 'int', 202),
      prop('requiresFlag', 'string', 'boss_coquille_majuscule_vaincu'),
    ],
  },
];

// --- Assemblage au format Tiled -------------------------------------------
const map = {
  compressionlevel: -1,
  width: W,
  height: H,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.10.2',
  version: '1.10',
  type: 'map',
  tilewidth: TILE,
  tileheight: TILE,
  nextlayerid: 4,
  nextobjectid: nextId,
  tilesets: [
    {
      firstgid: 1, name: 'placeholder_manuscrit', tilewidth: TILE, tileheight: TILE,
      tilecount: 1, columns: 1, image: 'placeholder.png', imagewidth: TILE, imageheight: TILE,
    },
  ],
  layers: [
    {
      id: 1, name: 'ground', type: 'tilelayer', visible: true, opacity: 1,
      x: 0, y: 0, width: W, height: H, data: grid.flat(),
    },
    {
      id: 3, name: 'filigrane', type: 'tilelayer', visible: true, opacity: 1,
      x: 0, y: 0, width: W, height: H, data: filigrane,
    },
    {
      id: 2, name: 'objects', type: 'objectgroup', visible: true, opacity: 1,
      x: 0, y: 0, draworder: 'topdown', objects,
    },
  ],
};

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'src', 'data', 'rooms', 'chapitre_01.json');
writeFileSync(out, JSON.stringify(map));
console.log(`chapitre_01.json écrit (${W}×${H}, ${objects.length} objets) → ${out}`);
