/**
 * Générateur de la salle ratures_01 (zone 3 « Les Ratures »).
 *
 * Porte 3 PNJ narratifs, tous adaptatifs selon le choix déjà fait dans La
 * Marge (`rature_jamais`/`nom_ecrit`) via `startVariants`
 * (narrative/dialogue.ts) : La Rature qui regrette
 * (`data/dialogues/pnj_ratures.json`, à l'entrée de la chambre des mots,
 * explique le mécanisme) + 2 PNJ-indice (retour de Lucas 2026-07-29,
 * retravaillés une 3e fois le 2026-07-29 suivant), disposés à des endroits
 * différents plus tôt dans le niveau — sur des plateformes en hauteur
 * INACCESSIBLES sans se tracer ses propres plateformes d'encre (retour de
 * Lucas : « il faudrait que le personnage soit obligé de construire des
 * plateformes pour atteindre certains pnj » — l'ancien petit escalier de 2
 * marches, à portée d'un simple saut tenu, ne l'exigeait pas vraiment, il
 * est retiré). Chacun donne un indice sur une moitié du CODE du temple
 * (le sujet « ciel », l'attribut « rouge » — remplace « personnage »/« bleu »,
 * retour de Lucas le même jour) sur POINT FINAL/indécis, sans le nommer,
 * remplace l'ancien essai-erreur libre des 12 combinaisons. Sur RATURE, ces
 * 2 PNJ n'apparaissent plus du tout (`hiddenIfFlag`, nouvelle propriété Tiled
 * générique) : « un seul pnj dans cette version » (Lucas) — leurs indices ne
 * servent à rien une fois la porte déjà ouverte, autant ne pas les proposer.
 *
 * Traversée : mot-pouvoir AILES juste avant un petit gouffre (x=18-21,
 * portée du dash HÂTE insuffisante). Pas d'ennemi dans cette salle (retour
 * de Lucas 2026-07-29 — les 2 ennemis communs qui patrouillaient ici après
 * le gouffre sont retirés).
 *
 * La chambre des mots (« Le/La ___ devint ___. », narrative/world_transform.ts)
 * qui suit a été retravaillée après un premier essai (retour de Lucas,
 * 2026-07-27) :
 *  - Les 3 fragments à collecter + la porte-palier qu'ils débloquaient
 *    (`ratures_phrase_composee`) sont retirés : la chambre des mots elle-même
 *    est le contenu de cette zone, doubler avec une collecte de fragments
 *    faisait doublon. La Rature qui regrette est repositionnée à l'entrée de
 *    la chambre plutôt qu'avant les fragments ; son dialogue explique
 *    désormais le mécanisme de la porte au lieu de parler des personnages
 *    coupés (réutilise toute la machinerie déjà construite — machine à
 *    états, adaptation au chemin — plutôt que de la jeter).
 *  - La porte unique de cette zone (`porte_temple`, ex-`porte_fin_ratures01`)
 *    a désormais une règle asymétrique selon le chemin narratif : sur RATURE
 *    elle est déjà ouverte (le pouvoir de réécrire suffit, pas besoin de
 *    preuve) ; sur POINT FINAL/indécis il faut composer la bonne phrase aux
 *    consoles pour l'ouvrir (`requiresFlagUnless`, nouvelle propriété Tiled
 *    générique lue par `checkDoors`/`isDoorLocked` dans game.ts — bypasse
 *    `requiresFlag` si ce second flag est vrai).
 *
 * Même convention que gen_room_marge01.mjs/gen_room_chapitre01.mjs (D7) :
 * géométrie décrite par des rectangles nommés, JSON compatible Tiled en sortie.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 82;
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

// Petit gouffre AILES (x=18-21) : le mot-pouvoir est ajouté juste avant
// (x=10), ce qui le rend franchissable.
clear(18, 14, 21, 16);

// Plateformes des 2 PNJ-indice, après le gouffre (retravaillé le 2026-07-29,
// même jour : plus d'escalier intermédiaire — retour de Lucas, atteindre ces
// PNJ doit exiger de se tracer ses propres plateformes d'encre, pas un simple
// saut/saut tenu). Hauteur au-dessus du sol (row14*16=224) : row5→144px et
// row3→176px, toutes deux nettement au-delà du maximum vertical atteignable
// sans encre (saut ~57px + AILES ~47px ≈ 105px) — impossible d'y monter sans
// peindre au moins un palier intermédiaire. Hauteurs différentes entre les
// deux pour varier (retour initial de Lucas, 2026-07-29 matin).
solid(29, 5, 32, 7); // PNJ-indice « ciel »
solid(37, 3, 40, 5); // PNJ-indice « rouge »

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

  // Mot-pouvoir AILES — juste avant le gouffre qu'il permet de franchir.
  {
    id: id(), name: 'mot_ales', type: 'word', x: 10 * TILE, y: 200, width: 16, height: 16,
    properties: [prop('ability', 'string', 'ales')],
  },

  // Pas d'ennemis dans ce niveau (retour de Lucas 2026-07-29) : les 2
  // ennemis communs (Coquille, Rature) qui patrouillaient ici après le
  // gouffre sont retirés.

  // Deux PNJ-indice, sur les plateformes en hauteur ci-dessus (retour de
  // Lucas 2026-07-29, retravaillé une 3e fois le même jour) : sur POINT
  // FINAL/indécis, le libre recoloriage ne suffit plus à ouvrir la porte du
  // temple, il faut le CODE exact — obtenu en interrogeant plusieurs PNJ,
  // chacun perché sur une plateforme atteignable seulement en s'y traçant de
  // l'encre, plutôt qu'en essayant les 12 combinaisons au hasard. Le code
  // lui-même est passé de « soleil devient jaune » → « personnage devient
  // bleu » → « ciel devient rouge » (data/chapters/ratures_01.json,
  // isTempleCode, dernier changement du 2026-07-29 : Lucas juge « soleil
  // jaune » et par extension un fait de la nature trop devinable). Chacun
  // donne un indice sur une moitié du code (sujet/attribut) sans le nommer
  // explicitement ; sur RATURE, la porte est déjà ouverte ET ces 2 PNJ ne
  // sont même plus présents (`hiddenIfFlag`, un seul PNJ sur cette voie,
  // demande explicite de Lucas). [proposition narration]
  {
    id: id(), name: 'pnj_indice_ciel', type: 'npc', x: 30 * TILE, y: 60, width: 12, height: 20,
    properties: [
      prop('dialogue', 'string', 'pnj_ratures_indice_ciel'),
      prop('hiddenIfFlag', 'string', 'rature_jamais'),
    ],
  },
  {
    id: id(), name: 'pnj_indice_rouge', type: 'npc', x: 38 * TILE, y: 28, width: 12, height: 20,
    properties: [
      prop('dialogue', 'string', 'pnj_ratures_indice_rouge'),
      prop('hiddenIfFlag', 'string', 'rature_jamais'),
    ],
  },

  // La Rature qui regrette : à l'entrée de la chambre des mots — son
  // dialogue explique désormais la porte plutôt que de parler des
  // personnages coupés.
  {
    id: id(), name: 'pnj_ratures', type: 'npc', x: 44 * TILE, y: 204, width: 12, height: 20,
    properties: [prop('dialogue', 'string', 'pnj_ratures')],
  },

  // --- Chambre des mots : "Le/La ___ devint ___." --------------------------
  // Couleurs/attributs, puis les 2 consoles, puis les sujets/noms — ordre
  // décrit par Lucas. Une seule combinaison ouvre la porte du temple sur
  // POINT FINAL/indécis, désormais présentée comme LE CODE (retour de Lucas
  // 2026-07-29) plutôt qu'un recoloriage libre à essayer — « personnage
  // devient bleu » (isTempleCode, data/chapters/ratures_01.json +
  // narrative/world_transform.ts), moins évident que l'ancien « soleil
  // devient jaune » ; les autres mots restent manipulables (les
  // pédestaux/consoles ne disparaissent pas selon la voie) mais ne sont pas
  // le code — cohérents avec le thème du brouillon inachevé. `page`
  // (féminin) est là pour que l'accord Le/La se voie.
  {
    id: id(), name: 'mot_jaune', type: 'transform_word', x: 48 * TILE, y: 200, width: 16, height: 16,
    properties: [prop('role', 'string', 'attribute'), prop('wordId', 'string', 'jaune'), prop('label', 'string', 'jaune')],
  },
  {
    id: id(), name: 'mot_rouge', type: 'transform_word', x: 51 * TILE, y: 200, width: 16, height: 16,
    properties: [prop('role', 'string', 'attribute'), prop('wordId', 'string', 'rouge'), prop('label', 'string', 'rouge')],
  },
  {
    id: id(), name: 'mot_bleu', type: 'transform_word', x: 54 * TILE, y: 200, width: 16, height: 16,
    properties: [prop('role', 'string', 'attribute'), prop('wordId', 'string', 'bleu'), prop('label', 'string', 'bleu')],
  },

  // Console de validation : dépose le mot porté dans le slot correspondant
  // à son rôle ; si les 2 slots se remplissent, résolution immédiate
  // (game.ts, handleInteract).
  {
    id: id(), name: 'console_valider', type: 'console', x: 58 * TILE, y: 200, width: 16, height: 24,
    properties: [prop('role', 'string', 'validate')],
  },
  // Console d'annulation : vide les 2 slots, clairement distincte et à
  // distance de la console de validation pour ne pas les confondre.
  {
    id: id(), name: 'console_annuler', type: 'console', x: 62 * TILE, y: 200, width: 16, height: 24,
    properties: [prop('role', 'string', 'cancel')],
  },

  {
    id: id(), name: 'mot_soleil', type: 'transform_word', x: 66 * TILE, y: 200, width: 16, height: 16,
    properties: [
      prop('role', 'string', 'subject'), prop('wordId', 'string', 'soleil'),
      prop('label', 'string', 'SOLEIL'), prop('gender', 'string', 'm'),
    ],
  },
  {
    id: id(), name: 'mot_personnage', type: 'transform_word', x: 69 * TILE, y: 200, width: 16, height: 16,
    properties: [
      prop('role', 'string', 'subject'), prop('wordId', 'string', 'personnage'),
      prop('label', 'string', 'PERSONNAGE'), prop('gender', 'string', 'm'),
    ],
  },
  {
    id: id(), name: 'mot_ciel', type: 'transform_word', x: 72 * TILE, y: 200, width: 16, height: 16,
    properties: [
      prop('role', 'string', 'subject'), prop('wordId', 'string', 'ciel'),
      prop('label', 'string', 'CIEL'), prop('gender', 'string', 'm'),
    ],
  },
  {
    id: id(), name: 'mot_page', type: 'transform_word', x: 75 * TILE, y: 200, width: 16, height: 16,
    properties: [
      prop('role', 'string', 'subject'), prop('wordId', 'string', 'page'),
      prop('label', 'string', 'PAGE'), prop('gender', 'string', 'f'),
    ],
  },

  // Porte du temple, seule porte de progression de cette zone : sur RATURE
  // déjà ouverte (requiresFlagUnless) ; sur POINT FINAL/indécis il faut avoir
  // composé la bonne phrase (requiresFlag). Mène désormais à la zone 4
  // (crue_01, le puits au liquide montant) — ne boucle plus sur elle-même
  // (2026-07-29, la zone 4 existe). requiresFlag pointe vers
  // temple_code_trouve (flag permanent posé en plus de monde_soleil_jaune,
  // game.ts) et non monde_soleil_jaune lui-même depuis le 2026-07-28 : ce
  // dernier peut désormais être effacé si le joueur recolorie le soleil
  // autrement après coup, ce qui reverrouillerait la porte à tort si elle en
  // dépendait directement. Le toast de fin de contenu actuel se déclenche
  // désormais à la sortie de crue_01 (plus ici, la zone 4 existe).
  {
    id: id(), name: 'porte_temple', type: 'door', x: 79 * TILE, y: 192, width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'crue_01'),
      prop('targetX', 'int', 3 * TILE),
      prop('targetY', 'int', 730),
      prop('requiresFlag', 'string', 'temple_code_trouve'),
      prop('requiresFlagUnless', 'string', 'rature_jamais'),
      prop('lockedMessage', 'string', 'La porte du temple ne s\'ouvre pas : il manque encore la bonne phrase.'), // [proposition]
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
