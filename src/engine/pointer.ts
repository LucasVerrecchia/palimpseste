/**
 * Souris → état abstrait (générique, engine/). Le jeu convertit ensuite la
 * position écran en coordonnées monde via Renderer.screenToView + caméra.
 * On expose l'état « maintenu » des deux boutons (tracer / effacer) et la
 * dernière position connue du curseur.
 */

export class Pointer {
  clientX = 0;
  clientY = 0;
  private left = false;
  private right = false;
  /** Front montant du clic gauche (pour les clics de menu, pas le tracé — voir `drawing`). */
  private leftJustPressed = false;
  /** Vrai tant que le curseur est au-dessus de la surface de jeu. */
  inside = false;

  attach(element: HTMLElement, win: Window): void {
    element.addEventListener('mousemove', (e: MouseEvent) => {
      this.clientX = e.clientX;
      this.clientY = e.clientY;
      this.inside = true;
    });
    element.addEventListener('mousedown', (e: MouseEvent) => {
      this.clientX = e.clientX;
      this.clientY = e.clientY;
      this.inside = true;
      if (e.button === 0) {
        if (!this.left) this.leftJustPressed = true;
        this.left = true;
      }
      if (e.button === 2) this.right = true;
    });
    win.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button === 0) this.left = false;
      if (e.button === 2) this.right = false;
    });
    // Le clic droit sert à effacer : pas de menu contextuel.
    element.addEventListener('contextmenu', (e: Event) => {
      e.preventDefault();
    });
    element.addEventListener('mouseleave', () => {
      this.inside = false;
    });
    // Perte de focus : on relâche tout (évite un bouton « collé »).
    win.addEventListener('blur', () => {
      this.left = false;
      this.right = false;
    });
  }

  get drawing(): boolean {
    return this.left;
  }

  get erasing(): boolean {
    return this.right;
  }

  /** Le clic gauche vient d'être pressé cette frame (front montant) — clics de menu. */
  get leftClicked(): boolean {
    return this.leftJustPressed;
  }

  /** À appeler en fin de frame logique pour consommer le front montant (même principe qu'Input.endFrame). */
  endFrame(): void {
    this.leftJustPressed = false;
  }
}
