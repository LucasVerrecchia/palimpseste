/**
 * Menu Options (demande de Lucas, 2026-07-29 : « un menu options pour couper
 * la musique ou non ») : une seule bascule pour l'instant, plus « Retour ».
 * Accessible depuis l'écran-titre ET le menu pause (même vue partagée par
 * les deux, comme `ui/slot_list.ts`). Pur affichage — la navigation/les
 * actions vivent dans game.ts. Même géométrie que `ui/title_menu.ts`
 * (panneau/lignes), pour rester visuellement cohérent.
 */
import { hexAlpha, INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, RENDERING } from '../config';

const PANEL_WIDTH = 240;
const PANEL_HEIGHT = 108;
const ROW_Y0 = 56;
const ROW_H = 22;
const ROW_COUNT = 2; // bascule musique, retour

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.shadowColor = RENDERING.shadowColor;
  ctx.shadowBlur = 12;
  ctx.fillStyle = PALETTE.parchment;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexAlpha(PALETTE.ink, 0.75);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, 10);
  ctx.stroke();
}

function optionLabels(musicMuted: boolean): readonly [string, string] {
  return [musicMuted ? 'Musique : coupée (rétablir)' : 'Musique : activée (couper)', 'Retour'];
}

export function drawOptionsMenu(ctx: CanvasRenderingContext2D, selected: number, musicMuted: boolean): void {
  ctx.fillStyle = hexAlpha(PALETTE.ink, 0.5);
  ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

  const width = PANEL_WIDTH;
  const x = (INTERNAL_WIDTH - width) / 2;
  const y = (INTERNAL_HEIGHT - PANEL_HEIGHT) / 2;
  panel(ctx, x, y, width, PANEL_HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic bold 13px Georgia, serif';
  ctx.fillText('Options', x + width / 2, y + 32);

  ctx.font = '11px Georgia, serif';
  optionLabels(musicMuted).forEach((label, i) => {
    const oy = y + ROW_Y0 + i * ROW_H;
    const isSelected = i === selected;
    if (isSelected) {
      const w = ctx.measureText(label).width + 24;
      ctx.fillStyle = hexAlpha(PALETTE.danger, 0.12);
      ctx.beginPath();
      ctx.roundRect(x + width / 2 - w / 2, oy - 11, w, 16, 8);
      ctx.fill();
    }
    ctx.fillStyle = isSelected ? PALETTE.danger : PALETTE.ink;
    ctx.fillText(`${isSelected ? '› ' : ''}${label}`, x + width / 2, oy);
  });
}

/** Option du menu Options survolée/cliquée à (x, y) — coordonnées vue (480×270). */
export function hitTestOptionsMenu(x: number, y: number): number | null {
  const py = (INTERNAL_HEIGHT - PANEL_HEIGHT) / 2;
  const px = (INTERNAL_WIDTH - PANEL_WIDTH) / 2;
  for (let i = 0; i < ROW_COUNT; i++) {
    const oy = py + ROW_Y0 + i * ROW_H;
    if (x >= px + 16 && x <= px + PANEL_WIDTH - 16 && y >= oy - 11 && y <= oy + 5) return i;
  }
  return null;
}
