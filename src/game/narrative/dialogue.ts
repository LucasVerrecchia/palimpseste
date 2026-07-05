/**
 * Machine à états de dialogue, data-driven (spec §4) et pure : aucune I/O,
 * aucun accès DOM. Le contenu vit dans data/dialogues/*.json ; l'UI
 * (dialogue_box) ne fait qu'afficher l'état courant.
 *
 * Schéma d'un dialogue :
 *   { id, start, nodes: { [nodeId]: { speaker, text, next?, choices?, effects? } } }
 * - `next` absent et pas de choix → le dialogue se termine après ce nœud.
 * - `effects` d'un nœud sont produits quand on ENTRE dans ce nœud.
 * - Les choix peuvent porter leurs propres `effects` (produits à la sélection).
 */

export interface DialogueEffect {
  type: 'set_flag';
  flag: string;
  value: boolean | number;
}

export interface DialogueChoice {
  text: string;
  next?: string;
  effects?: DialogueEffect[];
}

export interface DialogueNode {
  speaker: string;
  text: string;
  next?: string;
  choices?: DialogueChoice[];
  effects?: DialogueEffect[];
}

export interface DialogueData {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

export interface DialogueState {
  /** Nœud courant ; null = dialogue terminé. */
  nodeId: string | null;
}

export interface DialogueStep {
  state: DialogueState;
  effects: DialogueEffect[];
}

function nodeOrThrow(data: DialogueData, nodeId: string): DialogueNode {
  const node = data.nodes[nodeId];
  if (node === undefined) {
    throw new Error(`Dialogue "${data.id}" : nœud introuvable "${nodeId}"`);
  }
  return node;
}

export function startDialogue(data: DialogueData): DialogueStep {
  const node = nodeOrThrow(data, data.start);
  return { state: { nodeId: data.start }, effects: node.effects ?? [] };
}

export function currentNode(data: DialogueData, state: DialogueState): DialogueNode | null {
  return state.nodeId === null ? null : nodeOrThrow(data, state.nodeId);
}

/**
 * Avance le dialogue. Pour un nœud à choix, `choiceIndex` est obligatoire.
 * Retourne le nouvel état + les effets produits par la transition
 * (effets du choix sélectionné, puis effets du nœud d'arrivée).
 */
export function advanceDialogue(
  data: DialogueData,
  state: DialogueState,
  choiceIndex?: number,
): DialogueStep {
  if (state.nodeId === null) return { state, effects: [] };
  const node = nodeOrThrow(data, state.nodeId);

  let nextId: string | undefined;
  const effects: DialogueEffect[] = [];

  if (node.choices !== undefined && node.choices.length > 0) {
    if (choiceIndex === undefined) {
      throw new Error(`Dialogue "${data.id}" : le nœud "${state.nodeId}" attend un choix`);
    }
    const choice = node.choices[choiceIndex];
    if (choice === undefined) {
      throw new Error(`Dialogue "${data.id}" : choix ${String(choiceIndex)} hors limites`);
    }
    effects.push(...(choice.effects ?? []));
    nextId = choice.next;
  } else {
    nextId = node.next;
  }

  if (nextId === undefined) {
    return { state: { nodeId: null }, effects };
  }
  const nextNode = nodeOrThrow(data, nextId);
  effects.push(...(nextNode.effects ?? []));
  return { state: { nodeId: nextId }, effects };
}

/**
 * Valide un JSON brut de dialogue (imports data/) : structure + intégrité des
 * références `next`. Échoue tôt avec un message clair plutôt qu'en plein jeu.
 */
export function parseDialogueData(raw: unknown): DialogueData {
  if (typeof raw !== 'object' || raw === null) throw new Error('Dialogue : racine invalide');
  const obj = raw as Record<string, unknown>;
  const id = obj['id'];
  const start = obj['start'];
  const nodes = obj['nodes'];
  if (typeof id !== 'string' || typeof start !== 'string' || typeof nodes !== 'object' || nodes === null) {
    throw new Error('Dialogue : champs id/start/nodes invalides');
  }

  const data = raw as DialogueData;
  const check = (nodeId: string | undefined, from: string): void => {
    if (nodeId !== undefined && data.nodes[nodeId] === undefined) {
      throw new Error(`Dialogue "${data.id}" : "${from}" référence un nœud inexistant "${nodeId}"`);
    }
  };
  check(data.start, 'start');
  for (const [nodeId, node] of Object.entries(data.nodes)) {
    check(node.next, nodeId);
    for (const choice of node.choices ?? []) check(choice.next, nodeId);
  }
  return data;
}
