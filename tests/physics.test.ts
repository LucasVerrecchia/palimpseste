import { describe, expect, it } from 'vitest';
import { aabbOverlap, isOnGround, moveBody, type Body, type SolidQuery } from '../src/engine/physics';

const TS = 16;

/** Petit monde-test : couloir avec un sol en y=8 (ligne de tuiles) et un mur en x=10 (colonne). */
const floorAt8: SolidQuery = (_tx, ty) => ty >= 8;
const wallAt10: SolidQuery = (tx) => tx >= 10;
const empty: SolidQuery = () => false;

function body(partial: Partial<Body>): Body {
  return { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 0, ...partial };
}

describe('moveBody — collisions swept', () => {
  it('arrête le corps contre un mur à droite', () => {
    const b = body({ x: 100, y: 50, vx: 200 });
    const result = moveBody(b, 1, wallAt10, TS);
    // Le mur commence à la colonne 10 → x = 10*16 - largeur
    expect(result.body.x).toBe(10 * TS - b.w);
    expect(result.hitX).toBe(true);
    expect(result.body.vx).toBe(0);
  });

  it('ne traverse jamais un mur, même à très grande vitesse (anti-tunneling)', () => {
    const b = body({ x: 0, y: 50, vx: 100000 });
    const result = moveBody(b, 1, wallAt10, TS);
    expect(result.body.x).toBe(10 * TS - b.w);
    expect(result.hitX).toBe(true);
  });

  it('arrête le corps contre un mur à gauche', () => {
    const onlyLeftWall: SolidQuery = (tx) => tx <= 2;
    const b = body({ x: 100, y: 50, vx: -500 });
    const result = moveBody(b, 1, onlyLeftWall, TS);
    expect(result.body.x).toBe(3 * TS);
    expect(result.hitX).toBe(true);
  });

  it('atterrit sur le sol et signale grounded', () => {
    const b = body({ x: 20, y: 60, vy: 300 });
    const result = moveBody(b, 1, floorAt8, TS);
    expect(result.body.y).toBe(8 * TS - b.h);
    expect(result.grounded).toBe(true);
    expect(result.body.vy).toBe(0);
  });

  it('ne traverse pas le sol en chute très rapide (anti-tunneling vertical)', () => {
    const b = body({ x: 20, y: 0, vy: 100000 });
    const result = moveBody(b, 1, floorAt8, TS);
    expect(result.body.y).toBe(8 * TS - b.h);
    expect(result.grounded).toBe(true);
  });

  it('bute contre le plafond en montant', () => {
    const ceiling: SolidQuery = (_tx, ty) => ty <= 1;
    const b = body({ x: 20, y: 60, vy: -400 });
    const result = moveBody(b, 1, ceiling, TS);
    expect(result.body.y).toBe(2 * TS);
    expect(result.hitY).toBe(true);
    expect(result.grounded).toBe(false);
  });

  it('se déplace librement sans obstacle', () => {
    const b = body({ x: 10, y: 10, vx: 60, vy: 60 });
    const result = moveBody(b, 0.5, empty, TS);
    expect(result.body.x).toBeCloseTo(40);
    expect(result.body.y).toBeCloseTo(40);
    expect(result.hitX).toBe(false);
    expect(result.hitY).toBe(false);
  });

  it('un corps posé pile sur une frontière de tuile ne colle pas au mur voisin', () => {
    // Corps posé sur le sol (y = 8*16 - 22 = 106), immobile : aucun hit ne doit être signalé.
    const b = body({ x: 20, y: 8 * TS - 22, vx: 0, vy: 0 });
    const result = moveBody(b, 1 / 60, floorAt8, TS);
    expect(result.body.y).toBe(8 * TS - 22);
  });
});

describe('isOnGround', () => {
  it('détecte le sol sous les pieds', () => {
    const standing = body({ x: 20, y: 8 * TS - 22 });
    expect(isOnGround(standing, floorAt8, TS)).toBe(true);
  });
  it('ne détecte rien en l\'air', () => {
    const airborne = body({ x: 20, y: 40 });
    expect(isOnGround(airborne, floorAt8, TS)).toBe(false);
  });
});

describe('aabbOverlap', () => {
  it('détecte le chevauchement', () => {
    expect(aabbOverlap(0, 0, 10, 10, 5, 5, 10, 10)).toBe(true);
  });
  it('ne détecte pas les rectangles simplement adjacents', () => {
    expect(aabbOverlap(0, 0, 10, 10, 10, 0, 10, 10)).toBe(false);
  });
});
