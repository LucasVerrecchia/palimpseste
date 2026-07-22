/**
 * Ressource d'encre — logique pure (spec §4), testée unitairement.
 *
 * Le « délavage » (dépenser des PV à sec, D10) a été retiré après playtest
 * (2026-07-22, retour direct de Lucas) : à sec, on ne peut plus tracer du
 * tout — il faut effacer un tracé existant (remboursé) ou revenir à un
 * encrier. Plus simple à lire pour le joueur qu'une pénalité cachée.
 */

export interface InkState {
  current: number;
  max: number;
}

export function createInk(max: number): InkState {
  return { current: max, max };
}

/** La réserve suffit-elle pour dépenser `cost` ? À vérifier avant `spendInk`. */
export function canAfford(ink: InkState, cost: number): boolean {
  if (cost < 0) throw new Error('Coût d\'encre négatif');
  return ink.current >= cost;
}

/** Dépense `cost` d'encre. Appelant responsable d'avoir vérifié `canAfford`. */
export function spendInk(ink: InkState, cost: number): InkState {
  if (cost < 0) throw new Error('Coût d\'encre négatif');
  if (ink.current < cost) throw new Error('Encre insuffisante (vérifier canAfford avant spendInk)');
  return { current: ink.current - cost, max: ink.max };
}

/** Recharge complète (aux encriers / points de sauvegarde). */
export function refillInk(ink: InkState): InkState {
  return { current: ink.max, max: ink.max };
}

/**
 * Rembourse `amount` d'encre (effacement d'un bloc tracé), sans dépasser le max.
 */
export function reclaimInk(ink: InkState, amount: number): InkState {
  if (amount < 0) throw new Error('Remboursement d\'encre négatif');
  return { current: Math.min(ink.max, ink.current + amount), max: ink.max };
}
