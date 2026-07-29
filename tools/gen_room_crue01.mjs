/**
 * Générateur de la salle crue_01 (zone 4 « La Crue »).
 *
 * Idée de Lucas (2026-07-29) : un puits vertical où un liquide monte en
 * continu (`game/world/rising_hazard.ts`) et où le joueur doit grimper plus
 * vite qu'il ne monte, en se traçant lui-même ses plateformes d'encre (D10) —
 * la salle est volontairement un puits VIDE entre les deux plateformes fixes
 * (bas et mi-parcours) : tout le reste du parcours est laissé au tracé du
 * joueur, pas de géométrie de secours pré-posée. Même liquide, même vitesse
 * sur les deux chemins narratifs ; seule sa peau change (game/narrative/
 * hazard_flavor.ts) :
 *  - RATURE : le LIVRE déverse son encre pour ravaler le mot qui s'échappe.
 *  - POINT FINAL / indécis : le TEMPLE inonde son puits pour piéger le
 *    visiteur.
 * Aucun nouveau pouvoir enseigné ici (ANCRE a été retiré du jeu, D-round4) :
 * PLUME + BRÈCHE + HÂTE + AILES, déjà tous acquis avant d'arriver ici,
 * suffisent. Design initial (round précédent) : pas d'ennemi, la tension
 * venait uniquement de la course contre la montée. Retour de Lucas
 * 2026-07-29 : des tourelles fixes ajoutent une menace pendant la montée
 * (voir plus bas) — la tension vient désormais de la course ET du tir.
 *
 * Géométrie : sol d'entrée (rows 47-49) avec un encrier, puits ouvert,
 * plateforme de repos à mi-hauteur (rows 25-26, encrier — « reprendre son
 * souffle et de l'encre », demande explicite de Lucas) puis un second puits
 * ouvert jusqu'à la plateforme du haut (rows 6-7) où se trouve le
 * robinet/fermoir.
 *
 * Pas de porte de sortie (retour de Lucas 2026-07-29 : « il faudrait pas
 * mettre une porte en haut mais pouvoir continuer le niveau, comme si qu'on
 * arrivait au cœur du temple ») : la plateforme du haut n'est pas une
 * transition vers une autre salle, c'est la destination elle-même — le
 * robinet/fermoir EST le geste de clôture (arrête la montée pour de bon,
 * `game.ts` y déclenche aussi la fin du contenu actuellement construit,
 * zones 5-6 à venir). Ancienne `porte_suite` retirée.
 *
 * Murs latéraux décorés façon temple égyptien (hiéroglyphes, silhouettes de
 * profil, torches) sur le chemin POINT FINAL/indécis, façon marge de
 * manuscrit ancien (encre, plume, page cornée) sur RATURE — même reskin que
 * le liquide (`game/narrative/hazard_flavor.ts`, `color` réutilisé comme
 * indicateur de motif). Rendu générique dans `game.ts`
 * (`renderCrueWallDecor`), pas de données de salle nécessaires.
 *
 * Tourelles fixes (demande de Lucas 2026-07-29, « comme le boss au niveau 2 »)
 * sur les murs latéraux, en alternance, qui tirent des bulles vers le joueur
 * pendant la montée (`game/enemies/turret.ts`, même principe de projectile
 * visé-avec-anticipation que le mi-boss). Détruites par HÂTE (même rôle
 * "combat" que pour les ennemis communs, D-spec §6) ; pas de dégât de
 * contact (fixes, encastrées dans le mur, seul le tir est une menace).
 *
 * Bug corrigé (2026-07-29, capture d'écran de Lucas : joueur bloqué sous la
 * plateforme de l'encrier de mi-parcours) : les 2 plateformes de repos
 * étaient pleines sur TOUTE la largeur navigable du puits (colonnes 1 à
 * W-2) — un joueur en dessous ne pouvait donc JAMAIS atteindre leur surface,
 * quel que soit son habileté à l'encre : aucune ouverture nulle part, et les
 * murs latéraux occupent déjà les 2 colonnes restantes. Corrigé en rendant
 * une partie de chaque plateforme cassable au pouvoir BRÈCHE (déjà acquis
 * avant d'arriver ici) — suggestion de Lucas : « on pourrait rajouter des
 * murs breche à casser dans ce chemin vertical ». Le calque "ground" reste
 * plein (les 2 plateformes restent solides et fonctionnelles pour
 * l'encrier/la porte), seule une bande plus étroite (3 colonnes, sur un
 * côté différent pour chaque plateforme) est en plus enregistrée
 * `breche_wall` : une fois cassée, elle s'ouvre pour de bon (pas de calque
 * filigrane dans cette salle → la tuile révélée redevient simplement vide).
 *
 * Accès à la salle-trésor (2026-07-29, retour de Lucas sur une image du haut
 * du puits ; retravaillé 2 fois le même jour) : le mur du puits juste
 * au-dessus de la plateforme du robinet cache un point faible BRÈCHE. Le
 * casser ouvre sur une petite alcôve (extension du MÊME fichier de salle, à
 * droite du puits) contenant une porte vers `salle_tresor` — une salle
 * séparée (pas une extension du corridor cette fois : un premier essai en
 * corridor-jusqu'en-bas AU SEIN de `crue_01` faisait toucher au joueur le
 * niveau de l'eau montante alors même que cette eau n'existe pas dans ce
 * corridor, `isCaughtByHazard` ne testant que la coordonnée Y sans se
 * soucier du compartiment — plus simple et plus sûr de séparer complètement
 * en une salle à part, où l'aléa de `crue_01` n'a tout simplement aucune
 * prise). Voir `gen_room_salle_tresor.mjs` pour le trésor et l'effondrement
 * du plafond qui suit. `SHAFT_W` (largeur du puits proprement dit, inchangée)
 * doit rester synchronisée avec `CRUE01_SHAFT_WIDTH` dans `game.ts`
 * (`renderCrueWallDecor`/`renderHazard`, qui ont besoin du mur/de la largeur
 * DU PUITS, pas du fichier de salle entier désormais plus large).
 *
 * Même convention que gen_room_marge01.mjs/gen_room_chapitre01.mjs/
 * gen_room_ratures01.mjs (D7) : géométrie décrite par des rectangles nommés,
 * JSON compatible Tiled en sortie.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SHAFT_W = 14;
const H = 50;
const TILE = 16;
// Salle-trésor : extension à droite du puits, uniquement près du sommet
// (voir en-tête du fichier). `TOTAL_W` est la largeur réelle du fichier de
// salle ; `SHAFT_W` reste la largeur du puits pour toute la géométrie
// existante ci-dessous (inchangée).
const CHAMBER_W = 6;
const TOTAL_W = SHAFT_W + CHAMBER_W;

const grid = Array.from({ length: H }, () => Array.from({ length: TOTAL_W }, () => 0));
const solid = (x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
};
const clear = (x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 0;
};

// --- Décor solide (calque "ground") ---------------------------------------
solid(0, 0, SHAFT_W - 1, 0); // haut du puits
solid(0, 0, 0, H - 1); // paroi gauche
solid(SHAFT_W - 1, 0, SHAFT_W - 1, H - 1); // paroi droite du puits
solid(1, H - 3, SHAFT_W - 2, H - 1); // sol d'entrée

// Plateforme de repos à mi-hauteur : non tracée par le joueur (demande de
// Lucas), pleine largeur pour rester facile à rattraper après un puits
// ouvert — mais une partie (voir mur_breche_crue_mi plus bas) est cassable,
// sans quoi rien ne permettrait jamais d'atteindre sa surface par en dessous
// (bug corrigé 2026-07-29, voir en-tête du fichier).
solid(1, 25, SHAFT_W - 2, 26);

// Plateforme du haut, sous la porte de sortie et le robinet/fermoir — même
// remarque, une partie est cassable (mur_breche_crue_haut).
solid(1, 6, SHAFT_W - 2, 7);

// Bandes cassables des 2 plateformes (BRÈCHE, déjà acquis avant crue_01) :
// sur un côté différent pour chaque plateforme, pour varier. Le reste de
// chaque plateforme (colonnes hors de cette bande) reste un sol ordinaire,
// jamais cassable — l'encrier/la porte/le robinet gardent une assise stable.
const CRUE_BRECHE_MI_X0 = SHAFT_W - 4; // 10
const CRUE_BRECHE_HAUT_X0 = 2;

// --- Alcôve d'accès à la salle-trésor (petite, juste de quoi loger la porte)
// Bedrock plein par défaut sur toute l'extension (jamais atteignable
// autrement), puis l'alcôve est vidée dedans — seule une bande étroite du
// mur du puits (déjà solide sur toute sa hauteur ci-dessus) est en plus
// enregistrée `breche_wall`, pour ouvrir un passage précisément là.
solid(SHAFT_W, 0, TOTAL_W - 1, H - 1);
const TREASURE_DOOR_Y0 = 3;
const TREASURE_DOOR_Y1 = 5; // 3 rangées, à hauteur d'un joueur debout sur la plateforme du robinet
const ALCOVE_Y0 = 1;
const ALCOVE_Y1 = 7; // dernière rangée vide ; row 8 reste pleine (sol de l'alcôve, sous la porte)
clear(SHAFT_W, ALCOVE_Y0, TOTAL_W - 2, ALCOVE_Y1); // intérieur, colonne SHAFT_W = seuil
const ALCOVE_FLOOR_Y = (ALCOVE_Y1 + 1) * TILE; // 128

// --- Objets (calque "objects") --------------------------------------------
let nextId = 1;
const id = () => nextId++;
const prop = (name, type, value) => ({ name, type, value });

const FLOOR_SURFACE_Y = (H - 3) * TILE; // 752
const MID_SURFACE_Y = 25 * TILE; // 400
const TOP_SURFACE_Y = 6 * TILE; // 96

const objects = [
  { id: id(), name: 'spawn', type: 'spawn', x: 3 * TILE, y: FLOOR_SURFACE_Y - 22, width: 0, height: 0, point: true },

  // Encrier du bas : budget d'encre plein garanti au départ, quel que soit
  // l'état d'encre à l'arrivée depuis ratures_01.
  {
    id: id(), name: 'encrier_crue_bas', type: 'inkwell',
    x: 5 * TILE, y: FLOOR_SURFACE_Y - 24, width: 16, height: 24,
  },

  // Encrier de la plateforme de repos : « reprendre son souffle et de
  // l'encre » (demande explicite de Lucas) avant le second puits.
  {
    id: id(), name: 'encrier_crue_mi_parcours', type: 'inkwell',
    x: 6 * TILE, y: MID_SURFACE_Y - 24, width: 16, height: 24,
  },

  // Cœur (objet qui rend des PV, même type/mécanique que `potion_pv` de
  // chapitre_01) au niveau de ce checkpoint de mi-parcours (demande de
  // Lucas 2026-07-29, en remplacement d'un simple pictogramme décoratif
  // essayé plus tôt le même jour — celui-ci soigne réellement).
  {
    id: id(), name: 'coeur_crue_mi_parcours', type: 'potion',
    x: 9 * TILE, y: MID_SURFACE_Y - 20, width: 12, height: 12,
    properties: [prop('flag', 'string', 'coeur_crue01_pv')],
  },

  // Robinet/fermoir : point d'arrivée de la salle (retour de Lucas
  // 2026-07-29 : « comme si on arrivait au cœur du temple », pas de porte).
  // Arrête pour de bon la montée du liquide ET marque la fin du contenu
  // actuellement construit (CRUE01_VALVE_FLAG, game.ts). Une seule forme,
  // seul le texte affiché change selon le chemin narratif.
  { id: id(), name: 'valve_crue', type: 'valve', x: 9 * TILE, y: TOP_SURFACE_Y - 16, width: 16, height: 16 },

  // Bande cassable de la plateforme de repos (bug corrigé 2026-07-29, voir
  // en-tête du fichier) : sans elle, personne ne peut jamais atteindre sa
  // surface (et l'encrier dessus) depuis le dessous du puits.
  {
    id: id(), name: 'mur_breche_crue_mi', type: 'breche_wall',
    x: CRUE_BRECHE_MI_X0 * TILE, y: MID_SURFACE_Y, width: 3 * TILE, height: 2 * TILE,
    properties: [prop('flag', 'string', 'breche_crue_mi_ouverte')],
  },
  // Bande cassable de la plateforme du haut, côté opposé (varier) : sans
  // elle, le robinet en haut serait inatteignable.
  {
    id: id(), name: 'mur_breche_crue_haut', type: 'breche_wall',
    x: CRUE_BRECHE_HAUT_X0 * TILE, y: TOP_SURFACE_Y, width: 3 * TILE, height: 2 * TILE,
    properties: [prop('flag', 'string', 'breche_crue_haut_ouverte')],
  },

  // Tourelles fixes sur les murs latéraux (demande de Lucas 2026-07-29,
  // « comme le boss au niveau 2 ») : encastrées dans le mur, en alternance
  // de côté, réparties dans les deux moitiés du puits. Tirent une bulle
  // visée sur le joueur (`enemies/turret.ts`) ; détruites par HÂTE (même
  // rôle "combat" que les ennemis communs). x proche des parois (col0/col
  // SHAFT_W-1) pour lire comme montées sur le mur, pas flottantes dans le puits.
  { id: id(), name: 'tourelle_bas_gauche', type: 'turret', x: 6, y: 42 * TILE, width: 12, height: 12 },
  { id: id(), name: 'tourelle_bas_droite', type: 'turret', x: SHAFT_W * TILE - 18, y: 33 * TILE, width: 12, height: 12 },
  { id: id(), name: 'tourelle_haut_droite', type: 'turret', x: SHAFT_W * TILE - 18, y: 20 * TILE, width: 12, height: 12 },
  { id: id(), name: 'tourelle_haut_gauche', type: 'turret', x: 6, y: 12 * TILE, width: 12, height: 12 },

  // Mur BRÈCHE ouvrant sur l'alcôve (voir bloc de géométrie ci-dessus), et
  // la porte vers `salle_tresor` au fond de cette alcôve.
  {
    id: id(), name: 'mur_breche_crue_tresor', type: 'breche_wall',
    x: (SHAFT_W - 1) * TILE, y: TREASURE_DOOR_Y0 * TILE,
    width: TILE, height: (TREASURE_DOOR_Y1 - TREASURE_DOOR_Y0 + 1) * TILE,
    properties: [prop('flag', 'string', 'breche_crue_tresor_ouverte')],
  },
  {
    id: id(), name: 'porte_salle_tresor', type: 'door',
    x: (SHAFT_W + 2) * TILE, y: ALCOVE_FLOOR_Y - 32, width: 16, height: 32,
    properties: [
      prop('targetRoom', 'string', 'salle_tresor'),
      prop('targetX', 'int', 3 * TILE),
      prop('targetY', 'int', 128 - 22),
    ],
  },
];

// --- Assemblage au format Tiled -------------------------------------------
const map = {
  compressionlevel: -1,
  width: TOTAL_W,
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
      x: 0, y: 0, width: TOTAL_W, height: H, data: grid.flat(),
    },
    {
      id: 2, name: 'objects', type: 'objectgroup', visible: true, opacity: 1,
      x: 0, y: 0, draworder: 'topdown', objects,
    },
  ],
};

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'src', 'data', 'rooms', 'crue_01.json');
writeFileSync(out, JSON.stringify(map));
console.log(`crue_01.json écrit (${TOTAL_W}×${H}, ${objects.length} objets) → ${out}`);
