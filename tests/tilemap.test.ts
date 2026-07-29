import { describe, expect, it } from 'vitest';
import { filigraneGidAt, gidAt, mergeSolidTiles, parseTiledMap } from '../src/engine/tilemap';
import { Room } from '../src/game/world/room';
import { objectTiles } from '../src/game/narrative/deviation';
import marge01 from '../src/data/rooms/marge_01.json';
import chapitre01 from '../src/data/rooms/chapitre_01.json';
import ratures01 from '../src/data/rooms/ratures_01.json';
import crue01 from '../src/data/rooms/crue_01.json';
import salleTresor from '../src/data/rooms/salle_tresor.json';

function minimalMap(): Record<string, unknown> {
  return {
    width: 2,
    height: 2,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { type: 'tilelayer', name: 'ground', data: [1, 0, 0, 1] },
      {
        type: 'objectgroup',
        name: 'objects',
        objects: [
          {
            id: 1,
            name: 'porte',
            type: 'exit',
            x: 16,
            y: 0,
            width: 16,
            height: 32,
            properties: [{ name: 'destination', type: 'string', value: 'salle_2' }],
          },
        ],
      },
    ],
  };
}

describe('parseTiledMap', () => {
  it('parse un export Tiled minimal', () => {
    const map = parseTiledMap(minimalMap());
    expect(map.widthTiles).toBe(2);
    expect(map.ground).toEqual([1, 0, 0, 1]);
    expect(map.objects).toHaveLength(1);
    expect(map.objects[0]?.type).toBe('exit');
    expect(map.objects[0]?.properties['destination']).toBe('salle_2');
  });

  it('accepte le champ "class" de Tiled 1.9+ à la place de "type"', () => {
    const raw = minimalMap();
    const layers = raw['layers'] as Record<string, unknown>[];
    const objLayer = layers[1] as { objects: Record<string, unknown>[] };
    const obj = objLayer.objects[0] as Record<string, unknown>;
    delete obj['type'];
    obj['class'] = 'exit';
    const map = parseTiledMap(raw);
    expect(map.objects[0]?.type).toBe('exit');
  });

  it('rejette une carte sans calque ground', () => {
    const raw = minimalMap();
    raw['layers'] = [];
    expect(() => parseTiledMap(raw)).toThrow(/ground/);
  });

  it('rejette un calque ground de mauvaise taille', () => {
    const raw = minimalMap();
    (raw['layers'] as Record<string, unknown>[])[0] = {
      type: 'tilelayer',
      name: 'ground',
      data: [1, 0],
    };
    expect(() => parseTiledMap(raw)).toThrow();
  });

  it('gidAt retourne 0 hors limites', () => {
    const map = parseTiledMap(minimalMap());
    expect(gidAt(map, -1, 0)).toBe(0);
    expect(gidAt(map, 0, 5)).toBe(0);
    expect(gidAt(map, 0, 0)).toBe(1);
    expect(gidAt(map, 1, 0)).toBe(0);
  });

  it('filigrane est null quand la salle n\'a pas ce calque', () => {
    const map = parseTiledMap(minimalMap());
    expect(map.filigrane).toBeNull();
    expect(filigraneGidAt(map, 0, 0)).toBe(0);
  });

  it('parse un second calque "filigrane" quand présent', () => {
    const raw = minimalMap();
    (raw['layers'] as unknown[]).push({ type: 'tilelayer', name: 'filigrane', data: [0, 2, 2, 0] });
    const map = parseTiledMap(raw);
    expect(map.filigrane).toEqual([0, 2, 2, 0]);
    expect(filigraneGidAt(map, 1, 0)).toBe(2);
    expect(filigraneGidAt(map, 0, 0)).toBe(0);
    expect(filigraneGidAt(map, -1, 0)).toBe(0);
  });
});

describe('mergeSolidTiles — fusion des tuiles en dalles', () => {
  it('fusionne un bloc plein en un seul rectangle', () => {
    const rects = mergeSolidTiles(3, 2, () => true);
    expect(rects).toEqual([{ x: 0, y: 0, w: 3, h: 2 }]);
  });

  it('empile les séquences identiques et sépare les différentes (forme en L)', () => {
    // ##.
    // ##.
    // ###
    const grid = [
      [1, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
    ];
    const rects = mergeSolidTiles(3, 3, (x, y) => grid[y]?.[x] === 1);
    expect(rects).toEqual([
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 0, y: 2, w: 3, h: 1 },
    ]);
  });

  it('sépare les séquences non contiguës d\'une même ligne', () => {
    // #.#
    const rects = mergeSolidTiles(3, 1, (x) => x !== 1);
    expect(rects).toEqual([
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 2, y: 0, w: 1, h: 1 },
    ]);
  });

  it('retourne vide pour une grille vide', () => {
    expect(mergeSolidTiles(4, 4, () => false)).toEqual([]);
  });

  it('couvre exactement les tuiles solides de la salle réelle (ni trou ni excès)', () => {
    const map = parseTiledMap(marge01);
    const rects = mergeSolidTiles(map.widthTiles, map.heightTiles, (x, y) => gidAt(map, x, y) > 0);
    const covered = new Set<string>();
    for (const r of rects) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const key = `${String(x)},${String(y)}`;
          expect(covered.has(key), `chevauchement en ${key}`).toBe(false);
          covered.add(key);
        }
      }
    }
    for (let y = 0; y < map.heightTiles; y++) {
      for (let x = 0; x < map.widthTiles; x++) {
        expect(covered.has(`${String(x)},${String(y)}`)).toBe(gidAt(map, x, y) > 0);
      }
    }
  });
});

