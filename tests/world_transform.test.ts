import { describe, expect, it } from 'vitest';
import {
  composeTransformSentence,
  resolveTransformation,
  resolveWorldColor,
  type WorldTransformation,
} from '../src/game/narrative/world_transform';
import chapterRatures01 from '../src/data/chapters/ratures_01.json';

const SOLEIL = { id: 'soleil', label: 'SOLEIL', gender: 'm' as const };
const PAGE = { id: 'page', label: 'PAGE', gender: 'f' as const };
const JAUNE = { id: 'jaune', label: 'jaune' };

const TRANSFORMATIONS: WorldTransformation[] = [
  { subjectId: 'soleil', attributeId: 'jaune', flag: 'monde_soleil_jaune', target: 'sun', colorHex: '#D9A441' },
];

describe('composeTransformSentence — accord Le/La et blancs', () => {
  it('sujet masculin → "Le"', () => {
    expect(composeTransformSentence(SOLEIL, JAUNE)).toBe('Le SOLEIL devint jaune.');
  });

  it('sujet féminin → "La"', () => {
    expect(composeTransformSentence(PAGE, JAUNE)).toBe('La PAGE devint jaune.');
  });

  it('les deux slots vides → "Le … devint ….', () => {
    expect(composeTransformSentence(null, null)).toBe('Le … devint ….');
  });

  it('seul le sujet rempli', () => {
    expect(composeTransformSentence(SOLEIL, null)).toBe('Le SOLEIL devint ….');
  });

  it('seul l\'attribut rempli (article par défaut tant qu\'aucun sujet n\'est posé)', () => {
    expect(composeTransformSentence(null, JAUNE)).toBe('Le … devint jaune.');
  });
});

describe('resolveTransformation — correspondance exacte', () => {
  it('couple prévu → renvoie la transformation', () => {
    expect(resolveTransformation(TRANSFORMATIONS, 'soleil', 'jaune')).toEqual(TRANSFORMATIONS[0]);
  });

  it('couple non prévu → null', () => {
    expect(resolveTransformation(TRANSFORMATIONS, 'soleil', 'rouge')).toBeNull();
    expect(resolveTransformation(TRANSFORMATIONS, 'page', 'jaune')).toBeNull();
  });

  it('liste vide → null', () => {
    expect(resolveTransformation([], 'soleil', 'jaune')).toBeNull();
  });
});

describe('resolveWorldColor — seul RATURE rend la phrase visible', () => {
  it('flag posé + rature_jamais → couleur de la transformation', () => {
    const flags = { monde_soleil_jaune: true, rature_jamais: true };
    expect(resolveWorldColor('sun', TRANSFORMATIONS, flags, '#000000')).toBe('#D9A441');
  });

  it('flag posé mais chemin POINT FINAL → repli (le monde ne change pas)', () => {
    const flags = { monde_soleil_jaune: true, nom_ecrit: true };
    expect(resolveWorldColor('sun', TRANSFORMATIONS, flags, '#000000')).toBe('#000000');
  });

  it('flag posé mais chemin indécis (ni l\'un ni l\'autre) → repli', () => {
    const flags = { monde_soleil_jaune: true };
    expect(resolveWorldColor('sun', TRANSFORMATIONS, flags, '#000000')).toBe('#000000');
  });

  it('rature_jamais vrai mais flag pas encore posé → repli', () => {
    const flags = { rature_jamais: true };
    expect(resolveWorldColor('sun', TRANSFORMATIONS, flags, '#000000')).toBe('#000000');
  });

  it('cible inconnue → repli', () => {
    const flags = { monde_soleil_jaune: true, rature_jamais: true };
    expect(resolveWorldColor('ground', TRANSFORMATIONS, flags, '#000000')).toBe('#000000');
  });
});

describe('data/chapters/ratures_01.json — toutes les combinaisons sont prévues (retour de Lucas 2026-07-27)', () => {
  const { subjects, attributes } = chapterRatures01.transformWords;
  const transformations = chapterRatures01.worldTransformations as WorldTransformation[];

  it('4 sujets × 3 attributs = 12 combinaisons, chacune avec un flag et une couleur hex distincts', () => {
    expect(transformations).toHaveLength(subjects.length * attributes.length);
    expect(new Set(transformations.map((t) => t.flag)).size).toBe(transformations.length);
    for (const t of transformations) expect(t.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('aucune paire sujet/attribut du stock de mots ne reste sans transformation prévue', () => {
    for (const subject of subjects) {
      for (const attribute of attributes) {
        expect(
          resolveTransformation(transformations, subject.id, attribute.id),
          `manquant : ${subject.id} + ${attribute.id}`,
        ).not.toBeNull();
      }
    }
  });

  it('le target de chaque transformation correspond à l\'id de son sujet (mapping 1:1 avec l\'élément visuel)', () => {
    for (const t of transformations) expect(t.target).toBe(t.subjectId);
  });

  it('exactement une combinaison est marquée isTempleCode (le code du temple, retour de Lucas 2026-07-29 : "personnage devint bleu", moins évident que l\'ancien "soleil devint jaune")', () => {
    const codeEntries = transformations.filter((t) => t.isTempleCode === true);
    expect(codeEntries).toHaveLength(1);
    expect(codeEntries[0]?.subjectId).toBe('personnage');
    expect(codeEntries[0]?.attributeId).toBe('bleu');
  });
});
