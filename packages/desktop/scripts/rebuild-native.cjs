/* eslint-disable */
const path = require('path');

async function main() {
  const electronRebuild = require('electron-rebuild');
  // electron-rebuild exports default in CJS; support both
  const rebuild = electronRebuild.default || electronRebuild.rebuild || electronRebuild;

  const pkg = require('../package.json');
  const electronVersion = (pkg.devDependencies && pkg.devDependencies.electron) ? pkg.devDependencies.electron.replace(/^[^0-9]*/, '') : undefined;

  const buildPath = path.resolve(__dirname, '..');

  console.log(`[rebuild-native] buildPath=${buildPath} electronVersion=${electronVersion || '(auto)'}`);

  try {
    await rebuild({
      buildPath,
      electronVersion,
      onlyModules: ['better-sqlite3', 'keytar'],
      force: true,
      types: ['prod']
    });
    console.log('[rebuild-native] Completed successfully');
  } catch (err) {
    console.error('[rebuild-native] Failed:', err);
    process.exit(1);
  }
}

main();