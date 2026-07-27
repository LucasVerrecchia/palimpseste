import { describe, expect, it } from 'vitest';
import { allFragmentsCollected } from '../src/game/narrative/fragments';

describe('allFragmentsCollected — condition de progression dérivée des fragments', () => {
  it('liste vide de flags requis → jamais complète', () => {
    expect(allFragmentsCollected([], {})).toBe(false);
    expect(allFragmentsCollected([], { fragment_x: true })).toBe(false);
  });

  it('tous les flags requis vrais → complète', () => {
    const flags = { fragment_1: true, fragment_2: true, fragment_3: true };
    expect(allFragmentsCollected(['fragment_1', 'fragment_2', 'fragment_3'], flags)).toBe(true);
  });

  it('un seul flag manquant → incomplète', () => {
    const flags = { fragment_1: true, fragment_2: true };
    expect(allFragmentsCollected(['fragment_1', 'fragment_2', 'fragment_3'], flags)).toBe(false);
  });

  it('un flag requis explicitement faux → incomplète', () => {
    const flags = { fragment_1: true, fragment_2: false, fragment_3: true };
    expect(allFragmentsCollected(['fragment_1', 'fragment_2', 'fragment_3'], flags)).toBe(false);
  });

  it('des flags surnuméraires non requis n\'influent pas', () => {
    const flags = { fragment_1: true, fragment_2: true, autre_flag: false };
    expect(allFragmentsCollected(['fragment_1', 'fragment_2'], flags)).toBe(true);
  });
});
