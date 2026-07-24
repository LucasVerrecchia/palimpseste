/**
 * Fond lointain en parallaxe (décision D14, 2026-07-22). Décor continu,
 * présent partout dans la salle — contrairement au décor narratif de
 * `game.ts` (`renderParallaxDecor`, facteur 0.85), ponctuel et lié à un
 * évènement précis.
 *
 * Deux motifs avaient d'abord été posés séparément pour comparaison (un par
 * salle) : « palimpseste fantôme » (lignes d'écriture illisible) pour
 * marge_01, « paysage d'encre » (collines) pour chapitre_01. Retour de
 * Lucas : les deux plaisent, à combiner plutôt qu'à choisir — les lignes
 * lisent bien comme du vent une fois posées au-dessus des collines plutôt
 * qu'à leur place. Résultat : une seule scène, utilisée dans toutes les
 * salles, avec en plus arbres, oiseaux, soleil et nuages (retour de Lucas).
 *
 * 7 plans, du plus loin au plus proche (ordre de dessin = peintre) :
 * soleil → nuages → collines lointaines → traînées de vent → collines
 * intermédiaires → arbres → oiseaux. Tuilage horizontal via
 * `engine/parallax.ts` pour couvrir tout l'écran quelle que soit la caméra
 * (le soleil fait exception : un seul par salle, pas répété). Formes
 * vectorielles douces (D9), seed déterministe par tuile — même principe que
 * la lézarde des murs BRÈCHE (`renderCrack`, game.ts) — décalée par un hash
 * de l'id de salle pour que deux salles ne soient pas des copies exactes.
 */
import { seededRandom, tileIndicesCovering } from '../../engine/parallax';
import { BACKDROP, hexAlpha, INTERNAL_WIDTH, PALETTE } from '../config';

export type BackdropKind = 'manuscrit';

/** Salles couvertes par le fond. `Set` plutôt qu'un enum : pas d'autre motif pour l'instant. */
const BACKDROP_ROOMS = new Set(['marge_01', 'chapitre_01', 'ratures_01']);

/** Fonction pure isolée du canvas : testable seule, et seul endroit à toucher si une salle ne doit pas avoir de fond. */
export function resolveBackdropKind(roomId: string): BackdropKind | null {
  return BACKDROP_ROOMS.has(roomId) ? 'manuscrit' : null;
}

/** Petit hash de chaîne : décale les seeds par salle pour varier l'agencement sans changer la recette. */
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

// ---------- Éléments uniques (non tuilés) ----------

/** Soleil : un seul par salle, quasi immobile (facteur très lent appliqué par l'appelant). Rayons "dessinés" (DA D9). */
function drawSun(ctx: CanvasRenderingContext2D, roomWidth: number, roomHeight: number, roomSeed: number): void {
  const seed = roomSeed + 5000;
  const cx = roomWidth * (0.15 + seededRandom(seed) * 0.5);
  const cy = roomHeight * (0.14 + seededRandom(seed + 1) * 0.08);
  const r = 20;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8);
  glow.addColorStop(0, hexAlpha(PALETTE.sepia, 0.18));
  glow.addColorStop(1, hexAlpha(PALETTE.sepia, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  const rayCount = 8;
  const rayInner = r * 0.75;
  const rayOuter = r * 1.15;
  ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.3);
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + seededRandom(seed + 10 + i) * 0.15;
    const wobble = 0.85 + seededRandom(seed + 20 + i) * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rayInner, cy + Math.sin(angle) * rayInner);
    ctx.lineTo(cx + Math.cos(angle) * rayOuter * wobble, cy + Math.sin(angle) * rayOuter * wobble);
    ctx.stroke();
  }

  ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.35);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------- Plans tuilés ----------

