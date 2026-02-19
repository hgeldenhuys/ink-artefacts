import { exec } from 'child_process';

/**
 * Parse --exec "command" from process.argv.
 * Returns the command string or undefined if not found.
 */
export function parseExecArg(argv: string[] = process.argv): string | undefined {
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--exec' && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return undefined;
}

/**
 * Run a shell command (fire-and-forget).
 * If no command is provided, rings the terminal bell.
 */
export function runExec(cmd?: string): void {
  if (cmd) {
    exec(cmd);
  } else {
    process.stdout.write('\x07');
  }
}
