import { describe, expect, it } from 'vitest';
import { renderTextTable } from '../src/utils/text-table.js';
import { ansi } from '../src/utils/ansi.js';
import { createSpinner } from '../src/utils/spinner.js';
import { measureTreeBytes } from '../src/utils/tree-size.js';
import { createFixture } from './helpers.js';

describe('renderTextTable', () => {
  it('renders bordered rows', () => {
    const table = renderTextTable({
      headers: ['A', 'B'],
      widths: [4, 4],
      rows: [['1', '2']],
    });
    expect(table).toContain('A');
    expect(table).toContain('┌');
    expect(table).toContain('└');
  });
});

describe('ansi', () => {
  it('returns plain text when color is disabled', () => {
    const original = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    expect(ansi.red('x')).toBe('x');
    process.env.NO_COLOR = original;
  });
});

describe('createSpinner', () => {
  it('starts and stops without throwing', () => {
    const spinner = createSpinner('working');
    spinner.start();
    spinner.text = 'still working';
    spinner.succeed('done');
  });

  it('reports failure state', () => {
    const spinner = createSpinner('working');
    spinner.start();
    spinner.fail('stopped');
  });
});

describe('measureTreeBytes', () => {
  it('sums nested file sizes', async () => {
    const root = await createFixture({
      'a.txt': '1234',
      'nested/b.txt': '56',
    });
    const bytes = await measureTreeBytes(root);
    expect(bytes).toBeGreaterThan(0);
  });
});
