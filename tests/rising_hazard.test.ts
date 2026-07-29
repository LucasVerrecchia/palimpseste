import { describe, expect, it } from 'vitest';
import { advanceHazard, isCaughtByHazard } from '../src/game/world/rising_hazard';

describe('advanceHazard — la surface monte au cours du temps', () => {
  it('fait décroître Y proportionnellement au temps écoulé et à la vitesse', () => {
    expect(advanceHazard(500, 1, 10, 0)).toBe(490);
    expect(advanceHazard(500, 2.5, 10, 0)).toBe(475);
  });

  it('dt = 0 ne change rien', () => {
    expect(advanceHazard(500, 0, 10, 0)).toBe(500);
  });

  it('ne descend jamais sous minY (haut du puits)', () => {
    expect(advanceHazard(5, 10, 10, 0)).toBe(0);
    expect(advanceHazard(20, 1, 100, 16)).toBe(16);
  });
});

describe('isCaughtByHazard — contact avec la surface (générique : le point de référence est au choix de l\'appelant, ex. le centre du joueur pour "moitié submergé")', () => {
  it('rattrape dès que le point de référence atteint la surface', () => {
    expect(isCaughtByHazard(400, 400)).toBe(true);
  });

  it('rattrape si le point de référence est déjà passé sous la surface', () => {
    expect(isCaughtByHazard(420, 400)).toBe(true);
  });

  it('épargne tant que le point de référence reste strictement au-dessus', () => {
    expect(isCaughtByHazard(399, 400)).toBe(false);
  });
});
