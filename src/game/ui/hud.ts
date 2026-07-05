/**
 * HUD : jauge d'encre, lexique des mots retrouvés, messages éphémères.
 * Dessiné au Canvas dans la palette — aucun asset.
 */
import { INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, PLAYER } from '../config';
import type { InkState } from '../player/ink';

export interface Toast {
  text: string;
  ttl: number;
}

const GAUGE = { x: 8, y: 8, width: 64, height: 8 } as const;

export function drawHud(
  ctx: CanvasRenderingContext2D,
  ink: InkState,
  health: number,
  unlockedWords: readonly string[],
): void {
  // Jauge d'encre (l'encrier du HUD)
  ctx.fillStyle = PALETTE.parchmentShade;
  ctx.fillRect(GAUGE.x, GAUGE.y, GAUGE.width, GAUGE.height);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(GAUGE.x, GAUGE.y, Math.round((ink.current / ink.max) * GAUGE.width), GAUGE.height);
  ctx.strokeStyle = PALETTE.sepia;
  ctx.lineWidth = 1;
  ctx.strokeRect(GAUGE.x + 0.5, GAUGE.y + 0.5, GAUGE.width - 1, GAUGE.height - 1);
  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic 8px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('encre', GAUGE.x, GAUGE.y + GAUGE.height + 9);

  // PV : visibles seulement si entamés (le délavage)
  if (health < PLAYER.maxHealth) {
    ctx.fillStyle = PALETTE.parchmentShade;
    ctx.fillRect(GAUGE.x, GAUGE.y + 22, GAUGE.width, 4);
    ctx.fillStyle = PALETTE.danger;
    ctx.fillRect(GAUGE.x, GAUGE.y + 22, Math.round((health / PLAYER.maxHealth) * GAUGE.width), 4);
  }

  // Lexique : mots retrouvés, en haut à droite
  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic 9px Georgia, serif';
  ctx.textAlign = 'right';
  unlockedWords.forEach((word, i) => {
    ctx.fillText(word, INTERNAL_WIDTH - 8, 16 + i * 11);
  });
}

export function drawToasts(ctx: CanvasRenderingContext2D, toasts: readonly Toast[]): void {
  ctx.font = '10px Georgia, serif';
  ctx.textAlign = 'center';
  toasts.forEach((toast, i) => {
    const width = ctx.measureText(toast.text).width + 16;
    const x = INTERNAL_WIDTH / 2;
    const y = INTERNAL_HEIGHT - 20 - i * 18;
    ctx.fillStyle = PALETTE.ink;
    ctx.globalAlpha = Math.min(1, toast.ttl);
    ctx.fillRect(x - width / 2, y - 12, width, 16);
    ctx.fillStyle = PALETTE.parchment;
    ctx.fillText(toast.text, x, y);
    ctx.globalAlpha = 1;
  });
}
