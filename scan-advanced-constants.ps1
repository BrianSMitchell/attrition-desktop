# Advanced Constants Analysis Script
# Identifies additional constant opportunities beyond basic magic numbers and config keys

Write-Host "🔍 Advanced Constants Analysis - Finding Additional Optimization Opportunities" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Gray

# Define source directories to scan
$sourceDirs = @(
    "client/src",
    "server/src", 
    "shared/src"
)

$results = @{
    BusinessLogicConstants = @()
    ValidationPatterns = @()
    DefaultObjects = @()
    RepeatedStrings = @()
    ComponentPatterns = @()
    GameMechanics = @()
    FeatureFlags = @()
    UIConstants = @()
}

foreach ($dir in $sourceDirs) {
    if (Test-Path $dir) {
        Write-Host "`n📁 Scanning $dir..." -ForegroundColor Yellow
        
        # Find TypeScript/JavaScript files
        $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
                 Where-Object { $_.FullName -notmatch "(node_modules|dist|build|__tests__|\.test\.|\.spec\.)" }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { continue }
            
            Write-Host "  Analyzing $($file.Name)..." -ForegroundColor DarkGray
            
            # 1. Business Logic Constants - Hardcoded business rules
            $businessLogicPatterns = @(
                'if\s*\(\s*\w+\s*[><=!]+\s*(\d+\.?\d*)',  # Numeric thresholds in conditions
                'LEVEL_(\d+)',                             # Level-based constants
                'TIER_(\d+)',                             # Tier systems
                'MAX_(\w+).*?(\d+)',                      # Maximum value patterns
                'MIN_(\w+).*?(\d+)',                      # Minimum value patterns
                'DEFAULT_(\w+).*?(\d+\.?\d*)',            # Default values
                'COST_(\w+).*?(\d+)',                     # Cost-related values
                'PRICE_(\w+).*?(\d+)',                    # Price patterns
                'REWARD_(\w+).*?(\d+)',                   # Reward systems
                'BONUS_(\w+).*?(\d+\.?\d*)'               # Bonus multipliers
            )
            
            foreach ($pattern in $businessLogicPatterns) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $results.BusinessLogicConstants += @{
                        File = $file.Name
                        Pattern = $match.Value
                        Context = $match.Groups[0].Value
                    }
                }
            }
            
            # 2. Validation Patterns - Input validation rules
            $validationPatterns = @(
                '\.length\s*[><=!]+\s*(\d+)',             # Length validations
                'test\(/.*?/[gim]*\)',                    # Regex patterns
                'match\(/.*?/[gim]*\)',                   # Match patterns
                'MIN_LENGTH.*?(\d+)',                     # Minimum length
                'MAX_LENGTH.*?(\d+)',                     # Maximum length
                'REQUIRED_(\w+)',                         # Required field patterns
                'VALID_(\w+)',                            # Validation constants
                '["''`]required["''`]',                   # Required strings
                '["''`]invalid["''`]',                    # Validation messages
                'minLength:\s*(\d+)',                     # Form validation rules
                'maxLength:\s*(\d+)'
            )
            
            foreach ($pattern in $validationPatterns) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $results.ValidationPatterns += @{
                        File = $file.Name
                        Pattern = $match.Value
                        Context = $match.Groups[0].Value
                    }
                }
            }
            
            # 3. Default Objects - Repeated object structures
            $defaultObjectMatches = [regex]::Matches($content, '\{[^{}]*\}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
            foreach ($match in $defaultObjectMatches) {
                if ($match.Value.Length -gt 20 -and $match.Value.Length -lt 200) {
                    $results.DefaultObjects += @{
                        File = $file.Name
                        Object = $match.Value.Substring(0, [Math]::Min(100, $match.Value.Length))
                        FullObject = $match.Value
                    }
                }
            }
            
            # 4. Repeated Strings - Common text patterns
            $stringPatterns = @(
                '["''`]([A-Z_]{3,}|\w+\s+\w+\s+\w+)["''`]',  # Repeated caps or phrases
                '["''`](Success|Error|Warning|Info)["''`]',     # Status messages
                '["''`](Loading|Saving|Processing)["''`]',      # Action states
                '["''`](Active|Inactive|Pending)["''`]',        # Entity states
                '["''`](enabled|disabled|visible|hidden)["''`]' # UI states
            )
            
            foreach ($pattern in $stringPatterns) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $results.RepeatedStrings += @{
                        File = $file.Name
                        String = $match.Groups[1].Value
                        Context = $match.Value
                    }
                }
            }
            
            # 5. Component Patterns - Props and configurations
            $componentPatterns = @(
                'className=["''`]([^"''`]+)["''`]',        # CSS classes (already handled but check for missed ones)
                'defaultProps\s*=\s*\{',                  # Default props
                'propTypes\s*=\s*\{',                     # Prop types
                'useState\(([^)]+)\)',                    # Default state values
                'useEffect\(\(\)\s*=>\s*\{',             # Effect patterns
                'style=\{\{([^}]+)\}\}'                   # Inline styles
            )
            
            foreach ($pattern in $componentPatterns) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $results.ComponentPatterns += @{
                        File = $file.Name
                        Pattern = $match.Groups[1].Value
                        Context = $match.Value
                    }
                }
            }
            
            # 6. Game Mechanics - Game-specific constants (for Attrition game)
            $gameMechanicsPatterns = @(
                'health.*?(\d+)',                         # Health values
                'damage.*?(\d+)',                         # Damage values
                'armor.*?(\d+)',                          # Armor values
                'resource.*?(\d+)',                       # Resource amounts
                'building.*?(\d+)',                       # Building costs
                'unit.*?(\d+)',                           # Unit stats
                'research.*?(\d+)',                       # Research costs
                'technology.*?(\d+)',                     # Technology levels
                'empire.*?(\d+)',                         # Empire-related values
                'player.*?(\d+)'                          # Player-related values
            )
            
            foreach ($pattern in $gameMechanicsPatterns) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $results.GameMechanics += @{
                        File = $file.Name
                        Pattern = $match.Value
                        Value = $match.Groups[1].Value
                    }
                }
            }
            
            # 7. Feature Flags - Boolean configuration patterns
            $featureFlagPatterns = @(
                'FEATURE_(\w+)',                          # Feature flag naming
                'ENABLE_(\w+)',                           # Enable flags
                'DISABLE_(\w+)',                          # Disable flags
                'FLAG_(\w+)',                             # Generic flags
                'isEnabled.*?(\w+)',                      # Enabled checks
                'canAccess.*?(\w+)'                       # Permission checks
            )
            
            foreach ($pattern in $featureFlagPatterns) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $results.FeatureFlags += @{
                        File = $file.Name
                        Pattern = $match.Value
                        Context = $match.Groups[0].Value
                    }
                }
            }
            
            # 8. UI Constants - Interface-related hardcoded values
            $uiPatterns = @(
                'z-index:\s*(\d+)',                       # Z-index values
                'opacity:\s*(0\.\d+|1)',                  # Opacity values
                'transition.*?(\d+\.?\d*s)',              # Transition durations
                'animation.*?(\d+\.?\d*s)',               # Animation durations
                'border-radius:\s*(\d+px)',               # Border radius
                'padding:\s*(\d+px)',                     # Padding values
                'margin:\s*(\d+px)',                      # Margin values
                'width:\s*(\d+%|\d+px)',                  # Width values
                'height:\s*(\d+%|\d+px)'                  # Height values
            )
            
            foreach ($pattern in $uiPatterns) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $results.UIConstants += @{
                        File = $file.Name
                        Pattern = $match.Value
                        Value = $match.Groups[1].Value
                    }
                }
            }
        }
