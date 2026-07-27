/**
 * Générateur de la salle ratures_01 (zone 3 « Les Ratures », spec §6 : "zone
 * barbouillée du contenu supprimé, cimetière de persos coupés").
 *
 * Porte un PNJ narratif, La Rature qui regrette (`data/dialogues/pnj_ratures.json`),
 * dont l'intro/réaction s'adapte au choix déjà fait dans La Marge
 * (`rature_jamais` / `nom_ecrit`) via `startVariants` (narrative/dialogue.ts).
 *
 * Finalisation (session de planification dédiée, cf. session 17 où l'idée
 * avait été mise de côté) : le niveau était un simple couloir de traversée
 * avec 1 seul fragment — au-delà, injouable depuis D16 (voir plus bas). Trois
 * décisions structurent cette version :
 *  - AILES (double saut) migre ici, comme annoncé dans le commentaire de
 *    gen_room_chapitre01.mjs (D16) mais jamais fait : sans lui, le gouffre
 *    x=18-21 était infranchissable (portée du dash HÂTE ≈ 42px, gouffre =
 *    64px) et le fragment en hauteur, hors de portée. Mot-pouvoir ajouté
 *    juste avant le gouffre, même convention que chapitre_01.
 *  - 3 fragments à collecter (au lieu d'1), à hauteurs croissantes : au sol,
 *    à portée d'un saut simple, puis d'un double saut — pour donner un usage
 *    concret à AILES dans cette même salle.
 *  - Une fois les 3 ramassés, la phrase qu'ils composent (`resolveSentence`,
 *    variantes selon le penchant RATURE/POINT FINAL dans
 *    `data/chapters/ratures_01.json`) débloque une porte-palier
 *    (`requiresFlag:'ratures_phrase_composee'`) : la collecte devient une
 *    vraie condition de progression, pas un fragment de lore isolé. La porte
 *    boucle sur une alcôve de la même salle (pas de zone 4 à construire dans
 *    cette session — juste un point d'accroche propre pour plus tard).
 *  - 2 ennemis communs (Coquille, Rature), cohérents avec le thème « cimetière
 *    de persos coupés » — aucun nouveau type, mêmes archétypes que
 *    chapitre_01. Zones de patrouille séparées par 2 tuiles de marge (leçon
 *    D16-bis : ne jamais coller une patrouille à un mur/une autre patrouille).
 *
 * Même convention que gen_room_marge01.mjs/gen_room_chapitre01.mjs (D7) :
 * géométrie décrite par des rectangles nommés, JSON compatible Tiled en sortie.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 64;
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

// Petit gouffre AILES (x=18-21) : inchangé depuis la première version — le
// mot-pouvoir est désormais ajouté juste avant (x=10), ce qui le rend enfin
// franchissable.
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

  // Mot-pouvoir AILES (D16 : « migre au niveau 3 ») — juste avant le gouffre
  // qu'il permet de franchir, même convention que les mots-pouvoir de
  // chapitre_01.
  {
    id: id(), name: 'mot_ales', type: 'word', x: 10 * TILE, y: 200, width: 16, height: 16,
    properties: [prop('ability', 'string', 'ales')],
  },

  // Zones de patrouille des ennemis communs, après le gouffre. 2 tuiles de
  // marge entre les deux (D16-bis) pour ne jamais coincer un ennemi.
  {
    id: id(), name: 'coquille_ratures', type: 'enemy', x: 24 * TILE, y: 14 * TILE - 14, width: 6 * TILE, height: 14,
    properties: [prop('kind', 'string', 'coquille')],
  },
  {
    id: id(), name: 'rature_ratures', type: 'enemy', x: 32 * TILE, y: 14 * TILE - 14, width: 6 * TILE, height: 14,
    properties: [prop('kind', 'string', 'rature')],
  },

  // La Rature qui regrette : un seul PNJ, après les deux zones de patrouille
  // (tampon de 3 tuiles pour ne pas l'associer visuellement à une fuite
  // d'ennemi).
  {
    id: id(), name: 'pnj_ratures', type: 'npc', x: 41 * TILE, y: 204, width: 12, height: 20,
    properties: [prop('dialogue', 'string', 'pnj_ratures')],
  },

  // 3 fragments à hauteur croissante : au sol, puis à portée d'un saut simple
  // (~3 tuiles), puis d'un double saut AILES (~6 tuiles, comme l'ancien
  // fragment unique) — donne un usage concret au pouvoir dans cette salle.
  // Retour de Lucas (audit narratif 2026-07-26) : un fragment sans texte ne
  // dit rien de ce qu'on trouve ni pourquoi. Chacun est la trace d'un
  // personnage coupé différent (thème spec §6 : "cimetière de persos
  // coupés"), en écho à La Rature qui regrette sans la nommer directement —
  // elle n'est pas la seule à avoir été effacée. [TODO narration]
  {
    id: id(), name: 'fragment_ratures_1', type: 'fragment', x: 44 * TILE, y: 200, width: 16, height: 16,
    properties: [
      prop('flag', 'string', 'fragment_ratures_1'),
      prop('text', 'string', "« ...elle avait un nom, une fois. Il ne reste que les guillemets où il tenait. »"),
    ],
  },
  {
    id: id(), name: 'fragment_ratures_2', type: 'fragment', x: 49 * TILE, y: 11 * TILE, width: 16, height: 16,
    properties: [
      prop('flag', 'string', 'fragment_ratures_2'),
      prop('text', 'string', "« ...il devait sauver quelqu'un, au chapitre suivant. Le chapitre suivant n'est jamais venu. »"),
    ],
  },
  {
    id: id(), name: 'fragment_ratures_3', type: 'fragment', x: 54 * TILE, y: 8 * TILE, width: 16, height: 16,
    properties: [
      prop('flag', 'string', 'fragment_ratures_3'),
      prop('text', 'string', "« ...trois brouillons de la même scène, trois fois abandonnée. Celui-ci est le seul à avoir laissé une trace. »"),
    ],
  },

  // Porte-palier : verrouillée tant que les 3 fragments ne sont pas ramassés
  // et leur phrase composée (`ratures_phrase_composee`, posé dans
  // `checkPickups`, game.ts). Boucle sur une alcôve de la même salle — pas
  // de zone 4 à construire dans cette session, juste un point d'accroche
  // propre pour plus tard. `showsCompletionToast` déclenche le message de
  // fin de contenu actuel au moment du franchissement (et non plus
  // automatiquement à la première entrée dans la salle).
  {
    id: id(), name: 'porte_zone4', type: 'door', x: 59 * TILE, y: 192, width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'ratures_01'),
      prop('targetX', 'int', 62 * TILE),
      prop('targetY', 'int', 202),
      prop('requiresFlag', 'string', 'ratures_phrase_composee'),
      prop('lockedMessage', 'string', 'La page reste blanche : il faut retrouver et assembler les 3 fragments de cette zone.'), // [proposition]
      prop('showsCompletionToast', 'boolean', true),
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
const out = join(here, '..', 'src', 'data', 'rooms', 'ratures_01.json');
writeFileSync(out, JSON.stringify(map));
console.log(`ratures_01.json écrit (${W}×${H}, ${objects.length} objets) → ${out}`);
