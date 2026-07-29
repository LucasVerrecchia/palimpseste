import { describe, expect, it } from 'vitest';
import { DEFAULT_HAZARD_FLAVOR, resolveHazardFlavor, type HazardFlavorVariant } from '../src/game/narrative/hazard_flavor';

describe('resolveHazardFlavor — même liquide montant, peau narrative selon le penchant', () => {
  const variants: HazardFlavorVariant[] = [
    {
      when: {},
      name: 'les eaux du temple',
      color: 'unwritten',
      introNarration: 'Le puits du temple commence à se remplir.',
      catchMessage: 'Le temple t\'engloutit.',
      valveLabel: 'le robinet',
      stopMessage: 'Le robinet se referme.',
      treasureText: 'Un trésor du temple.',
      collapseMessage: 'Le temple tremble.',
      crushedMessage: 'Un bloc t\'écrase.',
    },
    {
      when: { rature_jamais: true },
      name: 'l\'encre du livre',
      color: 'ink',
      introNarration: 'Le livre déverse son encre pour te ravaler dans la page.',
      catchMessage: 'Le livre te ravale.',
      valveLabel: 'le fermoir',
      stopMessage: 'Le fermoir se referme.',
      treasureText: 'Un trésor du livre.',
      collapseMessage: 'Le livre tremble.',
      crushedMessage: 'Une page t\'écrase.',
    },
  ];

  it('sans variantes → repli sur DEFAULT_HAZARD_FLAVOR', () => {
    expect(resolveHazardFlavor([], {})).toBe(DEFAULT_HAZARD_FLAVOR);
  });

  it('sans flag (indécis) → variante de base (le temple)', () => {
    expect(resolveHazardFlavor(variants, {}).name).toBe('les eaux du temple');
  });

  it('nom_ecrit seul (POINT FINAL) → variante de base (le temple)', () => {
    expect(resolveHazardFlavor(variants, { nom_ecrit: true }).name).toBe('les eaux du temple');
  });

  it('rature_jamais → le livre, la plus spécifique', () => {
    const flavor = resolveHazardFlavor(variants, { rature_jamais: true });
    expect(flavor.name).toBe('l\'encre du livre');
    expect(flavor.color).toBe('ink');
  });

  it('un repli explicite remplace DEFAULT_HAZARD_FLAVOR si fourni', () => {
    const fallback: HazardFlavorVariant = {
      when: {},
      name: 'X',
      color: 'ink',
      introNarration: 'x',
      catchMessage: 'x',
      valveLabel: 'x',
      stopMessage: 'x',
      treasureText: 'x',
      collapseMessage: 'x',
      crushedMessage: 'x',
    };
    expect(resolveHazardFlavor([], {}, fallback)).toBe(fallback);
  });
});
