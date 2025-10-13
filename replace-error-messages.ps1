Write-Host "Replacing hardcoded error messages with constants..." -ForegroundColor Green

# Define common error message replacements
$replacements = @{
    # Generic errors
    "'Failed to load'" = 'ERROR_MESSAGES.FAILED_TO_LOAD'
    '"Failed to load"' = 'ERROR_MESSAGES.FAILED_TO_LOAD'
    "'Failed to save'" = 'ERROR_MESSAGES.FAILED_TO_SAVE'
    '"Failed to save"' = 'ERROR_MESSAGES.FAILED_TO_SAVE'
    "'Failed to update'" = 'ERROR_MESSAGES.FAILED_TO_UPDATE'
    '"Failed to update"' = 'ERROR_MESSAGES.FAILED_TO_UPDATE'
    "'Failed to delete'" = 'ERROR_MESSAGES.FAILED_TO_DELETE'
    '"Failed to delete"' = 'ERROR_MESSAGES.FAILED_TO_DELETE'
    "'Failed to create'" = 'ERROR_MESSAGES.FAILED_TO_CREATE'
    '"Failed to create"' = 'ERROR_MESSAGES.FAILED_TO_CREATE'
    
    # Authentication errors
    "'Authentication required'" = 'ERROR_MESSAGES.AUTHENTICATION_REQUIRED'
    '"Authentication required"' = 'ERROR_MESSAGES.AUTHENTICATION_REQUIRED'
    "'Invalid credentials'" = 'ERROR_MESSAGES.INVALID_CREDENTIALS'
    '"Invalid credentials"' = 'ERROR_MESSAGES.INVALID_CREDENTIALS'
    "'Token expired'" = 'ERROR_MESSAGES.TOKEN_EXPIRED'
    '"Token expired"' = 'ERROR_MESSAGES.TOKEN_EXPIRED'
    "'Token is invalid'" = 'ERROR_MESSAGES.TOKEN_INVALID'
    '"Token is invalid"' = 'ERROR_MESSAGES.TOKEN_INVALID'
    "'Unauthorized access'" = 'ERROR_MESSAGES.UNAUTHORIZED_ACCESS'
    '"Unauthorized access"' = 'ERROR_MESSAGES.UNAUTHORIZED_ACCESS'
    "'Access denied'" = 'ERROR_MESSAGES.ACCESS_DENIED'
    '"Access denied"' = 'ERROR_MESSAGES.ACCESS_DENIED'
    "'Session has expired'" = 'ERROR_MESSAGES.SESSION_EXPIRED'
    '"Session has expired"' = 'ERROR_MESSAGES.SESSION_EXPIRED'
    "'Login failed'" = 'ERROR_MESSAGES.LOGIN_FAILED'
    '"Login failed"' = 'ERROR_MESSAGES.LOGIN_FAILED'
    
    # Validation errors
    "'Invalid input'" = 'ERROR_MESSAGES.INVALID_INPUT'
    '"Invalid input"' = 'ERROR_MESSAGES.INVALID_INPUT'
    "'Missing required field'" = 'ERROR_MESSAGES.MISSING_REQUIRED_FIELD'
    '"Missing required field"' = 'ERROR_MESSAGES.MISSING_REQUIRED_FIELD'
    "'Invalid coordinates'" = 'ERROR_MESSAGES.INVALID_COORDINATES'
    '"Invalid coordinates"' = 'ERROR_MESSAGES.INVALID_COORDINATES'
    "'Missing coord'" = 'ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED'
    '"Missing coord"' = 'ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED'
    
    # Resource errors
    "'Not found'" = 'ERROR_MESSAGES.NOT_FOUND'
    '"Not found"' = 'ERROR_MESSAGES.NOT_FOUND'
    "'User not found'" = 'ERROR_MESSAGES.USER_NOT_FOUND'
    '"User not found"' = 'ERROR_MESSAGES.USER_NOT_FOUND'
    "'Empire not found'" = 'ERROR_MESSAGES.EMPIRE_NOT_FOUND'
    '"Empire not found"' = 'ERROR_MESSAGES.EMPIRE_NOT_FOUND'
    "'Base not found'" = 'ERROR_MESSAGES.BASE_NOT_FOUND'
    '"Base not found"' = 'ERROR_MESSAGES.BASE_NOT_FOUND'
    "'Fleet not found'" = 'ERROR_MESSAGES.FLEET_NOT_FOUND'
    '"Fleet not found"' = 'ERROR_MESSAGES.FLEET_NOT_FOUND'
    
    # System errors
    "'Database error'" = 'ERROR_MESSAGES.DATABASE_ERROR'
    '"Database error"' = 'ERROR_MESSAGES.DATABASE_ERROR'
    "'Connection error'" = 'ERROR_MESSAGES.CONNECTION_ERROR'
    '"Connection error"' = 'ERROR_MESSAGES.CONNECTION_ERROR'
    "'Network error'" = 'ERROR_MESSAGES.NETWORK_ERROR'
    '"Network error"' = 'ERROR_MESSAGES.NETWORK_ERROR'
    "'Service unavailable'" = 'ERROR_MESSAGES.SERVICE_UNAVAILABLE'
    '"Service unavailable"' = 'ERROR_MESSAGES.SERVICE_UNAVAILABLE'
    
    # Capacity errors
    "'Insufficient resources'" = 'ERROR_MESSAGES.INSUFFICIENT_RESOURCES'
    '"Insufficient resources"' = 'ERROR_MESSAGES.INSUFFICIENT_RESOURCES'
    "'Insufficient credits'" = 'ERROR_MESSAGES.INSUFFICIENT_CREDITS'
    '"Insufficient credits"' = 'ERROR_MESSAGES.INSUFFICIENT_CREDITS'
    "'Insufficient capacity'" = 'ERROR_MESSAGES.INSUFFICIENT_CAPACITY'
    '"Insufficient capacity"' = 'ERROR_MESSAGES.INSUFFICIENT_CAPACITY'
    "'Insufficient energy'" = 'ERROR_MESSAGES.INSUFFICIENT_ENERGY'
    '"Insufficient energy"' = 'ERROR_MESSAGES.INSUFFICIENT_ENERGY'
    
    # Progress errors
    "'Already in progress'" = 'ERROR_MESSAGES.ALREADY_IN_PROGRESS'
    '"Already in progress"' = 'ERROR_MESSAGES.ALREADY_IN_PROGRESS'
    "'Construction in progress'" = 'ERROR_MESSAGES.CONSTRUCTION_IN_PROGRESS'
    '"Construction in progress"' = 'ERROR_MESSAGES.CONSTRUCTION_IN_PROGRESS'
    "'No active construction'" = 'ERROR_MESSAGES.NO_ACTIVE_CONSTRUCTION'
    '"No active construction"' = 'ERROR_MESSAGES.NO_ACTIVE_CONSTRUCTION'
}

