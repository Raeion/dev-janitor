import { ansi } from './ansi.js';

const FRAMES = ['|', '/', '-', '\\'] as const;

export interface Spinner {
  text: string;
  start(): void;
  succeed(message?: string): void;
  fail(message?: string): void;
  stop(): void;
}

export function createSpinner(initialText: string): Spinner {
  let text = initialText;
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let active = false;

  const render = (): void => {
    if (!active || !process.stdout.isTTY) {
      return;
    }
    const glyph = FRAMES[frame % FRAMES.length];
    frame += 1;
    process.stdout.write(`\r${ansi.cyan(glyph)} ${text}`);
  };

  return {
    get text() {
      return text;
    },
    set text(value: string) {
      text = value;
      render();
    },
    start() {
      if (active) {
        return;
      }
      active = true;
      if (process.stdout.isTTY) {
        timer = setInterval(render, 80);
        render();
      }
    },
    succeed(message?: string) {
      this.stop();
      if (message) {
        console.log(ansi.green(`√ ${message}`));
      }
    },
    fail(message?: string) {
      this.stop();
      if (message) {
        console.log(ansi.red(`× ${message}`));
      }
    },
    stop() {
      active = false;
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      if (process.stdout.isTTY) {
        process.stdout.write('\r\x1B[K');
      }
    },
  };
}
