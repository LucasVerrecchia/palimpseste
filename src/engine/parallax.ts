/**
 * Aide générique au défilement en parallaxe (arrière-plans qui défilent plus
 * lentement que le premier plan, cf. `game/config.ts` `RENDERING.parallaxFactor`
 * et `BACKDROP`). Générique : ignore tout ce qui est motif/couleur — ça reste
 * dans game/ (D14). Le jeu applique son propre facteur au contexte
 * (`ctx.translate(-camera.x * factor, -camera.y * factor)`), puis appelle
 * cette fonction pour savoir à quels indices de tuile dessiner son motif afin
 * de couvrir toute la largeur de vue, quelle que soit la position caméra.
 */

/**
 * Indices entiers `i` tels que dessiner un motif de largeur `tileWidth` à
 * `x = i * tileWidth` couvre tout l'intervalle `[scrollX, scrollX + viewWidth]`,
 * avec une marge d'une tuile de chaque côté (évite un bord vide en cas
 * d'arrondi). `scrollX` est déjà le défilement après application du facteur
 * de parallaxe (`camera.x * factor`), pas la position caméra brute.
 */
export function tileIndicesCovering(scrollX: number, viewWidth: number, tileWidth: number): number[] {
  if (tileWidth <= 0) return [0];
  const first = Math.floor(scrollX / tileWidth) - 1;
  const last = Math.ceil((scrollX + viewWidth) / tileWidth) + 1;
  const indices: number[] = [];
  for (let i = first; i <= last; i++) indices.push(i);
  return indices;
}

/**
 * Bruit pseudo-aléatoire déterministe (même seed → même valeur, dans [0,1[).
 * Sert à varier un motif répété par tuile sans état à stocker ni dépendance —
 * même principe que la lézarde des murs BRÈCHE (`game.ts` `renderCrack`).
 */
export function seededRandom(seed: number): number {
  const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}
