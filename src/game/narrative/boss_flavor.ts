/**
 * Peau narrative du mi-boss (retour de playtest 2026-07-26) : le même boss
 * mécanique (`enemies/boss_coquille_majuscule.ts`, inchangé — mêmes phases,
 * mêmes stats) est reskinné selon le penchant choisi en marge_01 :
 * rature_jamais (on reste dans le méta) → on combat La Marge elle-même ;
 * sinon (POINT FINAL, ou indécis — on « joue le jeu du récit ») → un
 * monstre de conte inventé. Même principe que `resolveSentence`
 * (narrative/deviation.ts) : la variante la plus spécifique dont les `when`
 * correspondent aux flags l'emporte. Fonction pure, testée.
 */

export interface BossFlavorVariant {
  when: Record<string, boolean>;
  name: string;
  label: string;
  /**
   * Affiché la première fois que le joueur approche l'arène (audit narratif
   * 2026-07-26) : sans lui, rien n'expliquait pourquoi CETTE créature
   * précise barre la route à cet endroit précis (ex. « La Marge » réapparaît
   * en plein chapitre_01, une salle différente de la zone qu'elle nomme).
   */
  introToast: string;
  defeatToast: string;
  decor: 'hand_quill' | 'creature';
}

/** Comportement d'avant le reskin — filet de sécurité si les données sont absentes/invalides. */
export const DEFAULT_BOSS_FLAVOR: BossFlavorVariant = {
  when: {},
  name: 'la Coquille majuscule',
  label: 'C',
  introToast: 'La Coquille majuscule se dresse, mésorthographiée.',
  defeatToast: 'La Coquille majuscule est corrigée.',
  decor: 'hand_quill',
};

export function resolveBossFlavor(
  variants: readonly BossFlavorVariant[],
  flags: Record<string, boolean | number>,
  fallback: BossFlavorVariant = DEFAULT_BOSS_FLAVOR,
): BossFlavorVariant {
  let best: BossFlavorVariant | null = null;
  let bestScore = -1;
  for (const variant of variants) {
    let matches = true;
    let score = 0;
    for (const [flag, expected] of Object.entries(variant.when)) {
      if ((flags[flag] === true) !== expected) {
        matches = false;
        break;
      }
      score++;
    }
    if (matches && score > bestScore) {
      best = variant;
      bestScore = score;
    }
  }
  return best ?? fallback;
}
