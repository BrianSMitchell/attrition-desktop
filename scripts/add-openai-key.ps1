# Add OpenAI API Key to .env file
# This script safely adds your OpenAI API key to the .env file

Write-Host ""
Write-Host "🔑 OpenAI API Key Setup for Context-Aware Social Media System" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found in current directory" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Instructions:" -ForegroundColor Yellow
Write-Host "1. Go to: https://platform.openai.com/api-keys" -ForegroundColor White
Write-Host "2. Sign up or log in to your OpenAI account" -ForegroundColor White
Write-Host "3. Click 'Create new secret key'" -ForegroundColor White
Write-Host "4. Copy the key (starts with 'sk-')" -ForegroundColor White
Write-Host ""

# Check if OpenAI key already exists
$currentContent = Get-Content .env -Raw
if ($currentContent -match "OPENAI_API_KEY") {
    Write-Host "⚠️  OpenAI API key already exists in .env file" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to update it? (y/N)"
    if ($overwrite -ne 'y' -and $overwrite -ne 'Y') {
        Write-Host "✅ Keeping existing OpenAI API key" -ForegroundColor Green
        exit 0
    }
}

# Prompt for API key
Write-Host "🔐 Enter your OpenAI API key:" -ForegroundColor Cyan
$apiKey = Read-Host

# Validate API key format
if (-not ($apiKey -match "^sk-")) {
    Write-Host "❌ Error: Invalid API key format. OpenAI API keys start with 'sk-'" -ForegroundColor Red
    Write-Host "Please make sure you copied the complete API key." -ForegroundColor Red
    exit 1
}

# Add or update the API key in .env file
try {
    if ($currentContent -match "OPENAI_API_KEY") {
        # Replace existing key
        $updatedContent = $currentContent -replace "OPENAI_API_KEY=.*", "OPENAI_API_KEY=$apiKey"
        $updatedContent | Set-Content .env -NoNewline
        Write-Host "✅ OpenAI API key updated successfully!" -ForegroundColor Green
    } else {
        # Add new key
        $newLine = "`r`n`r`n# OpenAI API Configuration`r`nOPENAI_API_KEY=$apiKey"
        Add-Content .env $newLine
        Write-Host "✅ OpenAI API key added successfully!" -ForegroundColor Green
    }

    # Clear the plain text API key from memory
    $apiKey = $null
    [System.GC]::Collect()

    Write-Host ""
    Write-Host "🚀 Your Context-Aware Social Media System is now ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Test the system: node scripts/test-context-social.js --full" -ForegroundColor White
    Write-Host "2. Try a dry run: node scripts/lib/context-aware-social-post.js --dry-run --auto" -ForegroundColor White
    Write-Host "3. Add the key to GitHub Secrets for automated posting" -ForegroundColor White
    Write-Host ""
    Write-Host "🔐 Security Note: Your API key is safely stored in .env (not committed to git)" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Error updating .env file: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}