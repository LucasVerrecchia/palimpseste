/**
 * Abstraction Canvas 2D — rendu vectoriel haute résolution.
 *
 * Le monde et l'UI restent exprimés en « unités monde » (vue de 480×270),
 * mais le canvas occupe toute la fenêtre à la résolution native de l'écran
 * (devicePixelRatio inclus) : les formes et le texte sont dessinés en
 * vectoriel, donc nets à n'importe quelle taille. La vue est letterboxée
 * pour préserver le ratio 16:9.
 */

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly viewWidth: number;
  readonly viewHeight: number;
  private target: Window | null = null;

  constructor(viewWidth: number, viewHeight: number) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('Canvas 2D non disponible dans ce navigateur.');
    }
    this.ctx = ctx;
  }

  mount(parent: HTMLElement, target: Window): void {
    this.target = target;
    parent.appendChild(this.canvas);
    this.resize();
    target.addEventListener('resize', () => {
      this.resize();
    });
  }

  private resize(): void {
    if (this.target === null) return;
    const dpr = this.target.devicePixelRatio;
    this.canvas.width = Math.round(this.target.innerWidth * dpr);
    this.canvas.height = Math.round(this.target.innerHeight * dpr);
    this.canvas.style.width = `${String(this.target.innerWidth)}px`;
    this.canvas.style.height = `${String(this.target.innerHeight)}px`;
  }

  /**
   * Prépare la frame : letterbox, transformation vue → écran, clip et fond.
   * Tout ce qui est dessiné ensuite l'est en coordonnées de vue (480×270).
   */
  beginFrame(letterboxColor: string, backgroundColor: string): void {
    if (this.target === null) return;
    const { ctx } = this;
    const dpr = this.target.devicePixelRatio;
    const screenW = this.target.innerWidth;
    const screenH = this.target.innerHeight;
    const scale = Math.min(screenW / this.viewWidth, screenH / this.viewHeight);
    const offsetX = (screenW - this.viewWidth * scale) / 2;
    const offsetY = (screenH - this.viewHeight * scale) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = letterboxColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.viewWidth, this.viewHeight);
    ctx.clip();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
  }

  endFrame(): void {
    this.ctx.restore();
  }

  /**
   * Convertit une position écran (px CSS, ex. MouseEvent.clientX/Y) en
   * coordonnées de vue (repère 480×270), en inversant la letterbox + l'échelle.
   * Le devicePixelRatio n'intervient pas : clientX/Y et innerWidth/Height sont
   * déjà en px CSS. Le jeu ajoute ensuite la position caméra pour obtenir le
   * repère monde.
   */
  screenToView(clientX: number, clientY: number): { x: number; y: number } {
    if (this.target === null) return { x: 0, y: 0 };
    const screenW = this.target.innerWidth;
    const screenH = this.target.innerHeight;
    const scale = Math.min(screenW / this.viewWidth, screenH / this.viewHeight);
    const offsetX = (screenW - this.viewWidth * scale) / 2;
    const offsetY = (screenH - this.viewHeight * scale) / 2;
    return { x: (clientX - offsetX) / scale, y: (clientY - offsetY) / scale };
  }
}

/** Ce dont le jeu a besoin pour projeter la souris dans le monde. */
export interface Viewport {
  screenToView(clientX: number, clientY: number): { x: number; y: number };
}
