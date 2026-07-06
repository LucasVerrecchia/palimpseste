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

export function drawHud(
  ctx: CanvasRenderingContext2D,
  ink: InkState,
  health: number,
  unlockedWords: readonly string[],
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

  // PV : visibles seulement si entamés (le délavage)
  if (health < PLAYER.maxHealth) {
    ctx.fillStyle = hexAlpha(PALETTE.danger, 0.15);
    ctx.beginPath();
    ctx.roundRect(GAUGE.x, GAUGE.y + 15, GAUGE.width, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = PALETTE.danger;
    ctx.beginPath();
    ctx.roundRect(GAUGE.x, GAUGE.y + 15, (health / PLAYER.maxHealth) * GAUGE.width, 5, 2.5);
    ctx.fill();
  }

  // Lexique : mots retrouvés en chips, en haut à droite
  ctx.font = 'italic 10px Georgia, serif';
  unlockedWords.forEach((word, i) => {
    const textWidth = ctx.measureText(word).width;
    const chipW = textWidth + 14;
    const x = INTERNAL_WIDTH - 12 - chipW;
    const y = 12 + i * 18;
    ctx.fillStyle = hexAlpha(PALETTE.ink, 0.07);
    ctx.beginPath();
    ctx.roundRect(x, y, chipW, 14, 7);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 0.5, y + 0.5, chipW - 1, 13, 7);
    ctx.stroke();
    ctx.fillStyle = PALETTE.sepia;
    ctx.textAlign = 'center';
    ctx.fillText(word, x + chipW / 2, y + 10.5);
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
