/**
 * Logique pure de la « déviation » : le cœur narratif du jeu (décision D11,
 * 2026-07-08). Chaque chapitre porte une phrase-loi gravée dans le décor ;
 * le joueur peut la dévier de deux gestes déjà connus —
 *   - RATURER un mot-loi (barrière-canon)     → penchant vers RATURE ;
 *   - COMBLER un blanc ▢ d'encre (compléter)   → penchant vers POINT FINAL.
 *
 * Ce module ne fait que des calculs purs (aucune I/O, aucun Canvas), pour
 * rester testable (spec §4/§8). L'orchestration (événements, save, rendu)
 * vit dans game.ts.
 */
import { TILE_SIZE } from '../config';
import type { TileCoord } from '../../engine/tilemap';

/** Rectangle en pixels monde (comme un RoomObject). */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tuiles couvertes par un rectangle en pixels. On prend les tuiles dont le
 * centre tombe dans le rectangle : un objet aligné sur la grille (le cas des
 * mots-loi générés) donne exactement ses tuiles, sans déborder d'une rangée.
 */
export function objectTiles(rect: PixelRect): TileCoord[] {
  const tiles: TileCoord[] = [];
  const x0 = Math.floor(rect.x / TILE_SIZE);
  const y0 = Math.floor(rect.y / TILE_SIZE);
  const x1 = Math.floor((rect.x + rect.width - 1) / TILE_SIZE);
  const y1 = Math.floor((rect.y + rect.height - 1) / TILE_SIZE);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) tiles.push({ x, y });
  }
  return tiles;
}

/**
 * Un blanc ▢ est « comblé » quand toutes ses tuiles portent de l'encre tracée
 * par le joueur : il a littéralement réécrit le mot manquant de la phrase.
 */
export function isBlankFilled(tiles: readonly TileCoord[], hasInk: (x: number, y: number) => boolean): boolean {
  return tiles.length > 0 && tiles.every((tile) => hasInk(tile.x, tile.y));
}

/**
 * Applique le penchant d'une déviation au scalaire `endingLeaning`
 * (<0 vers RATURE, >0 vers POINT FINAL). Fonction triviale mais nommée et
 * testée : c'est elle qui relie un geste de gameplay à la logique des fins.
 */
export function applyLeaning(current: number, delta: number): number {
  return current + delta;
}

/**
 * Une variante de la phrase-loi : une phrase entière et grammaticalement
 * cohérente, affichée quand toutes les conditions `when` sont satisfaites.
 */
export interface SentenceVariant {
  /** Flags requis : chaque clé doit valoir `true`/`false` comme indiqué. */
  when: Record<string, boolean>;
  text: string;
}

/**
 * Recompose la phrase-loi selon l'état de l'histoire (D11) : au lieu de rayer
 * des mots isolément (grammaire cassée), on choisit une phrase authoriale
 * entière. On retient la variante satisfaite la PLUS spécifique (le plus de
 * conditions) ; la variante sans condition (`when: {}`) sert de base par défaut.
 * Fonction pure et testée — c'est elle qui donne du sens aux choix du joueur.
 */
export function resolveSentence(
  variants: readonly SentenceVariant[],
  flags: Record<string, boolean | number>,
): string {
  let best: SentenceVariant | null = null;
  let bestScore = -1;
  for (const variant of variants) {
    let matches = true;
    let score = 0;
    for (const [flag, expected] of Object.entries(variant.when)) {
      if ((flags[flag] === true) !== expected) {
        matches = false;
        break;
      }
      score++;
    }
    if (matches && score > bestScore) {
      best = variant;
      bestScore = score;
    }
  }
  return best?.text ?? '';
}
