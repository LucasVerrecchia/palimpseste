/**
 * Carte des événements du jeu (spec §2 : bus d'événements).
 * Les systèmes émettent/écoutent ces événements au lieu de s'appeler entre eux.
 */
import { EventBus } from '../engine/events';

export interface GameEvents extends Record<string, unknown> {
  ability_unlocked: { id: string };
  ink_spent: { amount: number; remaining: number };
  ink_refilled: { max: number };
  npc_talked: { npcId: string };
  flag_set: { flag: string; value: boolean | number };
  room_entered: { roomId: string };
  /** `reason` distingue le contexte pour le toast affiché (wireToasts, game.ts). */
  game_saved: { roomId: string; reason: 'inkwell' | 'door' | 'manual' | 'auto' };
  ink_reclaimed: { amount: number };
  player_respawned: { x: number; y: number };
  /** Un mot-loi a été raturé (déviation vers RATURE). */
  canon_erased: { objectId: number; flag: string };
  /** Un blanc ▢ a été comblé (déviation vers POINT FINAL). */
  canon_completed: { objectId: number; flag: string };
  /** Le joueur atteint une sortie de chapitre. */
  chapter_ended: { ending: string };
  /** Un mur BRÈCHE a été ouvert : le filigrane transparaît. */
  breche_opened: { objectId: number; flag: string };
  /** Le mi-boss (la Coquille majuscule) est vaincu. */
  boss_defeated: { bossId: string };
}

export type GameEventBus = EventBus<GameEvents>;

export function createGameBus(): GameEventBus {
  return new EventBus<GameEvents>();
}
