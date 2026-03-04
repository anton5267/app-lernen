const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const appRoot = path.resolve(__dirname, '..');
const distIndexPath = path.resolve(appRoot, 'dist/index.html');

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
  process.exit(exitCode);
});
