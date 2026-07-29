/**
 * Réglages persistants indépendants d'une partie (demande de Lucas,
 * 2026-07-29 : couper la musique doit rester vrai même après « Nouvelle
 * partie »/changement d'emplacement). Même mécanisme que `save.ts`
 * (engine/save.ts générique, schéma + validation ici), clé localStorage
 * séparée des emplacements de sauvegarde — une préférence d'appareil, pas une
 * progression de jeu.
 */

export const SETTINGS_KEY = 'palimpseste_settings';

export interface Settings {
  musicMuted: boolean;
}

export const DEFAULT_SETTINGS: Settings = { musicMuted: false };

/** Valide des réglages bruts. Retourne null (→ DEFAULT_SETTINGS) si la structure est invalide ou absente. */
export function parseSettings(raw: unknown): Settings | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj['musicMuted'] !== 'boolean') return null;
  return { musicMuted: obj['musicMuted'] };
}