describe('salle marge_01 — chapitre 1 « La Marge » (données réelles, refonte 2026-07-28)', () => {
  const map = parseTiledMap(marge01);

  it('a les dimensions attendues et un contour fermé', () => {
    expect(map.widthTiles).toBe(66);
    expect(map.heightTiles).toBe(17);
    // Bord haut + marges gauche/droite pleines.
    for (let tx = 0; tx < 66; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < 17; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, 65, ty)).toBeGreaterThan(0);
    }
  });

  it('le parcours d\'intro (sans pouvoir) a un trou à sauter, sans chute mortelle ailleurs', () => {
    // Sol plein avant et après le trou (x8-9).
    for (const tx of [1, 7, 10, 20, 40, 64]) {
      expect(gidAt(map, tx, 14)).toBeGreaterThan(0);
      expect(gidAt(map, tx, 16)).toBeGreaterThan(0);
    }
    expect(gidAt(map, 8, 14)).toBe(0);
    expect(gidAt(map, 9, 14)).toBe(0);
  });

  it('un muret (2 tuiles de haut) force un saut avant le PNJ/la plume', () => {
    // Bosse posée SUR le sol déjà continu à cet endroit (x14-15).
    expect(gidAt(map, 14, 12)).toBeGreaterThan(0);
    expect(gidAt(map, 15, 12)).toBeGreaterThan(0);
    expect(gidAt(map, 14, 14)).toBeGreaterThan(0); // le sol sous le muret reste solide
  });

  it('contient les objets requis, dont le mot-loi et son blanc', () => {
    const types = new Set(map.objects.map((o) => o.type));
    for (const required of ['spawn', 'npc', 'word', 'fragment', 'inkwell', 'door', 'canon']) {
      expect(types.has(required), `objet manquant : ${required}`).toBe(true);
    }
    expect(types.has('unwritten')).toBe(false);
    expect(types.has('exit')).toBe(false); // une seule porte, voir plus bas

    // Un seul mot-loi désormais (« enfant ») + son blanc (« . ») : plus de
    // mot-cage neutre séparé (le PNJ explique tout avant que le joueur agisse).
    const canon = map.objects.filter((o) => o.type === 'canon');
    expect(canon).toHaveLength(2);
    const modes = canon.map((o) => o.properties['mode']);
    expect(new Set(modes)).toEqual(new Set(['barrier', 'latent']));
  });

  it('le PNJ est rencontré en premier derrière le muret, la plume juste après', () => {
    const word = map.objects.find((o) => o.type === 'word');
    const npc = map.objects.find((o) => o.type === 'npc');
    expect(word?.properties['ability']).toBe('ecrire');
    expect(npc?.properties['dialogue']).toBe('pnj_marge');
    // Tous deux au-delà du muret (colonnes 14-15).
    expect(word?.x).toBeGreaterThan(15 * 16);
    expect(npc?.x).toBeGreaterThan(15 * 16);
    // Le PNJ avant la plume, dans cet ordre.
    expect(npc?.x).toBeLessThan(word?.x ?? 0);
    // Proches l'un de l'autre, pas à des bouts opposés du niveau.
    expect(Math.abs((word?.x ?? 0) - (npc?.x ?? 0))).toBeLessThanOrEqual(4 * 16);
  });

  it('« enfant » : mot-loi à raturer, penche vers RATURE', () => {
    const enfant = map.objects.find((o) => o.properties['text'] === 'enfant');
    expect(enfant?.properties['mode']).toBe('barrier');
    expect(enfant?.properties['flag']).toBe('rature_jamais');
    expect(enfant?.properties['leaning']).toBe(-1);
    expect(enfant?.properties['exclusiveWith']).toBe('nom_ecrit');
    // Ground vide là où le mot-loi se dresse (objet "canon", pas du décor fixe).
    const tiles = objectTiles({
      x: enfant?.x ?? 0,
      y: enfant?.y ?? 0,
      width: enfant?.width ?? 0,
      height: enfant?.height ?? 0,
    });
    for (const tile of tiles) expect(gidAt(map, tile.x, tile.y)).toBe(0);
  });

  it('la passerelle POINT FINAL a un trou de 2 tuiles : le blanc « . » à combler', () => {
    expect(gidAt(map, 37, 9)).toBeGreaterThan(0);
    expect(gidAt(map, 38, 9)).toBe(0); // blanc
    expect(gidAt(map, 39, 9)).toBe(0); // blanc
    expect(gidAt(map, 40, 9)).toBeGreaterThan(0);

    const blanc = map.objects.find((o) => o.properties['mode'] === 'latent');
    expect(blanc?.properties['text']).toBe('.');
    expect(blanc?.properties['flag']).toBe('nom_ecrit');
    expect(blanc?.properties['leaning']).toBe(1);
    expect(blanc?.properties['exclusiveWith']).toBe('rature_jamais');
  });

  it('porte vers chapitre_01, seule et à la toute fin du niveau, termine le chapitre', () => {
    const door = map.objects.find((o) => o.type === 'door');
    expect(door).toBeDefined();
    expect(door?.properties['targetRoom']).toBe('chapitre_01');
    // Au-delà du mot-loi « enfant » : l'atteindre est le seul moyen physique
    // de finir le niveau, quelle que soit la route choisie.
    const enfant = map.objects.find((o) => o.properties['text'] === 'enfant');
    expect(door?.x).toBeGreaterThan((enfant?.x ?? 0) + (enfant?.width ?? 0));
    expect(door?.properties['endsChapter']).toBe('chapitre1');
  });

  it('la cible de la porte vers chapitre_01 atterrit dans son corridor, pas au-dessus (D16, bug de spawn 2026-07-26)', () => {
    const door = map.objects.find((o) => o.type === 'door');
    // chapitre_01 a translaté tout son corridor de OFFSET=17 rangées (272px)
    // vers le bas ; une cible non traduite atterrissait au-dessus du plafond
    // du corridor, dans le vide nouvellement ajouté.
    expect(door?.properties['targetY']).toBeGreaterThan(17 * 16);
  });
});

