import { describe, expect, it } from 'vitest';
import type { Body } from '../src/engine/physics';
import { TURRET } from '../src/game/config';
import {
  createTurret,
  resolveTurretDashHit,
  resolveTurretProjectileHits,
  stepTurret,
  turretOverlapsPlayer,
  type TurretState,
} from '../src/game/enemies/turret';

function playerBody(partial: Partial<Body> = {}): Body {
  return { x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 0, ...partial };
}

const bigRoom = { width: 10000, height: 10000 };
const farPlayer = playerBody({ x: 500 });
// Turret créée en (50, 0) dans ces tests : rester sous TURRET.rangeDistance
// (130) pour tester le tir/la visée indépendamment du nouveau filtre de
// portée (retour de Lucas 2026-07-29 : les tourelles ne doivent tirer qu'à
// portée, testé séparément ci-dessous).
const nearPlayer = playerBody({ x: 100 });

describe('createTurret', () => {
  it('démarre non détruite, sans projectile, avec le cooldown initial', () => {
    const turret = createTurret(1, 0, 0);
    expect(turret.destroyed).toBe(false);
    expect(turret.projectiles).toHaveLength(0);
    expect(turret.cooldown).toBe(TURRET.initialCooldownSeconds);
  });
});

describe('stepTurret — tir périodique visé', () => {
  it('tire une bulle vers le joueur une fois le cooldown écoulé', () => {
    const turret = createTurret(1, 50, 0);
    const next = stepTurret(turret, TURRET.initialCooldownSeconds + 0.01, nearPlayer, bigRoom);
    expect(next.projectiles).toHaveLength(1);
    expect(next.projectiles[0]?.vx).toBeGreaterThan(0); // joueur à droite
    expect(next.cooldown).toBeCloseTo(TURRET.cooldownSeconds);
  });

  it('vise dans n\'importe quelle direction (pas seulement horizontale)', () => {
    const turret = createTurret(1, 50, 0);
    const next = stepTurret(turret, TURRET.initialCooldownSeconds + 0.01, playerBody({ x: 60, y: -100 }), bigRoom);
    expect(next.projectiles[0]?.vy).toBeLessThan(0);
  });

  it('ne tire pas avant la fin du cooldown', () => {
    const turret = createTurret(1, 50, 0);
    const next = stepTurret(turret, TURRET.initialCooldownSeconds - 0.1, nearPlayer, bigRoom);
    expect(next.projectiles).toHaveLength(0);
  });

  it('ne tire jamais hors de portée, même le cooldown écoulé', () => {
    const turret = createTurret(1, 50, 0);
    const next = stepTurret(turret, TURRET.initialCooldownSeconds + 5, farPlayer, bigRoom);
    expect(next.projectiles).toHaveLength(0);
  });

  it('reste gelée hors de portée puis tire dès que le joueur entre à portée', () => {
    const turret = createTurret(1, 50, 0);
    const stillFrozen = stepTurret(turret, TURRET.initialCooldownSeconds + 5, farPlayer, bigRoom);
    expect(stillFrozen.cooldown).toBeCloseTo(TURRET.initialCooldownSeconds); // gelé, pas décompté
    const afterEnteringRange = stepTurret(stillFrozen, TURRET.initialCooldownSeconds + 0.01, nearPlayer, bigRoom);
    expect(afterEnteringRange.projectiles).toHaveLength(1);
  });

  it('une tourelle détruite ne tire plus', () => {
    const turret: TurretState = { ...createTurret(1, 50, 0), destroyed: true, cooldown: 0 };
    const next = stepTurret(turret, 1, nearPlayer, bigRoom);
    expect(next.projectiles).toHaveLength(0);
    expect(next.destroyed).toBe(true);
  });

  it('une bulle déjà en vol continue même si sa tourelle est détruite entre-temps', () => {
    const turret: TurretState = {
      ...createTurret(1, 50, 0),
      destroyed: true,
      projectiles: [{ x: 5, y: 5, vx: 10, vy: 0, age: 0 }],
    };
    const next = stepTurret(turret, 1 / 60, farPlayer, bigRoom);
    expect(next.projectiles).toHaveLength(1);
    expect(next.projectiles[0]?.x).toBeGreaterThan(5);
  });

  it('une bulle expire après sa durée de vie', () => {
    let turret = createTurret(1, 50, 0);
    turret = stepTurret(turret, TURRET.initialCooldownSeconds + 0.01, nearPlayer, bigRoom);
    expect(turret.projectiles).toHaveLength(1);
    // Cooldown élevé à la main : évite qu'un second tir (déclenché par le
    // grand pas de temps qui suit) ne masque l'expiration testée ici.
    turret = { ...turret, cooldown: 999 };
    turret = stepTurret(turret, TURRET.projectileLifeSeconds + 0.1, nearPlayer, bigRoom);
    expect(turret.projectiles).toHaveLength(0);
  });

  it('une bulle disparaît en sortant des murs extérieurs de la salle', () => {
    let turret = createTurret(1, 50, 0);
    turret = stepTurret(turret, TURRET.initialCooldownSeconds + 0.01, nearPlayer, bigRoom);
    expect(turret.projectiles).toHaveLength(1);
    const small = { width: 55, height: 55 };
    turret = stepTurret(turret, 1, nearPlayer, small);
    expect(turret.projectiles).toHaveLength(0);
  });
});

