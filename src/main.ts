/**
 * Point d'entrée : bootstrap renderer + input clavier + souris + jeu,
 * puis boucle à pas fixe.
 */
import { Input } from './engine/input';
import { startLoop } from './engine/loop';
import { Pointer } from './engine/pointer';
import { Renderer } from './engine/renderer';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH, PALETTE } from './game/config';
import { Game } from './game/game';

const renderer = new Renderer(INTERNAL_WIDTH, INTERNAL_HEIGHT);
renderer.mount(document.body, window);

const input = new Input();
input.attach(window);

const pointer = new Pointer();
pointer.attach(renderer.canvas, window);

const game = new Game(input, pointer, renderer, window.localStorage);

startLoop({
  update: (dt) => {
    game.update(dt);
  },
  render: () => {
    renderer.beginFrame(PALETTE.ink, PALETTE.parchment);
    game.render(renderer.ctx);
    renderer.endFrame();
  },
});
