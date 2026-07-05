/**
 * Générateur de la salle "marge_01" au format Tiled JSON (grille dessinée en
 * ASCII ci-dessous, convertie en calque de tuiles). Stopgap de la Phase 1 :
 * à partir de la Phase 2, les salles seront éditées directement dans Tiled —
 * le fichier généré est 100 % compatible (il s'ouvre dans Tiled).
 *
 * Usage : node tools/gen_room_marge01.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 60;
const H = 17;

// Grille : '#' = tuile solide (gid 1), '.' = vide.
// Design : plaine de départ (PNJ + mot ÉCRIRE), fosse cols 22-31 avec marche
// de sortie (chemin alternatif par le bas), plateformes non-écrites par-dessus
// (chemin haut via ÉCRIRE), alcôve secrète en hauteur (nécessite ÉCRIRE),
// encrier puis porte de sortie à droite.
const grid = Array.from({ length: H }, () => Array(W).fill(0));

// Bords de la page
for (let x = 0; x < W; x++) {
  grid[0][x] = 1; // plafond
  grid[16][x] = 1; // fond de page
}
for (let y = 0; y < H; y++) {
  grid[y][0] = 1; // marge gauche
  grid[y][W - 1] = 1; // marge droite
}
// Sol principal (rows 14-15), interrompu par la fosse (cols 22-31)
for (let x = 1; x < W - 1; x++) {
  if (x < 22 || x > 31) {
    grid[14][x] = 1;
    grid[15][x] = 1;
  }
}
// Marche dans la fosse : sortie par la droite sans pouvoir (chemin alternatif)
grid[15][30] = 1;
// Alcôve secrète (fragment) — accessible uniquement via plateforme écrite
for (let x = 11; x <= 15; x++) grid[8][x] = 1;

const data = grid.flat();

const props = (entries) => entries.map(([name, type, value]) => ({ name, type, value }));

const objects = [
  { id: 1, name: 'spawn', type: 'spawn', x: 48, y: 202, width: 0, height: 0, point: true },
  {
    id: 2, name: 'pnj_marge', type: 'npc', x: 192, y: 204, width: 12, height: 20,
    properties: props([['dialogue', 'string', 'pnj_marge']]),
  },
  {
    id: 3, name: 'mot_ecrire', type: 'word', x: 272, y: 192, width: 16, height: 16,
    properties: props([['ability', 'string', 'ecrire']]),
  },
  // Plateformes non-écrites au-dessus de la fosse (chemin haut)
  { id: 4, name: 'plat_fosse_1', type: 'unwritten', x: 384, y: 208, width: 32, height: 16 },
  { id: 5, name: 'plat_fosse_2', type: 'unwritten', x: 448, y: 208, width: 32, height: 16 },
  // Plateforme non-écrite vers l'alcôve secrète
  { id: 6, name: 'plat_alcove', type: 'unwritten', x: 128, y: 176, width: 32, height: 16 },
  {
    id: 7, name: 'fragment_marge', type: 'fragment', x: 208, y: 104, width: 16, height: 16,
    properties: props([['flag', 'string', 'fragment_marge']]),
  },
  { id: 8, name: 'encrier_marge', type: 'inkwell', x: 640, y: 200, width: 16, height: 24 },
  { id: 9, name: 'sortie_est', type: 'exit', x: 896, y: 176, width: 16, height: 48 },
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
  tilewidth: 16,
  tileheight: 16,
  nextlayerid: 3,
  nextobjectid: objects.length + 1,
  tilesets: [
    {
      firstgid: 1,
      name: 'placeholder_manuscrit',
      tilewidth: 16,
      tileheight: 16,
      tilecount: 1,
      columns: 1,
      // Tileset "virtuel" : le rendu Phase 1 dessine les tuiles au code.
      image: 'placeholder.png',
      imagewidth: 16,
      imageheight: 16,
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
console.log('OK: src/data/rooms/marge_01.json généré (' + String(data.length) + ' tuiles)');
