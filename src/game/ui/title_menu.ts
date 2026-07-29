/**
 * Écran-titre : nouvelle partie / charger une partie / options (demande de
 * Lucas, 2026-07-28 — jusqu'ici le jeu démarrait directement en jeu, sans
 * menu). Pur affichage — la navigation et les actions vivent dans game.ts.
 *
 * « Nouvelle partie » démarre directement, SANS choisir d'emplacement : le
 * choix ne se fait qu'au moment de sauvegarder (menu pause) ou de charger
 * (ici) — retour de Lucas, 2026-07-28. Seule « Charger une partie » affiche
 * donc une liste d'emplacements (`ui/slot_list.ts`, partagée avec le menu
 * pause). « Options » (ajouté 2026-07-29, musique) affiche une vue partagée
 * avec le menu pause (`ui/options_menu.ts`), pas dessinée ici.
 */
import { hexAlpha, INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, RENDERING } from '../config';

export type TitleView = 'main' | 'load' | 'options';

export const TITLE_MENU_OPTIONS = ['Nouvelle partie', 'Charger une partie', 'Options'] as const;

const PANEL_WIDTH = 260;
// +22 (2026-07-29) : 3e option (Options) ajoutée, la hauteur fixe doit suivre.
const MAIN_HEIGHT = 130;
const MAIN_ROW_Y0 = 56;
const MAIN_ROW_H = 22;

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

export function drawTitleMain(ctx: CanvasRenderingContext2D, selected: number): void {
  ctx.fillStyle = hexAlpha(PALETTE.ink, 0.55);
  ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

  const width = PANEL_WIDTH;
  const x = (INTERNAL_WIDTH - width) / 2;
  const height = MAIN_HEIGHT;
  const y = (INTERNAL_HEIGHT - height) / 2;
  panel(ctx, x, y, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'italic bold 22px Georgia, serif';
  ctx.fillText('Palimpseste', x + width / 2, y + 32);

  ctx.font = '11px Georgia, serif';
  TITLE_MENU_OPTIONS.forEach((label, i) => {
    const oy = y + MAIN_ROW_Y0 + i * MAIN_ROW_H;
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

/** Option de l'écran-titre principal survolée/cliquée par la souris à (x, y) — coordonnées vue (480×270). */
export function hitTestTitleMain(x: number, y: number): number | null {
  const px = (INTERNAL_WIDTH - PANEL_WIDTH) / 2;
  const py = (INTERNAL_HEIGHT - MAIN_HEIGHT) / 2;
  for (let i = 0; i < TITLE_MENU_OPTIONS.length; i++) {
    const oy = py + MAIN_ROW_Y0 + i * MAIN_ROW_H;
    if (x >= px + 16 && x <= px + PANEL_WIDTH - 16 && y >= oy - 11 && y <= oy + 5) return i;
  }
  return null;
}
