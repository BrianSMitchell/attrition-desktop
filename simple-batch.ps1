# Simple Batch String Constants Migration
Write-Host "Batch String Constants Migration" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Simple replacements - most common patterns
$replacements = @(
    @{Find='"Loading..."'; Replace='{LOADING_MESSAGES.DEFAULT}'},
    @{Find='"Loading"'; Replace='{LOADING_MESSAGES.DEFAULT}'},
    @{Find='"Fleet"'; Replace='{GAME_TEXT.FLEET}'},
    @{Find='"Fleets"'; Replace='{GAME_TEXT.FLEETS}'},
    @{Find='"Building"'; Replace='{GAME_TEXT.BUILDING}'},
    @{Find='"Buildings"'; Replace='{GAME_TEXT.BUILDINGS}'},
    @{Find='"Research"'; Replace='{GAME_TEXT.RESEARCH}'},
    @{Find='"Credits"'; Replace='{GAME_TEXT.CREDITS}'},
    @{Find='"Energy"'; Replace='{GAME_TEXT.ENERGY}'},
    @{Find='"Empire"'; Replace='{GAME_TEXT.EMPIRE}'},
    @{Find='"Level"'; Replace='{GAME_TEXT.LEVEL}'},
    @{Find='"Status"'; Replace='{GAME_TEXT.STATUS}'},
    @{Find='"Active"'; Replace='{STATUS_TEXT.ACTIVE}'},
    @{Find='"Inactive"'; Replace='{STATUS_TEXT.INACTIVE}'},
    @{Find='"Online"'; Replace='{STATUS_TEXT.ONLINE}'},
    @{Find='"Offline"'; Replace='{STATUS_TEXT.OFFLINE}'},
    @{Find='"Available"'; Replace='{STATUS_TEXT.AVAILABLE}'},
    @{Find='"Unavailable"'; Replace='{STATUS_TEXT.UNAVAILABLE}'},
    @{Find='"Pending"'; Replace='{STATUS_TEXT.PENDING}'},
    @{Find='"Complete"'; Replace='{STATUS_TEXT.COMPLETE}'},
    @{Find='"Success"'; Replace='{STATUS_TEXT.SUCCESS}'},
    @{Find='"Error"'; Replace='{STATUS_TEXT.ERROR}'},
    @{Find='"Home"'; Replace='{PAGE_TEXT.HOME}'},
    @{Find='"Dashboard"'; Replace='{PAGE_TEXT.DASHBOARD}'},
    @{Find='"Settings"'; Replace='{PAGE_TEXT.SETTINGS}'},
    @{Find='"Help"'; Replace='{PAGE_TEXT.HELP}'},
    @{Find='"Cancel"'; Replace='{BUTTON_TEXT.CANCEL}'},
    @{Find='"Save"'; Replace='{BUTTON_TEXT.SAVE}'},
    @{Find='"Submit"'; Replace='{BUTTON_TEXT.SUBMIT}'},
    @{Find='"Start"'; Replace='{BUTTON_TEXT.START}'},
    @{Find='"Create"'; Replace='{BUTTON_TEXT.CREATE}'},
    @{Find='"Update"'; Replace='{BUTTON_TEXT.UPDATE}'},
    @{Find='"Delete"'; Replace='{BUTTON_TEXT.DELETE}'},
    @{Find='"Edit"'; Replace='{BUTTON_TEXT.EDIT}'},
    @{Find='"Refresh"'; Replace='{BUTTON_TEXT.REFRESH}'},
    @{Find='"Retry"'; Replace='{BUTTON_TEXT.RETRY}'}
)

# Target files (exclude already processed)
$files = Get-ChildItem "packages\client\src" -Include "*.tsx" -Recurse | 
    Where-Object { 
        $_.Name -notmatch "BasePage.tsx|Dashboard.tsx|StatusDot.tsx|App.tsx" -and
        $_.FullName -notmatch "node_modules|\.d\.ts|test|spec"
    }

$totalReplacements = 0
$changedFiles = 0

Write-Host "Processing $($files.Count) files..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $originalContent = $content
    $fileChanges = 0
    
    foreach ($replacement in $replacements) {
        if ($content -contains $replacement.Find) {
            $content = $content.Replace($replacement.Find, $replacement.Replace)
            $fileChanges++
            $totalReplacements++
        }
    }
    
    if ($content -ne $originalContent) {
        try {
            Set-Content $file.FullName $content -NoNewline -ErrorAction Stop
            Write-Host "$($file.Name): $fileChanges changes" -ForegroundColor Green
            $changedFiles++
        } catch {
            Write-Host "ERROR processing $($file.Name): $($_)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "BATCH PROCESSING COMPLETE!" -ForegroundColor Magenta
Write-Host "Files changed: $changedFiles" -ForegroundColor White
Write-Host "Total replacements: $totalReplacements" -ForegroundColor White
Write-Host ""
Write-Host "Run enhanced-scan.ps1 to see results!" -ForegroundColor Cyan