# Directories to process
$directories = @(
    "packages\server\src",
    "packages\client\src"
)

$totalReplacements = 0
$filesModified = 0

foreach ($directory in $directories) {
    if (Test-Path $directory) {
        Write-Host "Processing directory: $directory" -ForegroundColor Cyan
        
        # Find TypeScript and JavaScript files, excluding constants files
        $files = Get-ChildItem -Path $directory -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Where-Object { 
            $_.Name -notlike "*constants*" -and 
            $_.Name -notlike "*response-formats*" -and
            $_.FullName -notlike "*node_modules*"
        }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            $originalContent = $content
            $fileReplacements = 0
            
            if ($content) {
                # Apply each replacement
                foreach ($pattern in $replacements.Keys) {
                    $replacement = $replacements[$pattern]
                    $oldContent = $content
                    $content = $content -replace [regex]::Escape($pattern), $replacement
                    
                    if ($content -ne $oldContent) {
                        $matches = ([regex]::Matches($oldContent, [regex]::Escape($pattern))).Count
                        $fileReplacements += $matches
                        $totalReplacements += $matches
                    }
                }
                
                # Only save if changes were made
                if ($content -ne $originalContent) {
                    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                    $filesModified++
                    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
                    Write-Host "  Modified: $relativePath ($fileReplacements replacements)" -ForegroundColor Green
                }
            }
        }
    }
}

Write-Host "`nSUMMARY:" -ForegroundColor Yellow
Write-Host "Files modified: $filesModified" -ForegroundColor White
Write-Host "Total replacements: $totalReplacements" -ForegroundColor White
Write-Host "Error messages replacement completed!" -ForegroundColor Green