/**
 * Menu pause (Échap) : recommencer le niveau, sauvegarder, voir les pouvoirs,
 * admin (aller à un niveau), quitter. Pur affichage — la navigation/les
 * actions vivent dans game.ts. Retour de playtest 2026-07-22 : aucun moyen de
 * relire les commandes des pouvoirs ni de recommencer une salle ratée.
 * Option Admin ajoutée le 2026-07-27. Option Sauvegarder ajoutée le
 * 2026-07-28 (demande de Lucas : le choix d'emplacement ne doit se faire
 * qu'au moment de sauvegarder/charger, pas à la création d'une partie) — vue
 * 'save', même liste d'emplacements que l'écran-titre (`ui/slot_list.ts`).
 */
import { hexAlpha, INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, RENDERING } from '../config';
import type { AbilityDef } from '../player/abilities';
import { drawSlotList, type SlotDisplay } from './slot_list';

export type PauseView = 'menu' | 'powers' | 'admin' | 'save';

export interface AdminRoom {
  id: string;
  label: string;
}

export const PAUSE_MENU_OPTIONS = [
  'Recommencer le niveau',
  'Sauvegarder',
  'Voir les pouvoirs',
  'Admin : aller à un niveau',
  'Quitter',
] as const;

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

export function drawPauseMenu(
  ctx: CanvasRenderingContext2D,
  view: PauseView,
  selected: number,
  abilities: readonly AbilityDef[],
  unlocked: ReadonlySet<string>,
  leaningLines: readonly [string, string],
  rooms: readonly AdminRoom[],
  currentRoomId: string,
  saveSlots: readonly SlotDisplay[],
  pendingOverwriteSlot: number | null,
): void {
  if (view === 'save') {
    drawSlotList(ctx, 'Sauvegarder : quel emplacement ?', selected, saveSlots, pendingOverwriteSlot, false, 'Échap : retour');
    return;
  }

  ctx.fillStyle = hexAlpha(PALETTE.ink, 0.5);
  ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

  const width = 220;
  const x = (INTERNAL_WIDTH - width) / 2;

  if (view === 'menu') {
    const height = 34 + 18 + PAUSE_MENU_OPTIONS.length * 22 + 8;
    const y = (INTERNAL_HEIGHT - height) / 2;
    panel(ctx, x, y, width, height);

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.sepia;
    ctx.font = 'italic bold 13px Georgia, serif';
    ctx.fillText('Pause', x + width / 2, y + 20);

    // Voie narrative actuelle (retour de playtest 2026-07-26) : repère
    // persistant et consultable à tout moment, contrairement au toast qui
    // s'affiche une fois puis disparaît.
    ctx.font = 'bold 9px Georgia, serif';
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(leaningLines[0], x + width / 2, y + 32);
    ctx.font = 'italic 8px Georgia, serif';
    ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.85);
    ctx.fillText(leaningLines[1], x + width / 2, y + 42);

    ctx.font = '11px Georgia, serif';
    PAUSE_MENU_OPTIONS.forEach((label, i) => {
      const oy = y + 42 + 18 + i * 22;
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
    return;
  }

  if (view === 'powers') {
    const rowH = 22;
    const height = 34 + abilities.length * rowH + 16;
    const y = Math.max(8, (INTERNAL_HEIGHT - height) / 2);
    panel(ctx, x, y, width, height);

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.sepia;
    ctx.font = 'italic bold 13px Georgia, serif';
    ctx.fillText('Pouvoirs', x + width / 2, y + 20);

    ctx.textAlign = 'left';
    abilities.forEach((ability, i) => {
      const oy = y + 38 + i * rowH;
      const has = unlocked.has(ability.id);
      ctx.font = 'italic bold 10px Georgia, serif';
      ctx.fillStyle = has ? PALETTE.ink : hexAlpha(PALETTE.sepia, 0.4);
      ctx.fillText(has ? ability.word : '？？？', x + 16, oy);
      ctx.font = '8px Georgia, serif';
      ctx.fillStyle = hexAlpha(PALETTE.sepia, has ? 0.9 : 0.4);
      ctx.fillText(has ? ability.control : 'à trouver', x + 16, oy + 10);
    });

    ctx.textAlign = 'center';
    ctx.font = 'italic 9px Georgia, serif';
    ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.7);
    ctx.fillText('E : retour', x + width / 2, y + height - 6);
    return;
  }

  // view === 'admin' : téléportation directe vers une salle (outil de test,
  // ajouté à la demande de Lucas — débloque tous les pouvoirs à l'arrivée
  // pour ne jamais se retrouver bloqué dans une salle qui en suppose déjà
  // d'acquis, ex. le gouffre AILES de ratures_01).
  const rowH = 20;
  const height = 34 + rooms.length * rowH + 16;
  const y = Math.max(8, (INTERNAL_HEIGHT - height) / 2);
  panel(ctx, x, y, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic bold 13px Georgia, serif';
  ctx.fillText('Admin : aller à...', x + width / 2, y + 20);

  ctx.font = '11px Georgia, serif';
  rooms.forEach((room, i) => {
    const oy = y + 30 + 18 + i * rowH;
    const isSelected = i === selected;
    const isCurrent = room.id === currentRoomId;
    const label = isCurrent ? `${room.label} (ici)` : room.label;
    if (isSelected) {
      const w = ctx.measureText(label).width + 24;
      ctx.fillStyle = hexAlpha(PALETTE.danger, 0.12);
      ctx.beginPath();
      ctx.roundRect(x + width / 2 - w / 2, oy - 11, w, 16, 8);
      ctx.fill();
    }
    ctx.fillStyle = isSelected ? PALETTE.danger : isCurrent ? hexAlpha(PALETTE.sepia, 0.7) : PALETTE.ink;
    ctx.textAlign = 'center';
    ctx.fillText(`${isSelected ? '› ' : ''}${label}`, x + width / 2, oy);
  });
}

const PANEL_WIDTH = 220;

/** Ligne cliquée par la souris à (x, y) parmi `count` options espacées de `rowH`, centrées sur `py0`. */
function rowHit(py0: number, rowH: number, count: number, x: number, y: number): number | null {
  const px = (INTERNAL_WIDTH - PANEL_WIDTH) / 2;
  for (let i = 0; i < count; i++) {
    const oy = py0 + i * rowH;
    if (x >= px + 16 && x <= px + PANEL_WIDTH - 16 && y >= oy - 11 && y <= oy + 5) return i;
  }
  return null;
}

/**
 * Option du menu pause survolée/cliquée à (x, y) — coordonnées vue (480×270).
 * Géométrie dupliquée de `drawPauseMenu` (vue 'menu') : à garder synchronisée.
 */
export function hitTestPauseMenu(x: number, y: number): number | null {
  const height = 34 + 18 + PAUSE_MENU_OPTIONS.length * 22 + 8;
  const py = (INTERNAL_HEIGHT - height) / 2;
  return rowHit(py + 60, 22, PAUSE_MENU_OPTIONS.length, x, y);
}

/**
 * Salle admin survolée/cliquée à (x, y). Géométrie dupliquée de
 * `drawPauseMenu` (vue 'admin') : à garder synchronisée.
 */
export function hitTestPauseAdmin(roomCount: number, x: number, y: number): number | null {
  const height = 34 + roomCount * 20 + 16;
  const py = Math.max(8, (INTERNAL_HEIGHT - height) / 2);
  return rowHit(py + 48, 20, roomCount, x, y);
}
