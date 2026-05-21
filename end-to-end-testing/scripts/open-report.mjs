import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportPath = path.resolve(repoRoot, 'end-to-end-testing', 'reports', 'html', 'index.html');

if (!fs.existsSync(reportPath)) {
  console.error('No HTML report found. Run an end-to-end test session first.');
  process.exit(1);
}

const opener =
  process.platform === 'darwin'
    ? { command: 'open', args: [reportPath] }
    : process.platform === 'win32'
      ? { command: 'cmd', args: ['/c', 'start', '', reportPath] }
      : { command: 'xdg-open', args: [reportPath] };

const child = spawn(opener.command, opener.args, {
  detached: true,
  stdio: 'ignore',
});

child.unref();
console.log(`Opened ${path.relative(repoRoot, reportPath)}`);