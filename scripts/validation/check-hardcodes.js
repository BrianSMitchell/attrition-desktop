#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to search for hardcoded values
const patterns = {
  database_table: /\.from\(['"]([a-zA-Z_]+)['"]\)/g,
  http_status: /\b(200|201|204|400|401|403|404|409|500)\b/g,
  api_endpoint: /['"]\/[a-zA-Z\/\-_]+['"]/g,
  error_message: /['"](?:Error|Failed|Invalid|Missing|Unable|Cannot)[^'"]*['"]/g
};

function findHardcodes(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {};
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        results[type] = matches.length;
      }
    }
    
    return results;
  } catch (error) {
    return {};
  }
}

function scanDirectory(dir, extensions = ['.ts', '.js']) {
  const results = { total: {}, files: {} };
  
  function walkDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && !file.includes('node_modules')) {
        walkDir(filePath);
      } else if (extensions.some(ext => file.endsWith(ext))) {
        const hardcodes = findHardcodes(filePath);
        if (Object.keys(hardcodes).length > 0) {
          results.files[filePath] = hardcodes;
          
          // Add to totals
          for (const [type, count] of Object.entries(hardcodes)) {
            results.total[type] = (results.total[type] || 0) + count;
          }
        }
      }
    }
  }
  
  walkDir(dir);
  return results;
}

// Scan the server source code
const serverSrc = path.join(__dirname, '..', '..', 'packages', 'server', 'src');

console.log('🔍 Scanning for hardcoded values...\n');
const results = scanDirectory(serverSrc);

// Summary
console.log('📊 SUMMARY:');
console.log('===========');
for (const [type, count] of Object.entries(results.total)) {
  console.log(`${type.padEnd(20)}: ${count}`);
}
console.log('\n');

// Top offenders for database tables
console.log('🗄️  DATABASE TABLE REFERENCES:');
console.log('================================');
const dbFiles = Object.entries(results.files)
  .filter(([_, hardcodes]) => hardcodes.database_table)
  .sort((a, b) => b[1].database_table - a[1].database_table)
  .slice(0, 10);

for (const [file, hardcodes] of dbFiles) {
  const relativePath = path.relative(serverSrc, file);
  console.log(`${relativePath.padEnd(60)} : ${hardcodes.database_table}`);
}

// Top offenders for HTTP status codes
if (results.total.http_status) {
  console.log('\n🌐 HTTP STATUS CODE REFERENCES:');
  console.log('================================');
  const httpFiles = Object.entries(results.files)
    .filter(([_, hardcodes]) => hardcodes.http_status)
    .sort((a, b) => b[1].http_status - a[1].http_status)
    .slice(0, 10);

  for (const [file, hardcodes] of httpFiles) {
    const relativePath = path.relative(serverSrc, file);
    console.log(`${relativePath.padEnd(60)} : ${hardcodes.http_status}`);
  }
}

console.log(`\n✅ Scan complete! Found ${Object.keys(results.files).length} files with hardcoded values.`);