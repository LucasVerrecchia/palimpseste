/**
 * Pouvoirs = mots retrouvés. Les définitions (coût, effet) sont data-driven
 * dans data/abilities.json ; ce module n'expose que l'accès typé et l'état
 * de déblocage.
 */
import abilitiesJson from '../../data/abilities.json';

export interface AbilityDef {
  id: string;
  word: string;
  /** Coût en encre par tuile ; absent pour les pouvoirs de mouvement (leur
   * tuning vit dans game/config.ts, même convention que PHYSICS/INK). */
  inkCost?: number;
  effect: string;
  description: string;
  /** Touche/geste affiché dans le HUD et le menu pause (retour playtest 07-22). */
  control: string;
}

const ABILITIES: readonly AbilityDef[] = abilitiesJson.abilities;

/** Toutes les définitions (débloquées ou non) — pour le menu pause « Voir les pouvoirs ». */
export function allAbilities(): readonly AbilityDef[] {
  return ABILITIES;
}

export function getAbility(id: string): AbilityDef | null {
  return ABILITIES.find((a) => a.id === id) ?? null;
}

export function hasAbility(unlocked: ReadonlySet<string>, id: string): boolean {
  return unlocked.has(id);
}
