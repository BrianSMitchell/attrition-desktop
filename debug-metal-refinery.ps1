# Debug script for Metal Refinery construction failure
# This script will help identify why the construction is failing

Write-Host "=== Debugging Metal Refinery Construction Failure ===" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "Checking if server is running on port 3001..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -ErrorAction Stop
    Write-Host "✓ Server is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Server is not running or not responding" -ForegroundColor Red
    Write-Host "Please start the server first" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Next steps to debug:" -ForegroundColor Cyan
Write-Host "1. Open your browser's Developer Tools (F12)" -ForegroundColor White
Write-Host "2. Go to the Network tab" -ForegroundColor White
Write-Host "3. Try to start the metal refinery construction again" -ForegroundColor White
Write-Host "4. Look for the request to '/api/bases/[coord]/structures/metal_refinery/construct'" -ForegroundColor White
Write-Host "5. Click on that request and check the 'Response' tab" -ForegroundColor White
Write-Host ""
Write-Host "Common issues that cause 'Request failed':" -ForegroundColor Cyan
Write-Host "  - Already have a construction in progress at this base" -ForegroundColor White
Write-Host "  - Already have this structure queued at this base" -ForegroundColor White
Write-Host "  - No construction capacity at the base" -ForegroundColor White
Write-Host "  - Not enough credits" -ForegroundColor White
Write-Host "  - Not enough energy capacity" -ForegroundColor White
Write-Host "  - Not enough area" -ForegroundColor White
Write-Host "  - Not enough population" -ForegroundColor White
Write-Host ""
Write-Host "Check the server logs in the terminal where you started the server for more details" -ForegroundColor Yellow
