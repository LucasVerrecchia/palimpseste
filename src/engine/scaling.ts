/**
 * Mise à l'échelle entière — fonction pure, testée unitairement.
 * Générique (engine/) : ne connaît rien de Palimpseste.
 */

/**
 * Plus grand facteur entier permettant d'afficher une surface base(W×H)
 * dans un conteneur sans déformation ni pixel fractionnaire.
 * Ne descend jamais sous 1 : mieux vaut déborder légèrement qu'afficher un canvas nul.
 */
export function computeIntegerScale(
  containerWidth: number,
  containerHeight: number,
  baseWidth: number,
  baseHeight: number,
): number {
  const scaleX = Math.floor(containerWidth / baseWidth);
  const scaleY = Math.floor(containerHeight / baseHeight);
  return Math.max(1, Math.min(scaleX, scaleY));
}
