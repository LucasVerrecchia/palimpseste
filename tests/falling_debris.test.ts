import { describe, expect, it } from 'vitest';
import type { Body } from '../src/engine/physics';
import { FALLING_DEBRIS } from '../src/game/config';
import { createDebrisField, debrisHitsPlayer, stepDebrisField, type DebrisField } from '../src/game/world/falling_debris';

function playerBody(partial: Partial<Body> = {}): Body {
  return { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 0, ...partial };
}

const spawnPoints = [
  { x: 20, y: 0 },
  { x: 60, y: 0 },
];
const floorY = 1000;

describe('createDebrisField', () => {
  it('démarre vide, avec le délai initial', () => {
    const field = createDebrisField();
    expect(field.pieces).toHaveLength(0);
    expect(field.spawnTimer).toBe(FALLING_DEBRIS.initialDelaySeconds);
  });
});

describe('stepDebrisField — chute périodique en rotation', () => {
  it('ne fait rien tomber avant la fin du délai initial', () => {
    const field = createDebrisField();
    const next = stepDebrisField(field, FALLING_DEBRIS.initialDelaySeconds - 0.1, spawnPoints, floorY);
    expect(next.pieces).toHaveLength(0);
  });

  it('fait tomber un premier bloc au point de chute une fois le délai écoulé', () => {
    const field = createDebrisField();
    const next = stepDebrisField(field, FALLING_DEBRIS.initialDelaySeconds + 0.01, spawnPoints, floorY);
    expect(next.pieces).toHaveLength(1);
    expect(next.pieces[0]?.x).toBe(spawnPoints[0]?.x);
  });

  it('tourne entre les points de chute (round-robin, pas aléatoire)', () => {
    let field = createDebrisField();
    field = stepDebrisField(field, FALLING_DEBRIS.initialDelaySeconds + 0.01, spawnPoints, floorY);
    field = { ...field, spawnTimer: 0.01 };
    field = stepDebrisField(field, 0.02, spawnPoints, floorY);
    expect(field.pieces).toHaveLength(2);
    expect(field.pieces[1]?.x).toBe(spawnPoints[1]?.x);
  });

  it('les blocs tombent (y augmente) au fil du temps', () => {
    let field = createDebrisField();
    field = stepDebrisField(field, FALLING_DEBRIS.initialDelaySeconds + 0.01, spawnPoints, floorY);
    const y0 = field.pieces[0]?.y ?? 0;
    field = { ...field, spawnTimer: 999 }; // évite un nouveau spawn qui perturbe le test
    field = stepDebrisField(field, 0.5, spawnPoints, floorY);
    expect(field.pieces[0]?.y ?? 0).toBeGreaterThan(y0);
  });

  it('un bloc disparaît en atteignant le sol', () => {
    let field: DebrisField = { pieces: [{ id: 1, x: 20, y: floorY - 1 }], spawnTimer: 999, nextSpawnIndex: 0, nextId: 2 };
    field = stepDebrisField(field, 1, spawnPoints, floorY);
    expect(field.pieces).toHaveLength(0);
  });

  it('sans point de chute, ne fait jamais rien tomber', () => {
    const field = createDebrisField();
    const next = stepDebrisField(field, FALLING_DEBRIS.initialDelaySeconds + 5, [], floorY);
    expect(next.pieces).toHaveLength(0);
  });
});

describe('debrisHitsPlayer', () => {
  it('détecte le contact avec un bloc', () => {
    const field: DebrisField = { pieces: [{ id: 1, x: 10, y: 10 }], spawnTimer: 0, nextSpawnIndex: 0, nextId: 2 };
    expect(debrisHitsPlayer(field, playerBody({ x: 8, y: 8 }))).toBe(true);
    expect(debrisHitsPlayer(field, playerBody({ x: 500, y: 500 }))).toBe(false);
  });

  it('aucun bloc = jamais de contact', () => {
    expect(debrisHitsPlayer(createDebrisField(), playerBody())).toBe(false);
  });
});
