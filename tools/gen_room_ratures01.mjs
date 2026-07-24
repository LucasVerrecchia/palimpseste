/**
 * Générateur de la salle ratures_01 (zone 3 « Les Ratures », spec §6 : "zone
 * barbouillée du contenu supprimé, cimetière de persos coupés").
 *
 * Contrairement à chapitre_01 (D13, blockout mécanique pur, sans PNJ), cette
 * salle porte un premier vrai PNJ narratif au-delà de La Marge : La Rature
 * qui regrette (`data/dialogues/pnj_ratures.json`). Un seul personnage, une
 * seule histoire — retour explicite de Lucas contre deux PNJ miroirs
 * contradictoires — mais son introduction/réaction s'adapte au choix déjà
 * fait dans La Marge (`rature_jamais` / `nom_ecrit`) via `startVariants`
 * (narrative/dialogue.ts). Aucun nouveau pouvoir : les 4 sont déjà acquis en
 * traversant chapitre_01 ; juste un petit gouffre AILES et un fragment de
 * lore en hauteur pour que ça reste un niveau, pas juste un salon de dialogue.
 *
 * Même convention que gen_room_marge01.mjs/gen_room_chapitre01.mjs (D7) :
 * géométrie décrite par des rectangles nommés, JSON compatible Tiled en sortie.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 42;
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
solid(W - 1, 0, W - 1, H - 1); // marge droite : fin du contenu actuel (zones 4-6 à venir)
solid(1, 14, W - 2, 16); // sol continu

// Petit gouffre AILES (x=18-21) : rien de nouveau à apprendre ici (pouvoir
// déjà acquis dans chapitre_01), juste pour que la traversée reste un niveau.
clear(18, 14, 21, 16);

// --- Objets (calque "objects") --------------------------------------------
let nextId = 1;
const id = () => nextId++;
const prop = (name, type, value) => ({ name, type, value });

const objects = [
  { id: id(), name: 'spawn', type: 'spawn', x: 3 * TILE, y: 202, width: 0, height: 0, point: true },

  // Porte de retour vers chapitre_01 — cible loin de la porte d'arrivée côté
  // chapitre_01 (x≈70*16) et de sa propre porte de retour (x=2*16), même
  // convention anti aller-retour que les autres transitions.
  {
    id: id(), name: 'porte_chapitre1', type: 'door', x: 2 * TILE, y: 192, width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'chapitre_01'),
      prop('targetX', 'int', 66 * TILE),
      prop('targetY', 'int', 202),
    ],
  },

  // Encrier, avant le petit gouffre : point de sauvegarde propre à cette zone.
  { id: id(), name: 'encrier_ratures', type: 'inkwell', x: 6 * TILE, y: 200, width: 16, height: 24 },

  // La Rature qui regrette : un seul PNJ, juste après le gouffre.
  {
    id: id(), name: 'pnj_ratures', type: 'npc', x: 26 * TILE, y: 204, width: 12, height: 20,
    properties: [prop('dialogue', 'string', 'pnj_ratures')],
  },

  // Fragment de lore, en hauteur (récompense d'un double saut AILES).
  {
    id: id(), name: 'fragment_ratures', type: 'fragment', x: 34 * TILE, y: 8 * TILE, width: 16, height: 16,
    properties: [prop('flag', 'string', 'fragment_ratures')],
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
  nextlayerid: 3,
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
      id: 2, name: 'objects', type: 'objectgroup', visible: true, opacity: 1,
      x: 0, y: 0, draworder: 'topdown', objects,
    },
  ],
};

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'src', 'data', 'rooms', 'ratures_01.json');
writeFileSync(out, JSON.stringify(map));
console.log(`ratures_01.json écrit (${W}×${H}, ${objects.length} objets) → ${out}`);
