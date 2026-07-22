/**
 * HUD : jauge d'encre, lexique des mots retrouvés, messages éphémères.
 * Style « manuscrit moderne » : pilules arrondies, ombres douces, sérif.
 * Dessiné au Canvas dans la palette — aucun asset.
 */
import { hexAlpha, INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, PLAYER, RENDERING } from '../config';
import type { InkState } from '../player/ink';

export interface Toast {
  text: string;
  ttl: number;
}

const GAUGE = { x: 12, y: 12, width: 74, height: 10 } as const;

/** Petit cœur vectoriel (une ligne, cohérent avec le style des icônes de pouvoir). */
function drawHeartIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = PALETTE.danger;
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.bezierCurveTo(-r * 1.6, -r * 0.5, -r, -r * 1.8, 0, -r * 0.7);
  ctx.bezierCurveTo(r, -r * 1.8, r * 1.6, -r * 0.5, 0, r);
  ctx.fill();
  ctx.restore();
}

export interface UnlockedAbilityChip {
  word: string;
  control: string;
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  ink: InkState,
  health: number,
  unlockedAbilities: readonly UnlockedAbilityChip[],
): void {
  // Jauge d'encre en pilule
  ctx.fillStyle = hexAlpha(PALETTE.ink, 0.1);
  ctx.beginPath();
  ctx.roundRect(GAUGE.x, GAUGE.y, GAUGE.width, GAUGE.height, GAUGE.height / 2);
  ctx.fill();
  const fillWidth = (ink.current / ink.max) * GAUGE.width;
  if (fillWidth > GAUGE.height) {
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.roundRect(GAUGE.x, GAUGE.y, fillWidth, GAUGE.height, GAUGE.height / 2);
    ctx.fill();
  } else if (fillWidth > 0) {
    // Trop court pour la pilule : petite goutte ronde
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(GAUGE.x + GAUGE.height / 2, GAUGE.y + GAUGE.height / 2, fillWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(GAUGE.x + 0.5, GAUGE.y + 0.5, GAUGE.width - 1, GAUGE.height - 1, GAUGE.height / 2);
  ctx.stroke();

  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic 9px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('encre', GAUGE.x + GAUGE.width + 6, GAUGE.y + GAUGE.height - 2);

  // PV : visibles seulement si entamés (contact ennemi/boss). Petit cœur +
  // texte "PV" à côté (retour de playtest 2026-07-22 : sans repère, on ne
  // devine pas que cette barre représente la vie).
  if (health < PLAYER.maxHealth) {
    ctx.fillStyle = hexAlpha(PALETTE.danger, 0.15);
    ctx.beginPath();
    ctx.roundRect(GAUGE.x, GAUGE.y + 15, GAUGE.width, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = PALETTE.danger;
    ctx.beginPath();
    ctx.roundRect(GAUGE.x, GAUGE.y + 15, (health / PLAYER.maxHealth) * GAUGE.width, 5, 2.5);
    ctx.fill();

    drawHeartIcon(ctx, GAUGE.x + GAUGE.width + 9, GAUGE.y + 17.5, 3.5);
    ctx.fillStyle = PALETTE.sepia;
    ctx.font = 'italic 9px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('PV', GAUGE.x + GAUGE.width + 16, GAUGE.y + 20);
  }

  // Lexique : mots retrouvés en chips, en haut à droite — mot + touche
  // affichée à côté (retour de playtest 2026-07-22 : sans ça, un pouvoir
  // ramassé mais dont on ignore la commande "ne sert à rien").
  unlockedAbilities.forEach(({ word, control }, i) => {
    ctx.font = 'italic bold 10px Georgia, serif';
    const wordWidth = ctx.measureText(word).width;
    ctx.font = '8px Georgia, serif';
    const controlWidth = ctx.measureText(control).width;
    const chipW = Math.max(wordWidth, controlWidth) + 14;
    const x = INTERNAL_WIDTH - 12 - chipW;
    const y = 12 + i * 26;
    ctx.fillStyle = hexAlpha(PALETTE.ink, 0.07);
    ctx.beginPath();
    ctx.roundRect(x, y, chipW, 22, 7);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 0.5, y + 0.5, chipW - 1, 21, 7);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'italic bold 10px Georgia, serif';
    ctx.fillStyle = PALETTE.sepia;
    ctx.fillText(word, x + chipW / 2, y + 10.5);
    ctx.font = '8px Georgia, serif';
    ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.75);
    ctx.fillText(control, x + chipW / 2, y + 19);
  });
}

export function drawToasts(ctx: CanvasRenderingContext2D, toasts: readonly Toast[]): void {
  ctx.font = '10px Georgia, serif';
  ctx.textAlign = 'center';
  toasts.forEach((toast, i) => {
    const textWidth = ctx.measureText(toast.text).width;
    const width = textWidth + 22;
    const x = INTERNAL_WIDTH / 2;
    const y = INTERNAL_HEIGHT - 24 - i * 22;
    ctx.globalAlpha = Math.min(1, toast.ttl * 2);
    ctx.shadowColor = RENDERING.shadowColor;
    ctx.shadowBlur = RENDERING.shadowBlur;
    ctx.fillStyle = hexAlpha(PALETTE.ink, 0.88);
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - 13, width, 18, 9);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.parchment;
    ctx.fillText(toast.text, x, y);
    ctx.globalAlpha = 1;
  });
}
