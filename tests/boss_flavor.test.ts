import { describe, expect, it } from 'vitest';
import { DEFAULT_BOSS_FLAVOR, resolveBossFlavor, type BossFlavorVariant } from '../src/game/narrative/boss_flavor';

describe('resolveBossFlavor — même boss, peau narrative selon le penchant', () => {
  const variants: BossFlavorVariant[] = [
    {
      when: {},
      name: 'le Troll d\'Encre',
      label: 'T',
      introToast: 'Une créature de conte se dresse.',
      defeatToast: 'Le Troll d\'Encre est vaincu.',
      decor: 'creature',
    },
    {
      when: { rature_jamais: true },
      name: 'La Marge',
      label: 'M',
      introToast: 'La Marge elle-même se dresse.',
      defeatToast: 'La Marge est corrigée.',
      decor: 'hand_quill',
    },
  ];

  it('sans variantes → repli sur DEFAULT_BOSS_FLAVOR', () => {
    expect(resolveBossFlavor([], {})).toBe(DEFAULT_BOSS_FLAVOR);
  });

  it('sans flag (indécis) → variante de base (monstre de conte)', () => {
    expect(resolveBossFlavor(variants, {}).name).toBe('le Troll d\'Encre');
  });

  it('nom_ecrit seul (POINT FINAL) → variante de base (monstre de conte)', () => {
    expect(resolveBossFlavor(variants, { nom_ecrit: true }).name).toBe('le Troll d\'Encre');
  });

  it('rature_jamais → La Marge, la plus spécifique', () => {
    const flavor = resolveBossFlavor(variants, { rature_jamais: true });
    expect(flavor.name).toBe('La Marge');
    expect(flavor.decor).toBe('hand_quill');
  });

  it('un repli explicite remplace DEFAULT_BOSS_FLAVOR si fourni', () => {
    const fallback: BossFlavorVariant = {
      when: {},
      name: 'X',
      label: 'X',
      introToast: 'x',
      defeatToast: 'x',
      decor: 'creature',
    };
    expect(resolveBossFlavor([], {}, fallback)).toBe(fallback);
  });
});
