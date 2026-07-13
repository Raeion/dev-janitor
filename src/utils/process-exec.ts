import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function execCommand(
  command: string,
  args: string[],
  options: { timeout?: number; maxBuffer?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, {
    timeout: options.timeout ?? 30_000,
    maxBuffer: options.maxBuffer ?? 10 * 1024 * 1024,
  });
}
