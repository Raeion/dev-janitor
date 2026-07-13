export interface TextTableOptions {
  headers: string[];
  rows: string[][];
  widths: number[];
}

function padCell(value: string, width: number): string {
  if (value.length >= width) {
    return value.slice(0, width);
  }
  return value.padEnd(width, ' ');
}

function border(widths: number[]): string {
  return `┌${widths.map((w) => '─'.repeat(w + 2)).join('┬')}┐`;
}

function divider(widths: number[]): string {
  return `├${widths.map((w) => '─'.repeat(w + 2)).join('┼')}┤`;
}

function bottom(widths: number[]): string {
  return `└${widths.map((w) => '─'.repeat(w + 2)).join('┴')}┘`;
}

function row(cells: string[], widths: number[]): string {
  const padded = cells.map((cell, index) => ` ${padCell(cell, widths[index] ?? cell.length)} `);
  return `│${padded.join('│')}│`;
}

export function renderTextTable(options: TextTableOptions): string {
  const lines = [border(options.widths), row(options.headers, options.widths), divider(options.widths)];
  for (const tableRow of options.rows) {
    lines.push(row(tableRow, options.widths));
  }
  lines.push(bottom(options.widths));
  return lines.join('\n');
}
