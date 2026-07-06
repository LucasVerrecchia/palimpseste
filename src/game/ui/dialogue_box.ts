/**
 * Boîte de dialogue : pur affichage de l'état de la machine à états
 * (narrative/dialogue.ts). Aucune logique de transition ici.
 * Style « manuscrit moderne » : panneau arrondi, ombre portée, sérif.
 */
import { hexAlpha, INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, RENDERING } from '../config';
import type { DialogueNode } from '../narrative/dialogue';

const BOX = { x: 14, height: 86, margin: 12 } as const;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(candidate).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

export function drawDialogueBox(
  ctx: CanvasRenderingContext2D,
  node: DialogueNode,
  selectedChoice: number,
): void {
  const width = INTERNAL_WIDTH - BOX.x * 2;
  const y = INTERNAL_HEIGHT - BOX.height - 12;

  // Panneau
  ctx.shadowColor = RENDERING.shadowColor;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = PALETTE.parchment;
  ctx.beginPath();
  ctx.roundRect(BOX.x, y, width, BOX.height, 9);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = hexAlpha(PALETTE.ink, 0.75);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(BOX.x + 0.75, y + 0.75, width - 1.5, BOX.height - 1.5, 9);
  ctx.stroke();

  // Locuteur
  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic bold 11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(node.speaker, BOX.x + BOX.margin, y + 17);
  const speakerWidth = ctx.measureText(node.speaker).width;
  ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(BOX.x + BOX.margin, y + 21);
  ctx.lineTo(BOX.x + BOX.margin + speakerWidth, y + 21);
  ctx.stroke();

  // Texte
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '11px Georgia, serif';
  const lines = wrapText(ctx, node.text, width - BOX.margin * 2);
  lines.forEach((line, i) => {
    ctx.fillText(line, BOX.x + BOX.margin, y + 35 + i * 13);
  });

  const choices = node.choices ?? [];
  if (choices.length > 0) {
    // Choix en bas de boîte, navigation ↑/↓, sélection surlignée
    ctx.font = '10px Georgia, serif';
    choices.forEach((choice, i) => {
      const cy = y + BOX.height - 9 - (choices.length - 1 - i) * 14;
      const isSelected = i === selectedChoice;
      if (isSelected) {
        const w = ctx.measureText(choice.text).width + 20;
        ctx.fillStyle = hexAlpha(PALETTE.danger, 0.1);
        ctx.beginPath();
        ctx.roundRect(BOX.x + BOX.margin + 2, cy - 10, w, 13, 6.5);
        ctx.fill();
      }
      ctx.fillStyle = isSelected ? PALETTE.danger : PALETTE.sepia;
      ctx.fillText(`${isSelected ? '› ' : '  '}${choice.text}`, BOX.x + BOX.margin + 8, cy);
    });
  } else {
    ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.8);
    ctx.font = 'italic 10px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText('E …', BOX.x + width - BOX.margin, y + BOX.height - 9);
  }
}
