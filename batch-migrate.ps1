# Batch String Constants Migration Script
Write-Host "Batch String Constants Migration" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Common string replacements (safe, high-confidence mappings)
$replacements = @{
    # Loading messages
    '"Loading..."' = '{LOADING_MESSAGES.DEFAULT}'
    '"Loading data..."' = '{LOADING_MESSAGES.DATA}'
    '"Loading"' = '{LOADING_MESSAGES.DEFAULT}'
    '"Please wait..."' = '{LOADING_MESSAGES.PLEASE_WAIT}'
    '"Connecting..."' = '{LOADING_MESSAGES.CONNECTING}'
    '"Initializing..."' = '{LOADING_MESSAGES.INITIALIZING}'
    
    # Game elements
    '"Fleet"' = '{GAME_TEXT.FLEET}'
    '"Fleets"' = '{GAME_TEXT.FLEETS}'
    '"Building"' = '{GAME_TEXT.BUILDING}'
    '"Buildings"' = '{GAME_TEXT.BUILDINGS}'
    '"Research"' = '{GAME_TEXT.RESEARCH}'
    '"Credits"' = '{GAME_TEXT.CREDITS}'
    '"Energy"' = '{GAME_TEXT.ENERGY}'
    '"Empire"' = '{GAME_TEXT.EMPIRE}'
    '"Level"' = '{GAME_TEXT.LEVEL}'
    '"Status"' = '{GAME_TEXT.STATUS}'
    
    # Status indicators
    '"Active"' = '{STATUS_TEXT.ACTIVE}'
    '"Inactive"' = '{STATUS_TEXT.INACTIVE}'
    '"Online"' = '{STATUS_TEXT.ONLINE}'
    '"Offline"' = '{STATUS_TEXT.OFFLINE}'
    '"Available"' = '{STATUS_TEXT.AVAILABLE}'
    '"Unavailable"' = '{STATUS_TEXT.UNAVAILABLE}'
    '"Pending"' = '{STATUS_TEXT.PENDING}'
    '"Complete"' = '{STATUS_TEXT.COMPLETE}'
    '"Success"' = '{STATUS_TEXT.SUCCESS}'
    '"Failed"' = '{STATUS_TEXT.FAILED}'
    '"Error"' = '{STATUS_TEXT.ERROR}'
    
    # Navigation
    '"Home"' = '{PAGE_TEXT.HOME}'
    '"Dashboard"' = '{PAGE_TEXT.DASHBOARD}'
    '"Settings"' = '{PAGE_TEXT.SETTINGS}'
    '"Help"' = '{PAGE_TEXT.HELP}'
    '"Profile"' = '{PAGE_TEXT.PROFILE}'
    
    # Common actions
    '"Save"' = '{BUTTON_TEXT.SAVE}'
    '"Cancel"' = '{BUTTON_TEXT.CANCEL}'
    '"Submit"' = '{BUTTON_TEXT.SUBMIT}'
    '"Start"' = '{BUTTON_TEXT.START}'
    '"Edit"' = '{BUTTON_TEXT.EDIT}'
    '"Delete"' = '{BUTTON_TEXT.DELETE}'
    '"Create"' = '{BUTTON_TEXT.CREATE}'
    '"Update"' = '{BUTTON_TEXT.UPDATE}'
    '"Refresh"' = '{BUTTON_TEXT.REFRESH}'
    '"Retry"' = '{BUTTON_TEXT.RETRY}'
}

# Import statements to add (only add if not already present)
$importStatements = @{
    'LOADING_MESSAGES' = '@shared/constants/string-constants'
    'GAME_TEXT' = '@shared/constants/string-constants'  
    'STATUS_TEXT' = '@shared/constants/string-constants'
    'PAGE_TEXT' = '@shared/constants/string-constants'
    'BUTTON_TEXT' = '@shared/constants/string-constants'
    'ERROR_TEXT' = '@shared/constants/string-constants'
}

# Get target files (exclude already processed ones)
$targetFiles = Get-ChildItem "packages\client\src" -Include "*.tsx" -Recurse | 
    Where-Object { 
        $_.Name -notmatch "BasePage.tsx|Dashboard.tsx|StatusDot.tsx|App.tsx" -and
        $_.FullName -notmatch "node_modules|\.d\.ts|test|spec"
    }

$processedFiles = 0
$totalReplacements = 0
$filesWithChanges = @()

Write-Host "Found $($targetFiles.Count) files to process" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $targetFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $originalContent = $content
    $fileReplacements = 0
    $neededImports = @()
    
    # Apply replacements
    foreach ($find in $replacements.Keys) {
        $replace = $replacements[$find]
        
        if ($content -match [regex]::Escape($find)) {
            $content = $content -replace [regex]::Escape($find), $replace
            $fileReplacements++
            $totalReplacements++
            
            # Track which imports this file will need
            $constantName = $replace -replace '[{}]', '' -split '\.' | Select-Object -First 1
            if ($importStatements.ContainsKey($constantName) -and $neededImports -notcontains $constantName) {
                $neededImports += $constantName
            }
        }
    }
    
    # Add import statement if needed and not already present
    if ($neededImports.Count -gt 0) {
        $existingImport = $content -match "from '@shared/constants/string-constants'"
        
        if (-not $existingImport) {
            # Find existing imports to place new import appropriately
            $lines = $content -split "`n"
            $lastImportIndex = -1
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import.*from.*['\"];?\s*$") {
                    $lastImportIndex = $i
                }
            }
            
            if ($lastImportIndex -ge 0) {
                $importLine = "import { $($neededImports -join ', ') } from '@shared/constants/string-constants';"
                $lines = $lines[0..$lastImportIndex] + $importLine + $lines[($lastImportIndex + 1)..($lines.Count - 1)]
                $content = $lines -join "`n"
                $fileReplacements++
            }
        }
    }
    
    # Write back if changes were made
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline
        $filesWithChanges += [PSCustomObject]@{
            File = $file.Name
            Path = $relativePath
            Replacements = $fileReplacements
            ImportsAdded = $neededImports -join ', '
        }
        
        Write-Host "$($file.Name): $fileReplacements changes" -ForegroundColor Green
    }
    
    $processedFiles++
    
    # Progress indicator
    if ($processedFiles % 10 -eq 0) {
        Write-Host "   ... processed $processedFiles / $($targetFiles.Count) files" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "BATCH PROCESSING COMPLETE!" -ForegroundColor Magenta
Write-Host "==========================" -ForegroundColor Magenta
Write-Host "Files processed: $processedFiles" -ForegroundColor White
Write-Host "Files changed: $($filesWithChanges.Count)" -ForegroundColor White  
Write-Host "Total replacements: $totalReplacements" -ForegroundColor White

if ($filesWithChanges.Count -gt 0) {
    Write-Host ""
    Write-Host "CHANGED FILES SUMMARY:" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    $filesWithChanges | Sort-Object Replacements -Descending | ForEach-Object {
        Write-Host "$($_.File): $($_.Replacements) replacements" -ForegroundColor Yellow
        if ($_.ImportsAdded) {
            Write-Host "   Imports: $($_.ImportsAdded)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "Run 'enhanced-scan.ps1' to see updated opportunity counts!" -ForegroundColor Cyan