# Generate comprehensive report
Write-Host "`n📊 ADVANCED CONSTANTS ANALYSIS RESULTS" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Gray

# Function to display category results
function Show-CategoryResults {
    param($CategoryName, $Results, $ShowTop = 10)
    
    if ($Results.Count -gt 0) {
        Write-Host "`n🔍 $CategoryName Found: $($Results.Count)" -ForegroundColor Yellow
        
        # Group by pattern and count occurrences
        $grouped = $Results | Group-Object -Property { 
            if ($_.Pattern) { $_.Pattern } elseif ($_.String) { $_.String } else { $_.Object }
        } | Sort-Object Count -Descending | Select-Object -First $ShowTop
        
        foreach ($group in $grouped) {
            Write-Host "  • $($group.Name) (found $($group.Count) times)" -ForegroundColor White
            $sampleFiles = $group.Group | Select-Object -First 3 -ExpandProperty File | Sort-Object -Unique
            Write-Host "    Files: $($sampleFiles -join ', ')" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "`n✅ $CategoryName : No patterns found (already optimized)" -ForegroundColor Green
    }
}

Show-CategoryResults "Business Logic Constants" $results.BusinessLogicConstants
Show-CategoryResults "Validation Patterns" $results.ValidationPatterns
Show-CategoryResults "Default Objects" $results.DefaultObjects
Show-CategoryResults "Repeated Strings" $results.RepeatedStrings
Show-CategoryResults "Component Patterns" $results.ComponentPatterns
Show-CategoryResults "Game Mechanics" $results.GameMechanics
Show-CategoryResults "Feature Flags" $results.FeatureFlags
Show-CategoryResults "UI Constants" $results.UIConstants

# Summary and recommendations
Write-Host "`n🎯 ANALYSIS SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Gray

$totalOpportunities = $results.Values | ForEach-Object { $_.Count } | Measure-Object -Sum
Write-Host "Total Additional Constant Opportunities: $($totalOpportunities.Sum)" -ForegroundColor Yellow

if ($totalOpportunities.Sum -gt 0) {
    Write-Host "`n💡 RECOMMENDED NEXT STEPS:" -ForegroundColor Green
    Write-Host "1. Prioritize Business Logic Constants (highest impact)" -ForegroundColor White
    Write-Host "2. Standardize Validation Patterns (consistency)" -ForegroundColor White
    Write-Host "3. Create Default Object Templates (DRY principle)" -ForegroundColor White
    Write-Host "4. Implement Feature Flags System (configurability)" -ForegroundColor White
    Write-Host "5. Optimize UI Constants (design system)" -ForegroundColor White
} else {
    Write-Host "`n🎉 Excellent! Your codebase is already highly optimized for constants." -ForegroundColor Green
    Write-Host "Consider focusing on architectural patterns and code smell detection." -ForegroundColor White
}

Write-Host "`n✅ Advanced constants analysis completed!" -ForegroundColor Green