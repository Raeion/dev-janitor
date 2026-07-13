const enabled =
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== '0' &&
  (process.stdout.isTTY === true || process.env.FORCE_COLOR !== undefined);

function wrap(code: string, text: string): string {
  if (!enabled) {
    return text;
  }
  return `\u001B[${code}m${text}\u001B[0m`;
}

export const ansi = {
  bold: (text: string): string => wrap('1', text),
  dim: (text: string): string => wrap('2', text),
  red: (text: string): string => wrap('31', text),
  green: (text: string): string => wrap('32', text),
  yellow: (text: string): string => wrap('33', text),
  cyan: (text: string): string => wrap('36', text),
};
