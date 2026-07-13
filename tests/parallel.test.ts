import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from '../src/utils/parallel.js';

describe('mapWithConcurrency', () => {
  it('preserves order with bounded concurrency', async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await mapWithConcurrency(
      items,
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return value * 2;
      },
      { concurrency: 2 },
    );
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });
});
