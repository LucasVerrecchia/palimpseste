import { describe, expect, it } from 'vitest';
import {
  advanceDialogue,
  currentNode,
  parseDialogueData,
  startDialogue,
  type DialogueData,
} from '../src/game/narrative/dialogue';

const data: DialogueData = {
  id: 'test',
  start: 'a',
  nodes: {
    a: { speaker: 'X', text: 'Bonjour', next: 'b', effects: [{ type: 'set_flag', flag: 'salue', value: true }] },
    b: {
      speaker: 'X',
      text: 'Que veux-tu ?',
      choices: [
        { text: 'La vérité', next: 'c', effects: [{ type: 'set_flag', flag: 'verite', value: true }] },
        { text: 'Rien' },
      ],
    },
    c: { speaker: 'X', text: 'La voici.', effects: [{ type: 'set_flag', flag: 'entendu', value: 1 }] },
  },
};

describe('machine à états de dialogue', () => {
  it('démarre sur le nœud start et produit ses effets', () => {
    const step = startDialogue(data);
    expect(step.state.nodeId).toBe('a');
    expect(step.effects).toEqual([{ type: 'set_flag', flag: 'salue', value: true }]);
  });

  it('avance linéairement avec next', () => {
    const step = advanceDialogue(data, { nodeId: 'a' });
    expect(step.state.nodeId).toBe('b');
  });

  it('branche selon le choix et cumule les effets (choix + nœud d\'arrivée)', () => {
    const step = advanceDialogue(data, { nodeId: 'b' }, 0);
    expect(step.state.nodeId).toBe('c');
    expect(step.effects).toEqual([
      { type: 'set_flag', flag: 'verite', value: true },
      { type: 'set_flag', flag: 'entendu', value: 1 },
    ]);
  });

  it('un choix sans next termine le dialogue', () => {
    const step = advanceDialogue(data, { nodeId: 'b' }, 1);
    expect(step.state.nodeId).toBeNull();
  });

  it('un nœud final sans next termine le dialogue', () => {
    const step = advanceDialogue(data, { nodeId: 'c' });
    expect(step.state.nodeId).toBeNull();
    expect(currentNode(data, step.state)).toBeNull();
  });

  it('exige un choix sur un nœud à choix', () => {
    expect(() => advanceDialogue(data, { nodeId: 'b' })).toThrow();
  });

  it('rejette un index de choix hors limites', () => {
    expect(() => advanceDialogue(data, { nodeId: 'b' }, 5)).toThrow();
  });
});

describe('parseDialogueData — validation des données', () => {
  it('accepte un dialogue bien formé', () => {
    expect(parseDialogueData(JSON.parse(JSON.stringify(data)))).toBeTruthy();
  });

  it('rejette une référence next cassée', () => {
    const broken = {
      id: 'x',
      start: 'a',
      nodes: { a: { speaker: 's', text: 't', next: 'inexistant' } },
    };
    expect(() => parseDialogueData(broken)).toThrow(/inexistant/);
  });

  it('rejette un start cassé', () => {
    expect(() => parseDialogueData({ id: 'x', start: 'nope', nodes: {} })).toThrow();
  });

  it('rejette une racine invalide', () => {
    expect(() => parseDialogueData(null)).toThrow();
    expect(() => parseDialogueData('texte')).toThrow();
  });
});
