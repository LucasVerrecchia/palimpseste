/**
 * Boîte de dialogue : pur affichage de l'état de la machine à états
 * (narrative/dialogue.ts). Aucune logique de transition ici.
 * Style « manuscrit moderne » : panneau arrondi, ombre portée, sérif.
 *
 * La hauteur du panneau est CALCULÉE d'après le nombre de lignes de texte et de
 * choix, pour que les réponses ne chevauchent jamais la réplique du PNJ.
 */
import { hexAlpha, INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE, RENDERING } from '../config';
import type { DialogueNode } from '../narrative/dialogue';

const BOX = { x: 14, margin: 12, bottom: 12 } as const;
const LINE_H = 13;
const CHOICE_H = 15;

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
  const choices = node.choices ?? [];

  // Mesure d'abord (police du corps) pour dimensionner le panneau.
  ctx.font = '11px Georgia, serif';
  const lines = wrapText(ctx, node.text, width - BOX.margin * 2);

  // Découpage vertical : en-tête (locuteur) → texte → choix (ou indice « E … »).
  const headerH = 26; // haut du panneau jusqu'au 1er interligne de texte
  const textH = lines.length * LINE_H;
  const choicesH = choices.length > 0 ? 8 + choices.length * CHOICE_H : 14;
  const height = headerH + textH + choicesH + 8;
  const y = INTERNAL_HEIGHT - height - BOX.bottom;

  // Panneau
  ctx.shadowColor = RENDERING.shadowColor;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = PALETTE.parchment;
  ctx.beginPath();
  ctx.roundRect(BOX.x, y, width, height, 9);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = hexAlpha(PALETTE.ink, 0.75);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(BOX.x + 0.75, y + 0.75, width - 1.5, height - 1.5, 9);
  ctx.stroke();

  // Locuteur
  ctx.fillStyle = PALETTE.sepia;
  ctx.font = 'italic bold 11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(node.speaker, BOX.x + BOX.margin, y + 16);
  const speakerWidth = ctx.measureText(node.speaker).width;
  ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(BOX.x + BOX.margin, y + 20);
  ctx.lineTo(BOX.x + BOX.margin + speakerWidth, y + 20);
  ctx.stroke();

  // Texte
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '11px Georgia, serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, BOX.x + BOX.margin, y + headerH + 8 + i * LINE_H);
  });

  const choicesTop = y + headerH + textH + 6;
  if (choices.length > 0) {
    // Choix SOUS le texte (jamais dessus), navigation ↑/↓, sélection surlignée.
    ctx.font = '10px Georgia, serif';
    choices.forEach((choice, i) => {
      const cy = choicesTop + 10 + i * CHOICE_H;
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
    ctx.fillText('E …', BOX.x + width - BOX.margin, y + height - 8);
  }
}
