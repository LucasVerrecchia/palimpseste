/**
 * Point d'entrée : bootstrap du canvas en résolution interne + scaling entier.
 * Phase 0 : on affiche un écran placeholder dans la palette pour valider
 * la chaîne de rendu (résolution, pixel-perfect, mise à l'échelle).
 * La boucle à pas fixe et le renderer complet arrivent en Phase 1.
 */
import { computeIntegerScale } from './engine/scaling';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE } from './game/config';

function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = INTERNAL_WIDTH;
  canvas.height = INTERNAL_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('Canvas 2D non disponible dans ce navigateur.');
  }
  // Pixel-perfect côté contexte (le CSS image-rendering gère le côté affichage).
  ctx.imageSmoothingEnabled = false;

  document.body.appendChild(canvas);
  return { canvas, ctx };
}

/** Adapte la taille CSS du canvas à la fenêtre par facteur entier (×1, ×2, ×3...). */
function applyIntegerScaling(canvas: HTMLCanvasElement): void {
  const scale = computeIntegerScale(
    window.innerWidth,
    window.innerHeight,
    INTERNAL_WIDTH,
    INTERNAL_HEIGHT,
  );
  canvas.style.width = `${String(INTERNAL_WIDTH * scale)}px`;
  canvas.style.height = `${String(INTERNAL_HEIGHT * scale)}px`;
}

/** Écran placeholder Phase 0 : fond parchemin, cadre encre, titre. */
function drawPlaceholder(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PALETTE.parchment;
  ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

  // Marge de page, comme un feuillet de manuscrit.
  ctx.strokeStyle = PALETTE.parchmentShade;
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, INTERNAL_WIDTH - 24, INTERNAL_HEIGHT - 24);

  ctx.fillStyle = PALETTE.ink;
  ctx.font = '24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('PALIMPSESTE', INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2 - 8);

  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic 12px Georgia, serif';
  ctx.fillText(
    'Phase 0 — le manuscrit attend sa première phrase…',
    INTERNAL_WIDTH / 2,
    INTERNAL_HEIGHT / 2 + 16,
  );
}

function bootstrap(): void {
  const { canvas, ctx } = createCanvas();
  applyIntegerScaling(canvas);
  window.addEventListener('resize', () => {
    applyIntegerScaling(canvas);
  });
  drawPlaceholder(ctx);
}

bootstrap();
