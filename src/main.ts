/**
 * Point d'entrée : bootstrap renderer + input + jeu, puis boucle à pas fixe.
 */
import { Input } from './engine/input';
import { startLoop } from './engine/loop';
import { Renderer } from './engine/renderer';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from './game/config';
import { Game } from './game/game';

const renderer = new Renderer(INTERNAL_WIDTH, INTERNAL_HEIGHT);
renderer.mount(document.body, window);

const input = new Input();
input.attach(window);

const game = new Game(input, window.localStorage);

startLoop({
  update: (dt) => {
    game.update(dt);
  },
  render: () => {
    game.render(renderer.ctx);
  },
});
