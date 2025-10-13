Write-Host "Replacing API endpoint strings..." -ForegroundColor Green

$replacements = @{
    '"/api/game/fleets"' = 'API_ENDPOINTS.GAME.FLEETS'
    '"/api/game/bases"' = 'API_ENDPOINTS.GAME.BASES'
    '"/api/game/dashboard"' = 'API_ENDPOINTS.GAME.DASHBOARD'
    '"/api/auth/login"' = 'API_ENDPOINTS.AUTH.LOGIN'
}

$files = Get-ChildItem -Path "packages\server\src" -Recurse -Include *.ts,*.js

$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    $originalContent = $content
    
    if ($content) {
        foreach ($pattern in $replacements.Keys) {
            $replacement = $replacements[$pattern]
            if ($content -match [regex]::Escape($pattern)) {
                $content = $content -replace [regex]::Escape($pattern), $replacement
                $totalReplacements++
            }
        }
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            Write-Host "Modified: $($file.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "Total replacements: $totalReplacements" -ForegroundColor Yellow