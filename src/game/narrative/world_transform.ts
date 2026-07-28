/**
 * La « chambre des mots » (zone 3, Les Ratures) : le joueur compose une
 * phrase « Le/La ___ devint ___. » en portant deux mots (un sujet, un
 * attribut) jusqu'à une console. Même mécanique sur les deux chemins
 * narratifs, mais un sens différent (câblé dans game.ts, pas ici) :
 *  - RATURE : une phrase prévue devient réelle — le monde change.
 *  - POINT FINAL / indécis : une phrase prévue est le code qui ouvre la
 *    porte de sortie — rien ne change dans le monde, elle était déjà juste.
 *
 * Fonctions pures, sans I/O ni Canvas (spec §4/§8) — même famille que
 * `deviation.ts`/`fragments.ts`.
 */

export interface TransformWordDef {
  id: string;
  label: string;
  /** Genre grammatical, uniquement significatif pour un sujet (accord Le/La). */
  gender?: 'm' | 'f';
}

export interface WorldTransformation {
  subjectId: string;
  attributeId: string;
  /** Flag d'histoire posé quand cette phrase est validée (sur les deux chemins). */
  flag: string;
  /** Élément visuel concerné (ex. 'sun') — interprété par le rendu, pas ici. */
  target: string;
  colorHex: string;
  /**
   * Vrai pour l'unique combinaison qui ouvre la porte du temple (le
   * "code"). Data-driven plutôt qu'un couple sujet/attribut en dur dans
   * game.ts (2026-07-29) : changer le code n'importe où redevient une
   * modification de données, pas de logique.
   */
  isTempleCode?: boolean;
}

/**
 * Compose la phrase affichée dans le bandeau, avec l'accord Le/La selon le
 * genre du sujet en cours, et un blanc tant qu'un slot n'est pas rempli.
 */
export function composeTransformSentence(
  subject: TransformWordDef | null,
  attribute: TransformWordDef | null,
): string {
  const article = subject?.gender === 'f' ? 'La' : 'Le';
  const subjectText = subject?.label ?? '…';
  const attributeText = attribute?.label ?? '…';
  return `${article} ${subjectText} devint ${attributeText}.`;
}

/** Trouve la transformation prévue pour ce couple exact (sujet, attribut), s'il existe. */
export function resolveTransformation(
  transformations: readonly WorldTransformation[],
  subjectId: string,
  attributeId: string,
): WorldTransformation | null {
  return (
    transformations.find((t) => t.subjectId === subjectId && t.attributeId === attributeId) ?? null
  );
}

/**
 * Couleur effective d'un élément du monde (ex. le soleil) : la couleur d'une
 * transformation validée SI le joueur est sur le chemin RATURE, sinon la
 * couleur par défaut. Seul RATURE a le pouvoir de changer le monde pour de
 * vrai (voir en-tête du fichier) — le flag de la transformation, lui, est
 * posé sur les deux chemins (game.ts) : cette fonction est le seul endroit
 * où la règle « RATURE seul rend la phrase visible » s'applique.
 */
export function resolveWorldColor(
  target: string,
  transformations: readonly WorldTransformation[],
  flags: Record<string, boolean | number>,
  fallback: string,
): string {
  if (flags['rature_jamais'] !== true) return fallback;
  const active = transformations.find((t) => t.target === target && flags[t.flag] === true);
  return active?.colorHex ?? fallback;
}
