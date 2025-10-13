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

# Common environment variable names we'll look for
$envVarNames = @(
    "NODE_ENV", "PORT", "HOST", "SERVER_PORT",
    "DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET", "API_KEY", "SECRET_KEY", "AUTH_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "RENDER", "VERCEL", "NETLIFY", "HEROKU", 
    "DEBUG", "LOG_LEVEL", "VERBOSE", "NODE_DEBUG",
    "USE_HTTPS", "USE_REVERSE_PROXY_SSL", "SSL_CERT", "SSL_KEY"
)

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

$envVarResults = @{}

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $fileMatches = @()
    
    # Look for process.env.VAR_NAME patterns
    foreach ($envVar in $envVarNames) {
        $pattern = "process\.env\.$envVar\b"
        $matches = [regex]::Matches($content, $pattern)
        
        foreach ($match in $matches) {
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
            $context = $match.Value
            
            $fileMatches += "Line $lineNumber : $envVar ($context)"
        }
    }
    
    # Also look for generic process.env access
    $genericPattern = "process\.env\.\w+"
    $genericMatches = [regex]::Matches($content, $genericPattern)
    
    foreach ($match in $genericMatches) {
        # Skip if it's one we already found
        $alreadyFound = $false
        foreach ($envVar in $envVarNames) {
            if ($match.Value -match "process\.env\.$envVar\b") {
                $alreadyFound = $true
                break
            }
        }
        
        if (-not $alreadyFound) {
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
            $context = $match.Value
            
            # Extract variable name
            if ($context -match "process\.env\.(\w+)") {
                $varName = $matches[0].Groups[1].Value
                $fileMatches += "Line $lineNumber : $varName ($context)"
            }
        }
    }
    
    if ($fileMatches.Count -gt 0) {
        $totalMatches += $fileMatches.Count
        $matchingFiles += $file.FullName
        
        Write-Host ""
        Write-Host "Environment variables in $($file.FullName):" -ForegroundColor Yellow
        foreach ($match in ($fileMatches | Select-Object -First 10)) {
            Write-Host "  $match" -ForegroundColor Red
        }
        if ($fileMatches.Count -gt 10) {
            Write-Host "  ... and $($fileMatches.Count - 10) more matches" -ForegroundColor Gray
        }
        
        # Group matches by variable name for summary
        foreach ($match in $fileMatches) {
            if ($match -match "Line \d+ : (\w+) \(") {
                $varName = $matches[0].Groups[1].Value
                if ($envVarResults.ContainsKey($varName)) {
                    $envVarResults[$varName]++
                } else {
                    $envVarResults[$varName] = 1
                }
            }
        }
    }
}

Write-Host ""
Write-Host "=== Environment Variables Scan Results ===" -ForegroundColor Cyan
Write-Host "Total environment variable references: $totalMatches"
Write-Host "Files with environment variables: $($matchingFiles.Count)"

if ($envVarResults.Count -gt 0) {
    Write-Host ""
    Write-Host "Most common environment variables:"
    $envVarResults.Keys | Sort-Object { $envVarResults[$_] } -Descending | ForEach-Object {
        Write-Host "  $_ : $($envVarResults[$_]) references" -ForegroundColor Yellow
    }
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