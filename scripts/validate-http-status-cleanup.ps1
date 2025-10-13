#!/usr/bin/env pwsh

Write-Host "Validating HTTP status code cleanup..."
Write-Host "Searching for remaining hardcoded HTTP status codes in real HTTP contexts..."

# Define base directories to search
$baseDirs = @(
    "packages",
    "scripts", 
    "tests",
    "render-mcp",
    "supermemory-local"
)

# Define patterns to exclude
$excludePatterns = @(
    "node_modules",
    "dist",
    "build", 
    ".next",
    "coverage",
    "**/*.min.js",
    "**/*.bundle.js"
)

$totalIssues = 0
$issueFiles = @()

# Find all TypeScript and JavaScript files
$allFiles = @()
foreach ($dir in $baseDirs) {
    if (Test-Path $dir) {
        $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
                 Where-Object { 
                     $exclude = $false
                     foreach ($pattern in $excludePatterns) {
                         if ($_.FullName -like "*$pattern*") {
                             $exclude = $true
                             break
                         }
                     }
                     !$exclude
                 }
        $allFiles += $files
    }
}

Write-Host "Scanning $($allFiles.Count) files for hardcoded HTTP status codes..."

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $fileIssues = @()
    
    # Look for specific HTTP status code patterns
    $patterns = @(
        # Express.js response methods with hardcoded status
        '\.status\(\s*(\d{3})\s*\)',
        '\.sendStatus\(\s*(\d{3})\s*\)',
        '\.statusCode\s*=\s*(\d{3})',
        
        # Test assertions with hardcoded status
        '\.expect\(\s*(\d{3})\s*\)',
        '\.toBe\(\s*(\d{3})\s*\)',
        '\.toEqual\(\s*(\d{3})\s*\)',
        
        # Response object status
        'response\.status\s*===?\s*(\d{3})',
        'status\s*===?\s*(\d{3})',
        
        # HTTP client status checks
        'statusCode\s*===?\s*(\d{3})',
        'status_code\s*===?\s*(\d{3})'
    )
    
    foreach ($pattern in $patterns) {
        $matches = [regex]::Matches($content, $pattern)
        foreach ($match in $matches) {
            $statusCode = [int]$match.Groups[1].Value
            # Only flag actual HTTP status codes (100-599)
            if ($statusCode -ge 100 -and $statusCode -le 599) {
                # Skip if it's already using HTTP_STATUS
                $fullMatch = $match.Value
                if ($fullMatch -notmatch "HTTP_STATUS") {
                    $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
                    $fileIssues += "Line $lineNumber : $($match.Value)"
                }
            }
        }
    }
    
    if ($fileIssues.Count -gt 0) {
        $totalIssues += $fileIssues.Count
        $issueFiles += $file.FullName
        
        Write-Host ""
        Write-Host "Issues in $($file.FullName):" -ForegroundColor Yellow
        foreach ($issue in $fileIssues) {
            Write-Host "  $issue" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== HTTP Status Code Cleanup Validation Results ===" -ForegroundColor Cyan
Write-Host "Total hardcoded HTTP status codes found: $totalIssues"
Write-Host "Files with issues: $($issueFiles.Count)"

if ($totalIssues -eq 0) {
    Write-Host "✅ HTTP status code cleanup appears to be successful!" -ForegroundColor Green
} else {
    Write-Host "⚠️  There are still some hardcoded HTTP status codes that need attention" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "Files with remaining hardcoded status codes:"
    foreach ($file in $issueFiles) {
        Write-Host "  $file"
    }
}