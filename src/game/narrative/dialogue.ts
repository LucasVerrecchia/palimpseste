/**
 * Machine à états de dialogue, data-driven (spec §4) et pure : aucune I/O,
 * aucun accès DOM. Le contenu vit dans data/dialogues/*.json ; l'UI
 * (dialogue_box) ne fait qu'afficher l'état courant.
 *
 * Schéma d'un dialogue :
 *   { id, start, startVariants?, nodes: { [nodeId]: { speaker, text, next?, choices?, effects? } } }
 * - `next` absent et pas de choix → le dialogue se termine après ce nœud.
 * - `effects` d'un nœud sont produits quand on ENTRE dans ce nœud.
 * - Les choix peuvent porter leurs propres `effects` (produits à la sélection).
 * - `startVariants` (optionnel) : un PNJ **unique** peut réagir différemment
 *   selon les choix déjà faits par le joueur (storyFlags), sans que ce soit
 *   deux personnages contradictoires — même histoire, réaction différente.
 *   Même principe que `resolveSentence` (narrative/deviation.ts) : la
 *   variante la plus spécifique dont les conditions `when` sont remplies
 *   l'emporte ; à défaut, `start` sert de nœud de départ par défaut.
 */

export type DialogueEffect =
  | { type: 'set_flag'; flag: string; value: boolean | number }
  | { type: 'set_leaning'; delta: number };

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

/** Variante de nœud de départ : `start` utilisé quand tous les flags de `when` correspondent. */
export interface DialogueStartVariant {
  when: Record<string, boolean>;
  start: string;
}

export interface DialogueData {
  id: string;
  start: string;
  startVariants?: readonly DialogueStartVariant[];
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

export function startDialogue(data: DialogueData, startNodeId: string = data.start): DialogueStep {
  const node = nodeOrThrow(data, startNodeId);
  return { state: { nodeId: startNodeId }, effects: node.effects ?? [] };
}

/**
 * Résout le nœud de départ réel d'un dialogue selon les flags déjà posés
 * (storyFlags) : la variante la plus spécifique (le plus de conditions)
 * dont toutes les conditions `when` sont satisfaites l'emporte, sinon
 * `data.start`. Permet à un PNJ unique de réagir différemment à un choix
 * déjà fait sans dupliquer le personnage. Fonction pure, testée.
 */
export function resolveDialogueStart(data: DialogueData, flags: Record<string, boolean | number>): string {
  let best: string | null = null;
  let bestScore = -1;
  for (const variant of data.startVariants ?? []) {
    let matches = true;
    let score = 0;
    for (const [flag, expected] of Object.entries(variant.when)) {
      if ((flags[flag] === true) !== expected) {
        matches = false;
        break;
      }
      score++;
    }
    if (matches && score > bestScore) {
      best = variant.start;
      bestScore = score;
    }
  }
  return best ?? data.start;
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
  for (const variant of data.startVariants ?? []) check(variant.start, 'startVariants');
  return data;
}
