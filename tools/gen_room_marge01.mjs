/**
 * Générateur de la salle "marge_01" au format Tiled JSON.
 * Stopgap Phase 1 : à partir de la Phase 2 les salles seront éditées dans
 * Tiled (le fichier généré s'y ouvre). Usage : node tools/gen_room_marge01.mjs
 *
 * DESIGN (v2, difficulté par l'encre — voir décision D10) :
 * Le joueur trace ses blocs d'encre à la souris. Le niveau force le tracé :
 *
 *   île 0 (départ)   VOID A      île 1 (haute)   VOID B      île 2 + encrier   montée → sortie
 *   PNJ, mot ÉCRIRE  fosse       fragment↑       fosse       recharge          escalier d'encre
 *
 * - Les deux fosses sont trop larges pour être sautées ET leur mur opposé est
 *   trop haut pour être escaladé depuis le fond → tracer un pont est OBLIGATOIRE.
 * - Aucun encrier avant l'île 2 : franchir les DEUX fosses dépasse le budget,
 *   donc il faut effacer le pont de VOID A pour récupérer l'encre (le puzzle).
 * - Le fragment (optionnel, au-dessus de l'île 1) tente une dépense d'encre
 *   supplémentaire qui rend le puzzle de récupération plus mordant.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 74;
const H = 17;
const T = 16;

const grid = Array.from({ length: H }, () => Array(W).fill(0));
const fill = (x0, x1, y0, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
};

// Bords de la page
fill(0, W - 1, 0, 0); // plafond
fill(0, W - 1, H - 1, H - 1); // fond de page
fill(0, 0, 0, H - 1); // marge gauche
fill(W - 1, W - 1, 0, H - 1); // marge droite

// île 0 (départ) — sol bas, rows 14-15 (surface y=224)
fill(1, 16, 14, 15);
// VOID A : cols 17-28 (fond = row 16). Mur droit (île 1) haut → tracé obligatoire.
// île 1 (haute) — cols 29-40, rows 12-15 (surface y=192, +32 px)
fill(29, 40, 12, 15);
// VOID B : cols 41-51.
// île 2 (encrier) — cols 52-63, rows 12-15 (surface y=192)
fill(52, 63, 12, 15);
// Palier final — cols 64-68, rows 12-15 (continuité de l'île 2)
fill(64, 68, 12, 15);
// Corniche de sortie — cols 69-72, rows 5-6 (surface y=80, +112 px → escalier d'encre)
fill(69, 72, 5, 6);

const data = grid.flat();

const props = (entries) => entries.map(([name, type, value]) => ({ name, type, value }));

const objects = [
  { id: 1, name: 'spawn', type: 'spawn', x: 3 * T, y: 202, width: 0, height: 0, point: true },
  {
    id: 2, name: 'pnj_marge', type: 'npc', x: 8 * T, y: 204, width: 12, height: 20,
    properties: props([['dialogue', 'string', 'pnj_marge']]),
  },
  {
    id: 3, name: 'mot_ecrire', type: 'word', x: 13 * T, y: 200, width: 16, height: 16,
    properties: props([['ability', 'string', 'ecrire']]),
  },
  // Fragment secret : au-dessus de l'île 1, atteint en traçant un escalier vertical.
  {
    id: 4, name: 'fragment_marge', type: 'fragment', x: 34 * T, y: 72, width: 16, height: 16,
    properties: props([['flag', 'string', 'fragment_marge']]),
  },
  // Encrier : sur l'île 2, seul point de recharge/sauvegarde du niveau.
  { id: 5, name: 'encrier_marge', type: 'inkwell', x: 57 * T, y: 192 - 24, width: 16, height: 24 },
  // Sortie : sur la corniche haute (surface y=80), base posée dessus.
  { id: 6, name: 'sortie_est', type: 'exit', x: 70 * T, y: 32, width: 16, height: 48 },
];

const map = {
  compressionlevel: -1,
  height: H,
  width: W,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.10.2',
  version: '1.10',
  type: 'map',
  tilewidth: T,
  tileheight: T,
  nextlayerid: 3,
  nextobjectid: objects.length + 1,
  tilesets: [
    {
      firstgid: 1,
      name: 'placeholder_manuscrit',
      tilewidth: T,
      tileheight: T,
      tilecount: 1,
      columns: 1,
      image: 'placeholder.png',
      imagewidth: T,
      imageheight: T,
    },
  ],
  layers: [
    {
      id: 1, name: 'ground', type: 'tilelayer', visible: true, opacity: 1,
      x: 0, y: 0, width: W, height: H, data,
    },
    {
      id: 2, name: 'objects', type: 'objectgroup', visible: true, opacity: 1,
      x: 0, y: 0, draworder: 'topdown', objects,
    },
  ],
};

mkdirSync(new URL('../src/data/rooms/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/data/rooms/marge_01.json', import.meta.url), JSON.stringify(map));
console.log('OK: src/data/rooms/marge_01.json généré (' + String(data.length) + ' tuiles, ' + String(W) + 'x' + String(H) + ')');
