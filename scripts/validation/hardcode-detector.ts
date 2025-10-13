#!/usr/bin/env node

import { HTTP_STATUS } from '../packages/shared/src/response-formats';
#!/usr/bin/env node

/**
 * Hardcode Detector - Baseline Validation Script
 * 
 * Detects hardcoded database references, HTTP status codes, and API endpoints
 * across the Attrition codebase to establish baseline metrics before cleanup.
 * 
 * Usage: npx tsx scripts/validation/hardcode-detector.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ERROR_MESSAGES } from '../constants/response-formats';



interface HardcodeIssue {
  file: string;
  line: number;
  content: string;
  type: 'database_table' | 'http_status' | 'error_message' | 'api_endpoint';
  severity: 'high' | 'medium' | 'low';
}

interface DetectionReport {
  totalFiles: number;
  totalIssues: number;
  issuesByType: Record<string, number>;
  issues: HardcodeIssue[];
}

class HardcodeDetector {
  private readonly srcPath = path.join(process.cwd(), 'packages/server/src');
  private readonly patterns = {
    // Database table hardcoding patterns
    database_tables: [
      /\.from\(['"`]([^'"`]+)['"`]\)/g,  // .from('table_name')
      /\.table\(['"`]([^'"`]+)['"`]\)/g,  // .table('table_name')
      /FROM\s+['"`]?([a-z_]+)['"`]?\s/gi,  // SQL FROM clauses
    ],
    
    // HTTP status code patterns
    http_status: [
      /\.status\(\s*(\d{3})\s*\)/g,  // .status(404)
      /res\.sendStatus\(\s*(\d{3})\s*\)/g,  // res.sendStatus(HTTP_STATUS.NOT_FOUND)
      /statusCode:\s*(\d{3})/g,  // statusCode: HTTP_STATUS.NOT_FOUND
    ],
    
    // Common error message patterns
    error_messages: [
      /['"`](.*not found.*?)['"`]/gi,
      /['"`](.*missing.*?)['"`]/gi,
      /['"`](.*invalid.*?)['"`]/gi,
      /['"`](.*unauthorized.*?)['"`]/gi,
      /['"`](.*forbidden.*?)['"`]/gi,
      /['"`](.*access denied.*?)['"`]/gi,
    ],
    
    // API endpoint patterns in comments/strings
    api_endpoints: [
      /['"`](\/api\/[^'"`\s]+)['"`]/g,
      /GET\s+['"`]?(\/api\/[^'"`\s]+)['"`]?/gi,
      /POST\s+['"`]?(\/api\/[^'"`\s]+)['"`]?/gi,
      /PUT\s+['"`]?(\/api\/[^'"`\s]+)['"`]?/gi,
      /DELETE\s+['"`]?(\/api\/[^'"`\s]+)['"`]?/gi,
    ]
  };

  private readonly knownDbTables = [
    'empires', 'users', 'locations', 'colonies', 'buildings', 
    'tech_queue', 'credit_transactions', 'defenses', 'fleets'
  ];

  async detect(): Promise<DetectionReport> {
    console.log('?? Starting hardcode detection...');
    console.log(`?? Scanning directory: ${this.srcPath}`);
    
    const files = await this.getSourceFiles();
    console.log(`?? Found ${files.length} TypeScript files to scan`);
    
    const issues: HardcodeIssue[] = [];
    let processedFiles = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const fileIssues = this.scanFile(file, content);
      issues.push(...fileIssues);
      
      processedFiles++;
      if (processedFiles % 10 === 0) {
        console.log(`? Processed ${processedFiles}/${files.length} files...`);
      }
    }

    const report = this.generateReport(files.length, issues);
    this.printReport(report);
    
    return report;
  }

  private async getSourceFiles(): Promise<string[]> {
    const pattern = path.join(this.srcPath, '**/*.ts').replace(/\\/g, '/');
    const files = await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/dist/**'
      ]
    });
    
    return files.map(file => path.resolve(file));
  }

  private scanFile(filePath: string, content: string): HardcodeIssue[] {
    const issues: HardcodeIssue[] = [];
    const lines = content.split('\n');
    const relativePath = path.relative(this.srcPath, filePath);

    // Check each line for patterns
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Database table detection
      this.patterns.database_tables.forEach(pattern => {
        const matches = Array.from(line.matchAll(pattern));
        matches.forEach(match => {
          const tableName = match[1]?.toLowerCase();
          if (tableName && this.knownDbTables.includes(tableName)) {
            issues.push({
              file: relativePath,
              line: lineNumber,
              content: line.trim(),
              type: 'database_table',
              severity: 'high'
            });
          }
        });
      });

      // HTTP status code detection
      this.patterns.http_status.forEach(pattern => {
        const matches = Array.from(line.matchAll(pattern));
        matches.forEach(match => {
          issues.push({
            file: relativePath,
            line: lineNumber,
            content: line.trim(),
            type: 'http_status',
            severity: 'high'
          });
        });
      });

      // Error message detection
      this.patterns.error_messages.forEach(pattern => {
        const matches = Array.from(line.matchAll(pattern));
        matches.forEach(match => {
          if (match[1] && match[1].length > 5) { // Filter out very short matches
            issues.push({
              file: relativePath,
              line: lineNumber,
              content: line.trim(),
              type: 'error_message',
              severity: 'medium'
            });
          }
        });
      });

      // API endpoint detection
      this.patterns.api_endpoints.forEach(pattern => {
        const matches = Array.from(line.matchAll(pattern));
        matches.forEach(match => {
          issues.push({
            file: relativePath,
            line: lineNumber,
            content: line.trim(),
            type: 'api_endpoint',
            severity: 'low'
          });
        });
      });
    });

    return issues;
  }

  private generateReport(totalFiles: number, issues: HardcodeIssue[]): DetectionReport {
    const issuesByType: Record<string, number> = {};
    
    issues.forEach(issue => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });

    return {
      totalFiles,
      totalIssues: issues.length,
      issuesByType,
      issues
    };
  }

  private printReport(report: DetectionReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('?? HARDCODE DETECTION BASELINE REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n?? Files scanned: ${report.totalFiles}`);
    console.log(`?? Total hardcode issues found: ${report.totalIssues}`);
    
    console.log('\n?? Issues by type:');
    Object.entries(report.issuesByType).forEach(([type, count]) => {
      const emoji = type === 'database_table' ? '???' : 
                   type === 'http_status' ? '??' :
                   type === 'error_message' ? '?' : 
                   '??';
      console.log(`  ${emoji} ${type.replace('_', ' ')}: ${count} issues`);
    });

    // Show top 10 most problematic files
    const fileIssueCount: Record<string, number> = {};
    report.issues.forEach(issue => {
      fileIssueCount[issue.file] = (fileIssueCount[issue.file] || 0) + 1;
    });

    const topFiles = Object.entries(fileIssueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    if (topFiles.length > 0) {
      console.log('\n?? Top 10 files with most issues:');
      topFiles.forEach(([file, count]) => {
        console.log(`  ?? ${file}: ${count} issues`);
      });
    }

    // Sample issues by type
    console.log('\n?? Sample issues found:');
    ['database_table', 'http_status', 'error_message'].forEach(type => {
      const samples = report.issues
        .filter(i => i.type === type)
        .slice(0, 3);
      
      if (samples.length > 0) {
        console.log(`\n  ${type.replace('_', ' ').toUpperCase()}:`);
        samples.forEach(sample => {
          console.log(`    ?? ${sample.file}:${sample.line}`);
          console.log(`      ${sample.content}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('? Baseline established! Ready to begin systematic elimination.');
    console.log('='.repeat(80));
  }

  async saveReport(report: DetectionReport): Promise<void> {
    const reportPath = path.join(process.cwd(), 'scripts/validation/baseline-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n?? Detailed report saved to: ${reportPath}`);
  }
}

// Run the detector if this script is executed directly
if (require.main === module) {
  const detector = new HardcodeDetector();
  detector.detect()
    .then(report => detector.saveReport(report))
    .catch(error => {
      console.error('? Detection failed:', error);
      process.exit(1);
    });
}

export { HardcodeDetector, type HardcodeIssue, type DetectionReport };


