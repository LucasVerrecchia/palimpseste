/**
 * Abstraction Canvas 2D : résolution interne fixe, mise à l'échelle entière
 * vers l'écran, rendu pixel-perfect (aucun lissage).
 */
import { computeIntegerScale } from './scaling';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('Canvas 2D non disponible dans ce navigateur.');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Insère le canvas dans le DOM et branche l'adaptation à la fenêtre. */
  mount(parent: HTMLElement, target: Window): void {
    parent.appendChild(this.canvas);
    this.fitTo(target);
    target.addEventListener('resize', () => {
      this.fitTo(target);
    });
  }

  private fitTo(target: Window): void {
    const scale = computeIntegerScale(target.innerWidth, target.innerHeight, this.width, this.height);
    this.canvas.style.width = `${String(this.width * scale)}px`;
    this.canvas.style.height = `${String(this.height * scale)}px`;
  }
}
