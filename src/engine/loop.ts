/**
 * Boucle de jeu à pas de temps fixe (spec §2) : la logique tourne à fréquence
 * constante quel que soit le framerate d'affichage — jamais de physique
 * dépendante du refresh rate de l'écran.
 */

export interface LoopCallbacks {
  /** Logique du jeu, appelée à pas constant (dtSeconds fixe). */
  update(dtSeconds: number): void;
  /** Rendu, appelé une fois par frame ; alpha ∈ [0,1) = interpolation optionnelle. */
  render(alpha: number): void;
}

/** Pas logique : 60 Hz. */
export const FIXED_STEP_SECONDS = 1 / 60;

/**
 * Au-delà de ce retard accumulé on abandonne le rattrapage (onglet en arrière-plan,
 * lag machine) pour éviter la spirale de la mort où update ne rattrape jamais.
 */
const MAX_ACCUMULATED_SECONDS = 0.25;

/** Démarre la boucle. Retourne une fonction d'arrêt. */
export function startLoop(callbacks: LoopCallbacks): () => void {
  let accumulator = 0;
  let lastTime = performance.now();
  let running = true;

  function frame(now: number): void {
    if (!running) return;

    accumulator = Math.min(accumulator + (now - lastTime) / 1000, MAX_ACCUMULATED_SECONDS);
    lastTime = now;

    while (accumulator >= FIXED_STEP_SECONDS) {
      callbacks.update(FIXED_STEP_SECONDS);
      accumulator -= FIXED_STEP_SECONDS;
    }
    callbacks.render(accumulator / FIXED_STEP_SECONDS);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return () => {
    running = false;
  };
}
