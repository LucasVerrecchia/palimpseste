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
  game_saved: { roomId: string };
  platform_written: { objectId: number };
}

export type GameEventBus = EventBus<GameEvents>;

export function createGameBus(): GameEventBus {
  return new EventBus<GameEvents>();
}
