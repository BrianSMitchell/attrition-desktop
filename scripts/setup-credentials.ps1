# X/Twitter API Credentials Setup
# This script helps you securely configure your API credentials

# Set console to handle UTF-8 properly
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

# Create emojis using UTF-8 byte sequences
$key = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xF0, 0x9F, 0x94, 0x91))
$checkmark = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xE2, 0x9C, 0x85))
$warning = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xE2, 0x9A, 0xA0, 0xEF, 0xB8, 0x8F))

Write-Host "$key X/Twitter API Credentials Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "$warning This will save your credentials to a .env file in your project root." -ForegroundColor Yellow
Write-Host "The .env file is already configured to be ignored by git for security." -ForegroundColor Yellow
Write-Host ""

# Function to securely read credentials
function Read-SecureCredential {
    param([string]$prompt)
    
    $secureString = Read-Host $prompt -AsSecureString
    return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString))
}

# Get credentials from user
Write-Host "Please enter your X/Twitter API credentials:" -ForegroundColor White
Write-Host "(Get these from: https://developer.twitter.com/en/portal/dashboard)" -ForegroundColor Gray
Write-Host ""

$apiKey = Read-SecureCredential "API Key"
$apiKeySecret = Read-SecureCredential "API Key Secret"
$accessToken = Read-SecureCredential "Access Token"
$accessTokenSecret = Read-SecureCredential "Access Token Secret"

# Create .env file content
$envContent = @"
# X (Twitter) API Credentials
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# 
# IMPORTANT: This file is in .gitignore and will NOT be committed to version control

TWITTER_API_KEY=$apiKey
TWITTER_API_KEY_SECRET=$apiKeySecret
TWITTER_ACCESS_TOKEN=$accessToken
TWITTER_ACCESS_TOKEN_SECRET=$accessTokenSecret
"@

# Write to .env file
$envPath = "../.env"
try {
    $envContent | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host ""
    Write-Host "$checkmark Credentials saved successfully to .env file!" -ForegroundColor Green
    Write-Host "You can now run ./post.ps1 without entering credentials each time." -ForegroundColor Green
    Write-Host ""
    Write-Host "Security notes:" -ForegroundColor Yellow
    Write-Host "- The .env file is ignored by git and won't be committed" -ForegroundColor Gray
    Write-Host "- Keep this file secure and don't share it" -ForegroundColor Gray
    Write-Host "- You can run this setup script again to update credentials" -ForegroundColor Gray
} catch {
    Write-Host "$x Error saving credentials: $_" -ForegroundColor Red
    exit 1
}