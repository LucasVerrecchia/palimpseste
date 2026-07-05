/**
 * Boîte de dialogue : pur affichage de l'état de la machine à états
 * (narrative/dialogue.ts). Aucune logique de transition ici.
 */
import { INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE } from '../config';
import type { DialogueNode } from '../narrative/dialogue';

const BOX = { x: 8, height: 78, margin: 8 } as const;

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
  const y = INTERNAL_HEIGHT - BOX.height - BOX.x;

  ctx.fillStyle = PALETTE.parchment;
  ctx.fillRect(BOX.x, y, width, BOX.height);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(BOX.x + 1, y + 1, width - 2, BOX.height - 2);

  // Locuteur
  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic 10px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(node.speaker, BOX.x + BOX.margin, y + 14);

  // Texte
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '10px Georgia, serif';
  const lines = wrapText(ctx, node.text, width - BOX.margin * 2);
  lines.forEach((line, i) => {
    ctx.fillText(line, BOX.x + BOX.margin, y + 28 + i * 12);
  });

  const choices = node.choices ?? [];
  if (choices.length > 0) {
    // Choix alignés en bas de la boîte, navigation ↑/↓
    choices.forEach((choice, i) => {
      const cy = y + BOX.height - 8 - (choices.length - 1 - i) * 12;
      const isSelected = i === selectedChoice;
      ctx.fillStyle = isSelected ? PALETTE.danger : PALETTE.sepia;
      ctx.fillText(`${isSelected ? '> ' : '   '}${choice.text}`, BOX.x + BOX.margin + 8, cy);
    });
  } else {
    ctx.fillStyle = PALETTE.sepia;
    ctx.textAlign = 'right';
    ctx.fillText('E …', BOX.x + width - BOX.margin, y + BOX.height - 8);
  }
}