describe('salle chapitre_01 — blockout mécanique Phase 2 (D13, données réelles)', () => {
  const map = parseTiledMap(chapitre01);

  it('a un contour fermé et un calque "filigrane" (contrairement à marge_01)', () => {
    for (let tx = 0; tx < map.widthTiles; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < map.heightTiles; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, map.widthTiles - 1, ty)).toBeGreaterThan(0);
    }
    expect(map.filigrane).not.toBeNull();
  });

  it('la salle est genuinement plus haute qu\'une vue d\'écran (D16, défilement vertical de la caméra)', () => {
    // Vue interne 480×270 = 16.875 tuiles de haut (config.ts) ; la salle
    // double cette hauteur pour l'arène verticale du mi-boss.
    expect(map.heightTiles).toBeGreaterThan(20);
  });

  it('le mur du premier obstacle bloque le sol mais laisse de la place pour passer par-dessus', () => {
    // Colonne 14 (voir tools/gen_room_chapitre01.mjs) : pas de mot-pouvoir associé
    // depuis le retrait d'ANCRE — se franchit en traçant des plateformes d'encre.
    // OFFSET (17 rangées, D16) translate tout le corridor d'origine vers le bas.
    const col = 14;
    const OFFSET = 17;
    // Solide du sol jusqu'à une bonne hauteur...
    for (let ty = 6 + OFFSET; ty <= 16 + OFFSET; ty++) expect(gidAt(map, col, ty)).toBeGreaterThan(0);
    // ...mais pas jusqu'au plafond du corridor : on peut s'y tracer un escalier et passer par-dessus.
    expect(gidAt(map, col, 1 + OFFSET)).toBe(0);
    expect(gidAt(map, col, 2 + OFFSET)).toBe(0);
  });

  it('le mur BRÈCHE est plein du sol au plafond dans le calque ground (aucun passage par-dessus)', () => {
    const wall = map.objects.find((o) => o.name === 'mur_breche');
    expect(wall).toBeDefined();
    const col = Math.floor((wall?.x ?? 0) / 16);
    for (let ty = 0; ty < map.heightTiles; ty++) expect(gidAt(map, col, ty)).toBeGreaterThan(0);
    expect(wall?.properties['flag']).toBeTypeOf('string');
  });

  it('le mur BRÈCHE est entièrement cassable, sol au plafond mais SANS englober le sol (mur simple, D16-bis : retour de playtest 2026-07-26, pas de grimpe obligatoire pour lui)', () => {
    const wall = map.objects.find((o) => o.name === 'mur_breche');
    expect(wall).toBeDefined();
    // L'objet BRÈCHE enregistré couvre toute la hauteur du COULOIR (pas
    // seulement une bande) : premier mur BRÈCHE du jeu, cassable depuis le
    // sol comme avant le rehaussement de la salle. Il s'arrête PILE au-dessus
    // du sol (3 dernières rangées, "sol continu") : bug corrigé le
    // 2026-07-26 (retour de Lucas) — un mur qui engloberait aussi le sol
    // ouvrirait un trou dedans une fois cassé, où une Rature en poursuite
    // (elle ignore ses bornes de patrouille en chasse) pouvait tomber et
    // rester bloquée. Le sol doit rester solide quel que soit l'état du mur.
    const floorStartRow = map.heightTiles - 3;
    expect(wall?.y).toBe(0);
    expect(wall?.height).toBe(floorStartRow * 16);
    // Pas de crackY/crackHeight : la fissure (rendu, game.ts `crackRectOf`)
    // couvre donc tout le mur par défaut.
    expect(wall?.properties['crackY']).toBeUndefined();
  });

  it('2 murs BRÈCHE "points faibles" de l\'arène, retravaillés le 2026-07-29 : le premier (vertical) n\'est cassable qu\'au-dessus d\'une hauteur commune, le second est horizontal et posé pile à cette hauteur', () => {
    const wall1 = map.objects.find((o) => o.name === 'mur_breche_gauntlet_1');
    const wall2 = map.objects.find((o) => o.name === 'mur_breche_gauntlet_2');
    expect(wall1).toBeDefined();
    expect(wall2).toBeDefined();
    const floorStartRow = map.heightTiles - 3;

    // Mur 1 : colonne entière solide dans "ground" (base + partie haute)...
    const col1 = Math.floor((wall1?.x ?? 0) / 16);
    for (let ty = 0; ty < map.heightTiles; ty++) expect(gidAt(map, col1, ty)).toBeGreaterThan(0);
    // ...mais l'objet BRÈCHE (donc la partie réellement cassable) s'arrête
    // bien avant le sol : sa base reste un mur ordinaire, jamais cassable
    // (contrairement à l'ancienne version, tout le mur était cassable).
    expect(wall1?.y).toBe(0);
    expect(wall1?.height).toBeLessThan(floorStartRow * 16);
    expect(typeof wall1?.properties['flag']).toBe('string');
    // Plus besoin de crackY/crackHeight : l'objet est déjà restreint à la
    // bonne hauteur, la fissure couvre son étendue par défaut.
    expect(wall1?.properties['crackY']).toBeUndefined();

    // Mur 2 : horizontal (plus large que haut), posé pile à la hauteur où
    // le mur 1 devient cassable — les deux points faibles se rejoignent.
    expect(wall2?.width ?? 0).toBeGreaterThan(wall2?.height ?? 0);
    expect(wall2?.y).toBe(wall1?.height);
    expect(typeof wall2?.properties['flag']).toBe('string');
    expect(wall2?.properties['crackY']).toBeUndefined();

    // Retravaillé une 2e fois le même jour (retour de Lucas) : le plafond
    // doit bloquer TOUTE la longueur du corridor à cette hauteur, mais seule
    // une partie fragile, plus loin (pas juste après le mur 1), est
    // réellement cassable.
    const wall2Row = (wall2?.y ?? 0) / 16;
    const wall2ColStart = Math.floor((wall2?.x ?? 0) / 16);
    const wall2Width = (wall2?.width ?? 0) / 16;
    // Le plafond solide (calque "ground") s'étend bien avant la partie
    // fragile, vers le mur 1 : le joueur ne peut pas grimper n'importe où
    // le long du plafond pour trouver un passage, seule la partie fragile
    // (une fois cassée) en ouvre un.
    for (let tx = col1 + 1; tx < wall2ColStart; tx++) {
      expect(gidAt(map, tx, wall2Row)).toBeGreaterThan(0);
    }
    // Cette portion solide-mais-jamais-cassable (entre le mur 1 et la
    // partie fragile) est nettement plus longue que la partie fragile
    // elle-même : le point faible est loin du mur 1, pas juste après.
    expect(wall2ColStart - col1).toBeGreaterThan(wall2Width * 2);
  });

  it('le plafond horizontal (mur 2) s\'étend sur (presque) toute la longueur restante du corridor, jusqu\'au bord de la salle (retour de Lucas 2026-07-29, 3e passe : "c\'est lui qui devrait être sur toute la longueur, pas la hauteur")', () => {
    const wall2 = map.objects.find((o) => o.name === 'mur_breche_gauntlet_2');
    const wall2ColEnd = Math.floor((wall2?.x ?? 0) / 16) + Math.floor((wall2?.width ?? 0) / 16) - 1;
    // Le plafond (calque "ground", pas seulement l'objet BRÈCHE) va bien
    // jusqu'au bord jouable de la salle (W-2), pas juste jusqu'à l'ancienne
    // limite (x=67) — c'est la LONGUEUR qui a changé, pas une nouvelle
    // contrainte de hauteur (un plafond en hauteur ajouté puis retiré la
    // passe précédente bloquait à tort le passage normal par en dessous).
    expect(wall2ColEnd).toBe(map.widthTiles - 2);
  });

  it('casser n\'importe quel mur BRÈCHE ne perce jamais le sol (régression : une Rature en poursuite tombait dans le trou et restait bloquée)', () => {
    const walls = map.objects.filter((o) => o.type === 'breche_wall');
    expect(walls.length).toBeGreaterThan(0);
    const room = new Room('chapitre_01', map);
    for (const wall of walls) room.registerBrecheWall(wall.id, objectTiles(wall));
    for (const wall of walls) {
      room.revealFiligrane(wall.id);
      const col = Math.floor(wall.x / 16);
      // Les 3 rangées du sol restent solides à la colonne du mur, même une
      // fois ce mur (et tous les précédents) révélé·s.
      for (let ty = map.heightTiles - 3; ty < map.heightTiles; ty++) {
        expect(room.isSolid(col, ty)).toBe(true);
      }
    }
  });

  it('contient les ennemis communs et le mi-boss, aucun PNJ ni phrase-loi', () => {
    const kinds = map.objects.filter((o) => o.type === 'enemy').map((o) => o.properties['kind']);
    expect(new Set(kinds)).toEqual(new Set(['coquille', 'rature']));
    expect(map.objects.some((o) => o.type === 'boss')).toBe(true);
    expect(map.objects.some((o) => o.type === 'npc')).toBe(false);
    expect(map.objects.some((o) => o.type === 'canon')).toBe(false);
  });

  it('offre un seul encrier avant l\'arène du mi-boss, juste avant le puits d\'escalade (retour de Lucas 2026-07-29 : il y en avait deux, n\'en garder qu\'un, celui à côté du pouvoir BRÈCHE)', () => {
    const inkwells = map.objects.filter((o) => o.type === 'inkwell');
    const boss = map.objects.find((o) => o.type === 'boss');
    const brecheWord = map.objects.find((o) => o.type === 'word' && o.properties['ability'] === 'breche');
    expect(inkwells).toHaveLength(1);
    expect(inkwells[0]?.x).toBeLessThan(boss?.x ?? 0);
    expect(Math.abs((inkwells[0]?.x ?? 0) - (brecheWord?.x ?? 0))).toBeLessThan(64);
  });

  it('offre un mot-pouvoir pour chacun des 2 pouvoirs restants (D16 : AILES retiré), avant son obstacle', () => {
    const words = map.objects.filter((o) => o.type === 'word');
    const abilities = words.map((w) => w.properties['ability']);
    expect(new Set(abilities)).toEqual(new Set(['hate', 'breche']));

    const xOf = (ability: string) => words.find((w) => w.properties['ability'] === ability)?.x ?? -1;
    const brecheCol = Math.floor((map.objects.find((o) => o.name === 'mur_breche')?.x ?? 0) / 16);
    expect(xOf('breche')).toBeLessThan(brecheCol * 16);
  });

  it('offre une fiole de PV à usage unique, en hauteur au-dessus de l\'arène du boss', () => {
    const potion = map.objects.find((o) => o.type === 'potion');
    const boss = map.objects.find((o) => o.type === 'boss');
    expect(potion).toBeDefined();
    expect(potion?.properties['flag']).toBeTypeOf('string');
    // Posée en hauteur (au-dessus du sol) plutôt qu'accessible en marchant.
    expect(potion?.y ?? 0).toBeLessThan((boss?.y ?? 0));
  });

  it('laisse assez d\'espace entre la BRÈCHE et le mi-boss (arène, pas un couloir)', () => {
    const wall = map.objects.find((o) => o.name === 'mur_breche');
    const boss = map.objects.find((o) => o.type === 'boss');
    expect((boss?.x ?? 0) - (wall?.x ?? 0)).toBeGreaterThan(18 * 16);
  });

  it('la porte de retour vise marge_01 loin de sa propre case (anti aller-retour)', () => {
    const door = map.objects.find((o) => o.type === 'door' && o.properties['targetRoom'] === 'marge_01');
    expect(door).toBeDefined();
    const targetX = door?.properties['targetX'];
    expect(typeof targetX === 'number' && Math.abs(targetX - (door?.x ?? 0)) > 32).toBe(true);
  });

  it('porte vers ratures_01, au-delà de l\'arène du mi-boss (D15), verrouillée tant que le mi-boss n\'est pas vaincu (retour de playtest 2026-07-26)', () => {
    const doors = map.objects.filter((o) => o.type === 'door');
    expect(doors).toHaveLength(2);
    const forward = doors.find((o) => o.properties['targetRoom'] === 'ratures_01');
    const boss = map.objects.find((o) => o.type === 'boss');
    expect(forward).toBeDefined();
    expect(forward?.x ?? 0).toBeGreaterThan(boss?.x ?? 0);
    expect(forward?.properties['requiresFlag']).toBe('boss_coquille_majuscule_vaincu');
    // Contour toujours fermé malgré l'élargissement de la salle (W=74).
    for (let tx = 0; tx < map.widthTiles; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < map.heightTiles; ty++) {
      expect(gidAt(map, map.widthTiles - 1, ty)).toBeGreaterThan(0);
    }
  });
});

