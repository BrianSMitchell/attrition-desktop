/**
 * Add .js extensions to all relative imports for ES module compatibility
 */
const fs = require('fs');
const path = require('path');

function addJsExtensions(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Match import/export statements with relative paths without .js extension
  const patterns = [
    // import ... from './path' or '../path'
    /(import\s+(?:[\w*{},\s]+)\s+from\s+['"])(\.[^'"]+)(['"])/g,
    // export ... from './path' or '../path'
    /(export\s+(?:[\w*{},\s]+)\s+from\s+['"])(\.[^'"]+)(['"])/g,
    // export * from './path' or '../path'
    /(export\s+\*\s+from\s+['"])(\.[^'"]+)(['"])/g,
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, before, importPath, after) => {
      // Skip if already has .js extension
      if (importPath.endsWith('.js')) {
        return match;
      }
      
      // Add .js extension
      modified = true;
      return `${before}${importPath}.js${after}`;
    });
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  let totalUpdated = 0;

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (!['node_modules', 'dist', '.git'].includes(item)) {
        totalUpdated += processDirectory(fullPath);
      }
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      if (addJsExtensions(fullPath)) {
        totalUpdated++;
      }
    }
  });

  return totalUpdated;
}

const srcDir = path.join(__dirname, '..', 'src');
console.log('Adding .js extensions to imports in', srcDir);
console.log('='.repeat(50));

const updated = processDirectory(srcDir);

console.log('='.repeat(50));
console.log(`✓ Updated ${updated} file(s)`);
