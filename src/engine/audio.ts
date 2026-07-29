/**
 * Son : musique de fond bouclée (`HTMLAudioElement`) + effets sonores
 * synthétisés en Web Audio API (D9 : zéro asset généré par du code — seule la
 * musique est un vrai fichier, fourni par Lucas dans `src/fx/music`, les
 * bruitages sont de simples oscillateurs, pas de banque de sons à charger).
 *
 * Générique (engine/), aucune connaissance du jeu : `game.ts` construit les
 * instances, décide quand jouer quoi, et fournit les réglages (fréquences,
 * volumes) via `game/config.ts`.
 *
 * Non testé unitairement au-delà de `resolveChannelVolume` (API navigateur —
 * `HTMLAudioElement`/`AudioContext` n'existent pas en environnement de test,
 * même convention que Input/Pointer/Renderer).
 */

/** Volume effectif d'un canal : 0 si coupé, sinon volume de base multiplié par une atténuation temporaire (0..1, ex. menu pause ouvert). Pure, testée. */
export function resolveChannelVolume(muted: boolean, baseVolume: number, duckFactor: number): number {
  if (muted) return 0;
  return Math.max(0, Math.min(1, baseVolume * duckFactor));
}

/** Musique de fond bouclée, avec coupure et atténuation temporaire indépendantes. */
export class MusicPlayer {
  private readonly element: HTMLAudioElement;
  private readonly baseVolume: number;
  private muted: boolean;
  private duckFactor = 1;

  constructor(src: string, baseVolume: number, muted: boolean) {
    this.element = new Audio(src);
    this.element.loop = true;
    this.baseVolume = baseVolume;
    this.muted = muted;
    this.applyVolume();
  }

  /**
   * Tente de démarrer la lecture. Si l'autoplay est bloqué (politique
   * navigateur : aucun geste utilisateur encore reçu), réessaie une seule
   * fois au prochain clic/touche — pas besoin que l'appelant s'en soucie.
   */
  tryPlay(): void {
    this.element.play().catch(() => {
      const retry = (): void => {
        void this.element.play().catch(() => {});
      };
      window.addEventListener('pointerdown', retry, { once: true });
      window.addEventListener('keydown', retry, { once: true });
    });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolume();
  }

  /** Atténuation temporaire (0..1) — ex. menu pause ouvert. 1 = volume normal. */
  setDuckFactor(factor: number): void {
    this.duckFactor = factor;
    this.applyVolume();
  }

  private applyVolume(): void {
    this.element.volume = resolveChannelVolume(this.muted, this.baseVolume, this.duckFactor);
  }
}

/** Enveloppe d'un bruitage synthétisé : glissando de fréquence + décroissance du volume. */
export interface SfxTone {
  type: OscillatorType;
  startFreq: number;
  endFreq: number;
  durationSeconds: number;
  gain: number;
}

/** Joue de courts bruitages synthétisés (AudioContext créé paresseusement, au premier son demandé). */
export class SfxPlayer {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  play(tone: SfxTone): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (ctx === null) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = tone.type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(Math.max(1, tone.startFreq), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endFreq), now + tone.durationSeconds);
    gainNode.gain.setValueAtTime(tone.gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + tone.durationSeconds);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + tone.durationSeconds);
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx === null) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }
}