describe('salle ratures_01 — zone 3 « Les Ratures » (AILES, chambre des mots, porte du temple)', () => {
  const map = parseTiledMap(ratures01);

  it('a un contour fermé', () => {
    for (let tx = 0; tx < map.widthTiles; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < map.heightTiles; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, map.widthTiles - 1, ty)).toBeGreaterThan(0);
    }
  });

  it('contient 3 PNJ, un encrier, 2 portes, 7 mots-transformation et 2 consoles ; aucun ennemi, fragment, boss ni canon', () => {
    const types = new Set(map.objects.map((o) => o.type));
    for (const required of ['spawn', 'npc', 'inkwell', 'word', 'door', 'transform_word', 'console']) {
      expect(types.has(required), `objet manquant : ${required}`).toBe(true);
    }
    expect(map.objects.filter((o) => o.type === 'npc')).toHaveLength(3);
    expect(map.objects.filter((o) => o.type === 'door')).toHaveLength(2);
    expect(map.objects.filter((o) => o.type === 'transform_word')).toHaveLength(7);
    expect(map.objects.filter((o) => o.type === 'console')).toHaveLength(2);
    // Les 3 fragments + PNJ-gardien de l'ancienne porte-palier sont retirés
    // (retour de Lucas 2026-07-27) : la chambre des mots est le contenu de
    // cette zone, une collecte séparée faisait doublon. Les 2 ennemis
    // communs sont retirés à leur tour (retour de Lucas 2026-07-29).
    expect(types.has('enemy')).toBe(false);
    expect(types.has('fragment')).toBe(false);
    expect(types.has('boss')).toBe(false);
    expect(types.has('canon')).toBe(false);
  });

  it('le PNJ La Rature qui regrette pointe vers pnj_ratures et se trouve à l\'entrée de la chambre des mots (avant tous ses objets)', () => {
    const npc = map.objects.find((o) => o.properties['dialogue'] === 'pnj_ratures');
    expect(npc).toBeDefined();
    const chamberObjects = map.objects.filter((o) => o.type === 'transform_word' || o.type === 'console');
    for (const obj of chamberObjects) expect(npc?.x ?? 0).toBeLessThan(obj.x);
  });

  it('2 PNJ-indice (retour de Lucas 2026-07-29, retravaillé une 3e fois le même jour), avant La Rature qui regrette, sur des plateformes hors de portée sans encre, masqués sur RATURE', () => {
    const npcs = map.objects.filter((o) => o.type === 'npc');
    const ciel = npcs.find((o) => o.properties['dialogue'] === 'pnj_ratures_indice_ciel');
    const rouge = npcs.find((o) => o.properties['dialogue'] === 'pnj_ratures_indice_rouge');
    const rature = npcs.find((o) => o.properties['dialogue'] === 'pnj_ratures');
    expect(ciel).toBeDefined();
    expect(rouge).toBeDefined();
    expect(ciel?.x ?? 0).toBeLessThan(rature?.x ?? 0);
    expect(rouge?.x ?? 0).toBeLessThan(rature?.x ?? 0);
    // Masqués sur RATURE (demande de Lucas : « un seul pnj dans cette
    // version ») — La Rature qui regrette n'a pas cette propriété.
    expect(ciel?.properties['hiddenIfFlag']).toBe('rature_jamais');
    expect(rouge?.properties['hiddenIfFlag']).toBe('rature_jamais');
    expect(rature?.properties['hiddenIfFlag']).toBeUndefined();
    // Ni l'un ni l'autre au sol (row14*16=224), à des hauteurs distinctes.
    expect(ciel?.y ?? 0).toBeLessThan(200);
    expect(rouge?.y ?? 0).toBeLessThan(200);
    expect(ciel?.y).not.toBe(rouge?.y);
    // Nettement au-delà du maximum vertical atteignable sans encre (retour
    // de Lucas 2026-07-29 : il faut être obligé de construire des
    // plateformes) — saut simple (~57px) + AILES (~47px) ≈ 105px max, donc
    // une plateforme dont la surface est à plus de 105px au-dessus du sol
    // (y < 224 - 105 = 119) est hors de portée sans peindre au moins un
    // palier intermédiaire.
    expect(ciel?.y ?? 999).toBeLessThan(119);
    expect(rouge?.y ?? 999).toBeLessThan(119);
  });

  it('aucun escalier construit ne mène aux plateformes des PNJ-indice (doivent être atteintes en traçant de l\'encre, retour de Lucas 2026-07-29)', () => {
    // Sous chaque plateforme (jusqu'au sol, row14), aucune tuile solide à sa
    // colonne : un pur puits vertical, pas de marche intermédiaire. Repère la
    // plateforme réelle en cherchant la première rangée solide sous chaque
    // PNJ-indice, plutôt que de recalculer sa hauteur depuis npc.y (offset
    // par la hauteur du sprite, pas directement comparable à une rangée).
    const ciel = map.objects.find((o) => o.properties['dialogue'] === 'pnj_ratures_indice_ciel');
    const rouge = map.objects.find((o) => o.properties['dialogue'] === 'pnj_ratures_indice_rouge');
    for (const npc of [ciel, rouge]) {
      const col = Math.floor((npc?.x ?? 0) / 16);
      let platformBottomRow = -1;
      for (let ty = 0; ty < 14; ty++) {
        if (gidAt(map, col, ty) > 0) platformBottomRow = ty;
      }
      expect(platformBottomRow).toBeGreaterThan(0);
      for (let ty = platformBottomRow + 1; ty < 14; ty++) {
        expect(gidAt(map, col, ty)).toBe(0);
      }
    }
  });

  it('offre le mot-pouvoir AILES avant le gouffre qu\'il permet de franchir (D16 : migration jamais faite jusqu\'ici)', () => {
    const words = map.objects.filter((o) => o.type === 'word');
    expect(words).toHaveLength(1);
    expect(words[0]?.properties['ability']).toBe('ales');

    let gapStartCol = -1;
    for (let tx = 1; tx < map.widthTiles - 1; tx++) {
      if (gidAt(map, tx, 14) === 0 && gidAt(map, tx, 16) === 0) {
        gapStartCol = tx;
        break;
      }
    }
    expect(gapStartCol).toBeGreaterThan(0);
    expect(words[0]?.x ?? Infinity).toBeLessThan(gapStartCol * 16);
  });

  it('un petit gouffre coupe le sol avant les ennemis et le PNJ, seul moyen de le franchir : AILES', () => {
    const npc = map.objects.find((o) => o.type === 'npc');
    let gapWidth = 0;
    let gapEndsBeforeNpc = true;
    for (let tx = 1; tx < map.widthTiles - 1; tx++) {
      if (gidAt(map, tx, 14) === 0 && gidAt(map, tx, 16) === 0) {
        gapWidth++;
        if (tx * 16 >= (npc?.x ?? 0)) gapEndsBeforeNpc = false;
      }
    }
    expect(gapWidth).toBeGreaterThanOrEqual(3);
    expect(gapEndsBeforeNpc).toBe(true);
  });

  it('la porte de retour vise chapitre_01 loin des deux portes concernées', () => {
    const door = map.objects.find((o) => o.type === 'door' && o.properties['targetRoom'] === 'chapitre_01');
    expect(door).toBeDefined();
    const targetX = door?.properties['targetX'];
    expect(typeof targetX === 'number' && Math.abs(targetX - (door?.x ?? 0)) > 32).toBe(true);
  });

  it('la chambre des mots propose 4 sujets (dont un féminin) et 3 attributs, tous distincts', () => {
    const words = map.objects.filter((o) => o.type === 'transform_word');
    const subjects = words.filter((w) => w.properties['role'] === 'subject');
    const attributes = words.filter((w) => w.properties['role'] === 'attribute');
    expect(subjects).toHaveLength(4);
    expect(attributes).toHaveLength(3);
    expect(new Set(subjects.map((w) => w.properties['wordId'])).size).toBe(4);
    expect(new Set(attributes.map((w) => w.properties['wordId'])).size).toBe(3);
    expect(subjects.some((w) => w.properties['gender'] === 'f')).toBe(true);
    // Le seul mot câblé à un effet cette passe (voir data/chapters/ratures_01.json).
    expect(subjects.some((w) => w.properties['wordId'] === 'soleil')).toBe(true);
    expect(attributes.some((w) => w.properties['wordId'] === 'jaune')).toBe(true);
  });

  it('2 consoles de rôles distincts (valider/annuler)', () => {
    const panels = map.objects.filter((o) => o.type === 'console');
    expect(panels).toHaveLength(2);
    expect(new Set(panels.map((p) => p.properties['role']))).toEqual(new Set(['validate', 'cancel']));
  });

  it('la porte du temple est déjà ouverte sur RATURE (requiresFlagUnless) mais requiert la bonne phrase sinon, mène à la zone 4 (crue_01), et se trouve après tous les mots/consoles', () => {
    const door = map.objects.find((o) => o.type === 'door' && o.properties['requiresFlag'] === 'temple_code_trouve');
    expect(door).toBeDefined();
    expect(door?.properties['requiresFlagUnless']).toBe('rature_jamais');
    // Depuis 2026-07-29 (zone 4 construite), la porte du temple mène à
    // crue_01 au lieu de boucler sur elle-même ; le toast de fin de contenu
    // se déclenche désormais à la sortie de crue_01, plus ici.
    expect(door?.properties['targetRoom']).toBe('crue_01');
    expect(door?.properties['showsCompletionToast']).toBeUndefined();
    const chamberObjects = map.objects.filter((o) => o.type === 'transform_word' || o.type === 'console');
    for (const obj of chamberObjects) expect(door?.x ?? 0).toBeGreaterThan(obj.x);
  });
});

