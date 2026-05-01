import { describe, expect, it } from 'vitest';
import { scaleQuantity, formatQuantity } from '@/lib/parsing/scaling';

describe('scaleQuantity', () => {
  it('returns null when quantity is null', () => {
    expect(scaleQuantity(null, 4, 8)).toBeNull();
  });
  it('doubles quantities when target is double base', () => {
    expect(scaleQuantity(2, 4, 8)).toBe(4);
  });
  it('halves quantities when target is half base', () => {
    expect(scaleQuantity(2, 4, 2)).toBe(1);
  });
  it('handles fractional ratios', () => {
    expect(scaleQuantity(1, 4, 6)).toBe(1.5);
  });
});

describe('formatQuantity', () => {
  it('returns empty string for null', () => {
    expect(formatQuantity(null)).toBe('');
  });
  it('formats whole numbers without fraction', () => {
    expect(formatQuantity(3)).toBe('3');
  });
  it('formats common fractions with unicode glyph', () => {
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(0.25)).toBe('¼');
    expect(formatQuantity(0.75)).toBe('¾');
  });
  it('formats mixed numbers', () => {
    expect(formatQuantity(1.5)).toBe('1 ½');
    expect(formatQuantity(2.25)).toBe('2 ¼');
  });
});
