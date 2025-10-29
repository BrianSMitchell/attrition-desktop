Write-Host ""
Write-Host "🔑 OpenAI API Key Setup" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Go to: https://platform.openai.com/api-keys" -ForegroundColor White
Write-Host "2. Create a new secret key" -ForegroundColor White
Write-Host "3. Copy the key (starts with 'sk-')" -ForegroundColor White
Write-Host "4. Paste it below when prompted" -ForegroundColor White
Write-Host ""

$apiKey = Read-Host "Paste your OpenAI API key here"

if ($apiKey -like "sk-*") {
    Add-Content .env "`r`n`r`n# OpenAI API Configuration`r`nOPENAI_API_KEY=$apiKey"
    Write-Host ""
    Write-Host "✅ Success! OpenAI API key added to .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Now test your system:" -ForegroundColor Yellow
    Write-Host "node scripts/test-context-social.js --full" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Invalid key format. OpenAI keys start with 'sk-'" -ForegroundColor Red
}