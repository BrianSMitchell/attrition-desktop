# Attrition MMO - Quick Social Media Posting
# 
# This script sets up your Twitter credentials securely and runs the social media workflow
# 
# Usage: ./scripts/post.ps1

# Set console to handle UTF-8 properly
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

# Function to load environment variables from .env file
function Load-EnvFile {
    param([string]$EnvFilePath = "../.env")
    
    if (Test-Path $EnvFilePath) {
        Write-Host "Loading credentials from .env file..." -ForegroundColor Gray
        Get-Content $EnvFilePath | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                if ($value -and $value -ne 'your_api_key_here' -and $value -ne 'your_api_key_secret_here' -and $value -ne 'your_access_token_here' -and $value -ne 'your_access_token_secret_here') {
                    Set-Item -Path "env:$key" -Value $value
                }
            }
        }
    }
}

# Create emojis using UTF-8 byte sequences
$rocket = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xF0, 0x9F, 0x9A, 0x80))
$lock = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xF0, 0x9F, 0x94, 0x90))
$checkmark = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xE2, 0x9C, 0x85))
$x = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xE2, 0x9D, 0x8C))
$target = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xF0, 0x9F, 0x8E, 0xAF))
$wave = [System.Text.Encoding]::UTF8.GetString([byte[]]@(0xF0, 0x9F, 0x91, 0x8B))

Write-Host "$rocket Attrition MMO - Social Media Posting" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file if it exists
Load-EnvFile

# Function to securely read credentials
function Read-SecureCredential {
    param([string]$prompt)
    
    $secureString = Read-Host $prompt -AsSecureString
    return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString))
}

# Check if credentials are already set
$credsSet = $env:TWITTER_API_KEY -and $env:TWITTER_API_KEY_SECRET -and $env:TWITTER_ACCESS_TOKEN -and $env:TWITTER_ACCESS_TOKEN_SECRET

if (-not $credsSet) {
    Write-Host "$lock Setting up Twitter credentials..." -ForegroundColor Yellow
    Write-Host "Your credentials will be set for this session only." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $env:TWITTER_API_KEY = Read-SecureCredential "Enter Twitter API Key"
        $env:TWITTER_API_KEY_SECRET = Read-SecureCredential "Enter Twitter API Key Secret"
        $env:TWITTER_ACCESS_TOKEN = Read-SecureCredential "Enter Twitter Access Token"
        $env:TWITTER_ACCESS_TOKEN_SECRET = Read-SecureCredential "Enter Twitter Access Token Secret"
        
        Write-Host "$checkmark Credentials set successfully!" -ForegroundColor Green
        Write-Host ""
        
    } catch {
        Write-Host "$x Error setting credentials: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "$checkmark Twitter credentials already set!" -ForegroundColor Green
    Write-Host ""
}

# Run the social media workflow
try {
    Write-Host "$target Starting social media workflow..." -ForegroundColor Cyan
    Write-Host ""
    
    node social-post.js
    
} catch {
    Write-Host "$x Error running workflow: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "$wave Social media workflow complete!" -ForegroundColor Green