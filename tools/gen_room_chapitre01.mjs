/**
 * Générateur de la salle chapitre_01 (blockout « Le Chapitre Premier »).
 *
 * Décision de calibrage Phase 2 (voir docs/architecture.md D13) : cette salle
 * est un terrain d'essai MÉCANIQUE — aucun PNJ, aucune phrase-loi, aucun texte
 * narratif (les choix narratifs se décident avec Lucas, pas dans cette passe).
 * Elle enchaîne dans l'ordre les 3 pouvoirs restants + le filigrane + un
 * ennemi de chaque sorte + le mi-boss, pour prouver la chaîne complète :
 *
 *   porte (retour La Marge) → mur ANCRE (grimper) → gouffre ALES (double saut)
 *   → mur BRÈCHE (effacer → filigrane) → Coquille + Rature → mi-boss.
 *
 * Même convention que gen_room_marge01.mjs (D7) : géométrie décrite par des
 * rectangles nommés, JSON compatible Tiled en sortie.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 56;
const H = 17;
const TILE = 16;

const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => 0));
const solid = (x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
};
const clear = (x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 0;
};

// --- Décor solide (calque "ground") ---------------------------------------
solid(0, 0, W - 1, 0); // bord haut de la page
solid(0, 0, 0, H - 1); // marge gauche
solid(W - 1, 0, W - 1, H - 1); // marge droite
solid(1, 14, W - 2, 16); // sol continu

// Mur ANCRE (x=14) : bloque le couloir au sol, mais laisse 3 tuiles de vide
// au-dessus (rangées 1-3) pour passer par-dessus une fois grimpé — trop haut
// pour un simple saut (13 tuiles), ça exige de s'accrocher au mur (ANCRE).
solid(14, 4, 14, 16);

// Gouffre ALES (x=26-31) : 6 tuiles de large, hors de portée d'un saut simple
// mais franchissable avec le double saut.
clear(26, 14, 31, 16);

// Mur BRÈCHE (x=38) : plein du sol au plafond (rangée 0 incluse) — impossible
// de grimper par-dessus, seule la BRÈCHE (clic droit + pouvoir) l'ouvre.
solid(38, 0, 38, 16);

// --- Calque "filigrane" (le brouillon d'en dessous, D11/§4) ---------------
// Entièrement vide : une fois le mur BRÈCHE effacé, le passage s'ouvre
// complètement (aucun obstacle cent dessous ici — juste une illustration
// simple de la mécanique).
const filigrane = Array.from({ length: H * W }, () => 0);

// --- Objets (calque "objects") --------------------------------------------
let nextId = 1;
const id = () => nextId++;
const prop = (name, type, value) => ({ name, type, value });

const objects = [
  // Point d'apparition par défaut (si la salle est chargée hors transition).
  { id: id(), name: 'spawn', type: 'spawn', x: 3 * TILE, y: 202, width: 0, height: 0, point: true },

  // Porte de retour vers La Marge — cible décalée de la porte d'arrivée côté
  // marge_01 (x=20*16=320) pour ne jamais se re-déclencher au ré-atterrissage.
  {
    id: id(), name: 'porte_marge', type: 'door', x: 2 * TILE, y: 192, width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'marge_01'),
      prop('targetX', 'int', 360),
      prop('targetY', 'int', 202),
    ],
  },

  // Mur ANCRE : indication purement mécanique (pas de mot-loi ici).
  {
    id: id(), name: 'mur_ancre', type: 'wall_hint', x: 14 * TILE, y: 4 * TILE, width: 16, height: 13 * TILE,
  },

  // Mur BRÈCHE : effaçable uniquement avec le pouvoir BRÈCHE.
  {
    id: id(), name: 'mur_breche', type: 'breche_wall', x: 38 * TILE, y: 0, width: 16, height: H * TILE,
    properties: [prop('flag', 'string', 'breche_chapitre1_ouverte')],
  },

  // Ennemis communs : une Coquille en patrouille, une Rature qui poursuit.
  {
    id: id(), name: 'coquille_1', type: 'enemy', x: 39 * TILE, y: 14 * TILE - 14, width: 6 * TILE, height: 14,
    properties: [prop('kind', 'string', 'coquille')],
  },
  {
    id: id(), name: 'rature_1', type: 'enemy', x: 45 * TILE, y: 14 * TILE - 14, width: 6 * TILE, height: 14,
    properties: [prop('kind', 'string', 'rature')],
  },

  // Mi-boss : la Coquille majuscule, en bout de salle.
  {
    id: id(), name: 'boss_coquille_majuscule', type: 'boss', x: 50 * TILE, y: 14 * TILE - 20, width: 4 * TILE, height: 20,
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
