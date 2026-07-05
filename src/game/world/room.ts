/**
 * Salle : tilemap parsée + objets de gameplay. Fournit la requête de solidité
 * consommée par la physique (tuiles + plateformes d'encre écrites + bords).
 */
import { gidAt, type ParsedMap, type RoomObject } from '../../engine/tilemap';
import type { SolidQuery } from '../../engine/physics';
import { TILE_SIZE } from '../config';

export interface UnwrittenPlatform {
  objectId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  written: boolean;
}

export class Room {
  readonly id: string;
  readonly map: ParsedMap;
  readonly platforms: UnwrittenPlatform[];
  /** Tuiles solides ajoutées par l'écriture, clés "tx,ty". */
  private readonly writtenTiles = new Set<string>();

  constructor(id: string, map: ParsedMap) {
    this.id = id;
    this.map = map;
    this.platforms = map.objects
      .filter((o) => o.type === 'unwritten')
      .map((o) => ({ objectId: o.id, x: o.x, y: o.y, width: o.width, height: o.height, written: false }));
  }

  get pixelWidth(): number {
    return this.map.widthTiles * TILE_SIZE;
  }

  get pixelHeight(): number {
    return this.map.heightTiles * TILE_SIZE;
  }

  objectsOfType(type: string): RoomObject[] {
    return this.map.objects.filter((o) => o.type === type);
  }

  firstObjectOfType(type: string): RoomObject | null {
    return this.map.objects.find((o) => o.type === type) ?? null;
  }

  /**
   * Requête de solidité pour la physique. Hors carte : solide sur les côtés
   * et en dessous (on ne quitte pas la page), ouvert au-dessus.
   */
  readonly isSolid: SolidQuery = (tx, ty) => {
    if (tx < 0 || tx >= this.map.widthTiles) return true;
    if (ty >= this.map.heightTiles) return true;
    if (ty < 0) return false;
    if (gidAt(this.map, tx, ty) > 0) return true;
    return this.writtenTiles.has(`${String(tx)},${String(ty)}`);
  };

  /** Matérialise une plateforme non-écrite : ses tuiles deviennent solides. */
  writePlatform(platform: UnwrittenPlatform): void {
    platform.written = true;
    const txMin = Math.floor(platform.x / TILE_SIZE);
    const txMax = Math.floor((platform.x + platform.width - 1) / TILE_SIZE);
    const tyMin = Math.floor(platform.y / TILE_SIZE);
    const tyMax = Math.floor((platform.y + platform.height - 1) / TILE_SIZE);
    for (let ty = tyMin; ty <= tyMax; ty++) {
      for (let tx = txMin; tx <= txMax; tx++) {
        this.writtenTiles.add(`${String(tx)},${String(ty)}`);
      }
    }
  }
}
