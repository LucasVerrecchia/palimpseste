/**
 * Salle : tilemap parsée + couche d'encre tracée par le joueur.
 * La couche d'encre est mutable (paint/erase à la souris) et vient s'ajouter
 * aux tuiles statiques pour la requête de solidité de la physique.
 */
import {
  filigraneGidAt,
  gidAt,
  mergeSolidTiles,
  type ParsedMap,
  type RoomObject,
  type TileCoord,
  type TileRect,
} from '../../engine/tilemap';
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
  /**
   * Barrières « canon » : tuiles du décor narratif imposé par l'Auteur,
   * solides tant qu'on ne les a pas RATURÉES (la phrase du chapitre). Clés
   * "tx,ty" → id de l'objet-canon, pour pouvoir effacer un mot d'un bloc.
   */
  private readonly canon = new Map<string, number>();
  /**
   * Murs BRÈCHE : tuiles "ground" spécifiquement marquées comme effaçables
   * par ce pouvoir (contrairement à un mur naturel, permanent). Clés "tx,ty"
   * → id de l'objet-mur (décision D11-bis, Phase 2). Une fois effacée, la
   * tuile bascule dans `revealed` : sa solidité et son rendu viennent
   * désormais du calque "filigrane" (le brouillon d'en dessous).
   */
  private readonly breche = new Map<string, number>();
  private readonly revealed = new Set<string>();

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

  /**
   * Solidité effective du décor : la tuile "ground" tant qu'elle n'a pas été
   * BRÈCHE-révélée, sinon la tuile "filigrane" qui transparaît dessous (peut
   * être vide → nouveau passage, ou solide → nouvel obstacle).
   */
  private isGroundOrFiligraneSolid(tileX: number, tileY: number): boolean {
    if (this.revealed.has(key(tileX, tileY))) {
      return filigraneGidAt(this.map, tileX, tileY) > 0;
    }
    return this.isNaturalSolid(tileX, tileY);
  }

  // ---------- Murs BRÈCHE (façade effaçable → filigrane) ----------

  /** Marque les tuiles d'un mur BRÈCHE comme effaçables (au chargement). */
  registerBrecheWall(objectId: number, tiles: readonly TileCoord[]): void {
    for (const tile of tiles) this.breche.set(key(tile.x, tile.y), objectId);
  }

  /** Id du mur BRÈCHE couvrant cette tuile (non encore révélé), ou null. */
  brecheAt(tileX: number, tileY: number): number | null {
    const k = key(tileX, tileY);
    if (this.revealed.has(k)) return null;
    return this.breche.get(k) ?? null;
  }

  /** Efface un mur BRÈCHE entier : ses tuiles basculent sur le filigrane dessous. */
  revealFiligrane(objectId: number): void {
    for (const [k, ownerId] of this.breche) {
      if (ownerId === objectId) this.revealed.add(k);
    }
  }

  isFiligraneRevealed(tileX: number, tileY: number): boolean {
    return this.revealed.has(key(tileX, tileY));
  }

  /** Dalles de décor "ground" actuellement solide (murs BRÈCHE non révélés inclus). */
  groundSlabs(): TileRect[] {
    return mergeSolidTiles(
      this.map.widthTiles,
      this.map.heightTiles,
      (x, y) => this.isNaturalSolid(x, y) && !this.revealed.has(key(x, y)),
    );
  }

  /** Dalles du filigrane révélé et solide (le brouillon qui transparaît). */
  filigraneSlabs(): TileRect[] {
    return mergeSolidTiles(
      this.map.widthTiles,
      this.map.heightTiles,
      (x, y) => this.revealed.has(key(x, y)) && filigraneGidAt(this.map, x, y) > 0,
    );
  }

  // ---------- Barrières canon (mots-loi solides et effaçables) ----------

  /** Marque les tuiles d'un mot-loi comme barrière solide (au chargement). */
  registerCanonBarrier(objectId: number, tiles: readonly TileCoord[]): void {
    for (const tile of tiles) this.canon.set(key(tile.x, tile.y), objectId);
  }

  /** Y a-t-il une barrière canon (non raturée) sur cette tuile ? */
  hasCanon(tileX: number, tileY: number): boolean {
    return this.canon.has(key(tileX, tileY));
  }

  /** Id du mot-loi couvrant cette tuile, ou null (pour cibler une rature). */
  canonAt(tileX: number, tileY: number): number | null {
    return this.canon.get(key(tileX, tileY)) ?? null;
  }

  /** Rature un mot-loi entier : ses tuiles cessent d'être solides. */
  eraseCanon(objectId: number): void {
    for (const [k, ownerId] of this.canon) {
      if (ownerId === objectId) this.canon.delete(k);
    }
  }

  /** Dalles canon fusionnées (rendu du décor imposé encore en place). */
  canonSlabs(): TileRect[] {
    return mergeSolidTiles(this.map.widthTiles, this.map.heightTiles, (x, y) => this.hasCanon(x, y));
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
    return (
      !this.isGroundOrFiligraneSolid(tileX, tileY) &&
      !this.hasInk(tileX, tileY) &&
      !this.hasCanon(tileX, tileY)
    );
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
    return this.isGroundOrFiligraneSolid(tx, ty) || this.hasInk(tx, ty) || this.hasCanon(tx, ty);
  };
}
