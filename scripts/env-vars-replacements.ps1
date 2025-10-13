param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

Write-Host "Environment Variables Bulk Replacement" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

if ($DryRun) {
    Write-Host "DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
}

# Define environment variable replacements
# These are the hardcoded env var names that should use ENV_VARS constants instead
$envVarReplacements = @(
    # SSL/TLS Environment Variables
    @{From = "process.env.FORCE_HTTPS"; To = "process.env[ENV_VARS.FORCE_HTTPS]"}
    @{From = "process.env.TLS_DISABLE_SESSION_RESUMPTION"; To = "process.env[ENV_VARS.TLS_DISABLE_SESSION_RESUMPTION]"}
    @{From = "process.env.TLS_SESSION_TIMEOUT"; To = "process.env[ENV_VARS.TLS_SESSION_TIMEOUT]"}
    @{From = "process.env.TLS_SESSION_CACHE_SIZE"; To = "process.env[ENV_VARS.TLS_SESSION_CACHE_SIZE]"}
    @{From = "process.env.TLS_OCSP_STAPLING"; To = "process.env[ENV_VARS.TLS_OCSP_STAPLING]"}
    @{From = "process.env.SSL_KEY_PASSPHRASE"; To = "process.env[ENV_VARS.SSL_KEY_PASSPHRASE]"}
    @{From = "process.env.TLS_CERT_PINNING_ENABLED"; To = "process.env[ENV_VARS.TLS_CERT_PINNING_ENABLED]"}
    @{From = "process.env.TLS_PINNED_CERTIFICATES"; To = "process.env[ENV_VARS.TLS_PINNED_CERTIFICATES]"}
    @{From = "process.env.TLS_PINNED_PUBLIC_KEYS"; To = "process.env[ENV_VARS.TLS_PINNED_PUBLIC_KEYS]"}
    @{From = "process.env.TLS_CERT_PINNING_STRICT"; To = "process.env[ENV_VARS.TLS_CERT_PINNING_STRICT]"}
    @{From = "process.env.TLS_CERT_PINNING_REPORT_URL"; To = "process.env[ENV_VARS.TLS_CERT_PINNING_REPORT_URL]"}
    @{From = "process.env.TLS_CERT_PINNING_MAX_AGE"; To = "process.env[ENV_VARS.TLS_CERT_PINNING_MAX_AGE]"}
    @{From = "process.env.TLS_CERT_PINNING_INCLUDE_SUBDOMAINS"; To = "process.env[ENV_VARS.TLS_CERT_PINNING_INCLUDE_SUBDOMAINS]"}
    @{From = "process.env.SSL_KEY_PATH"; To = "process.env[ENV_VARS.SSL_KEY_PATH]"}
    @{From = "process.env.SSL_CERT_PATH"; To = "process.env[ENV_VARS.SSL_CERT_PATH]"}
    @{From = "process.env.SSL_CA_PATH"; To = "process.env[ENV_VARS.SSL_CA_PATH]"}
    @{From = "process.env.USE_REVERSE_PROXY_SSL"; To = "process.env[ENV_VARS.USE_REVERSE_PROXY_SSL]"}
    
    # Authentication & Security
    @{From = "process.env.DEVICE_BINDING_THRESHOLD"; To = "process.env[ENV_VARS.DEVICE_BINDING_THRESHOLD]"}
    @{From = "process.env.DEVICE_BINDING_STRICT"; To = "process.env[ENV_VARS.DEVICE_BINDING_STRICT]"}
    @{From = "process.env.ENABLE_DEVICE_BINDING"; To = "process.env[ENV_VARS.ENABLE_DEVICE_BINDING]"}
    @{From = "process.env.ADMIN_MAINTENANCE_SECRET"; To = "process.env[ENV_VARS.ADMIN_MAINTENANCE_SECRET]"}
    
    # Logging & Debug
    @{From = "process.env.LOG_LEVEL"; To = "process.env[ENV_VARS.LOG_LEVEL]"}
    @{From = "process.env.SECURITY_REPORT_URI"; To = "process.env[ENV_VARS.SECURITY_REPORT_URI]"}
    @{From = "process.env.ENABLE_ERROR_SYNC"; To = "process.env[ENV_VARS.ENABLE_ERROR_SYNC]"}
    
    # Communication & Notifications
    @{From = "process.env.SLACK_WEBHOOK_URL"; To = "process.env[ENV_VARS.SLACK_WEBHOOK_URL]"}
    @{From = "process.env.SLACK_CHANNEL"; To = "process.env[ENV_VARS.SLACK_CHANNEL]"}
    @{From = "process.env.SLACK_USERNAME"; To = "process.env[ENV_VARS.SLACK_USERNAME]"}
    @{From = "process.env.SMTP_HOST"; To = "process.env[ENV_VARS.SMTP_HOST]"}
    @{From = "process.env.SMTP_PORT"; To = "process.env[ENV_VARS.SMTP_PORT]"}
    @{From = "process.env.SMTP_USERNAME"; To = "process.env[ENV_VARS.SMTP_USERNAME]"}
    @{From = "process.env.SMTP_PASSWORD"; To = "process.env[ENV_VARS.SMTP_PASSWORD]"}
    @{From = "process.env.EMAIL_FROM"; To = "process.env[ENV_VARS.EMAIL_FROM]"}
    @{From = "process.env.EMAIL_RECIPIENTS"; To = "process.env[ENV_VARS.EMAIL_RECIPIENTS]"}
    
    # Rate Limiting
    @{From = "process.env.RATE_LIMIT_ENABLED"; To = "process.env[ENV_VARS.RATE_LIMIT_ENABLED]"}
    @{From = "process.env.RATE_LIMIT_WINDOW_MS"; To = "process.env[ENV_VARS.RATE_LIMIT_WINDOW_MS]"}
    @{From = "process.env.RATE_LIMIT_MAX_REQUESTS"; To = "process.env[ENV_VARS.RATE_LIMIT_MAX_REQUESTS]"}
    @{From = "process.env.RATE_LIMIT_SKIP_AUTH"; To = "process.env[ENV_VARS.RATE_LIMIT_SKIP_AUTH]"}
    @{From = "process.env.RATE_LIMIT_SKIP_GAME"; To = "process.env[ENV_VARS.RATE_LIMIT_SKIP_GAME]"}
    
    # System & Platform
    @{From = "process.env.APPDATA"; To = "process.env[ENV_VARS.APPDATA]"}
    @{From = "process.env.HOME"; To = "process.env[ENV_VARS.HOME]"}
    
    # Game Configuration
    @{From = "process.env.DEBUG_RESOURCES"; To = "process.env[ENV_VARS.DEBUG_RESOURCES]"}
    @{From = "process.env.DEBUG_PATCH_LOG"; To = "process.env[ENV_VARS.DEBUG_PATCH_LOG]"}
    @{From = "process.env.ECONOMY_DEBUG"; To = "process.env[ENV_VARS.ECONOMY_DEBUG]"}
    
    # React App (Legacy)
    @{From = "process.env.REACT_APP_VERSION"; To = "process.env[ENV_VARS.REACT_APP_VERSION]"}
    
    # Testing Configuration
    @{From = "process.env.TEST_ADMIN_TOKEN"; To = "process.env[ENV_VARS.TEST_ADMIN_TOKEN]"}
    @{From = "process.env.TEST_USER_EMAIL"; To = "process.env[ENV_VARS.TEST_USER_EMAIL]"}
    @{From = "process.env.TEST_USER_PASSWORD"; To = "process.env[ENV_VARS.TEST_USER_PASSWORD]"}
    
    # Health Checks
    @{From = "process.env.HTTPS_HEALTH_CHECK_INTERVAL_MINUTES"; To = "process.env[ENV_VARS.HTTPS_HEALTH_CHECK_INTERVAL_MINUTES]"}
    
    # Security Monitoring
    @{From = "process.env.SECURITY_EVENTS_RETENTION"; To = "process.env[ENV_VARS.SECURITY_EVENTS_RETENTION]"}
    @{From = "process.env.MAX_SESSIONS_PER_USER"; To = "process.env[ENV_VARS.MAX_SESSIONS_PER_USER]"}
    @{From = "process.env.DEVICE_FINGERPRINT_THRESHOLD"; To = "process.env[ENV_VARS.DEVICE_FINGERPRINT_THRESHOLD]"}
    @{From = "process.env.AUTO_REVOKE_ON_SUSPICIOUS"; To = "process.env[ENV_VARS.AUTO_REVOKE_ON_SUSPICIOUS]"}
    
    # Desktop App Specific
    @{From = "process.env.ELECTRON_IS_DEV"; To = "process.env[ENV_VARS.ELECTRON_IS_DEV]"}
    @{From = "process.env.DEBUG"; To = "process.env[ENV_VARS.DEBUG]"}
    @{From = "process.env.ADMIN_MODE"; To = "process.env[ENV_VARS.ADMIN_MODE]"}
    @{From = "process.env.ELECTRON_ENABLE_LOGGING"; To = "process.env[ENV_VARS.ELECTRON_ENABLE_LOGGING]"}
    @{From = "process.env.API_BASE_URL"; To = "process.env[ENV_VARS.API_BASE_URL]"}
    @{From = "process.env.PRODUCTION_API_HOST"; To = "process.env[ENV_VARS.PRODUCTION_API_HOST]"}
    @{From = "process.env.XDG_CONFIG_HOME"; To = "process.env[ENV_VARS.XDG_CONFIG_HOME]"}
    @{From = "process.env.ATTRITION_LAUNCHED_BY_LAUNCHER"; To = "process.env[ENV_VARS.ATTRITION_LAUNCHED_BY_LAUNCHER]"}
)

