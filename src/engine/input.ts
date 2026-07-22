/**
 * Entrées → actions abstraites (spec §4) : le jeu ne lit JAMAIS KeyboardEvent
 * directement, il interroge des actions. Les bindings sont remappables
 * (exigence d'accessibilité, §8) et basés sur KeyboardEvent.code : la position
 * physique des touches est identique en AZERTY et QWERTY.
 */

// Le tracé/effacement d'encre passe par la souris (voir engine/pointer.ts),
// pas par une action clavier. 'respawn' renvoie au dernier encrier. 'dash'
// n'existe que si HÂTE est débloqué (le jeu ignore l'action sinon).
export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'dash' | 'interact' | 'respawn';

export type Bindings = Record<string, Action>;

export const DEFAULT_BINDINGS: Bindings = {
  ArrowLeft: 'left',
  KeyA: 'left', // Q sur AZERTY (position physique)
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up', // Z sur AZERTY
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyE: 'interact',
  KeyR: 'respawn',
};

export class Input {
  private readonly down = new Set<Action>();
  private readonly pressed = new Set<Action>();
  private bindings: Bindings;

  constructor(bindings: Bindings = { ...DEFAULT_BINDINGS }) {
    this.bindings = bindings;
  }

  attach(target: Window): void {
    target.addEventListener('keydown', (e: KeyboardEvent) => {
      const action = this.bindings[e.code];
      if (action === undefined) return;
      e.preventDefault(); // ex. empêcher Espace de scroller la page
      if (!e.repeat && !this.down.has(action)) {
        this.pressed.add(action);
      }
      this.down.add(action);
    });
    target.addEventListener('keyup', (e: KeyboardEvent) => {
      const action = this.bindings[e.code];
      if (action === undefined) return;
      this.down.delete(action);
    });
    // Sécurité : si la fenêtre perd le focus, on relâche tout (sinon touche "collée").
    target.addEventListener('blur', () => {
      this.down.clear();
    });
  }

  /** L'action est-elle maintenue en ce moment ? */
  isDown(action: Action): boolean {
    return this.down.has(action);
  }

  /** L'action vient-elle d'être pressée cette frame (front montant) ? */
  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  /** À appeler en fin de frame logique pour consommer les fronts montants. */
  endFrame(): void {
    this.pressed.clear();
  }

  /** Remappe une touche (accessibilité). */
  rebind(code: string, action: Action): void {
    this.bindings[code] = action;
  }
}
