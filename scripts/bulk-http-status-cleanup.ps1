# Bulk HTTP Status Code Cleanup Script
# Replaces hardcoded HTTP status codes with HTTP_STATUS constants in actual HTTP contexts

$projectRoot = "C:\Projects\Attrition"
$replacementCount = 0
$modifiedFiles = @()

# Define targeted replacement patterns for ACTUAL HTTP status code usage
$replacements = @{
    # Express.js response patterns
    'res.status(200)' = 'res.status(HTTP_STATUS.OK)'
    'res.status(201)' = 'res.status(HTTP_STATUS.CREATED)'
    'res.status(202)' = 'res.status(HTTP_STATUS.ACCEPTED)'
    'res.status(204)' = 'res.status(HTTP_STATUS.NO_CONTENT)'
    'res.status(301)' = 'res.status(HTTP_STATUS.MOVED_PERMANENTLY)'
    'res.status(302)' = 'res.status(HTTP_STATUS.FOUND)'
    'res.status(304)' = 'res.status(HTTP_STATUS.NOT_MODIFIED)'
    'res.status(400)' = 'res.status(HTTP_STATUS.BAD_REQUEST)'
    'res.status(401)' = 'res.status(HTTP_STATUS.UNAUTHORIZED)'
    'res.status(403)' = 'res.status(HTTP_STATUS.FORBIDDEN)'
    'res.status(404)' = 'res.status(HTTP_STATUS.NOT_FOUND)'
    'res.status(405)' = 'res.status(HTTP_STATUS.METHOD_NOT_ALLOWED)'
    'res.status(406)' = 'res.status(HTTP_STATUS.NOT_ACCEPTABLE)'
    'res.status(409)' = 'res.status(HTTP_STATUS.CONFLICT)'
    'res.status(410)' = 'res.status(HTTP_STATUS.GONE)'
    'res.status(422)' = 'res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY)'
    'res.status(429)' = 'res.status(HTTP_STATUS.TOO_MANY_REQUESTS)'
    'res.status(500)' = 'res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)'
    'res.status(501)' = 'res.status(HTTP_STATUS.NOT_IMPLEMENTED)'
    'res.status(502)' = 'res.status(HTTP_STATUS.BAD_GATEWAY)'
    'res.status(503)' = 'res.status(HTTP_STATUS.SERVICE_UNAVAILABLE)'
    'res.status(504)' = 'res.status(HTTP_STATUS.GATEWAY_TIMEOUT)'
    
    # Response with space variations
    'res.status( 200 )' = 'res.status(HTTP_STATUS.OK)'
    'res.status( 201 )' = 'res.status(HTTP_STATUS.CREATED)'
    'res.status( 400 )' = 'res.status(HTTP_STATUS.BAD_REQUEST)'
    'res.status( 401 )' = 'res.status(HTTP_STATUS.UNAUTHORIZED)'
    'res.status( 403 )' = 'res.status(HTTP_STATUS.FORBIDDEN)'
    'res.status( 404 )' = 'res.status(HTTP_STATUS.NOT_FOUND)'
    'res.status( 500 )' = 'res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)'
    
    # response.status patterns
    'response.status(200)' = 'response.status(HTTP_STATUS.OK)'
    'response.status(201)' = 'response.status(HTTP_STATUS.CREATED)'
    'response.status(400)' = 'response.status(HTTP_STATUS.BAD_REQUEST)'
    'response.status(401)' = 'response.status(HTTP_STATUS.UNAUTHORIZED)'
    'response.status(403)' = 'response.status(HTTP_STATUS.FORBIDDEN)'
    'response.status(404)' = 'response.status(HTTP_STATUS.NOT_FOUND)'
    'response.status(500)' = 'response.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)'
    
    # sendStatus patterns
    'res.sendStatus(200)' = 'res.sendStatus(HTTP_STATUS.OK)'
    'res.sendStatus(201)' = 'res.sendStatus(HTTP_STATUS.CREATED)'
    'res.sendStatus(204)' = 'res.sendStatus(HTTP_STATUS.NO_CONTENT)'
    'res.sendStatus(400)' = 'res.sendStatus(HTTP_STATUS.BAD_REQUEST)'
    'res.sendStatus(401)' = 'res.sendStatus(HTTP_STATUS.UNAUTHORIZED)'
    'res.sendStatus(403)' = 'res.sendStatus(HTTP_STATUS.FORBIDDEN)'
    'res.sendStatus(404)' = 'res.sendStatus(HTTP_STATUS.NOT_FOUND)'
    'res.sendStatus(500)' = 'res.sendStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)'
    
    # Test assertion patterns (expect, toBe, toEqual)
    '.expect(200)' = '.expect(HTTP_STATUS.OK)'
    '.expect(201)' = '.expect(HTTP_STATUS.CREATED)'
    '.expect(204)' = '.expect(HTTP_STATUS.NO_CONTENT)'
    '.expect(400)' = '.expect(HTTP_STATUS.BAD_REQUEST)'
    '.expect(401)' = '.expect(HTTP_STATUS.UNAUTHORIZED)'
    '.expect(403)' = '.expect(HTTP_STATUS.FORBIDDEN)'
    '.expect(404)' = '.expect(HTTP_STATUS.NOT_FOUND)'
    '.expect(409)' = '.expect(HTTP_STATUS.CONFLICT)'
    '.expect(422)' = '.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY)'
    '.expect(500)' = '.expect(HTTP_STATUS.INTERNAL_SERVER_ERROR)'
    '.expect(503)' = '.expect(HTTP_STATUS.SERVICE_UNAVAILABLE)'
    
    # toBe patterns in tests
    '.toBe(200)' = '.toBe(HTTP_STATUS.OK)'
    '.toBe(201)' = '.toBe(HTTP_STATUS.CREATED)'
    '.toBe(400)' = '.toBe(HTTP_STATUS.BAD_REQUEST)'
    '.toBe(401)' = '.toBe(HTTP_STATUS.UNAUTHORIZED)'
    '.toBe(403)' = '.toBe(HTTP_STATUS.FORBIDDEN)'
    '.toBe(404)' = '.toBe(HTTP_STATUS.NOT_FOUND)'
    '.toBe(500)' = '.toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)'
    
    # toEqual patterns in tests
    '.toEqual(200)' = '.toEqual(HTTP_STATUS.OK)'
    '.toEqual(201)' = '.toEqual(HTTP_STATUS.CREATED)'
    '.toEqual(400)' = '.toEqual(HTTP_STATUS.BAD_REQUEST)'
    '.toEqual(401)' = '.toEqual(HTTP_STATUS.UNAUTHORIZED)'
    '.toEqual(403)' = '.toEqual(HTTP_STATUS.FORBIDDEN)'
    '.toEqual(404)' = '.toEqual(HTTP_STATUS.NOT_FOUND)'
    '.toEqual(500)' = '.toEqual(HTTP_STATUS.INTERNAL_SERVER_ERROR)'
    
    # StatusCode property patterns
    'statusCode: 200' = 'statusCode: HTTP_STATUS.OK'
    'statusCode: 201' = 'statusCode: HTTP_STATUS.CREATED'
    'statusCode: 400' = 'statusCode: HTTP_STATUS.BAD_REQUEST'
    'statusCode: 401' = 'statusCode: HTTP_STATUS.UNAUTHORIZED'
    'statusCode: 403' = 'statusCode: HTTP_STATUS.FORBIDDEN'
    'statusCode: 404' = 'statusCode: HTTP_STATUS.NOT_FOUND'
    'statusCode: 500' = 'statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR'
    
    # status property patterns
    'status: 200' = 'status: HTTP_STATUS.OK'
    'status: 201' = 'status: HTTP_STATUS.CREATED'
    'status: 400' = 'status: HTTP_STATUS.BAD_REQUEST'
    'status: 401' = 'status: HTTP_STATUS.UNAUTHORIZED'
    'status: 403' = 'status: HTTP_STATUS.FORBIDDEN'
    'status: 404' = 'status: HTTP_STATUS.NOT_FOUND'
    'status: 500' = 'status: HTTP_STATUS.INTERNAL_SERVER_ERROR'
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

Write-Host "Found $($allFiles.Count) files to process for HTTP status cleanup" -ForegroundColor Green

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

Write-Host "`nBulk HTTP status cleanup completed!" -ForegroundColor Green
Write-Host "Total replacements: $replacementCount" -ForegroundColor Green
Write-Host "Files modified: $($modifiedFiles.Count)" -ForegroundColor Green

if ($modifiedFiles.Count -gt 0) {
    Write-Host "`nModified files:" -ForegroundColor Cyan
    $modifiedFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}