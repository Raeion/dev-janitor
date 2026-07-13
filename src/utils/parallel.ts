export interface MapConcurrencyOptions {
  concurrency?: number;
}

/**
 * Map items with a bounded concurrency pool.
 * Preserves result order matching the input array.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  options: MapConcurrencyOptions = {},
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const concurrency = Math.max(1, options.concurrency ?? 8);
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index] as T, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
