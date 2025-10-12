# Attrition MMO - Quick Social Media Posting
# 
# This script sets up your Twitter credentials securely and runs the social media workflow
# 
# Usage: ./scripts/post.ps1

Write-Host "🚀 Attrition MMO - Social Media Posting" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Function to securely read credentials
function Read-SecureCredential {
    param([string]$prompt)
    
    $secureString = Read-Host $prompt -AsSecureString
    return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString))
}

# Check if credentials are already set
$credsSet = $env:TWITTER_API_KEY -and $env:TWITTER_API_KEY_SECRET -and $env:TWITTER_ACCESS_TOKEN -and $env:TWITTER_ACCESS_TOKEN_SECRET

if (-not $credsSet) {
    Write-Host "🔐 Setting up Twitter credentials..." -ForegroundColor Yellow
    Write-Host "Your credentials will be set for this session only." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $env:TWITTER_API_KEY = Read-SecureCredential "Enter Twitter API Key"
        $env:TWITTER_API_KEY_SECRET = Read-SecureCredential "Enter Twitter API Key Secret"
        $env:TWITTER_ACCESS_TOKEN = Read-SecureCredential "Enter Twitter Access Token"
        $env:TWITTER_ACCESS_TOKEN_SECRET = Read-SecureCredential "Enter Twitter Access Token Secret"
        
        Write-Host "✅ Credentials set successfully!" -ForegroundColor Green
        Write-Host ""
        
    } catch {
        Write-Host "❌ Error setting credentials: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Twitter credentials already set!" -ForegroundColor Green
    Write-Host ""
}

# Run the social media workflow
try {
    Write-Host "🎯 Starting social media workflow..." -ForegroundColor Cyan
    Write-Host ""
    
    node scripts/social-post.js
    
} catch {
    Write-Host "❌ Error running workflow: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "👋 Social media workflow complete!" -ForegroundColor Green