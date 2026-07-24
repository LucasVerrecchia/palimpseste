import { describe, expect, it } from 'vitest';
import { resolveBackdropKind } from '../src/game/world/backdrop';

describe('resolveBackdropKind', () => {
  it('couvre marge_01, chapitre_01 et ratures_01 avec le même fond', () => {
    expect(resolveBackdropKind('marge_01')).toBe('manuscrit');
    expect(resolveBackdropKind('chapitre_01')).toBe('manuscrit');
    expect(resolveBackdropKind('ratures_01')).toBe('manuscrit');
  });

  it('renvoie null pour une salle sans fond défini', () => {
    expect(resolveBackdropKind('salle_inconnue')).toBeNull();
  });
});
