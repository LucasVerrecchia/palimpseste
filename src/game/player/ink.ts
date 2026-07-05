/**
 * Ressource d'encre — logique pure (spec §4), testée unitairement.
 * Règle sombre : à sec, écrire puise dans les PV du joueur (le « délavage »).
 */

export interface InkState {
  current: number;
  max: number;
}

export interface SpendResult {
  ink: InkState;
  /** PV à retirer au joueur si l'encre ne suffisait pas (délavage). */
  healthCost: number;
}

export function createInk(max: number): InkState {
  return { current: max, max };
}

/**
 * Dépense `cost` d'encre. Si la réserve est insuffisante, le manque est
 * converti en coût de PV — écrire reste toujours possible, mais ça use l'être.
 */
export function spendInk(ink: InkState, cost: number): SpendResult {
  if (cost < 0) throw new Error('Coût d\'encre négatif');
  const paidWithInk = Math.min(cost, ink.current);
  return {
    ink: { current: ink.current - paidWithInk, max: ink.max },
    healthCost: cost - paidWithInk,
  };
}

/** Recharge complète (aux encriers / points de sauvegarde). */
export function refillInk(ink: InkState): InkState {
  return { current: ink.max, max: ink.max };
}