/** Amas de nuages, façon touches rondes — motif clairsemé (certaines tuiles restent vides). */
function drawCloudTile(ctx: CanvasRenderingContext2D, tileX: number, tileWidth: number, roomHeight: number, roomSeed: number): void {
  const seed = Math.round(tileX) * 41 + roomSeed;
  if (seededRandom(seed) < 0.4) return;
  const cx = tileX + tileWidth * (0.2 + seededRandom(seed + 1) * 0.6);
  const cy = roomHeight * (0.08 + seededRandom(seed + 2) * 0.14);
  const puffs = 3 + Math.floor(seededRandom(seed + 3) * 2);

  ctx.fillStyle = hexAlpha(PALETTE.unwritten, 0.4);
  for (let i = 0; i < puffs; i++) {
    const ox = (i - (puffs - 1) / 2) * 11;
    const oy = seededRandom(seed + 4 + i) * 3;
    const r = 6 + seededRandom(seed + 8 + i) * 5;
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Traînée de vent : quelques traits ondulés, courts — les anciennes "lignes fantômes", reprises comme du vent dans le ciel. */
function drawWindTile(ctx: CanvasRenderingContext2D, tileX: number, tileWidth: number, roomHeight: number, roomSeed: number): void {
  const seed = Math.round(tileX) * 53 + roomSeed + 900;
  if (seededRandom(seed) < 0.3) return;
  const cx = tileX + seededRandom(seed + 1) * tileWidth;
  const cy = roomHeight * (0.1 + seededRandom(seed + 2) * 0.25);
  const width = 40 + seededRandom(seed + 3) * 20;
  const strands = 2 + Math.floor(seededRandom(seed + 4) * 2);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((seededRandom(seed + 5) - 0.5) * 0.1);
  ctx.strokeStyle = hexAlpha(PALETTE.unwritten, 0.5);
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < strands; i++) {
    const y = i * 5;
    const sag = (seededRandom(seed + i * 3 + 6) - 0.5) * 3;
    ctx.beginPath();
    ctx.moveTo(-width / 2, y);
    ctx.quadraticCurveTo(sag, y + 2, width / 2 - seededRandom(seed + i * 7) * 12, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Une colline en lavis, assez large pour raccorder avec ses voisines sans coupure visible. */
function drawHillTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileWidth: number,
  baseline: number,
  alpha: number,
  height: number,
  roomSeed: number,
): void {
  const seed = Math.round(tileX) * 23 + Math.round(height) + roomSeed;
  const peakX = tileX + tileWidth * (0.3 + seededRandom(seed) * 0.4);
  const peakY = baseline - height * (0.6 + seededRandom(seed + 1) * 0.7);

  ctx.fillStyle = hexAlpha(PALETTE.sepia, alpha);
  ctx.beginPath();
  ctx.moveTo(tileX, baseline);
  ctx.quadraticCurveTo(tileX + tileWidth * 0.15, baseline - height * 0.3, peakX, peakY);
  ctx.quadraticCurveTo(tileX + tileWidth * 0.75, baseline - height * 0.35, tileX + tileWidth, baseline);
  ctx.lineTo(tileX + tileWidth, baseline + 60);
  ctx.lineTo(tileX, baseline + 60);
  ctx.closePath();
  ctx.fill();
}

/** Silhouette d'arbre (tronc + houppier en amas de touffes + petites branches), posée sur la ligne d'horizon des collines intermédiaires. */
function drawTreeTile(ctx: CanvasRenderingContext2D, tileX: number, tileWidth: number, baseline: number, roomSeed: number): void {
  const seed = Math.round(tileX) * 61 + roomSeed + 300;
  if (seededRandom(seed) < 0.35) return;
  const cx = tileX + tileWidth * 0.5 + (seededRandom(seed + 1) - 0.5) * tileWidth * 0.5;
  const trunkH = 9 + seededRandom(seed + 2) * 6;
  const canopyR = 6 + seededRandom(seed + 3) * 5;
  const canopyY = baseline - trunkH - canopyR * 0.6;

  ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.3);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cx, baseline);
  ctx.lineTo(cx, baseline - trunkH);
  ctx.stroke();

  // Deux petites branches, esquissées avant le houppier pour lire "sous" les touffes.
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, baseline - trunkH * 0.55);
  ctx.lineTo(cx - canopyR * 0.5, baseline - trunkH * 0.8);
  ctx.moveTo(cx, baseline - trunkH * 0.7);
  ctx.lineTo(cx + canopyR * 0.45, baseline - trunkH * 0.95);
  ctx.stroke();

  // Houppier en amas de 3 touffes (au lieu d'un seul rond) pour une silhouette moins géométrique.
  ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.32);
  const lobes: Array<[number, number, number]> = [
    [0, 0, canopyR],
    [-canopyR * 0.7, canopyR * 0.25, canopyR * 0.7],
    [canopyR * 0.65, canopyR * 0.3, canopyR * 0.65],
  ];
  for (const [ox, oy, r] of lobes) {
    ctx.beginPath();
    ctx.arc(cx + ox, canopyY + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Quelques touches plus sombres pour suggérer le feuillage sans le détailler feuille à feuille.
  ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.22);
  for (let i = 0; i < 3; i++) {
    const a = seededRandom(seed + 10 + i) * Math.PI * 2;
    const dist = canopyR * (0.3 + seededRandom(seed + 14 + i) * 0.4);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * dist, canopyY + Math.sin(a) * dist * 0.7, canopyR * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Oiseau : deux traits en "m", ailes qui battent doucement (anime avec `time`). */
function drawBirdTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileWidth: number,
  roomHeight: number,
  roomSeed: number,
  time: number,
): void {
  const seed = Math.round(tileX) * 71 + roomSeed + 700;
  if (seededRandom(seed) < 0.4) return;
  const cx = tileX + seededRandom(seed + 1) * tileWidth;
  const cy = roomHeight * (0.12 + seededRandom(seed + 2) * 0.22);
  const flap = Math.sin(time * 2.4 + seededRandom(seed + 3) * Math.PI * 2) * 2.6;

  ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.4);
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - flap);
  ctx.quadraticCurveTo(cx - 2, cy - flap - 3, cx, cy);
  ctx.quadraticCurveTo(cx + 2, cy - flap - 3, cx + 6, cy - flap);
  ctx.stroke();
}

