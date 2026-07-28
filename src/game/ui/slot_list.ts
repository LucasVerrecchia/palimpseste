/**
 * Liste des 3 emplacements de sauvegarde — panneau partagé entre l'écran-titre
 * (Charger une partie) et le menu pause (Sauvegarder, ajouté le 2026-07-28 :
 * retour de Lucas, le choix d'emplacement ne doit se faire QU'au moment de
 * sauvegarder/charger, jamais à la création d'une nouvelle partie). Pur
 * affichage — la navigation/les actions vivent dans game.ts.
 */
import { hexAlpha, INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, RENDERING } from '../config';

export interface SlotDisplay {
  slot: number;
  /** null = emplacement vide. */
  summary: string | null;
}

const PANEL_WIDTH = 260;
const ROW_H = 30;

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

/**
 * @param header Titre du panneau (ex. « Sauvegarder : quel emplacement ? », « Charger une partie »).
 * @param dimEmpty Grise les emplacements vides (ils ne sont pas sélectionnables, cas du chargement).
 * @param footer Indice en bas du panneau (ex. « Échap : retour »).
 */
export function drawSlotList(
  ctx: CanvasRenderingContext2D,
  header: string,
  selected: number,
  slots: readonly SlotDisplay[],
  pendingOverwriteSlot: number | null,
  dimEmpty: boolean,
  footer: string,
): void {
  ctx.fillStyle = hexAlpha(PALETTE.ink, 0.55);
  ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

  const width = PANEL_WIDTH;
  const x = (INTERNAL_WIDTH - width) / 2;
  const height = 40 + slots.length * ROW_H + 16;
  const y = Math.max(8, (INTERNAL_HEIGHT - height) / 2);
  panel(ctx, x, y, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic bold 13px Georgia, serif';
  ctx.fillText(header, x + width / 2, y + 20);

  slots.forEach((slot, i) => {
    const oy = y + 34 + i * ROW_H;
    const isSelected = i === selected;
    const isEmpty = slot.summary === null;
    const label = `Emplacement ${String(slot.slot)}`;

    if (isSelected) {
      ctx.fillStyle = hexAlpha(PALETTE.danger, 0.1);
      ctx.beginPath();
      ctx.roundRect(x + 12, oy - 11, width - 24, ROW_H - 6, 8);
      ctx.fill();
    }

    ctx.font = '11px Georgia, serif';
    ctx.fillStyle = isSelected ? PALETTE.danger : isEmpty && dimEmpty ? hexAlpha(PALETTE.sepia, 0.45) : PALETTE.ink;
    ctx.fillText(`${isSelected ? '› ' : ''}${label}`, x + width / 2, oy);

    ctx.font = 'italic 9px Georgia, serif';
    if (slot.slot === pendingOverwriteSlot) {
      ctx.fillStyle = PALETTE.danger;
      ctx.fillText('Rappuie sur E pour écraser cette sauvegarde', x + width / 2, oy + 11);
    } else {
      ctx.fillStyle = hexAlpha(PALETTE.sepia, isEmpty ? 0.5 : 0.85);
      ctx.fillText(isEmpty ? 'vide' : (slot.summary ?? ''), x + width / 2, oy + 11);
    }
  });

  ctx.font = 'italic 9px Georgia, serif';
  ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.7);
  ctx.fillText(footer, x + width / 2, y + height - 6);
}

/** Emplacement survolé/cliqué à (x, y) — coordonnées vue (480×270), géométrie identique à `drawSlotList`. */
export function hitTestSlotList(slotCount: number, x: number, y: number): number | null {
  const px = (INTERNAL_WIDTH - PANEL_WIDTH) / 2;
  const height = 40 + slotCount * ROW_H + 16;
  const py = Math.max(8, (INTERNAL_HEIGHT - height) / 2);
  for (let i = 0; i < slotCount; i++) {
    const oy = py + 34 + i * ROW_H;
    if (x >= px + 12 && x <= px + PANEL_WIDTH - 12 && y >= oy - 11 && y <= oy + ROW_H - 17) return i;
  }
  return null;
}