describe('salle crue_01 — zone 4 « La Crue » (liquide montant, D-crue 2026-07-29)', () => {
  const map = parseTiledMap(crue01);
  // Largeur du puits proprement dit (doit rester synchronisée avec SHAFT_W
  // de tools/gen_room_crue01.mjs / CRUE01_SHAFT_WIDTH de game.ts) : depuis
  // l'ajout de la salle-trésor (2026-07-29), `map.widthTiles` couvre aussi
  // l'extension à droite et ne désigne plus la largeur navigable du puits —
  // les tests sur l'ouverture/largeur du puits doivent utiliser cette
  // constante, pas `map.widthTiles`.
  const SHAFT_W = 14;

  it('a un contour fermé', () => {
    for (let tx = 0; tx < map.widthTiles; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < map.heightTiles; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, map.widthTiles - 1, ty)).toBeGreaterThan(0);
    }
  });

  it('contient 1 spawn, 2 encriers, 1 cœur, 1 robinet, 4 tourelles, 3 murs BRÈCHE et 1 porte (vers salle_tresor) ; aucun ennemi commun ni PNJ, aucun trésor ICI (déplacé dans salle_tresor, 2026-07-29)', () => {
    const types = new Set(map.objects.map((o) => o.type));
    for (const required of ['spawn', 'inkwell', 'potion', 'valve', 'turret', 'door']) {
      expect(types.has(required), `objet manquant : ${required}`).toBe(true);
    }
    expect(map.objects.filter((o) => o.type === 'inkwell')).toHaveLength(2);
    expect(map.objects.filter((o) => o.type === 'potion')).toHaveLength(1);
    expect(map.objects.filter((o) => o.type === 'valve')).toHaveLength(1);
    expect(map.objects.filter((o) => o.type === 'turret')).toHaveLength(4);
    expect(map.objects.filter((o) => o.type === 'breche_wall')).toHaveLength(3);
    expect(map.objects.filter((o) => o.type === 'door')).toHaveLength(1);
    expect(map.objects.find((o) => o.type === 'door')?.properties['targetRoom']).toBe('salle_tresor');
    expect(types.has('treasure')).toBe(false);
    expect(types.has('enemy')).toBe(false);
    expect(types.has('npc')).toBe(false);
    expect(types.has('word')).toBe(false);
  });

  it('un sol d\'entrée solide sous le spawn, avec un encrier dessus', () => {
    const spawn = map.objects.find((o) => o.type === 'spawn');
    expect(spawn).toBeDefined();
    const spawnCol = Math.floor((spawn?.x ?? 0) / 16);
    // Cherche depuis le bas (pas depuis le haut : row0 est aussi solide, le
    // haut du puits) le sommet du bloc de sol continu sous le spawn.
    let floorRow = map.heightTiles;
    for (let ty = map.heightTiles - 1; ty >= 0; ty--) {
      if (gidAt(map, spawnCol, ty) > 0) floorRow = ty;
      else break;
    }
    expect(floorRow).toBeLessThan(map.heightTiles - 1);
    // Les pieds du joueur au spawn touchent tout juste le sol (même
    // convention que les autres salles : spawn.y = surface du sol - hauteur joueur).
    expect((spawn?.y ?? 0) + 22).toBeLessThanOrEqual(floorRow * 16 + 1);

    const bottomInkwell = map.objects
      .filter((o) => o.type === 'inkwell')
      .sort((a, b) => b.y - a.y)[0];
    expect(bottomInkwell).toBeDefined();
    expect(bottomInkwell?.y ?? 0).toBeLessThan(floorRow * 16);
  });

  it('une plateforme de repos à mi-hauteur (non tracée par le joueur), avec le second encrier dessus, entre le sol et le robinet en haut du puits', () => {
    const valve = map.objects.find((o) => o.type === 'valve');
    expect(valve).toBeDefined();
    const inkwells = map.objects.filter((o) => o.type === 'inkwell').sort((a, b) => b.y - a.y);
    const midInkwell = inkwells[1];
    expect(midInkwell).toBeDefined();
    // Le second encrier est strictement entre le sol (encrier du bas) et le
    // robinet (en haut du puits) : une vraie étape intermédiaire.
    expect(midInkwell?.y ?? 0).toBeGreaterThan(valve?.y ?? 0);
    expect(midInkwell?.y ?? 0).toBeLessThan(inkwells[0]?.y ?? 0);

    // La plateforme sous cet encrier est solide sur (quasi) toute la largeur
    // du puits (pleine largeur : facile à rattraper après un puits ouvert).
    // Bornée à SHAFT_W (pas map.widthTiles) : au-delà, ce sont les colonnes
    // de la salle-trésor/bedrock, sans rapport avec cette plateforme.
    const midRow = Math.floor((midInkwell?.y ?? 0) / 16) + 2;
    let solidCols = 0;
    for (let tx = 1; tx < SHAFT_W - 1; tx++) if (gidAt(map, tx, midRow) > 0) solidCols++;
    expect(solidCols).toBeGreaterThanOrEqual(SHAFT_W - 4);
  });

  it('entre le sol et la plateforme de repos, et entre la plateforme de repos et le robinet, le puits est vide (aucune géométrie de secours — tout est laissé au tracé du joueur)', () => {
    const inkwells = map.objects.filter((o) => o.type === 'inkwell').sort((a, b) => b.y - a.y);
    const bottomRow = Math.floor((inkwells[0]?.y ?? 0) / 16);
    const midRow = Math.floor((inkwells[1]?.y ?? 0) / 16);
    const valve = map.objects.find((o) => o.type === 'valve');
    const topRow = Math.floor((valve?.y ?? 0) / 16);

    // Borné à SHAFT_W (pas map.widthTiles) : le mur du puits (col SHAFT_W-1)
    // est toujours solide (paroi réelle) mais devenait une colonne
    // "intérieure" ordinaire une fois la salle-trésor ajoutée derrière lui,
    // ce qui aurait fait échouer ce test à tort (colonne solide incluse dans
    // la vérification d'ouverture alors qu'elle n'a jamais fait partie du
    // puits navigable).
    const isRowFullyOpen = (row: number) => {
      for (let tx = 1; tx < SHAFT_W - 1; tx++) if (gidAt(map, tx, row) > 0) return false;
      return true;
    };
    let openBelowMid = 0;
    for (let ty = midRow + 3; ty < bottomRow; ty++) if (isRowFullyOpen(ty)) openBelowMid++;
    expect(openBelowMid).toBeGreaterThan(10);

    let openAboveMid = 0;
    for (let ty = topRow + 3; ty < midRow; ty++) if (isRowFullyOpen(ty)) openAboveMid++;
    expect(openAboveMid).toBeGreaterThan(10);
  });

  it('un robinet/fermoir se trouve sur la plateforme du haut, seul point d\'arrivée de la salle (pas de porte, retour de Lucas 2026-07-29)', () => {
    const valve = map.objects.find((o) => o.type === 'valve');
    expect(valve).toBeDefined();
    // Sur la plateforme du haut (row6, y=96) : au-dessus, pas au sol.
    expect(valve?.y ?? 999).toBeLessThan(120);
  });

  it('les 2 plateformes de repos ont chacune une bande cassable (BRÈCHE) — bug corrigé le 2026-07-29 : sans ça, personne ne peut jamais atteindre leur surface depuis le puits (capture d\'écran de Lucas, joueur bloqué sous l\'encrier de mi-parcours)', () => {
    // 3 murs BRÈCHE au total désormais (2026-07-29, salle-trésor) : les 2
    // bandes des plateformes de repos, plus celle qui ouvre sur la
    // salle-trésor (testée séparément plus bas) — exclue ici par sa hauteur
    // (3 rangées, pas 2).
    const walls = map.objects.filter((o) => o.type === 'breche_wall' && o.height === 2 * 16);
    expect(walls).toHaveLength(2);
    for (const wall of walls) {
      expect(typeof wall.properties['flag']).toBe('string');
      // Chaque bande fait bien 2 rangées (l'épaisseur des plateformes).
      expect(wall.height).toBe(2 * 16);
    }
    const inkwells = map.objects.filter((o) => o.type === 'inkwell').sort((a, b) => b.y - a.y);
    const midInkwell = inkwells[1];
    const valve = map.objects.find((o) => o.type === 'valve');

    // Une bande est au niveau de la plateforme de repos, l'autre au niveau
    // de la plateforme du haut (même hauteur Y que l'encrier/le robinet
    // correspondants).
    const midWall = walls.find((w) => Math.abs(w.y - (midInkwell?.y ?? 0)) <= 40);
    const topWall = walls.find((w) => Math.abs(w.y - (valve?.y ?? 0)) <= 40);
    expect(midWall).toBeDefined();
    expect(topWall).toBeDefined();
    expect(midWall?.id).not.toBe(topWall?.id);

    // Les deux bandes sont sur des côtés différents (varier), et aucune ne
    // couvre toute la largeur navigable (le reste de la plateforme doit
    // rester un sol ordinaire, jamais cassable, pour l'encrier/le robinet).
    expect(midWall?.width ?? 0).toBeLessThan((SHAFT_W - 2) * 16);
    expect(topWall?.width ?? 0).toBeLessThan((SHAFT_W - 2) * 16);
    expect(Math.abs((midWall?.x ?? 0) - (topWall?.x ?? 0))).toBeGreaterThan(64);
  });

  it('casser une bande BRÈCHE d\'une plateforme de repos ouvre un passage jusqu\'à sa surface, sans affecter l\'autre plateforme', () => {
    const room = new Room('crue_01', map);
    const walls = map.objects.filter((o) => o.type === 'breche_wall' && o.height === 2 * 16);
    for (const wall of walls) room.registerBrecheWall(wall.id, objectTiles(wall));
    const [wallA, wallB] = walls;
    if (wallA === undefined || wallB === undefined) throw new Error('2 murs BRÈCHE de plateforme attendus');
    room.revealFiligrane(wallA.id);

    // La bande cassée n'est plus solide (aucun filigrane dans cette salle :
    // une tuile révélée redevient simplement vide).
    const openCol = Math.floor(wallA.x / 16);
    const openRow = Math.floor(wallA.y / 16);
    expect(room.isSolid(openCol, openRow)).toBe(false);

    // L'autre plateforme reste entièrement intacte (mur non cassé).
    const otherCol = Math.floor(wallB.x / 16);
    const otherRow = Math.floor(wallB.y / 16);
    expect(room.isSolid(otherCol, otherRow)).toBe(true);
  });

  it('une alcôve derrière un mur BRÈCHE tout en haut du puits, avec une porte vers salle_tresor (retravaillé le 2026-07-29 : un corridor-jusqu\'en-bas AU SEIN de crue_01 faisait toucher à tort au joueur le niveau de l\'eau montante, qui n\'existe pourtant pas dans ce compartiment séparé — une vraie salle à part règle le problème à la racine)', () => {
    const TOTAL_W = map.widthTiles; // 20 = SHAFT_W(14) + CHAMBER_W(6)

    // L'alcôve (rows 1-7, cols SHAFT_W..TOTAL_W-2) est vide — juste assez
    // pour marcher jusqu'à la porte, pas un corridor à descendre.
    for (let ty = 1; ty <= 7; ty++) {
      for (let tx = SHAFT_W; tx <= TOTAL_W - 2; tx++) {
        expect(gidAt(map, tx, ty), `(${String(tx)},${String(ty)}) devrait être vide`).toBe(0);
      }
    }
    // Sol de l'alcôve (row 8) et paroi lointaine (col TOTAL_W-1) solides.
    for (let tx = SHAFT_W; tx <= TOTAL_W - 1; tx++) {
      expect(gidAt(map, tx, 8), `sol de l'alcôve en (${String(tx)},8)`).toBeGreaterThan(0);
    }
    for (let ty = 1; ty <= 8; ty++) {
      expect(gidAt(map, TOTAL_W - 1, ty), `paroi lointaine en (${String(TOTAL_W - 1)},${String(ty)})`).toBeGreaterThan(0);
    }

    // Le mur BRÈCHE qui ouvre sur l'alcôve : sur le mur du puits (col
    // SHAFT_W-1), près du sommet (à hauteur du robinet), 3 rangées de haut
    // (pas 2, contrairement aux bandes des plateformes de repos).
    const doorWall = map.objects.find((o) => o.type === 'breche_wall' && o.height === 3 * 16);
    expect(doorWall).toBeDefined();
    expect(Math.floor((doorWall?.x ?? -1) / 16)).toBe(SHAFT_W - 1);
    expect(typeof doorWall?.properties['flag']).toBe('string');
    expect(doorWall?.y ?? 999).toBeLessThan(100);

    // La porte vers salle_tresor est dans l'alcôve, pas dans le puits.
    const door = map.objects.find((o) => o.type === 'door');
    expect(door).toBeDefined();
    expect(door?.x ?? 0).toBeGreaterThan(SHAFT_W * 16);
    expect(door?.properties['targetRoom']).toBe('salle_tresor');
  });

  it('un objet cœur (restaure des PV, même mécanique que la fiole de chapitre_01) au niveau de l\'encrier de mi-parcours (retour de Lucas 2026-07-29, en remplacement d\'un simple pictogramme décoratif)', () => {
    const heart = map.objects.find((o) => o.type === 'potion');
    const midInkwell = map.objects.filter((o) => o.type === 'inkwell').sort((a, b) => b.y - a.y)[1];
    expect(heart).toBeDefined();
    expect(typeof heart?.properties['flag']).toBe('string');
    expect(midInkwell).toBeDefined();
    expect(Math.abs((heart?.y ?? 0) - (midInkwell?.y ?? 0))).toBeLessThan(40);
  });

  it('casser le mur BRÈCHE de la salle-trésor ouvre un passage précis, sans affecter le reste du mur du puits', () => {
    const room = new Room('crue_01', map);
    const doorWall = map.objects.find((o) => o.type === 'breche_wall' && o.height === 3 * 16);
    if (doorWall === undefined) throw new Error('mur BRÈCHE de la salle-trésor attendu');
    room.registerBrecheWall(doorWall.id, objectTiles(doorWall));

    const doorCol = Math.floor(doorWall.x / 16);
    const doorRow0 = Math.floor(doorWall.y / 16);
    // Juste au-dessus de la bande cassable, le mur du puits reste solide
    // (pas de trou géant, seulement la bande enregistrée).
    expect(room.isSolid(doorCol, doorRow0 - 1)).toBe(true);

    room.revealFiligrane(doorWall.id);
    for (let ty = doorRow0; ty < doorRow0 + 3; ty++) {
      expect(room.isSolid(doorCol, ty), `(${String(doorCol)},${String(ty)}) devrait être ouvert`).toBe(false);
    }
    // Toujours solide juste au-dessus/en dessous de la bande révélée.
    expect(room.isSolid(doorCol, doorRow0 - 1)).toBe(true);
    expect(room.isSolid(doorCol, doorRow0 + 3)).toBe(true);
  });

  it('4 tourelles fixes, encastrées près des parois, réparties entre le sol et la plateforme de repos puis entre celle-ci et le robinet, alternant de côté', () => {
    const turrets = map.objects.filter((o) => o.type === 'turret');
    expect(turrets).toHaveLength(4);

    const inkwells = map.objects.filter((o) => o.type === 'inkwell').sort((a, b) => b.y - a.y);
    const bottomY = inkwells[0]?.y ?? 0;
    const midY = inkwells[1]?.y ?? 0;
    const valveY = map.objects.find((o) => o.type === 'valve')?.y ?? 0;

    // Chaque tourelle est proche d'une paroi DU PUITS (col0 ou col
    // SHAFT_W-1), pas flottante au milieu. Borné à SHAFT_W (pas
    // map.widthTiles) : au-delà se trouve la salle-trésor, sans rapport.
    for (const t of turrets) {
      const nearLeftWall = t.x < 16;
      const nearRightWall = t.x > (SHAFT_W - 2) * 16;
      expect(nearLeftWall || nearRightWall, `tourelle ${t.name} pas près d'un mur`).toBe(true);
    }

    // 2 dans la moitié basse (entre le sol et la plateforme de repos), 2
    // dans la moitié haute (entre la plateforme de repos et le robinet).
    const lower = turrets.filter((t) => t.y > midY && t.y < bottomY);
    const upper = turrets.filter((t) => t.y > valveY && t.y < midY);
    expect(lower).toHaveLength(2);
    expect(upper).toHaveLength(2);

    // Alternance de côté : pas les 4 du même côté.
    const leftCount = turrets.filter((t) => t.x < 16).length;
    expect(leftCount).toBeGreaterThan(0);
    expect(leftCount).toBeLessThan(4);
  });
});

