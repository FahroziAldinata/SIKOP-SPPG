import { describe, it, expect } from 'vitest';
import { generateDateRange } from './utils.js';

describe('generateDateRange', () => {
  it('should return empty array if start or end date is missing', () => {
    expect(generateDateRange(null, '2026-07-05')).toEqual([]);
    expect(generateDateRange('2026-07-01', null)).toEqual([]);
    expect(generateDateRange(null, null)).toEqual([]);
    expect(generateDateRange()).toEqual([]);
  });

  it('should return correct date range for valid dates', () => {
    const range = generateDateRange('2026-07-01', '2026-07-03');
    expect(range).toHaveLength(3);
    expect(range[0].toISOString().split('T')[0]).toBe('2026-07-01');
    expect(range[1].toISOString().split('T')[0]).toBe('2026-07-02');
    expect(range[2].toISOString().split('T')[0]).toBe('2026-07-03');
  });

  it('should return single date when start and end date are the same', () => {
    const range = generateDateRange('2026-07-01', '2026-07-01');
    expect(range).toHaveLength(1);
    expect(range[0].toISOString().split('T')[0]).toBe('2026-07-01');
  });
});
