import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportRoot = path.resolve(repoRoot, 'manual-tests', 'reports', 'html');
const defaultIndexPath = path.join(reportRoot, 'index.html');

if (!fs.existsSync(defaultIndexPath)) {
  console.error('No HTML report found. Run a manual test session first.');
  process.exit(1);
}

const argPort = process.argv.find(argument => argument.startsWith('--port='));
const port = Number(argPort?.slice('--port='.length) ?? process.env.PORT ?? 4180);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function resolveFilePath(urlPathname) {
  const normalizedPath = decodeURIComponent(urlPathname.split('?')[0]);
  const safePath = normalizedPath === '/' ? '/index.html' : normalizedPath;
  const absolutePath = path.resolve(reportRoot, `.${safePath}`);

  if (!absolutePath.startsWith(reportRoot)) {
    return null;
  }

  return absolutePath;
}

const server = http.createServer((request, response) => {
  const filePath = resolveFilePath(request.url ?? '/');

  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  const existingPath = fs.existsSync(filePath)
    ? filePath
    : filePath.endsWith('.html')
      ? filePath
      : path.join(filePath, 'index.html');

  if (!fs.existsSync(existingPath) || fs.statSync(existingPath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Report file not found');
    return;
  }

  const extension = path.extname(existingPath).toLowerCase();
  const contentType = mimeTypes[extension] ?? 'application/octet-stream';

  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });

  fs.createReadStream(existingPath).pipe(response);
});

server.listen(port, () => {
  console.log(`Previewing manual report at http://localhost:${port}`);
});

server.on('error', error => {
  console.error((error instanceof Error ? error.message : String(error)));
  process.exit(1);
});