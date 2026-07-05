/**
 * Bus d'événements typé (spec §2) : les systèmes communiquent par événements
 * plutôt que par appels directs, pour rester découplés. Générique : le jeu
 * fournit sa propre carte d'événements (voir game/events.ts).
 */

export type EventHandler<TPayload> = (payload: TPayload) => void;

export class EventBus<TEvents extends Record<string, unknown>> {
  // Stockage interne volontairement effacé en `never` : la sûreté de type est
  // garantie par les signatures publiques de on() / emit().
  private readonly handlers = new Map<keyof TEvents, Set<EventHandler<never>>>();

  /** Abonne un handler. Retourne la fonction de désabonnement. */
  on<K extends keyof TEvents>(type: K, handler: EventHandler<TEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (set === undefined) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  emit<K extends keyof TEvents>(type: K, payload: TEvents[K]): void {
    const set = this.handlers.get(type);
    if (set === undefined) return;
    for (const handler of set) {
      (handler as EventHandler<TEvents[K]>)(payload);
    }
  }
}
