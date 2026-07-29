/**
 * Générateur de la salle `salle_tresor` (bonus optionnel de la zone 4 « La
 * Crue »), demande de Lucas 2026-07-29.
 *
 * Historique court (même jour) : le trésor se trouvait d'abord dans une
 * petite alcôve en hauteur au sein de `crue_01` ; puis, retour de Lucas, au
 * fond d'un long corridor où il fallait redescendre après avoir cassé le mur
 * BRÈCHE ; mais ce corridor faisait partie du même fichier de salle que le
 * puits, et `isCaughtByHazard` (world/rising_hazard.ts) ne teste que la
 * coordonnée Y du joueur, pas son compartiment — le joueur touchait donc à
 * tort le niveau de l'eau montante en tombant, alors même que l'eau
 * n'existe pas dans ce corridor. Plutôt que de complexifier le test de
 * l'aléa avec une notion de "compartiment", une salle séparée règle le
 * problème à la racine (l'aléa de `crue_01` n'a simplement aucune prise
 * ici).
 *
 * Design (retour de Lucas) : petite salle plate, pas de tracé d'encre
 * nécessaire. Le trésor est près de l'entrée ; le ramasser fait « trembler
 * le temple » et des blocs se mettent à tomber du plafond en continu
 * (`game/world/falling_debris.ts`, points de chute = objets `debris_spawn`
 * ci-dessous) — il faut courir jusqu'à la porte de sortie, à l'autre bout,
 * sans se faire toucher (même sévérité que les autres échecs du jeu : retour
 * au dernier encrier).
 *
 * Porte d'entrée : cible une position sur la porte `porte_salle_tresor` de
 * `crue_01` (alcôve derrière le mur BRÈCHE du puits).
 *
 * Porte de sortie (retravaillée le 2026-07-29, le jour même, avant tout
 * playtest de cette salle) : menait d'abord en boucle vers `crue_01` ; Lucas
 * demande qu'elle mène plutôt « à l'extérieur du temple », la vraie fin du
 * jeu construit jusqu'ici. `endsGame` (propriété Tiled générique, lue par
 * `checkDoors`/`finalizeEnding`, game.ts) : plus de `targetRoom`, cette porte
 * ne transite nulle part, elle termine la partie (texte différent
 * RATURE/POINT FINAL selon `rature_jamais`, même principe que `endsChapter`
 * pour la fin du chapitre 1).
 *
 * Même convention que les autres générateurs (D7) : géométrie décrite par
 * des rectangles nommés, JSON compatible Tiled en sortie.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 26;
const H = 10;
const TILE = 16;

const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => 0));
const solid = (x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
};

// --- Décor solide (calque "ground") ---------------------------------------
solid(0, 0, W - 1, 0); // plafond
solid(0, 0, 0, H - 1); // mur gauche
solid(W - 1, 0, W - 1, H - 1); // mur droit
solid(1, H - 2, W - 2, H - 1); // sol, sur toute la largeur (pas de tracé d'encre requis)

const FLOOR_SURFACE_Y = (H - 2) * TILE; // 128

// --- Objets (calque "objects") --------------------------------------------
let nextId = 1;
const id = () => nextId++;
const prop = (name, type, value) => ({ name, type, value });

const objects = [
  { id: id(), name: 'spawn', type: 'spawn', x: 3 * TILE, y: FLOOR_SURFACE_Y - 22, width: 0, height: 0, point: true },

  // Porte de retour vers crue_01 (l'alcôve derrière le mur BRÈCHE) — cible
  // décalée de la porte d'arrivée côté crue_01 pour ne jamais se
  // re-déclencher au ré-atterrissage.
  {
    id: id(), name: 'porte_crue01_entree', type: 'door', x: 2 * TILE, y: FLOOR_SURFACE_Y - 32, width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'crue_01'),
      prop('targetX', 'int', 3 * TILE),
      prop('targetY', 'int', 96 - 22), // plateforme du haut du puits (TOP_SURFACE_Y=96), loin de l'alcôve
    ],
  },

  // Le trésor, près de l'entrée : le ramasser déclenche l'effondrement
  // (game.ts, gated sur room.id === 'salle_tresor').
  {
    id: id(), name: 'tresor_salle_tresor', type: 'treasure',
    x: 12 * TILE, y: FLOOR_SURFACE_Y - 20, width: 16, height: 16,
    properties: [prop('flag', 'string', 'salle_tresor_trouve')],
  },

  // Points de chute des blocs (plafond), répartis entre le trésor et la
  // sortie — c'est la course qui doit être tendue, pas l'approche du trésor.
  { id: id(), name: 'debris_spawn_1', type: 'debris_spawn', x: 9 * TILE, y: TILE, width: 0, height: 0, point: true },
  { id: id(), name: 'debris_spawn_2', type: 'debris_spawn', x: 12 * TILE, y: TILE, width: 0, height: 0, point: true },
  { id: id(), name: 'debris_spawn_3', type: 'debris_spawn', x: 15 * TILE, y: TILE, width: 0, height: 0, point: true },
  { id: id(), name: 'debris_spawn_4', type: 'debris_spawn', x: 18 * TILE, y: TILE, width: 0, height: 0, point: true },
  { id: id(), name: 'debris_spawn_5', type: 'debris_spawn', x: 21 * TILE, y: TILE, width: 0, height: 0, point: true },

  // Porte de sortie, à l'autre bout de la salle : termine le jeu (`endsGame`)
  // plutôt que de mener quelque part.
  {
    id: id(), name: 'porte_sortie_tresor', type: 'door', x: (W - 3) * TILE, y: FLOOR_SURFACE_Y - 32, width: 16, height: 32,
    properties: [prop('endsGame', 'bool', true)],
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
const out = join(here, '..', 'src', 'data', 'rooms', 'salle_tresor.json');
writeFileSync(out, JSON.stringify(map));
console.log(`salle_tresor.json écrit (${W}×${H}, ${objects.length} objets) → ${out}`);
