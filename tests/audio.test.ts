import { describe, expect, it } from 'vitest';
import { resolveChannelVolume } from '../src/engine/audio';

describe('resolveChannelVolume', () => {
  it('coupé (muted) → toujours 0, quels que soient les autres facteurs', () => {
    expect(resolveChannelVolume(true, 1, 1)).toBe(0);
    expect(resolveChannelVolume(true, 0.5, 1)).toBe(0);
    expect(resolveChannelVolume(true, 1, 0)).toBe(0);
  });

  it('non coupé, atténuation neutre → volume de base tel quel', () => {
    expect(resolveChannelVolume(false, 0.5, 1)).toBe(0.5);
  });

  it('non coupé, atténuation partielle (menu pause) → volume de base réduit d\'autant', () => {
    expect(resolveChannelVolume(false, 0.6, 0.3)).toBeCloseTo(0.18);
  });

  it('borné à [0, 1] même si les entrées dépassent', () => {
    expect(resolveChannelVolume(false, 2, 1)).toBe(1);
    expect(resolveChannelVolume(false, 1, -1)).toBe(0);
  });
});
