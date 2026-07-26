import { describe, expect, it } from 'vitest';
import {
  applyLeaning,
  isBlankFilled,
  isDeviationLocked,
  objectTiles,
  resolveLeaning,
  resolveSentence,
  type SentenceVariant,
} from '../src/game/narrative/deviation';

describe('objectTiles — tuiles couvertes par un mot-loi', () => {
  it('un objet aligné sur la grille donne exactement ses tuiles', () => {
    // 32×16 px en (45*16, 9*16) = 2 tuiles côte à côte, rangée 9.
    expect(objectTiles({ x: 720, y: 144, width: 32, height: 16 })).toEqual([
      { x: 45, y: 9 },
      { x: 46, y: 9 },
    ]);
  });

  it('couvre un bloc rectangulaire (barrière 2×6)', () => {
    const tiles = objectTiles({ x: 54 * 16, y: 8 * 16, width: 32, height: 96 });
    expect(tiles).toHaveLength(12);
    expect(tiles[0]).toEqual({ x: 54, y: 8 });
    expect(tiles[tiles.length - 1]).toEqual({ x: 55, y: 13 });
  });
});

describe('isBlankFilled — blanc ▢ comblé d\'encre', () => {
  const tiles = [
    { x: 45, y: 9 },
    { x: 46, y: 9 },
  ];

  it('faux tant qu\'une tuile n\'a pas d\'encre', () => {
    const inked = new Set(['45,9']);
    expect(isBlankFilled(tiles, (x, y) => inked.has(`${String(x)},${String(y)}`))).toBe(false);
  });

  it('vrai quand toutes les tuiles portent de l\'encre', () => {
    const inked = new Set(['45,9', '46,9']);
    expect(isBlankFilled(tiles, (x, y) => inked.has(`${String(x)},${String(y)}`))).toBe(true);
  });

  it('un blanc vide (aucune tuile) n\'est jamais considéré comblé', () => {
    expect(isBlankFilled([], () => true)).toBe(false);
  });
});

describe('applyLeaning — geste → penchant de fin', () => {
  it('raturer penche vers RATURE (négatif)', () => {
    expect(applyLeaning(0, -1)).toBe(-1);
  });
  it('compléter penche vers POINT FINAL (positif)', () => {
    expect(applyLeaning(-1, 1)).toBe(0); // faire les deux → neutre (palimpseste)
  });
});

describe('isDeviationLocked — exclusivité mutuelle RATURE / POINT FINAL', () => {
  it('jamais verrouillé sans exclusiveWith (ex. « enfermé », obstacle neutre)', () => {
    expect(isDeviationLocked(undefined, { rature_jamais: true, nom_ecrit: true })).toBe(false);
  });

  it('déverrouillé tant que l\'autre voie n\'est pas engagée (le 3ᵉ cas "aucun des deux" reste possible)', () => {
    expect(isDeviationLocked('nom_ecrit', {})).toBe(false);
    expect(isDeviationLocked('rature_jamais', {})).toBe(false);
  });

  it('verrouillé une fois que l\'autre voie est engagée', () => {
    expect(isDeviationLocked('nom_ecrit', { nom_ecrit: true })).toBe(true);
    expect(isDeviationLocked('rature_jamais', { rature_jamais: true })).toBe(true);
  });
});

describe('resolveLeaning — quelle voie le joueur a empruntée', () => {
  it('aucun flag → indécise', () => {
    expect(resolveLeaning({})).toBe('indecise');
  });

  it('rature_jamais → rature', () => {
    expect(resolveLeaning({ rature_jamais: true })).toBe('rature');
  });

  it('nom_ecrit → point_final', () => {
    expect(resolveLeaning({ nom_ecrit: true })).toBe('point_final');
  });

  it('rature_jamais est prioritaire si les deux sont vrais (ne devrait pas arriver, exclusivité mutuelle)', () => {
    expect(resolveLeaning({ rature_jamais: true, nom_ecrit: true })).toBe('rature');
  });
});

describe('resolveSentence — la phrase recomposée selon les choix', () => {
  const variants: SentenceVariant[] = [
    { when: {}, text: 'BASE' },
    { when: { efface_enferme: true }, text: 'LIBERE' },
    { when: { efface_enferme: true, rature_jamais: true }, text: 'RATURE' },
    { when: { efface_enferme: true, nom_ecrit: true }, text: 'POINT' },
    { when: { efface_enferme: true, nom_ecrit: true, rature_jamais: true }, text: 'DEUX' },
  ];

  it('sans aucun flag → variante de base', () => {
    expect(resolveSentence(variants, {})).toBe('BASE');
  });

  it('« enfermé » raturé seul → variante libérée', () => {
    expect(resolveSentence(variants, { efface_enferme: true })).toBe('LIBERE');
  });

  it('choisit la variante la PLUS spécifique satisfaite', () => {
    expect(resolveSentence(variants, { efface_enferme: true, rature_jamais: true })).toBe('RATURE');
    expect(resolveSentence(variants, { efface_enferme: true, nom_ecrit: true })).toBe('POINT');
    expect(
      resolveSentence(variants, { efface_enferme: true, nom_ecrit: true, rature_jamais: true }),
    ).toBe('DEUX');
  });

  it('une condition à false doit être respectée (ne matche pas si le flag est vrai)', () => {
    const v: SentenceVariant[] = [
      { when: {}, text: 'BASE' },
      { when: { rature_jamais: false }, text: 'INTACT' },
    ];
    expect(resolveSentence(v, {})).toBe('INTACT'); // rature_jamais absent ≡ false
    expect(resolveSentence(v, { rature_jamais: true })).toBe('BASE');
  });
});
