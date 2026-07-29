/**
 * Peau narrative du liquide montant (zone 4, décision de Lucas 2026-07-29) :
 * même mécanique (`world/rising_hazard.ts`, même vitesse, même salle)
 * reskinnée selon le penchant choisi en marge_01 — même principe que
 * `resolveBossFlavor` : la variante la plus spécifique dont les `when`
 * correspondent aux flags l'emporte.
 *  - rature_jamais (RATURE) : le LIVRE déverse son encre pour ravaler le mot
 *    qui tente de s'émanciper.
 *  - sinon (POINT FINAL, ou indécis) : le TEMPLE inonde son puits pour
 *    piéger le visiteur.
 * Fonction pure, testée.
 */

export interface HazardFlavorVariant {
  when: Record<string, boolean>;
  name: string;
  /** Couleur de la surface — une des couleurs de la palette existante (aucune couleur inventée). */
  color: 'ink' | 'unwritten';
  /** Affiché à la première entrée dans la salle (cadre pourquoi ce liquide, ici, maintenant). */
  introNarration: string;
  /** Toast affiché quand la surface rattrape le joueur (même sévérité qu'une chute dans un gouffre). */
  catchMessage: string;
  /**
   * Nom affiché du robinet/bouton en haut du puits (demande de Lucas
   * 2026-07-29) : « robinet » a du sens pour de l'eau (le temple), pas pour
   * de l'encre (le livre) — un seul objet `valve` dans la salle, son libellé
   * change selon le chemin.
   */
  valveLabel: string;
  /** Narration affichée une fois le robinet/bouton actionné (arrête la montée pour de bon). */
  stopMessage: string;
  /**
   * Narration affichée en ramassant le trésor dans `salle_tresor` (derrière
   * le mur BRÈCHE tout en haut de `crue_01`, retour de Lucas 2026-07-29 :
   * « on ramasse un trésor au centre du temple »). [proposition]
   */
  treasureText: string;
  /**
   * Narration affichée juste après `treasureText`, au moment où le plafond
   * commence à s'effondrer (retour de Lucas : « le temple tremble et des
   * bouts du plafond tombent, on doit courir vite vers la sortie »).
   * [proposition]
   */
  collapseMessage: string;
  /** Toast affiché en cas d'écrasement par un bloc (même sévérité qu'ailleurs : retour au dernier encrier). */
  crushedMessage: string;
}

/** Comportement de repli — filet de sécurité si les données sont absentes/invalides. */
export const DEFAULT_HAZARD_FLAVOR: HazardFlavorVariant = {
  when: {},
  name: 'les eaux du temple',
  color: 'unwritten',
  introNarration: 'Les eaux du temple commencent déjà à monter.',
  catchMessage: 'Les eaux du temple se referment sur toi : le manuscrit te ramène à l\'encrier.',
  valveLabel: 'le robinet',
  stopMessage: 'Tu refermes le robinet. Te voilà au cœur du temple : les eaux cessent enfin de monter.',
  treasureText: 'Un trésor scellé depuis des siècles au cœur du temple.',
  collapseMessage: 'Le temple tremble : le plafond s\'effondre. Cours vers la sortie !',
  crushedMessage: 'Un bloc du plafond t\'écrase : le manuscrit te ramène à l\'encrier.',
};

export function resolveHazardFlavor(
  variants: readonly HazardFlavorVariant[],
  flags: Record<string, boolean | number>,
  fallback: HazardFlavorVariant = DEFAULT_HAZARD_FLAVOR,
): HazardFlavorVariant {
  let best: HazardFlavorVariant | null = null;
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
