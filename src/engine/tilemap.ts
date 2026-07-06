/**
 * Parseur d'exports Tiled JSON (spec §2 : cartes éditées avec Tiled, JSON
 * parsé par du code maison — aucune lib runtime). On ne supporte que le
 * sous-ensemble utilisé par le projet : cartes finies orthogonales, calques
 * de tuiles en tableau brut, calques d'objets rectangles/points.
 * Le parseur valide et échoue avec un message clair plutôt que de propager
 * des `undefined` silencieux.
 */

export type PropertyValue = string | number | boolean;

export interface RoomObject {
  id: number;
  name: string;
  /** Champ "type" (Tiled ≤1.8) ou "class" (Tiled ≥1.9). */
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, PropertyValue>;
}

export interface ParsedMap {
  widthTiles: number;
  heightTiles: number;
  tileSize: number;
  /** GIDs du calque "ground", ligne par ligne ; 0 = vide. */
  ground: number[];
  objects: RoomObject[];
}

function fail(message: string): never {
  throw new Error(`Tilemap invalide : ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNumber(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  if (typeof value !== 'number') fail(`champ numérique "${key}" manquant`);
  return value;
}

function getString(obj: Record<string, unknown>, key: string, fallback?: string): string {
  const value = obj[key];
  if (typeof value === 'string') return value;
  if (fallback !== undefined) return fallback;
  fail(`champ texte "${key}" manquant`);
}

function parseProperties(value: unknown): Record<string, PropertyValue> {
  const result: Record<string, PropertyValue> = {};
  if (!Array.isArray(value)) return result;
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const name = entry['name'];
    const propValue = entry['value'];
    if (typeof name !== 'string') continue;
    if (
      typeof propValue === 'string' ||
      typeof propValue === 'number' ||
      typeof propValue === 'boolean'
    ) {
      result[name] = propValue;
    }
  }
  return result;
}

function parseObject(value: unknown): RoomObject {
  if (!isRecord(value)) fail('objet mal formé');
  // Tiled 1.9+ remplace "type" par "class" sur les objets ; on accepte les deux.
  const type = getString(value, 'type', getString(value, 'class', ''));
  return {
    id: getNumber(value, 'id'),
    name: getString(value, 'name', ''),
    type,
    x: getNumber(value, 'x'),
    y: getNumber(value, 'y'),
    width: typeof value['width'] === 'number' ? value['width'] : 0,
    height: typeof value['height'] === 'number' ? value['height'] : 0,
    properties: parseProperties(value['properties']),
  };
}

export function parseTiledMap(raw: unknown): ParsedMap {
  if (!isRecord(raw)) fail('la racine doit être un objet');
  const widthTiles = getNumber(raw, 'width');
  const heightTiles = getNumber(raw, 'height');
  const tileSize = getNumber(raw, 'tilewidth');
  if (getNumber(raw, 'tileheight') !== tileSize) fail('tuiles non carrées non supportées');

  const layers = raw['layers'];
  if (!Array.isArray(layers)) fail('calques manquants');

  let ground: number[] | null = null;
  const objects: RoomObject[] = [];

  for (const layer of layers) {
    if (!isRecord(layer)) continue;
    const layerType = layer['type'];
    if (layerType === 'tilelayer' && getString(layer, 'name') === 'ground') {
      const data = layer['data'];
      if (!Array.isArray(data) || !data.every((v): v is number => typeof v === 'number')) {
        fail('calque "ground" : data doit être un tableau de nombres (encodage CSV/array)');
      }
      if (data.length !== widthTiles * heightTiles) {
        fail(`calque "ground" : ${String(data.length)} tuiles au lieu de ${String(widthTiles * heightTiles)}`);
      }
      ground = data;
    } else if (layerType === 'objectgroup') {
      const objs = layer['objects'];
      if (Array.isArray(objs)) {
        for (const obj of objs) objects.push(parseObject(obj));
      }
    }
  }

  if (ground === null) fail('calque de tuiles "ground" introuvable');
  return { widthTiles, heightTiles, tileSize, ground, objects };
}

/** GID à la position (tx, ty) ; 0 (vide) hors limites. */
export function gidAt(map: ParsedMap, tileX: number, tileY: number): number {
  if (tileX < 0 || tileX >= map.widthTiles || tileY < 0 || tileY >= map.heightTiles) return 0;
  return map.ground[tileY * map.widthTiles + tileX] ?? 0;
}

/** Rectangle en unités de tuiles. */
export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Fusionne les tuiles solides en grands rectangles (« dalles ») : les
 * séquences horizontales identiques de lignes consécutives sont empilées.
 * Utilisé par le rendu pour dessiner des formes continues plutôt qu'une
 * grille de carrés — c'est ce qui casse le look « damier 8-bit ».
 * Fonction pure, testée.
 */
export function mergeSolidTiles(
  width: number,
  height: number,
  isSolid: (tileX: number, tileY: number) => boolean,
): TileRect[] {
  const rects: TileRect[] = [];
  let openAbove = new Map<string, TileRect>();

  for (let y = 0; y < height; y++) {
    const openHere = new Map<string, TileRect>();
    let runStart = -1;
    for (let x = 0; x <= width; x++) {
      const solid = x < width && isSolid(x, y);
      if (solid && runStart < 0) runStart = x;
      if (!solid && runStart >= 0) {
        const key = `${String(runStart)}:${String(x - runStart)}`;
        const above = openAbove.get(key);
        if (above !== undefined) {
          above.h += 1;
          openHere.set(key, above);
        } else {
          const rect: TileRect = { x: runStart, y, w: x - runStart, h: 1 };
          rects.push(rect);
          openHere.set(key, rect);
        }
        runStart = -1;
      }
    }
    openAbove = openHere;
  }
  return rects;
}
