const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const appRoot = path.resolve(__dirname, '..');
const distIndexPath = path.resolve(appRoot, 'dist/index.html');
const distDirPath = path.resolve(appRoot, 'dist');

function normalizePublicPath(rawPath) {
  const value = String(rawPath ?? '').trim();
  if (!value || value === '/') {
    return '';
  }

  let normalized = value;
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

function collectHtmlFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const htmlFiles = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      htmlFiles.push(...collectHtmlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.toLowerCase().endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }

  return htmlFiles;
}

function rewriteHtmlForPublicPath(publicPath) {
  const normalizedPublicPath = normalizePublicPath(publicPath);
  if (!normalizedPublicPath) {
    return;
  }

  const htmlFiles = collectHtmlFiles(distDirPath);
  for (const htmlFilePath of htmlFiles) {
    const originalHtml = fs.readFileSync(htmlFilePath, 'utf8');

    const rewrittenHtml = originalHtml
      .replace(/(\b(?:href|src)=["'])\/(?!\/)/g, `$1${normalizedPublicPath}/`)
      .replace(/url\(\s*\/(?!\/)/g, `url(${normalizedPublicPath}/`);

    if (rewrittenHtml !== originalHtml) {
      fs.writeFileSync(htmlFilePath, rewrittenHtml, 'utf8');
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[export-web-safe] Applied public path prefix "${normalizedPublicPath}" to ${htmlFiles.length} HTML files.`);
}

async function runExport() {
  return new Promise((resolve) => {
    const child = spawn('npx expo export --platform web', {
      cwd: appRoot,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stderrBuffer = '';

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrBuffer += text;
      process.stderr.write(chunk);
    });

    child.on('error', () => {
      resolve(1);
    });

    child.on('close', (exitCode) => {
      const hasDistBuild = fs.existsSync(distIndexPath);
      const hasEpermKillError = /kill EPERM/i.test(stderrBuffer);

      if (exitCode === 0) {
        resolve(0);
        return;
      }

      if (hasDistBuild && hasEpermKillError) {
        // eslint-disable-next-line no-console
        console.warn(
          '[export-web-safe] expo export завершився з EPERM після створення dist. Продовжуємо як успіх.'
        );
        resolve(0);
        return;
      }

      resolve(exitCode || 1);
    });
  });
}

runExport().then((exitCode) => {
  if (exitCode === 0) {
    rewriteHtmlForPublicPath(process.env.WEB_PUBLIC_PATH);
  }
  process.exit(exitCode);
});
