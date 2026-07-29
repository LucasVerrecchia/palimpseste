/**
 * Écran de fin (demande de Lucas, 2026-07-29 : la 2e porte de la salle aux
 * trésors doit mener « à l'extérieur du temple », la vraie fin du jeu
 * construit jusqu'ici, plutôt que de boucler sur crue_01).
 *
 * `drawEndingScreen` : POINT FINAL/indécis uniquement. Le texte de clôture
 * (« l'enfant rentre à son village... », `finalizeEnding`, game.ts) est déjà
 * affiché juste avant via `showNarration` ; cet écran ne fait que conclure
 * proprement, comme l'écran-titre, plutôt que de laisser le joueur planté
 * dans une salle vide sans plus rien à faire. La voie RATURE n'utilise plus
 * ce panneau : elle a sa propre cinématique (le personnage principal
 * s'éloigne, `renderEndingWalkAway`, game.ts) qui se termine sur
 * `drawRatureEndingText` ci-dessous, un fondu au noir plutôt qu'un panneau
 * parchemin — fin ouverte (« Fin... pour l'instant ! ») plutôt que
 * définitive.
 */
import { hexAlpha, INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, RENDERING } from '../config';

const PANEL_WIDTH = 280;
const PANEL_HEIGHT = 100;

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

export function drawEndingScreen(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = hexAlpha(PALETTE.ink, 0.55);
  ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

  const width = PANEL_WIDTH;
  const x = (INTERNAL_WIDTH - width) / 2;
  const height = PANEL_HEIGHT;
  const y = (INTERNAL_HEIGHT - height) / 2;
  panel(ctx, x, y, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'italic bold 22px Georgia, serif';
  ctx.fillText('Fin', x + width / 2, y + 34);

  ctx.font = '11px Georgia, serif';
  ctx.fillStyle = PALETTE.sepia;
  ctx.fillText('Voie choisie : le Point Final.', x + width / 2, y + 58);
  ctx.fillText('Appuie sur E, Espace ou clique pour revenir à l\'écran-titre.', x + width / 2, y + 78);
}

/**
 * Écran final de la cinématique RATURE : plein noir (le fondu, `renderEndingWalkAway`
 * dans game.ts, vient de le recouvrir entièrement), texte de clôture ouvert
 * plutôt que définitif — demande de Lucas 2026-07-29 : « Fin... pour
 * l'instant ! ».
 */
export function drawRatureEndingText(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = 'italic bold 22px Georgia, serif';
  ctx.fillText('Fin... pour l\'instant !', INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2 - 4);

  ctx.font = '11px Georgia, serif';
  ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.8);
  ctx.fillText(
    'Appuie sur E, Espace ou clique pour revenir à l\'écran-titre.',
    INTERNAL_WIDTH / 2,
    INTERNAL_HEIGHT / 2 + 20,
  );
}
