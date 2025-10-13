# Bulk Error Message Cleanup Script
# Replaces hardcoded error strings with ERROR_MESSAGES constants

$projectRoot = "C:\Projects\Attrition"
$replacementCount = 0
$modifiedFiles = @()

# Define comprehensive replacement mappings for common error strings
$replacements = @{
    # Authentication/Authorization errors
    "'Authentication required'" = "ERROR_MESSAGES.AUTHENTICATION_REQUIRED"
    '"Authentication required"' = "ERROR_MESSAGES.AUTHENTICATION_REQUIRED"
    "'Invalid credentials'" = "ERROR_MESSAGES.INVALID_CREDENTIALS"
    '"Invalid credentials"' = "ERROR_MESSAGES.INVALID_CREDENTIALS"
    "'Token has expired'" = "ERROR_MESSAGES.TOKEN_EXPIRED"
    '"Token has expired"' = "ERROR_MESSAGES.TOKEN_EXPIRED"
    "'Invalid token'" = "ERROR_MESSAGES.TOKEN_INVALID"
    '"Invalid token"' = "ERROR_MESSAGES.TOKEN_INVALID"
    "'Access denied'" = "ERROR_MESSAGES.ACCESS_DENIED"
    '"Access denied"' = "ERROR_MESSAGES.ACCESS_DENIED"
    "'Unauthorized access'" = "ERROR_MESSAGES.UNAUTHORIZED_ACCESS"
    '"Unauthorized access"' = "ERROR_MESSAGES.UNAUTHORIZED_ACCESS"
    "'Token is required'" = "ERROR_MESSAGES.TOKEN_REQUIRED"
    '"Token is required"' = "ERROR_MESSAGES.TOKEN_REQUIRED"
    "'refreshToken is required'" = "ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED"
    '"refreshToken is required"' = "ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED"
    "'Invalid refresh token'" = "ERROR_MESSAGES.INVALID_REFRESH_TOKEN"
    '"Invalid refresh token"' = "ERROR_MESSAGES.INVALID_REFRESH_TOKEN"
    
    # Validation errors
    "'Invalid input'" = "ERROR_MESSAGES.INVALID_INPUT"
    '"Invalid input"' = "ERROR_MESSAGES.INVALID_INPUT"
    "'Invalid request'" = "ERROR_MESSAGES.INVALID_REQUEST"
    '"Invalid request"' = "ERROR_MESSAGES.INVALID_REQUEST"
    "'Invalid parameter'" = "ERROR_MESSAGES.INVALID_PARAMETER"
    '"Invalid parameter"' = "ERROR_MESSAGES.INVALID_PARAMETER"
    "'Missing required field'" = "ERROR_MESSAGES.MISSING_REQUIRED_FIELD"
    '"Missing required field"' = "ERROR_MESSAGES.MISSING_REQUIRED_FIELD"
    "'Field is required'" = "ERROR_MESSAGES.FIELD_REQUIRED"
    '"Field is required"' = "ERROR_MESSAGES.FIELD_REQUIRED"
    "'Coordinate parameter is required'" = "ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED"
    '"Coordinate parameter is required"' = "ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED"
    "'Invalid coordinates'" = "ERROR_MESSAGES.INVALID_COORDINATES"
    '"Invalid coordinates"' = "ERROR_MESSAGES.INVALID_COORDINATES"
    
    # Resource/Entity not found errors
    "'Not found'" = "ERROR_MESSAGES.NOT_FOUND"
    '"Not found"' = "ERROR_MESSAGES.NOT_FOUND"
    "'User not found'" = "ERROR_MESSAGES.USER_NOT_FOUND"
    '"User not found"' = "ERROR_MESSAGES.USER_NOT_FOUND"
    "'Empire not found'" = "ERROR_MESSAGES.EMPIRE_NOT_FOUND"
    '"Empire not found"' = "ERROR_MESSAGES.EMPIRE_NOT_FOUND"
    "'Base not found'" = "ERROR_MESSAGES.BASE_NOT_FOUND"
    '"Base not found"' = "ERROR_MESSAGES.BASE_NOT_FOUND"
    "'Fleet not found'" = "ERROR_MESSAGES.FLEET_NOT_FOUND"
    '"Fleet not found"' = "ERROR_MESSAGES.FLEET_NOT_FOUND"
    "'Building not found'" = "ERROR_MESSAGES.BUILDING_NOT_FOUND"
    '"Building not found"' = "ERROR_MESSAGES.BUILDING_NOT_FOUND"
    "'Territory not found'" = "ERROR_MESSAGES.TERRITORY_NOT_FOUND"
    '"Territory not found"' = "ERROR_MESSAGES.TERRITORY_NOT_FOUND"
    
    # Capacity/Resource errors
    "'Insufficient resources'" = "ERROR_MESSAGES.INSUFFICIENT_RESOURCES"
    '"Insufficient resources"' = "ERROR_MESSAGES.INSUFFICIENT_RESOURCES"
    "'Insufficient credits'" = "ERROR_MESSAGES.INSUFFICIENT_CREDITS"
    '"Insufficient credits"' = "ERROR_MESSAGES.INSUFFICIENT_CREDITS"
    "'Insufficient capacity'" = "ERROR_MESSAGES.INSUFFICIENT_CAPACITY"
    '"Insufficient capacity"' = "ERROR_MESSAGES.INSUFFICIENT_CAPACITY"
    "'Insufficient energy'" = "ERROR_MESSAGES.INSUFFICIENT_ENERGY"
    '"Insufficient energy"' = "ERROR_MESSAGES.INSUFFICIENT_ENERGY"
    "'Not enough space'" = "ERROR_MESSAGES.NOT_ENOUGH_SPACE"
    '"Not enough space"' = "ERROR_MESSAGES.NOT_ENOUGH_SPACE"
    
    # Construction/Progress errors  
    "'Construction already in progress'" = "ERROR_MESSAGES.CONSTRUCTION_IN_PROGRESS"
    '"Construction already in progress"' = "ERROR_MESSAGES.CONSTRUCTION_IN_PROGRESS"
    "'Already in progress'" = "ERROR_MESSAGES.ALREADY_IN_PROGRESS"
    '"Already in progress"' = "ERROR_MESSAGES.ALREADY_IN_PROGRESS"
    "'No active construction'" = "ERROR_MESSAGES.NO_ACTIVE_CONSTRUCTION"
    '"No active construction"' = "ERROR_MESSAGES.NO_ACTIVE_CONSTRUCTION"
    
    # Database/System errors
    "'Database error'" = "ERROR_MESSAGES.DATABASE_ERROR"
    '"Database error"' = "ERROR_MESSAGES.DATABASE_ERROR"
    "'Connection error'" = "ERROR_MESSAGES.CONNECTION_ERROR"
    '"Connection error"' = "ERROR_MESSAGES.CONNECTION_ERROR"
    "'Internal server error'" = "ERROR_MESSAGES.INTERNAL_ERROR"
    '"Internal server error"' = "ERROR_MESSAGES.INTERNAL_ERROR"
    "'Something went wrong'" = "ERROR_MESSAGES.SOMETHING_WENT_WRONG"
    '"Something went wrong"' = "ERROR_MESSAGES.SOMETHING_WENT_WRONG"
    "'Operation failed'" = "ERROR_MESSAGES.OPERATION_FAILED"
    '"Operation failed"' = "ERROR_MESSAGES.OPERATION_FAILED"
    
    # Network errors
    "'Network error'" = "ERROR_MESSAGES.NETWORK_ERROR"
    '"Network error"' = "ERROR_MESSAGES.NETWORK_ERROR"
    "'No internet connection'" = "ERROR_MESSAGES.NO_INTERNET_CONNECTION"
    '"No internet connection"' = "ERROR_MESSAGES.NO_INTERNET_CONNECTION"
    "'Internet connection lost'" = "ERROR_MESSAGES.CONNECTION_LOST"
    '"Internet connection lost"' = "ERROR_MESSAGES.CONNECTION_LOST"
    "'Sync error'" = "ERROR_MESSAGES.SYNC_ERROR"
    '"Sync error"' = "ERROR_MESSAGES.SYNC_ERROR"
    "'Failed to check network connectivity'" = "ERROR_MESSAGES.FAILED_TO_CHECK_NETWORK_CONNECTIVITY"
    '"Failed to check network connectivity"' = "ERROR_MESSAGES.FAILED_TO_CHECK_NETWORK_CONNECTIVITY"
    
    # Load/Save errors
    "'Failed to load'" = "ERROR_MESSAGES.FAILED_TO_LOAD"
    '"Failed to load"' = "ERROR_MESSAGES.FAILED_TO_LOAD"
    "'Failed to load data'" = "ERROR_MESSAGES.FAILED_TO_LOAD_DATA"
    '"Failed to load data"' = "ERROR_MESSAGES.FAILED_TO_LOAD_DATA"
    "'Failed to load message summary'" = "ERROR_MESSAGES.FAILED_TO_LOAD_MESSAGE_SUMMARY"
    '"Failed to load message summary"' = "ERROR_MESSAGES.FAILED_TO_LOAD_MESSAGE_SUMMARY"
    "'Failed to save'" = "ERROR_MESSAGES.FAILED_TO_SAVE"
    '"Failed to save"' = "ERROR_MESSAGES.FAILED_TO_SAVE"
    "'Failed to update'" = "ERROR_MESSAGES.FAILED_TO_UPDATE"
    '"Failed to update"' = "ERROR_MESSAGES.FAILED_TO_UPDATE"
    
    # Game-specific errors
    "'Empire access denied'" = "ERROR_MESSAGES.EMPIRE_ACCESS_DENIED"
    '"Empire access denied"' = "ERROR_MESSAGES.EMPIRE_ACCESS_DENIED"
    "'Territory not owned'" = "ERROR_MESSAGES.TERRITORY_NOT_OWNED"
    '"Territory not owned"' = "ERROR_MESSAGES.TERRITORY_NOT_OWNED"
    "'Construction error'" = "ERROR_MESSAGES.CONSTRUCTION_ERROR"
    '"Construction error"' = "ERROR_MESSAGES.CONSTRUCTION_ERROR"
    "'Technology research error'" = "ERROR_MESSAGES.TECH_RESEARCH_ERROR"
    '"Technology research error"' = "ERROR_MESSAGES.TECH_RESEARCH_ERROR"
    "'Fleet movement error'" = "ERROR_MESSAGES.FLEET_MOVEMENT_ERROR"
    '"Fleet movement error"' = "ERROR_MESSAGES.FLEET_MOVEMENT_ERROR"
    
    # Form validation errors
    "'Email is required'" = "ERROR_MESSAGES.EMAIL_REQUIRED"
    '"Email is required"' = "ERROR_MESSAGES.EMAIL_REQUIRED"
    "'Password is required'" = "ERROR_MESSAGES.PASSWORD_REQUIRED"
    '"Password is required"' = "ERROR_MESSAGES.PASSWORD_REQUIRED"
    "'Username is required'" = "ERROR_MESSAGES.USERNAME_REQUIRED"
    '"Username is required"' = "ERROR_MESSAGES.USERNAME_REQUIRED"
    "'Email is invalid'" = "ERROR_MESSAGES.EMAIL_INVALID"
    '"Email is invalid"' = "ERROR_MESSAGES.EMAIL_INVALID"
    
    # System/Feature errors
    "'Feature is disabled'" = "ERROR_MESSAGES.FEATURE_DISABLED"
    '"Feature is disabled"' = "ERROR_MESSAGES.FEATURE_DISABLED"
    "'Test-only endpoint disabled'" = "ERROR_MESSAGES.FEATURE_DISABLED"
    '"Test-only endpoint disabled"' = "ERROR_MESSAGES.FEATURE_DISABLED"
    "'Service unavailable'" = "ERROR_MESSAGES.SERVICE_UNAVAILABLE"
    '"Service unavailable"' = "ERROR_MESSAGES.SERVICE_UNAVAILABLE"
}

