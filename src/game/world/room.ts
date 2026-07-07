/**
 * Salle : tilemap parsée + couche d'encre tracée par le joueur.
 * La couche d'encre est mutable (paint/erase à la souris) et vient s'ajouter
 * aux tuiles statiques pour la requête de solidité de la physique.
 */
import { gidAt, mergeSolidTiles, type ParsedMap, type RoomObject, type TileRect } from '../../engine/tilemap';
import type { SolidQuery } from '../../engine/physics';
import { TILE_SIZE } from '../config';

function key(tileX: number, tileY: number): string {
  return `${String(tileX)},${String(tileY)}`;
}

export class Room {
  readonly id: string;
  readonly map: ParsedMap;
  /** Tuiles d'encre tracées par le joueur, clés "tx,ty". */
  private readonly ink = new Set<string>();

  constructor(id: string, map: ParsedMap) {
    this.id = id;
    this.map = map;
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

  /** Tuile solide « naturelle » (décor de la carte, hors encre). */
  isNaturalSolid(tileX: number, tileY: number): boolean {
    return gidAt(this.map, tileX, tileY) > 0;
  }

  /** Y a-t-il de l'encre tracée par le joueur en (tileX, tileY) ? */
  hasInk(tileX: number, tileY: number): boolean {
    return this.ink.has(key(tileX, tileY));
  }

  /**
   * La tuile est-elle traçable ? (dans la carte, vide de décor et d'encre).
   * La vérification de portée et de chevauchement avec le joueur est faite
   * par le jeu (game.ts) qui connaît la position du joueur.
   */
  isPaintable(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileX >= this.map.widthTiles || tileY < 0 || tileY >= this.map.heightTiles) {
      return false;
    }
    return !this.isNaturalSolid(tileX, tileY) && !this.hasInk(tileX, tileY);
  }

  paintInk(tileX: number, tileY: number): void {
    this.ink.add(key(tileX, tileY));
  }

  eraseInk(tileX: number, tileY: number): void {
    this.ink.delete(key(tileX, tileY));
  }

  /** Dalles d'encre fusionnées (pour un rendu en formes continues arrondies). */
  inkSlabs(): TileRect[] {
    return mergeSolidTiles(this.map.widthTiles, this.map.heightTiles, (x, y) => this.hasInk(x, y));
  }

  /**
   * Requête de solidité pour la physique : décor + encre tracée. Hors carte,
   * solide sur les côtés et en dessous (on ne quitte pas la page), ouvert au-dessus.
   */
  readonly isSolid: SolidQuery = (tx, ty) => {
    if (tx < 0 || tx >= this.map.widthTiles) return true;
    if (ty >= this.map.heightTiles) return true;
    if (ty < 0) return false;
    return this.isNaturalSolid(tx, ty) || this.hasInk(tx, ty);
  };
}