# Find TypeScript and JavaScript files in main packages
$files = Get-ChildItem -Path "packages/server/src", "packages/client/src", "packages/shared/src", "packages/desktop/src" -Recurse -Include "*.ts", "*.js" -Exclude "*.d.ts", "configuration-keys.ts", "env-vars.ts"

Write-Host "Found $($files.Count) files to process" -ForegroundColor Cyan

$modifiedFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8 -ErrorAction Stop
        if ($null -eq $content) {
            $content = ""
        }
        
        $originalContent = $content
        $fileModified = $false
        $fileReplacements = 0
        
        foreach ($replacement in $envVarReplacements) {
            $oldContent = $content
            $content = $content.Replace($replacement.From, $replacement.To)
            if ($content -ne $oldContent) {
                $count = ($oldContent.Split($replacement.From).Count - 1)
                $fileReplacements += $count
                $fileModified = $true
            }
        }
        
        if ($fileModified) {
            # Add ENV_VARS import if needed and not already present
            if (-not $content.Contains("ENV_VARS") -or -not $content.Contains("@shared/constants/env-vars")) {
                $lines = $content -split "`n"
                $insertIndex = 0
                
                # Find where to insert import (after other imports)
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    if ($lines[$i] -match "^import " -or $lines[$i] -match "^from ") {
                        $insertIndex = $i + 1
                    } elseif ($lines[$i].Trim() -eq "" -and $insertIndex -gt 0) {
                        break
                    }
                }
                
                # Insert the import
                $importLine = "import { ENV_VARS } from '@shared/constants/env-vars';"
                $newLines = @()
                $newLines += $lines[0..($insertIndex-1)]
                $newLines += $importLine
                $newLines += $lines[$insertIndex..($lines.Count-1)]
                $content = $newLines -join "`n"
            }
            
            if (-not $DryRun) {
                Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            }
            
            $modifiedFiles++
            $totalReplacements += $fileReplacements
            
            if ($Verbose) {
                $relativePath = $file.FullName.Replace((Get-Location).Path, "")
                Write-Host "Modified: $relativePath ($fileReplacements replacements)" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nSUMMARY" -ForegroundColor Magenta
Write-Host "=======" -ForegroundColor Magenta
Write-Host "Files processed: $($files.Count)" -ForegroundColor White
Write-Host "Files modified: $modifiedFiles" -ForegroundColor Green
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Green

if ($DryRun) {
    Write-Host "`nDRY RUN COMPLETE - Run without -DryRun to apply changes" -ForegroundColor Yellow
} else {
    Write-Host "`nENVIRONMENT VARIABLES BULK REPLACEMENT COMPLETE!" -ForegroundColor Green
}