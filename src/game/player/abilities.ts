/**
 * Pouvoirs = mots retrouvés. Les définitions (coût, effet) sont data-driven
 * dans data/abilities.json ; ce module n'expose que l'accès typé et l'état
 * de déblocage.
 */
import abilitiesJson from '../../data/abilities.json';

export interface AbilityDef {
  id: string;
  word: string;
  inkCost: number;
  effect: string;
  description: string;
}

const ABILITIES: readonly AbilityDef[] = abilitiesJson.abilities;

export function getAbility(id: string): AbilityDef | null {
  return ABILITIES.find((a) => a.id === id) ?? null;
}

export function hasAbility(unlocked: ReadonlySet<string>, id: string): boolean {
  return unlocked.has(id);
}
