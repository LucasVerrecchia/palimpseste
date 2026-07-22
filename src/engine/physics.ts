/**
 * Physique AABB avec collision *swept* contre une grille de tuiles (spec §4).
 *
 * Principe anti-tunneling : au lieu de déplacer le corps puis de résoudre les
 * chevauchements (méthode qui laisse passer les murs à grande vitesse), on
 * balaie colonne par colonne (axe X) puis ligne par ligne (axe Y) toutes les
 * tuiles traversées par le mouvement. La première tuile solide rencontrée
 * arrête le corps pile contre elle — il est donc impossible d'en traverser une,
 * quelle que soit la vitesse. Séparation par axe : X d'abord, puis Y.
 *
 * Fonctions pures : aucune dépendance au DOM, testées unitairement.
 */

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

export interface MoveResult {
  body: Body;
  /** Collision horizontale (mur) pendant ce déplacement. */
  hitX: boolean;
  /** Collision verticale (sol ou plafond) pendant ce déplacement. */
  hitY: boolean;
  /** Vrai si le corps a atterri (collision vers le bas). */
  grounded: boolean;
}

/** Le monde répond : la tuile (tx, ty) est-elle solide ? */
export type SolidQuery = (tileX: number, tileY: number) => boolean;

/**
 * Epsilon pour ne pas compter une tuile quand un bord est exactement aligné
 * sur sa frontière (un corps posé sur y=224 ne "touche" pas la ligne 224/16).
 */
const EPS = 1e-4;

function spanRange(start: number, size: number, tileSize: number): [number, number] {
  return [Math.floor((start + EPS) / tileSize), Math.floor((start + size - EPS) / tileSize)];
}

function anySolidInColumn(isSolid: SolidQuery, col: number, rowMin: number, rowMax: number): boolean {
  for (let row = rowMin; row <= rowMax; row++) {
    if (isSolid(col, row)) return true;
  }
  return false;
}

function anySolidInRow(isSolid: SolidQuery, row: number, colMin: number, colMax: number): boolean {
  for (let col = colMin; col <= colMax; col++) {
    if (isSolid(col, row)) return true;
  }
  return false;
}

/**
 * Déplace le corps selon sa vitesse pendant dt, en s'arrêtant contre les
 * tuiles solides. Retourne un nouveau corps (l'original n'est pas modifié) ;
 * la vitesse est annulée sur l'axe de chaque collision.
 */
export function moveBody(body: Body, dtSeconds: number, isSolid: SolidQuery, tileSize: number): MoveResult {
  let { x, y, vx, vy } = body;
  const { w, h } = body;
  let hitX = false;
  let hitY = false;
  let grounded = false;

  // ---- Axe X : balayage des colonnes traversées ----
  const dx = vx * dtSeconds;
  if (dx > 0) {
    const [rowMin, rowMax] = spanRange(y, h, tileSize);
    const firstCol = Math.floor((x + w - EPS) / tileSize) + 1;
    const lastCol = Math.floor((x + w + dx - EPS) / tileSize);
    let blockedAt = -1;
    for (let col = firstCol; col <= lastCol; col++) {
      if (anySolidInColumn(isSolid, col, rowMin, rowMax)) {
        blockedAt = col;
        break;
      }
    }
    if (blockedAt >= 0) {
      x = blockedAt * tileSize - w;
      vx = 0;
      hitX = true;
    } else {
      x += dx;
    }
  } else if (dx < 0) {
    const [rowMin, rowMax] = spanRange(y, h, tileSize);
    const firstCol = Math.floor((x + EPS) / tileSize) - 1;
    const lastCol = Math.floor((x + dx + EPS) / tileSize);
    let blockedAt = -1;
    for (let col = firstCol; col >= lastCol; col--) {
      if (anySolidInColumn(isSolid, col, rowMin, rowMax)) {
        blockedAt = col;
        break;
      }
    }
    if (blockedAt >= 0) {
      x = (blockedAt + 1) * tileSize;
      vx = 0;
      hitX = true;
    } else {
      x += dx;
    }
  }

  // ---- Axe Y : balayage des lignes traversées (avec le x déjà résolu) ----
  const dy = vy * dtSeconds;
  if (dy > 0) {
    const [colMin, colMax] = spanRange(x, w, tileSize);
    const firstRow = Math.floor((y + h - EPS) / tileSize) + 1;
    const lastRow = Math.floor((y + h + dy - EPS) / tileSize);
    let blockedAt = -1;
    for (let row = firstRow; row <= lastRow; row++) {
      if (anySolidInRow(isSolid, row, colMin, colMax)) {
        blockedAt = row;
        break;
      }
    }
    if (blockedAt >= 0) {
      y = blockedAt * tileSize - h;
      vy = 0;
      hitY = true;
      grounded = true;
    } else {
      y += dy;
    }
  } else if (dy < 0) {
    const [colMin, colMax] = spanRange(x, w, tileSize);
    const firstRow = Math.floor((y + EPS) / tileSize) - 1;
    const lastRow = Math.floor((y + dy + EPS) / tileSize);
    let blockedAt = -1;
    for (let row = firstRow; row >= lastRow; row--) {
      if (anySolidInRow(isSolid, row, colMin, colMax)) {
        blockedAt = row;
        break;
      }
    }
    if (blockedAt >= 0) {
      y = (blockedAt + 1) * tileSize;
      vy = 0;
      hitY = true;
    } else {
      y += dy;
    }
  }

  return { body: { x, y, w, h, vx, vy }, hitX, hitY, grounded };
}

/** Le corps repose-t-il sur une tuile solide (sonde 1 epsilon sous les pieds) ? */
export function isOnGround(body: Body, isSolid: SolidQuery, tileSize: number): boolean {
  const [colMin, colMax] = spanRange(body.x, body.w, tileSize);
  const rowBelow = Math.floor((body.y + body.h + EPS) / tileSize);
  return anySolidInRow(isSolid, rowBelow, colMin, colMax);
}

/**
 * Le corps touche-t-il un mur solide sur son flanc gauche (-1) ou droit (+1) ?
 * Sonde 1 epsilon au-delà du bord, sur toute la hauteur du corps (pour ANCRE).
 */
export function isTouchingWall(body: Body, isSolid: SolidQuery, tileSize: number, side: 1 | -1): boolean {
  const [rowMin, rowMax] = spanRange(body.y, body.h, tileSize);
  const col =
    side > 0
      ? Math.floor((body.x + body.w + EPS) / tileSize)
      : Math.floor((body.x - EPS) / tileSize);
  return anySolidInColumn(isSolid, col, rowMin, rowMax);
}

/** Chevauchement de deux rectangles (utilitaire pour triggers/pickups). */
export function aabbOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