/** Dessine un plan tuilé : couvre toute la largeur de vue quelle que soit la caméra (`engine/parallax.ts`). */
function renderTiledLayer(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  factor: number,
  tileWidth: number,
  drawTile: (tileX: number, tileWidth: number) => void,
): void {
  const scrollX = cameraX * factor;
  ctx.save();
  ctx.translate(-scrollX, -cameraY * factor);
  for (const i of tileIndicesCovering(scrollX, INTERNAL_WIDTH, tileWidth)) {
    drawTile(i * tileWidth, tileWidth);
  }
  ctx.restore();
}

/**
 * Dessine le fond lointain de la salle courante (7 plans), s'il y en a un
 * pour cette salle. Appelée par `Game.render` juste après la texture
 * papier : les motifs sont volontairement translucides, pensés pour lire
 * "à travers" le parchemin plutôt que comme un calque opaque par-dessus.
 */
export function renderBackdrop(
  ctx: CanvasRenderingContext2D,
  roomId: string,
  cameraX: number,
  cameraY: number,
  roomWidth: number,
  roomHeight: number,
  time: number,
): void {
  if (resolveBackdropKind(roomId) === null) return;
  const roomSeed = hashSeed(roomId);
  const baseline = roomHeight * 0.72;

  ctx.save();
  ctx.translate(-cameraX * BACKDROP.sunFactor, -cameraY * BACKDROP.sunFactor);
  drawSun(ctx, roomWidth, roomHeight, roomSeed);
  ctx.restore();

  renderTiledLayer(ctx, cameraX, cameraY, BACKDROP.cloudsFactor, BACKDROP.cloudsTileWidth, (x, w) => {
    drawCloudTile(ctx, x, w, roomHeight, roomSeed);
  });
  renderTiledLayer(ctx, cameraX, cameraY, BACKDROP.mountainsFarFactor, BACKDROP.mountainsFarTileWidth, (x, w) => {
    drawHillTile(ctx, x, w, baseline, 0.07, 24, roomSeed);
  });
  renderTiledLayer(ctx, cameraX, cameraY, BACKDROP.windFactor, BACKDROP.windTileWidth, (x, w) => {
    drawWindTile(ctx, x, w, roomHeight, roomSeed);
  });
  renderTiledLayer(ctx, cameraX, cameraY, BACKDROP.mountainsMidFactor, BACKDROP.mountainsMidTileWidth, (x, w) => {
    drawHillTile(ctx, x, w, baseline, 0.12, 42, roomSeed);
  });
  renderTiledLayer(ctx, cameraX, cameraY, BACKDROP.treesFactor, BACKDROP.treesTileWidth, (x, w) => {
    drawTreeTile(ctx, x, w, baseline, roomSeed);
  });
  renderTiledLayer(ctx, cameraX, cameraY, BACKDROP.birdsFactor, BACKDROP.birdsTileWidth, (x, w) => {
    drawBirdTile(ctx, x, w, roomHeight, roomSeed, time);
  });
}
