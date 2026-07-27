import { describe, expect, it } from 'vitest';
import { filigraneGidAt, gidAt, mergeSolidTiles, parseTiledMap } from '../src/engine/tilemap';
import { Room } from '../src/game/world/room';
import { objectTiles } from '../src/game/narrative/deviation';
import marge01 from '../src/data/rooms/marge_01.json';
import chapitre01 from '../src/data/rooms/chapitre_01.json';
import ratures01 from '../src/data/rooms/ratures_01.json';

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

describe('salle marge_01 — chapitre 1 « La Marge » (données réelles, v3)', () => {
  const map = parseTiledMap(marge01);

  it('a les dimensions attendues et un contour fermé', () => {
    expect(map.widthTiles).toBe(64);
    expect(map.heightTiles).toBe(17);
    // Sol continu sur les 3 rangées du bas (pas de chute mortelle dans la marge).
    for (let tx = 1; tx <= 62; tx++) {
      expect(gidAt(map, tx, 14)).toBeGreaterThan(0);
      expect(gidAt(map, tx, 16)).toBeGreaterThan(0);
    }
    // Bord haut + marges gauche/droite pleines.
    for (let tx = 0; tx < 64; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < 17; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, 63, ty)).toBeGreaterThan(0);
    }
  });

  it('contient les objets requis, dont les mots-loi', () => {
    const types = new Set(map.objects.map((o) => o.type));
    for (const required of ['spawn', 'npc', 'word', 'fragment', 'inkwell', 'door', 'canon']) {
      expect(types.has(required), `objet manquant : ${required}`).toBe(true);
    }
    expect(types.has('unwritten')).toBe(false); // plus de plateformes pré-placées
    // Plus de sorties séparées (retour de playtest 2026-07-22) : une seule
    // porte, en fin de parcours, termine le chapitre (voir plus bas).
    expect(types.has('exit')).toBe(false);

    // Les obstacles SONT des mots-loi : 2 barrières (enfermé, jamais) + 1 blanc.
    const canon = map.objects.filter((o) => o.type === 'canon');
    const modes = canon.map((o) => o.properties['mode']);
    expect(new Set(modes)).toEqual(new Set(['barrier', 'latent']));
    const barrierTexts = canon
      .filter((o) => o.properties['mode'] === 'barrier')
      .map((o) => o.properties['text']);
    expect(new Set(barrierTexts)).toEqual(new Set(['enfermé', 'jamais']));
  });

  it('« enfermé » : mot-cage de départ, hors décor fixe, neutre (apprentissage)', () => {
    // Objet "canon" en x14-15 : le calque ground reste vide là où il se dresse.
    for (let ty = 8; ty <= 13; ty++) {
      expect(gidAt(map, 14, ty)).toBe(0);
      expect(gidAt(map, 15, ty)).toBe(0);
    }
    const enferme = map.objects.find((o) => o.properties['text'] === 'enfermé');
    expect(enferme?.properties['mode']).toBe('barrier');
    expect(enferme?.properties['flag']).toBe('efface_enferme');
    expect(enferme?.properties['leaning']).toBeUndefined(); // neutre : ne pèse pas sur la fin
  });

  it('la passerelle POINT FINAL a un trou de 2 tuiles : le blanc ▢ à combler', () => {
    // Passerelle en rangée 9, ininterrompue sauf le trou x40-41.
    expect(gidAt(map, 39, 9)).toBeGreaterThan(0);
    expect(gidAt(map, 40, 9)).toBe(0); // ▢
    expect(gidAt(map, 41, 9)).toBe(0); // ▢
    expect(gidAt(map, 42, 9)).toBeGreaterThan(0);
  });

  it('« jamais » : barrage final effaçable qui penche vers RATURE', () => {
    // Objet "canon" en x50-51 : ground vide là où il se dresse.
    for (let ty = 8; ty <= 13; ty++) {
      expect(gidAt(map, 50, ty)).toBe(0);
      expect(gidAt(map, 51, ty)).toBe(0);
    }
    const jamais = map.objects.find((o) => o.properties['text'] === 'jamais');
    expect(jamais?.properties['mode']).toBe('barrier');
    expect(jamais?.properties['flag']).toBe('rature_jamais');
    expect(jamais?.properties['leaning']).toBe(-1);
  });

  it('porte vers chapitre_01, seule et à la toute fin du niveau, termine le chapitre', () => {
    const door = map.objects.find((o) => o.type === 'door');
    expect(door).toBeDefined();
    expect(door?.properties['targetRoom']).toBe('chapitre_01');
    // Au-delà du barrage "jamais" (colonnes 50-51) : l'atteindre est le seul
    // moyen physique de finir le niveau, quelle que soit la route choisie.
    expect(door?.x).toBeGreaterThan(51 * 16);
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

  it('deux murs BRÈCHE "points faibles" dans l\'arène : mur plein jusqu\'au sol (jamais le sol), fissure restreinte en hauteur (retour de playtest 2026-07-26, précisé D16-bis)', () => {
    const gauntletWalls = map.objects.filter((o) => o.type === 'breche_wall' && o.name !== 'mur_breche');
    expect(gauntletWalls).toHaveLength(2);
    const floorStartRow = map.heightTiles - 3;
    for (const wall of gauntletWalls) {
      const col = Math.floor(wall.x / 16);
      // La colonne entière est solide dans "ground"...
      for (let ty = 0; ty < map.heightTiles; ty++) expect(gidAt(map, col, ty)).toBeGreaterThan(0);
      // ...et l'objet BRÈCHE lui-même couvre toute la hauteur jusqu'au sol,
      // jamais le sol (casser n'importe où dans cet objet ouvre tout le mur
      // d'un coup, même mécanique tout-ou-rien que le mur simple ci-dessus).
      expect(wall.y).toBe(0);
      expect(wall.height).toBe(floorStartRow * 16);
      expect(typeof wall.properties['flag']).toBe('string');
      // Seule la fissure DESSINÉE est restreinte à une bande étroite : il
      // faut grimper jusque-là pour la voir/l'atteindre en premier.
      expect(typeof wall.properties['crackY']).toBe('number');
      expect(wall.properties['crackHeight']).toBeLessThan((map.heightTiles * 16) / 4);
    }
    // Hauteurs de fissure différentes : un point faible en haut de l'arène, un plus bas.
    const crackYs = gauntletWalls.map((w) => w.properties['crackY'] as number).sort((a, b) => a - b);
    expect(crackYs[0]).toBeLessThan(10 * 16);
    expect(crackYs[1]).toBeGreaterThan(15 * 16);
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

  it('offre deux encriers avant l\'arène du mi-boss (D16 : un après le premier mur, un avant le puits d\'escalade)', () => {
    const inkwells = map.objects.filter((o) => o.type === 'inkwell');
    const boss = map.objects.find((o) => o.type === 'boss');
    expect(inkwells).toHaveLength(2);
    for (const inkwell of inkwells) expect(inkwell.x).toBeLessThan(boss?.x ?? 0);
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

describe('salle ratures_01 — zone 3 « Les Ratures » (finalisée : AILES, 3 fragments, ennemis, palier de sortie)', () => {
  const map = parseTiledMap(ratures01);

  it('a un contour fermé', () => {
    for (let tx = 0; tx < map.widthTiles; tx++) expect(gidAt(map, tx, 0)).toBeGreaterThan(0);
    for (let ty = 0; ty < map.heightTiles; ty++) {
      expect(gidAt(map, 0, ty)).toBeGreaterThan(0);
      expect(gidAt(map, map.widthTiles - 1, ty)).toBeGreaterThan(0);
    }
  });

  it('contient un unique PNJ, un encrier, 3 fragments, 2 ennemis et 2 portes ; aucun boss ni canon', () => {
    const types = new Set(map.objects.map((o) => o.type));
    for (const required of ['spawn', 'npc', 'inkwell', 'fragment', 'word', 'enemy', 'door']) {
      expect(types.has(required), `objet manquant : ${required}`).toBe(true);
    }
    expect(map.objects.filter((o) => o.type === 'npc')).toHaveLength(1);
    expect(map.objects.filter((o) => o.type === 'fragment')).toHaveLength(3);
    expect(map.objects.filter((o) => o.type === 'enemy')).toHaveLength(2);
    expect(map.objects.filter((o) => o.type === 'door')).toHaveLength(2);
    expect(types.has('boss')).toBe(false);
    expect(types.has('canon')).toBe(false);
  });

  it('le PNJ pointe vers le dialogue pnj_ratures', () => {
    const npc = map.objects.find((o) => o.type === 'npc');
    expect(npc?.properties['dialogue']).toBe('pnj_ratures');
  });

  it('les 3 fragments ont chacun un flag distinct et préfixé "fragment_"', () => {
    const fragments = map.objects.filter((o) => o.type === 'fragment');
    const flags = fragments.map((f) => f.properties['flag']);
    expect(new Set(flags).size).toBe(3);
    for (const flag of flags) {
      expect(typeof flag).toBe('string');
      expect((flag as string).startsWith('fragment_')).toBe(true);
    }
  });

  it('contient exactement les 2 ennemis communs (Coquille, Rature), séparés par une marge de sécurité', () => {
    const enemies = map.objects.filter((o) => o.type === 'enemy');
    const kinds = enemies.map((o) => o.properties['kind']);
    expect(new Set(kinds)).toEqual(new Set(['coquille', 'rature']));
    const [a, b] = [...enemies].sort((x, y) => x.x - y.x);
    // Aucun chevauchement/contact entre les deux zones de patrouille.
    expect((b?.x ?? 0)).toBeGreaterThanOrEqual((a?.x ?? 0) + (a?.width ?? 0));
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

  it('la porte-palier est verrouillée par la phrase composée (les 3 fragments) et boucle sur la même salle', () => {
    const door = map.objects.find((o) => o.type === 'door' && o.properties['requiresFlag'] === 'ratures_phrase_composee');
    expect(door).toBeDefined();
    expect(door?.properties['targetRoom']).toBe('ratures_01');
    expect(door?.properties['showsCompletionToast']).toBe(true);
    // Placée après tous les fragments, pas avant.
    const fragments = map.objects.filter((o) => o.type === 'fragment');
    for (const fragment of fragments) expect(door?.x ?? 0).toBeGreaterThan(fragment.x);
  });
});
