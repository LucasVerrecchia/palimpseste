/**
 * Générateur de la salle marge_01 (chapitre 1 « La Marge »).
 *
 * Pourquoi un générateur ? Éditer à la main un tableau `ground` de centaines
 * de tuiles est illisible et fragile. On décrit ici la géométrie par des
 * rectangles nommés, et on émet un JSON **compatible Tiled** (mêmes champs) :
 * il reste ouvrable/éditable dans Tiled plus tard, mais notre level design
 * chapitre 1 est traçable et reproductible.
 *
 * Conventions monde : tuile = 16 px, vue 480×270. Le sol occupe les 3 rangées
 * du bas (y 14-16), la page a un bord haut (y 0) et deux marges (x 0, x W-1).
 *
 * Refonte du 2026-07-28 (demande de Lucas, « on repart presque de 0 en
 * termes d'agencement ») :
 *   - Le niveau s'ouvre sur un petit parcours SANS pouvoir (un trou à
 *     sauter, un muret à franchir) qui mène derrière un mur.
 *   - « Il était une fois » est un décor purement visuel (arrière-plan en
 *     parallaxe, `game.ts` → `renderMargeIntroDecor`), visible pendant ce
 *     parcours, ce n'est PAS la phrase-loi interactive.
 *   - La vraie phrase-loi devient « Un enfant qui avait soif d'aventure. »
 *     (`data/chapters/marge_01.json`). Un seul mot-cage désormais : raturer
 *     « enfant » (au lieu de « jamais ») ouvre la voie RATURE. Le geste
 *     POINT FINAL devient littéral : dessiner un point (blanc « . », au
 *     lieu du blanc « toi ») à la fin de la phrase.
 * Ajustements du 2026-07-28, deuxième passe (retour de Lucas) :
 *   - Parcours d'intro légèrement rallongé (approche du trou, puis du
 *     muret, chacune un peu plus longue).
 *   - Le PNJ est rencontré EN PREMIER derrière le muret ; la plume est
 *     trouvée un peu plus loin, après lui (dans l'autre sens jusqu'ici).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 66;
const H = 17;
const TILE = 16;

const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => 0));
const solid = (x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
};

// --- Décor solide (calque "ground") ---------------------------------------
solid(0, 0, W - 1, 0); // bord haut de la page
solid(0, 0, 0, H - 1); // marge gauche
solid(W - 1, 0, W - 1, H - 1); // marge droite

// Sol du parcours d'intro, coupé par un trou à sauter (x8-9) : le seul
// obstacle qui existe avant que le joueur ait le moindre pouvoir.
solid(1, 14, 7, 16);
solid(10, 14, W - 2, 16);
// Muret à franchir (x14-15), posé sur le sol déjà continu à cet endroit :
// une bosse de 2 tuiles de haut, largement sautable sans pouvoir. C'est le
// « mur » derrière lequel attendent le PNJ puis la plume.
solid(14, 12, 15, 13);

// Passerelle haute (route POINT FINAL). Trou de 2 tuiles en x=38-39 : le
// blanc « . » à combler d'encre pour poser le point final de la phrase.
solid(34, 9, 37, 9);
solid(40, 9, 43, 9);

// NB : le mot-loi « enfant » (barrage à raturer) n'est PAS dans ce calque,
// c'est un objet "canon" solide et effaçable (voir plus bas).

// --- Objets (calque "objects") --------------------------------------------
let nextId = 1;
const id = () => nextId++;
const prop = (name, type, value) => ({ name, type, value });

const objects = [
  // Point d'apparition : pieds sur le sol (y = 14*16 - 22 = 202).
  { id: id(), name: 'spawn', type: 'spawn', x: 3 * TILE, y: 202, width: 0, height: 0, point: true },

  // PNJ de la Marge : le premier rencontré derrière le muret. Il explique le
  // pouvoir de la plume (encore à trouver un peu plus loin) ET la règle du
  // chapitre AVANT que le joueur touche à quoi que ce soit.
  {
    id: id(), name: 'pnj_marge', type: 'npc', x: 20 * TILE, y: 204, width: 12, height: 20,
    properties: [prop('dialogue', 'string', 'pnj_marge')],
  },

  // Mot-pouvoir PLUME, un peu après le PNJ.
  {
    id: id(), name: 'mot_ecrire', type: 'word', x: 23 * TILE, y: 200, width: 16, height: 16,
    properties: [prop('ability', 'string', 'ecrire')],
  },

  // Encrier / point de sauvegarde, avant la zone du choix.
  { id: id(), name: 'encrier_marge', type: 'inkwell', x: 28 * TILE, y: 200, width: 16, height: 24 },

  // Fragment de lore secret, haut dans la page au-dessus de la passerelle
  // (récompense de tracé vertical). [TODO narration]
  {
    id: id(), name: 'fragment_marge', type: 'fragment', x: 38 * TILE, y: 4 * TILE, width: 16, height: 16,
    properties: [
      prop('flag', 'string', 'fragment_marge'),
      prop(
        'text',
        'string',
        "« Je suis le dernier mot que la Plume ait tracé avant de se taire. Je cherche la phrase qui m'achèverait. »",
      ),
    ],
  },

  // Le choix : deux façons de dévier la phrase.
  // « . » (route POINT FINAL) : blanc à combler d'encre, dans le trou de la
  // passerelle haute (x38-39, y9). Le remplir = poser le point final.
  {
    id: id(), name: 'blanc_point', type: 'canon', x: 38 * TILE, y: 9 * TILE, width: 32, height: 16,
    properties: [
      prop('mode', 'string', 'latent'),
      prop('text', 'string', '.'),
      prop('flag', 'string', 'nom_ecrit'),
      prop('leaning', 'int', 1),
      // Exclusivité mutuelle (même mécanisme que l'ancien design) : une fois
      // « enfant » raturé, ce blanc ne peut plus être comblé.
      prop('exclusiveWith', 'string', 'rature_jamais'),
    ],
  },
  // « enfant » (route RATURE) : barrage-canon au sol, à raturer pour ouvrir
  // la voie basse. 2 tuiles de large, 6 de haut (x46-47, y8-13).
  {
    id: id(), name: 'mot_enfant', type: 'canon', x: 46 * TILE, y: 8 * TILE, width: 32, height: 6 * TILE,
    properties: [
      prop('mode', 'string', 'barrier'),
      prop('text', 'string', 'enfant'),
      prop('flag', 'string', 'rature_jamais'),
      prop('leaning', 'int', -1),
      // Exclusivité mutuelle : une fois le blanc comblé, ce mot ne peut plus
      // être raturé.
      prop('exclusiveWith', 'string', 'nom_ecrit'),
    ],
  },

  // Porte vers le Chapitre Premier, à la toute fin du niveau (au-delà du
  // barrage « enfant », le franchir, raturé ou contourné en s'y traçant des
  // plateformes d'encre, est le seul moyen physique d'arriver jusqu'ici).
  // Une seule porte, en fin de parcours, termine le chapitre (`endsChapter`)
  // juste avant de transiter vers chapitre_01.
  {
    id: id(), name: 'porte_chapitre1', type: 'door', x: 60 * TILE, y: 192, width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'chapitre_01'),
      prop('targetX', 'int', 64),
      // targetY = 202 + OFFSET*16 (OFFSET=17, D16) : chapitre_01 a doublé de
      // hauteur pour l'arène verticale du mi-boss, tout son corridor
      // d'origine a été translaté vers le bas d'autant.
      prop('targetY', 'int', 474),
      prop('endsChapter', 'string', 'chapitre1'),
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
const out = join(here, '..', 'src', 'data', 'rooms', 'marge_01.json');
writeFileSync(out, JSON.stringify(map));
console.log(`marge_01.json écrit (${W}×${H}, ${objects.length} objets) → ${out}`);