# Find all TypeScript, JavaScript files
$fileExtensions = @("*.ts", "*.tsx", "*.js", "*.jsx")
$allFiles = @()

foreach ($extension in $fileExtensions) {
    $files = Get-ChildItem -Path $projectRoot -Filter $extension -Recurse | Where-Object {
        $_.FullName -notmatch "node_modules" -and 
        $_.FullName -notmatch "\.git" -and
        $_.FullName -notmatch "dist" -and
        $_.FullName -notmatch "build" -and
        $_.FullName -notmatch "coverage" -and
        $_.FullName -notmatch "\.next" -and
        $_.FullName -notmatch "desktop\\resources"
    }
    $allFiles += $files
}

Write-Host "Found $($allFiles.Count) files to process for error message cleanup" -ForegroundColor Green

# Process each file
foreach ($file in $allFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        $originalContent = $content
        $fileModified = $false
        $fileReplacements = 0
        
        # Apply string replacements
        foreach ($pattern in $replacements.Keys) {
            $replacement = $replacements[$pattern]
            if ($content.Contains($pattern)) {
                $content = $content.Replace($pattern, $replacement)
                $fileReplacements++
                $fileModified = $true
            }
        }
        
        if ($fileModified) {
            # Write the modified content back to file
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            $replacementCount += $fileReplacements
            $modifiedFiles += $file.FullName
            Write-Host "Modified: $($file.FullName) ($fileReplacements replacements)" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nBulk error message cleanup completed!" -ForegroundColor Green
Write-Host "Total replacements: $replacementCount" -ForegroundColor Green
Write-Host "Files modified: $($modifiedFiles.Count)" -ForegroundColor Green

if ($modifiedFiles.Count -gt 0) {
    Write-Host "`nModified files:" -ForegroundColor Cyan
    $modifiedFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}