describe('turretOverlapsPlayer', () => {
  it('détecte le chevauchement', () => {
    const turret = createTurret(1, 0, 0);
    expect(turretOverlapsPlayer(turret, playerBody({ x: 5 }))).toBe(true);
    expect(turretOverlapsPlayer(turret, playerBody({ x: 500 }))).toBe(false);
  });
});

describe('resolveTurretDashHit — un seul coup suffit', () => {
  it('un dash au contact détruit la tourelle', () => {
    const turret = createTurret(1, 0, 0);
    const next = resolveTurretDashHit(turret, playerBody({ x: 5 }), true);
    expect(next.destroyed).toBe(true);
  });

  it('sans dash actif, rien ne se passe même au contact', () => {
    const turret = createTurret(1, 0, 0);
    const next = resolveTurretDashHit(turret, playerBody({ x: 5 }), false);
    expect(next.destroyed).toBe(false);
  });

  it('hors de portée, le dash ne détruit pas', () => {
    const turret = createTurret(1, 0, 0);
    const next = resolveTurretDashHit(turret, playerBody({ x: 500 }), true);
    expect(next.destroyed).toBe(false);
  });

  it('une tourelle déjà détruite reste inchangée', () => {
    const turret: TurretState = { ...createTurret(1, 0, 0), destroyed: true };
    const next = resolveTurretDashHit(turret, playerBody({ x: 5 }), true);
    expect(next).toBe(turret);
  });
});

describe('resolveTurretProjectileHits', () => {
  it('retire une bulle qui touche le joueur et compte le coup', () => {
    const turret: TurretState = { ...createTurret(1, 0, 0), projectiles: [{ x: 5, y: 5, vx: 10, vy: 0, age: 0 }] };
    const result = resolveTurretProjectileHits(turret, playerBody({ x: 0, y: 0 }));
    expect(result.hits).toBe(1);
    expect(result.turret.projectiles).toHaveLength(0);
  });

  it('laisse intactes les bulles hors de portée', () => {
    const turret: TurretState = {
      ...createTurret(1, 0, 0),
      projectiles: [{ x: 500, y: 500, vx: 10, vy: 0, age: 0 }],
    };
    const result = resolveTurretProjectileHits(turret, playerBody({ x: 0, y: 0 }));
    expect(result.hits).toBe(0);
    expect(result.turret.projectiles).toHaveLength(1);
  });
});
