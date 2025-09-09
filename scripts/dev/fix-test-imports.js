#!/usr/bin/env node

/**
 * Fix Import Paths in Centralized Tests
 * Updates relative imports to work from new test locations
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const importFixRules = [
  // Server test imports
  {
    pattern: /from ['"`]\.\.\/scripts\/(.*?)['"`]/g,
    replacement: "from '../../packages/server/src/scripts/$1'",
    description: 'Server script imports'
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/src\/(.*?)['"`]/g,
    replacement: "from '../../packages/server/src/$1'",
    description: 'Server src imports (two levels up)'
  },
  {
    pattern: /from ['"`]\.\.\/src\/(.*?)['"`]/g,
    replacement: "from '../../packages/server/src/$1'",
    description: 'Server src imports (one level up)'
  },
  {
    pattern: /import\(['"`]\.\.\/scripts\/(.*?)['"`]\)/g,
    replacement: "import('../../packages/server/src/scripts/$1')",
    description: 'Dynamic server script imports'
  },
  {
    pattern: /import\(['"`]\.\.\/\.\.\/src\/(.*?)['"`]\)/g,
    replacement: "import('../../packages/server/src/$1')",
    description: 'Dynamic server src imports (two levels up)'
  },
  {
    pattern: /import\(['"`]\.\.\/src\/(.*?)['"`]\)/g,
    replacement: "import('../../packages/server/src/$1')",
    description: 'Dynamic server src imports (one level up)'
  },
  
  // Client test imports
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/src\/(.*?)['"`]/g,
    replacement: "from '../../packages/client/src/$1'",
    description: 'Client src imports (three levels up)'
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/src\/(.*?)['"`]/g,
    replacement: "from '../../packages/client/src/$1'",
    description: 'Client src imports (two levels up) - context dependent'
  },
  
  // Desktop test imports
  {
    pattern: /from ['"`]\.\.\/(services|main|preload)\/(.*?)['"`]/g,
    replacement: "from '../../packages/desktop/src/$1/$2'",
    description: 'Desktop service/main/preload imports'
  },
  
  // Shared package imports - update to use alias
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/\.\.\/shared\/src\/(.*?)['"`]/g,
    replacement: "from '@game/shared/$1'",
    description: 'Shared package imports (deep relative to alias)'
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/\.\.\/shared\/src\/(.*?)['"`]/g,
    replacement: "from '@game/shared/$1'",
    description: 'Shared package imports (relative to alias)'
  },
  
  // Test utilities - update to use alias
  {
    pattern: /from ['"`]\.\.\/test-utils\/(.*?)['"`]/g,
    replacement: "from '@test-utils/test-utils/$1'",
    description: 'Test utilities imports'
  },
  {
    pattern: /from ['"`]\.\.\/\.\.\/test-utils\/(.*?)['"`]/g,
    replacement: "from '@test-utils/test-utils/$1'",
    description: 'Test utilities imports (two levels up)'
  }
];

class ImportFixer {
  constructor() {
    this.fixedFiles = [];
    this.errors = [];
  }

  async fixImports() {
    console.log('🔧 Starting automated import path fixes...');
    
    // Get all test files
    const testFiles = await glob('tests/**/*.{js,ts,tsx}', {
      ignore: ['tests/utils/**', 'tests/fixtures/**']
    });
    
    console.log(`Found ${testFiles.length} test files to process`);
    
    for (const file of testFiles) {
      try {
        await this.fixFileImports(file);
      } catch (error) {
        this.errors.push({ file, error: error.message });
        console.error(`❌ Error fixing ${file}: ${error.message}`);
      }
    }
    
    this.generateReport();
  }
  
  async fixFileImports(filePath) {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let content = originalContent;
    let hasChanges = false;
    const appliedRules = [];
    
    for (const rule of importFixRules) {
      const beforeCount = (content.match(rule.pattern) || []).length;
      content = content.replace(rule.pattern, rule.replacement);
      const afterCount = (content.match(rule.pattern) || []).length;
      
      if (beforeCount > afterCount) {
        hasChanges = true;
        appliedRules.push({
          description: rule.description,
          changes: beforeCount - afterCount
        });
      }
    }
    
    if (hasChanges) {
      // Create backup
      fs.writeFileSync(`${filePath}.backup`, originalContent);
      
      // Write fixed content
      fs.writeFileSync(filePath, content);
      
      this.fixedFiles.push({
        file: filePath,
        rules: appliedRules
      });
      
      console.log(`✅ Fixed imports in ${path.basename(filePath)} (${appliedRules.length} rule types applied)`);
    }
  }
  
  generateReport() {
    console.log('\n📊 Import Fix Report');
    console.log('===================');
    
    if (this.fixedFiles.length === 0) {
      console.log('No files needed import fixes.');
    } else {
      console.log(`Fixed imports in ${this.fixedFiles.length} files:`);
      
      for (const { file, rules } of this.fixedFiles) {
        console.log(`\n📁 ${file}`);
        for (const rule of rules) {
          console.log(`  - ${rule.description}: ${rule.changes} change(s)`);
        }
      }
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const { file, error } of this.errors) {
        console.log(`  - ${file}: ${error}`);
      }
    }
    
    console.log(`\n✅ Import fixing complete. Backups created with .backup extension.`);
    console.log('If tests fail, you can restore with: Get-ChildItem -Recurse -Filter "*.backup" | ForEach-Object { Move-Item $_.FullName ($_.FullName -replace ".backup$") -Force }');
  }
}

if (require.main === module) {
  const fixer = new ImportFixer();
  fixer.fixImports().catch(error => {
    console.error('Import fixing failed:', error);
    process.exit(1);
  });
}

module.exports = ImportFixer;