describe('salle salle_tresor — bonus de la zone 4, effondrement du plafond (2026-07-29)', () => {
  const map = parseTiledMap(salleTresor);

  it('a un contour fermé, plate (pas de tracé d\'encre nécessaire pour la traverser)', () => {
    for (let tx = 0; tx < map.widthTiles; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < map.heightTiles; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, map.widthTiles - 1, ty)).toBeGreaterThan(0);
    }
    const floorRow = map.heightTiles - 1;
    for (let tx = 1; tx < map.widthTiles - 1; tx++) {
      expect(gidAt(map, tx, floorRow), `sol en (${String(tx)},${String(floorRow)})`).toBeGreaterThan(0);
    }
  });

  it('contient 1 spawn, 1 trésor et 2 portes (entrée + sortie), plusieurs points de chute de débris ; aucun ennemi', () => {
    const types = new Set(map.objects.map((o) => o.type));
    for (const required of ['spawn', 'treasure', 'door', 'debris_spawn']) {
      expect(types.has(required), `objet manquant : ${required}`).toBe(true);
    }
    expect(map.objects.filter((o) => o.type === 'door')).toHaveLength(2);
    expect(map.objects.filter((o) => o.type === 'treasure')).toHaveLength(1);
    expect(map.objects.filter((o) => o.type === 'debris_spawn').length).toBeGreaterThanOrEqual(3);
    expect(types.has('enemy')).toBe(false);
    expect(types.has('turret')).toBe(false);
  });

  it('le trésor est près de l\'entrée, avec un flag ; les points de chute sont répartis entre lui et la sortie', () => {
    const treasure = map.objects.find((o) => o.type === 'treasure');
    const doors = map.objects.filter((o) => o.type === 'door').sort((a, b) => a.x - b.x);
    const entryDoor = doors[0];
    const exitDoor = doors[1];
    expect(treasure).toBeDefined();
    expect(typeof treasure?.properties['flag']).toBe('string');
    expect(treasure?.x ?? 0).toBeGreaterThan(entryDoor?.x ?? 0);
    expect(treasure?.x ?? 0).toBeLessThan((exitDoor?.x ?? 0) - 64); // encore loin de la sortie

    const spawns = map.objects.filter((o) => o.type === 'debris_spawn');
    for (const s of spawns) {
      expect(s.x).toBeGreaterThan(treasure?.x ?? 0);
      expect(s.x).toBeLessThan(exitDoor?.x ?? 0);
    }
  });

  it('la porte d\'entrée mène à crue_01 ; la porte de sortie termine le jeu (endsGame) plutôt que de mener quelque part (retour de Lucas 2026-07-29 : « ça sera la fin du jeu »)', () => {
    const doors = map.objects.filter((o) => o.type === 'door').sort((a, b) => a.x - b.x);
    expect(doors).toHaveLength(2);
    const [entryDoor, exitDoor] = doors;
    expect(entryDoor?.properties['targetRoom']).toBe('crue_01');
    expect(exitDoor?.properties['targetRoom']).toBeUndefined();
    expect(exitDoor?.properties['endsGame']).toBe(true);
  });
});
