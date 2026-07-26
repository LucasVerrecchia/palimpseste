/**
 * Générateur de la salle marge_01 (chapitre 1 « La Marge »).
 *
 * Pourquoi un générateur ? Éditer à la main un tableau `ground` de centaines
 * de tuiles est illisible et fragile. On décrit ici la géométrie par des
 * rectangles nommés, et on émet un JSON **compatible Tiled** (mêmes champs) :
 * il reste ouvrable/éditable dans Tiled plus tard, mais notre level design
 * chapitre 1 est traçable et reproductible (`node scripts/build_marge_01.mjs`).
 *
 * Conventions monde : tuile = 16 px, vue 480×270. Le sol occupe les 3 rangées
 * du bas (y 14-16), la page a un bord haut (y 0) et deux marges (x 0, x 63).
 *
 * Trame du chapitre (décision narration 2026-07-08, à valider avec Lucas) :
 * on traverse la première phrase du livre, gravée au-dessus du décor —
 *   « Le mot ▢ resta dans la marge, et n'en sortit jamais. »
 * Deux façons de la dévier pour se libérer :
 *   - RATURER « jamais » (barrière-canon, clic droit)  → penchant RATURE.
 *   - REMPLIR le blanc ▢ d'encre (compléter la phrase)  → penchant POINT FINAL.
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

// --- Décor solide (calque "ground") ---------------------------------------
solid(0, 0, W - 1, 0); // bord haut de la page
solid(0, 0, 0, H - 1); // marge gauche
solid(W - 1, 0, W - 1, H - 1); // marge droite
solid(1, 14, W - 2, 16); // sol continu (pas de chute mortelle dans une marge)

// Plus de murs abstraits : les seuls obstacles sont les MOTS de la phrase
// (objets "canon", gérés à l'exécution car effaçables). Le seul relief fixe
// est la passerelle haute qui mène à la sortie POINT FINAL.

// Passerelle haute (route POINT FINAL). Trou de 2 tuiles en x=40-41 : le blanc
// ▢ à combler d'encre pour compléter la phrase et poursuivre.
solid(34, 9, 39, 9);
solid(42, 9, 46, 9);

// NB : les mots-loi « enfermé » (cage de départ) et « jamais » (barrage final)
// ne sont PAS dans ce calque — ce sont des objets "canon" solides et effaçables.

// --- Objets (calque "objects") --------------------------------------------
let nextId = 1;
const id = () => nextId++;
const prop = (name, type, value) => ({ name, type, value });

const objects = [
  // Point d'apparition : pieds sur le sol (y = 14*16 - 22 = 202).
  { id: id(), name: 'spawn', type: 'spawn', x: 3 * TILE, y: 202, width: 0, height: 0, point: true },

  // PNJ de la Marge : rencontré AVANT le pouvoir (il explique quoi faire).
  {
    id: id(), name: 'pnj_marge', type: 'npc', x: 6 * TILE, y: 204, width: 12, height: 20,
    properties: [prop('dialogue', 'string', 'pnj_marge')],
  },

  // Mot-pouvoir ÉCRIRE, à ramasser en marchant (aucun tracé requis avant).
  // Juste après : ta première épreuve est un mot à raturer.
  {
    id: id(), name: 'mot_ecrire', type: 'word', x: 10 * TILE, y: 200, width: 16, height: 16,
    properties: [prop('ability', 'string', 'ecrire')],
  },

  // ── Premier geste concret : te libérer en raturant ta condition ─────────
  // « enfermé » : mot-cage solide barrant tout le couloir dès le départ. Le
  // raturer (clic droit) = ton premier « j'édite l'histoire, donc le monde
  // change ». Neutre (pas de penchant) : c'est l'apprentissage, pas le choix.
  {
    id: id(), name: 'mot_enferme', type: 'canon', x: 14 * TILE, y: 8 * TILE, width: 32, height: 6 * TILE,
    properties: [
      prop('mode', 'string', 'barrier'),
      prop('text', 'string', 'enfermé'),
      prop('flag', 'string', 'efface_enferme'),
    ],
  },

  // Encrier / point de sauvegarde, avant la zone du choix.
  { id: id(), name: 'encrier_marge', type: 'inkwell', x: 28 * TILE, y: 200, width: 16, height: 24 },

  // Fragment de lore secret, haut dans la page (récompense de tracé vertical).
  {
    id: id(), name: 'fragment_marge', type: 'fragment', x: 40 * TILE, y: 4 * TILE, width: 16, height: 16,
    properties: [prop('flag', 'string', 'fragment_marge')],
  },

  // ── Le choix final : deux façons de dévier la fin de la phrase ──────────
  // « ▢ » (route POINT FINAL) : blanc à combler d'encre, dans le trou de la
  // passerelle haute (x40-41, y9). Le remplir = t'écrire dans l'histoire.
  {
    id: id(), name: 'blanc_nom', type: 'canon', x: 40 * TILE, y: 9 * TILE, width: 32, height: 16,
    properties: [
      prop('mode', 'string', 'latent'),
      prop('text', 'string', 'toi'),
      prop('flag', 'string', 'nom_ecrit'),
      prop('leaning', 'int', 1),
      // Exclusivité mutuelle (retour de playtest 2026-07-26) : une fois
      // raturé "jamais", ce blanc ne peut plus être comblé.
      prop('exclusiveWith', 'string', 'rature_jamais'),
    ],
  },
  // « jamais » (route RATURE) : barrage-canon au sol, à raturer pour ouvrir la
  // voie basse. 2 tuiles de large, 6 de haut (x50-51, y8-13).
  {
    id: id(), name: 'mot_jamais', type: 'canon', x: 50 * TILE, y: 8 * TILE, width: 32, height: 6 * TILE,
    properties: [
      prop('mode', 'string', 'barrier'),
      prop('text', 'string', 'jamais'),
      prop('flag', 'string', 'rature_jamais'),
      prop('leaning', 'int', -1),
      // Exclusivité mutuelle (retour de playtest 2026-07-26) : une fois le
      // blanc ▢ comblé, ce mot ne peut plus être raturé.
      prop('exclusiveWith', 'string', 'nom_ecrit'),
    ],
  },

  // Porte vers le Chapitre Premier, à la toute fin du niveau (au-delà du
  // barrage « jamais » — le franchir, raturé ou contourné en s'y traçant des
  // plateformes d'encre, est le seul moyen physique d'arriver jusqu'ici).
  // Retour de playtest 2026-07-22 : les deux anciennes "sorties" (objets
  // `exit`) ressemblaient à des portes qui ne menaient nulle part —
  // supprimées. Cette porte est maintenant la seule, et c'est elle qui
  // termine le chapitre (`endsChapter`) juste avant de faire transiter vers
  // chapitre_01 : plus besoin de `requiresFlag`, l'atteindre EST la fin.
  {
    id: id(), name: 'porte_chapitre1', type: 'door', x: 60 * TILE, y: 192, width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'chapitre_01'),
      prop('targetX', 'int', 64),
      // targetY = 202 + OFFSET*16 (OFFSET=17, D16) : chapitre_01 a doublé de
      // hauteur pour l'arène verticale du mi-boss, tout son corridor
      // d'origine a été translaté vers le bas d'autant. Sans cette
      // translation on atterrit au-dessus du plafond du corridor, dans le
      // vide nouvellement ajouté (bug de spawn signalé en playtest 2026-07-26).
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
