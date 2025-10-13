#!/usr/bin/env pwsh

Write-Host "Scanning for hardcoded environment variable references..."

# Define base directories to search
$baseDirs = @(
    "packages\server\src",
    "packages\client\src",
    "packages\shared\src",
    "scripts"
)

# Define patterns to exclude
$excludePatterns = @(
    "node_modules",
    "dist",
    "build", 
    ".next",
    "coverage",
    "**/*.min.js",
    "**/*.bundle.js",
    "*env*.d.ts",       # TypeScript env definitions
    "vite.config.*"     # Vite config files
)

$totalMatches = 0
$matchingFiles = @()

# Environment variable patterns to look for
$envVarPatterns = @{
    # Node.js environment variables
    'NODE_ENV' = @(
        'process\.env\.NODE_ENV',
        'NODE_ENV\s*===?\s*["\']',
        'NODE_ENV\s*!==?\s*["\']'
    );
    
    # Server configuration
    'SERVER' = @(
        'process\.env\.PORT\b',
        'process\.env\.HOST\b',
        'process\.env\.SERVER_PORT\b'
    );
    
    # Database configuration
    'DATABASE' = @(
        'process\.env\.DATABASE_URL\b',
        'process\.env\.SUPABASE_URL\b',
        'process\.env\.SUPABASE_ANON_KEY\b',
        'process\.env\.SUPABASE_SERVICE_ROLE_KEY\b',
        'process\.env\.DB_HOST\b',
        'process\.env\.DB_PORT\b',
        'process\.env\.DB_NAME\b',
        'process\.env\.DB_USER\b',
        'process\.env\.DB_PASSWORD\b'
    );
    
    # Authentication and API keys
    'AUTH' = @(
        'process\.env\.JWT_SECRET\b',
        'process\.env\.API_KEY\b',
        'process\.env\.SECRET_KEY\b',
        'process\.env\.AUTH_SECRET\b',
        'process\.env\.NEXT_PUBLIC_SUPABASE_URL\b',
        'process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY\b'
    );
    
    # Platform and deployment
    'PLATFORM' = @(
        'process\.env\.RENDER\b',
        'process\.env\.VERCEL\b',
        'process\.env\.NETLIFY\b',
        'process\.env\.HEROKU\b',
        'process\.env\.AWS_\w+\b',
        'process\.env\.NODE_OPTIONS\b'
    );
    
    # Development and debugging
    'DEBUG' = @(
        'process\.env\.DEBUG\b',
        'process\.env\.LOG_LEVEL\b',
        'process\.env\.VERBOSE\b',
        'process\.env\.NODE_DEBUG\b'
    );
    
    # SSL and security
    'SSL' = @(
        'process\.env\.USE_HTTPS\b',
        'process\.env\.SSL_CERT\b',
        'process\.env\.SSL_KEY\b',
        'process\.env\.TLS_\w+\b',
        'process\.env\.USE_REVERSE_PROXY_SSL\b'
    );
    
    # Custom application vars
    'APP' = @(
        'process\.env\.APP_\w+\b',
        'process\.env\.VITE_\w+\b',
        'process\.env\.REACT_APP_\w+\b',
        'process\.env\.NEXT_PUBLIC_\w+\b'
    );
    
    # Generic process.env access
    'GENERIC' = @(
        'process\.env\[["\'][^"\']+["\']\]',
        'process\.env\.\w+(?!\s*=)'
    )
}

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

Write-Host "Found $($allFiles.Count) files to scan for environment variables"

$categoryResults = @{}

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $fileMatches = @{}
    
    foreach ($category in $envVarPatterns.Keys) {
        $patterns = $envVarPatterns[$category]
        $categoryMatches = @()
        
        foreach ($pattern in $patterns) {
            $matches = [regex]::Matches($content, $pattern)
            foreach ($match in $matches) {
                $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
                $context = $match.Value
                
                # Extract just the env var name for cleaner output
                $envVarName = ""
                if ($context -match 'process\.env\.(\w+)') {
                    $envVarName = $matches[0].Groups[1].Value
                } elseif ($context -match 'NODE_ENV') {
                    $envVarName = "NODE_ENV"
                } else {
                    $envVarName = $context
                }
                
                $categoryMatches += "Line $lineNumber : $envVarName ($context)"
            }
        }
        
        if ($categoryMatches.Count -gt 0) {
            $fileMatches[$category] = $categoryMatches
        }
    }
    
    if ($fileMatches.Count -gt 0) {
        $fileTotal = ($fileMatches.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
        $totalMatches += $fileTotal
        $matchingFiles += $file.FullName
        
        Write-Host ""
        Write-Host "Environment variables in $($file.FullName):" -ForegroundColor Yellow
        
        foreach ($category in $fileMatches.Keys) {
            Write-Host "  [$category]:" -ForegroundColor Cyan
            foreach ($match in ($fileMatches[$category] | Select-Object -First 5)) {
                Write-Host "    $match" -ForegroundColor Red
            }
            if ($fileMatches[$category].Count -gt 5) {
                Write-Host "    ... and $($fileMatches[$category].Count - 5) more $category matches" -ForegroundColor Gray
            }
            
            # Update category totals
            if ($categoryResults.ContainsKey($category)) {
                $categoryResults[$category] += $fileMatches[$category].Count
            } else {
                $categoryResults[$category] = $fileMatches[$category].Count
            }
        }
    }
}

Write-Host ""
Write-Host "=== Environment Variables Scan Results ===" -ForegroundColor Cyan
Write-Host "Total environment variable references: $totalMatches"
Write-Host "Files with environment variables: $($matchingFiles.Count)"

Write-Host ""
Write-Host "Environment variables by category:"
foreach ($category in $categoryResults.Keys | Sort-Object) {
    Write-Host "  $category : $($categoryResults[$category]) matches" -ForegroundColor Yellow
}

if ($matchingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Files with environment variables (first 20):"
    $matchingFiles | Select-Object -First 20 | ForEach-Object {
        Write-Host "  $_"
    }
    if ($matchingFiles.Count -gt 20) {
        Write-Host "  ... and $($matchingFiles.Count - 20) more files"
    }
}