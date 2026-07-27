/**
 * Une collecte est « complète » quand tous les fragments d'une salle ont
 * posé leur flag. Utilisé pour dériver une condition de progression (ex.
 * débloquer un palier de sortie) à partir d'un ensemble de fragments
 * data-driven, sans coder en dur leur nombre ni leurs noms. Fonction pure,
 * testée — même convention que `isBlankFilled` (narrative/deviation.ts).
 */
export function allFragmentsCollected(
  fragmentFlags: readonly string[],
  flags: Record<string, boolean | number>,
): boolean {
  return fragmentFlags.length > 0 && fragmentFlags.every((flag) => flags[flag] === true);
}
