import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportRoot = path.resolve(repoRoot, 'end-to-end-testing', 'reports', 'html');
const defaultIndexPath = path.join(reportRoot, 'index.html');
const liveStatusPath = '/__e2e-report-status';

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

const liveReloadScript = `
<script id="e2e-report-live-reload">
(() => {
  const statusUrl = '${liveStatusPath}';
  let currentVersion = null;

  async function checkForUpdate() {
    try {
      const response = await fetch(statusUrl, { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const status = await response.json();
      if (!status.version) {
        return;
      }

      if (currentVersion === null) {
        currentVersion = status.version;
        return;
      }

      if (status.version !== currentVersion) {
        window.location.reload();
      }
    } catch {
      // The report may be between writes while the runner refreshes it.
    }
  }

  window.setInterval(checkForUpdate, 1000);
  checkForUpdate();
})();
</script>`;

function getReportStatus() {
  try {
    const stat = fs.statSync(defaultIndexPath);
    return {
      version: `${Math.round(stat.mtimeMs)}:${stat.size}`,
      updatedAt: stat.mtime.toISOString(),
    };
  } catch {
    return {
      version: null,
      updatedAt: null,
    };
  }
}

function withLiveReload(html) {
  if (html.includes('id="e2e-report-live-reload"')) {
    return html;
  }

  if (html.includes('</body>')) {
    return html.replace('</body>', `${liveReloadScript}\n</body>`);
  }

  return `${html}\n${liveReloadScript}`;
}

function waitingPage() {
  return withLiveReload(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offtasks End-to-End Report</title>
  <style>
    body {
      align-items: center;
      background: #101827;
      color: #eef4ff;
      display: flex;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }

    main {
      max-width: 560px;
      padding: 32px;
    }

    h1 {
      font-size: 28px;
      margin: 0 0 12px;
    }

    p {
      color: #b8c7df;
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }
  </style>
</head>
<body>
  <main>
    <h1>Waiting for the first report</h1>
    <p>Keep this tab open, then run an end-to-end test command in another terminal. This page will refresh when the report is generated or updated.</p>
  </main>
</body>
</html>`);
}

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
  const urlPathname = (request.url ?? '/').split('?')[0];

  if (urlPathname === liveStatusPath) {
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(JSON.stringify(getReportStatus()));
    return;
  }

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
    if (existingPath === defaultIndexPath || filePath === defaultIndexPath) {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(waitingPage());
      return;
    }

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

  if (extension === '.html') {
    response.end(withLiveReload(fs.readFileSync(existingPath, 'utf8')));
    return;
  }

  fs.createReadStream(existingPath).pipe(response);
});

server.listen(port, () => {
  console.log(`Previewing live end-to-end report at http://localhost:${port}`);
  console.log('Keep this process running, then run an e2e test command in another terminal. The page refreshes after each completed scenario.');
});

server.on('error', error => {
  console.error((error instanceof Error ? error.message : String(error)));
  process.exit(1);
});