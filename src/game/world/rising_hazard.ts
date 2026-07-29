/**
 * Liquide montant (zone 4, décision de Lucas 2026-07-29) : une surface qui
 * s'élève en continu (Y décroît, l'axe Y grandissant vers le bas comme
 * partout ailleurs dans le projet) dans une salle verticale ; le joueur doit
 * s'y tracer ses propres plateformes d'encre plus vite qu'elle ne monte.
 * Fonctions pures, testées, même famille que `player/ink.ts` : la mise en
 * scène (couleur, texte selon le chemin narratif) vit dans
 * `narrative/hazard_flavor.ts`, l'orchestration (reset au respawn, rendu)
 * dans game.ts.
 */

/** Fait monter la surface de `riseSpeed` px/s ; ne remonte jamais au-delà de `minY` (haut du puits). */
export function advanceHazard(y: number, dtSeconds: number, riseSpeed: number, minY: number): number {
  return Math.max(minY, y - riseSpeed * dtSeconds);
}

/**
 * Le joueur est-il rattrapé ? Vrai dès que le point de référence donné
 * atteint ou dépasse la surface. `playerY` est au choix de l'appelant : les
 * pieds (rattrapé au premier contact) ou le centre du corps (rattrapé à
 * moitié submergé, retour de Lucas 2026-07-29 — au premier pixel touché,
 * « ça fait très expéditif »). game.ts utilise le centre.
 */
export function isCaughtByHazard(playerY: number, hazardY: number): boolean {
  return playerY >= hazardY;
}
