/**
 * Schéma de sauvegarde du jeu (spec §4) + validation/migration.
 * Le mécanisme de stockage est dans engine/save.ts ; ici on ne définit que
 * le contrat de données et sa robustesse (version inconnue → null → new game).
 */

/** Nombre d'emplacements de sauvegarde proposés à l'écran-titre (2026-07-28). */
export const SAVE_SLOT_COUNT = 3;

/** Clé localStorage d'un emplacement (1..SAVE_SLOT_COUNT) — une partie indépendante par emplacement. */
export function saveKey(slot: number): string {
  return `palimpseste_save_${String(slot)}`;
}

// v3 : refonte du chapitre 1 (mécanique de déviation, D11) → nouvelle géométrie
// de marge_01. Les saves v2 restauraient un playerPos de l'ancien tracé (ex.
// encrier tout à droite) et faisaient réapparaître le joueur au mauvais endroit :
// parseSave les rejette → nouvelle partie propre au spawn de gauche.
export const SAVE_VERSION = 3;

export interface SaveData {
  version: typeof SAVE_VERSION;
  unlockedAbilities: string[];
  visitedRooms: string[];
  storyFlags: Record<string, boolean | number>;
  /** <0 penche vers RATURE, >0 vers POINT FINAL (utilisé en Phase 3). */
  endingLeaning: number;
  playerPos: { room: string; x: number; y: number };
  inkMax: number;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isFlagRecord(value: unknown): value is Record<string, boolean | number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((v) => typeof v === 'boolean' || typeof v === 'number');
}

/**
 * Valide une sauvegarde brute. Retourne null si la version est inconnue ou la
 * structure invalide — le jeu repartira alors d'une nouvelle partie plutôt que
 * de planter sur des données d'une vieille version.
 * (Quand SAVE_VERSION augmentera, les migrations v1→v2… s'ajouteront ici.)
 */
export function parseSave(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  if (obj['version'] !== SAVE_VERSION) return null;

  const pos = obj['playerPos'];
  if (typeof pos !== 'object' || pos === null) return null;
  const posObj = pos as Record<string, unknown>;

  if (
    !isStringArray(obj['unlockedAbilities']) ||
    !isStringArray(obj['visitedRooms']) ||
    !isFlagRecord(obj['storyFlags']) ||
    typeof obj['endingLeaning'] !== 'number' ||
    typeof obj['inkMax'] !== 'number' ||
    typeof posObj['room'] !== 'string' ||
    typeof posObj['x'] !== 'number' ||
    typeof posObj['y'] !== 'number'
  ) {
    return null;
  }

  return {
    version: SAVE_VERSION,
    unlockedAbilities: obj['unlockedAbilities'],
    visitedRooms: obj['visitedRooms'],
    storyFlags: obj['storyFlags'],
    endingLeaning: obj['endingLeaning'],
    playerPos: { room: posObj['room'], x: posObj['x'], y: posObj['y'] },
    inkMax: obj['inkMax'],
  };
}
