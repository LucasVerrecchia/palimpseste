/**
 * Persistance localStorage générique et versionnée (spec §4).
 * L'engine fournit le mécanisme (sérialisation + tolérance à la corruption) ;
 * le schéma, son numéro de version et sa migration appartiennent au jeu
 * (voir game/save.ts) via la fonction `parse` injectée.
 */

/** Sous-ensemble de l'API Storage — permet d'injecter un faux stockage en test. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveJson(storage: StorageLike, key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

/**
 * Charge et valide une sauvegarde. Retourne null (jamais d'exception) si la
 * clé est absente, le JSON corrompu, ou si `parse` rejette le contenu
 * (version inconnue, champs manquants) — le jeu repart alors de zéro.
 */
export function loadJson<T>(
  storage: StorageLike,
  key: string,
  parse: (raw: unknown) => T | null,
): T | null {
  const text = storage.getItem(key);
  if (text === null) return null;
  try {
    return parse(JSON.parse(text));
  } catch {
    return null;
  }
}

export function clearSave(storage: StorageLike, key: string): void {
  storage.removeItem(key);
}
