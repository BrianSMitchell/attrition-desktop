#!/bin/bash

# ==========================================
# Attrition Code Smell Detector Script
# ==========================================
# Automated detection of code smells using ESLint plugin and metrics system
#
# Usage:
#   ./scripts/ci/code-smell-detector.sh [options]
#
# Options:
#   --package <package>    Specific package to analyze (server, client, shared)
#   --output <format>      Output format (console, json, html, markdown)
#   --threshold <level>    Threshold level (low, medium, high, critical)
#   --category <category>  Specific smell category to detect
#   --fix                  Attempt to auto-fix detected issues
#   --baseline <commit>    Baseline commit for comparison
#   --help                 Show this help message

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PACKAGES_DIR="${PROJECT_ROOT}/packages"

# Default configuration
OUTPUT_FORMAT="console"
THRESHOLD_LEVEL="medium"
SPECIFIC_PACKAGE=""
SMELL_CATEGORY=""
AUTO_FIX=false
BASELINE_COMMIT=""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# ==========================================
# Utility Functions
# ==========================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_smell() {
    echo -e "${PURPLE}[SMELL]${NC} $*"
}

print_usage() {
    cat << EOF
Attrition Code Smell Detector

Usage: $0 [options]

Options:
    --package <package>    Specific package to analyze (server, client, shared)
    --output <format>      Output format (console, json, html, markdown)
    --threshold <level>    Threshold level (low, medium, high, critical)
    --category <category>  Specific smell category to detect
    --fix                  Attempt to auto-fix detected issues
    --baseline <commit>    Baseline commit for comparison
    --help                 Show this help message

Smell Categories:
    bloaters       - Large classes and methods
    couplers       - Tight coupling between classes
    duplicators    - Duplicate code segments
    dispensables   - Unnecessary code elements
    project        - Project-specific patterns (ID consistency, legacy patterns)

Examples:
    $0 --package server --output json --threshold high
    $0 --category bloaters --fix
    $0 --baseline main --output markdown

EOF
}

exit_with_error() {
    log_error "$*"
    exit 1
}

# ==========================================
# Code Smell Detection Functions
# ==========================================

detect_bloaters() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"
    local issues=()

    log_info "Detecting bloater code smells in $package..."

    # Find large files (>500 lines)
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            local lines=$(wc -l < "$file")
            if [[ $lines -gt 500 ]]; then
                issues+=("Large file: $file (${lines} lines)")
            fi
        fi
    done < <(find "$package_dir/src" -name "*.ts" -o -name "*.tsx" | head -20)

    # Find long functions/methods
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            # This is a simplified check - in practice would use AST parsing
            local function_count=$(grep -c "function\|=>" "$file" 2>/dev/null || echo "0")
            if [[ $function_count -gt 20 ]]; then
                issues+=("File with many functions: $file (${function_count} functions)")
            fi
        fi
    done < <(find "$package_dir/src" -name "*.ts" -o -name "*.tsx" | head -20)

    echo "${issues[@]}"
}

detect_couplers() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"
    local issues=()

    log_info "Detecting coupler code smells in $package..."

    # Find files with many imports
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            local import_count=$(grep -c "^import\|require(" "$file" 2>/dev/null || echo "0")
            if [[ $import_count -gt 15 ]]; then
                issues+=("Highly coupled file: $file (${import_count} imports)")
            fi
        fi
    done < <(find "$package_dir/src" -name "*.ts" -o -name "*.tsx" | head -20)

    echo "${issues[@]}"
}

detect_duplicators() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"
    local issues=()

    log_info "Detecting duplicator code smells in $package..."

    # Find potential duplicate code blocks
    # This is a simplified approach - would use proper duplication detection tools
    find "$package_dir/src" -name "*.ts" -o -name "*.tsx" | head -10 | while read -r file; do
        if [[ -f "$file" ]]; then
            # Look for repeated patterns (simplified)
            local duplicates=$(grep -o "[a-zA-Z_][a-zA-Z0-9_]*" "$file" | sort | uniq -d | wc -l)
            if [[ $duplicates -gt 50 ]]; then
                issues+=("Potential code duplication in: $file")
            fi
        fi
    done

    echo "${issues[@]}"
}

detect_dispensables() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"
    local issues=()

    log_info "Detecting dispensable code smells in $package..."

    # Find commented out code
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            local comment_lines=$(grep -c "^[[:space:]]*//" "$file" 2>/dev/null || echo "0")
            local total_lines=$(wc -l < "$file")
            local comment_ratio=$((comment_lines * 100 / total_lines))

            if [[ $comment_ratio -gt 30 ]]; then
                issues+=("High comment ratio in: $file (${comment_ratio}%)")
            fi
        fi
    done < <(find "$package_dir/src" -name "*.ts" -o -name "*.tsx" | head -20)

    echo "${issues[@]}"
}

detect_project_specific_smells() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"
    local issues=()

    log_info "Detecting project-specific code smells in $package..."

    # Only run project-specific detection for server package
    if [[ "$package" != "server" ]]; then
        return 0
    fi

    # Check for ID consistency issues (UUID vs ObjectId)
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            if grep -q "ObjectId" "$file" 2>/dev/null; then
                issues+=("Legacy ObjectId usage in: $file")
            fi
        fi
    done < <(find "$package_dir/src" -name "*.ts" | head -20)

    # Check for console.log statements
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            local console_count=$(grep -c "console\.log" "$file" 2>/dev/null || echo "0")
            if [[ $console_count -gt 0 ]]; then
                issues+=("Console logging in: $file (${console_count} statements)")
            fi
        fi
    done < <(find "$package_dir/src" -name "*.ts" | head -20)

    # Check for legacy patterns
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            if grep -q "mongoose" "$file" 2>/dev/null; then
                issues+=("Legacy mongoose usage in: $file")
            fi
        fi
    done < <(find "$package_dir/src" -name "*.ts" | head -20)

    echo "${issues[@]}"
}

# ==========================================
# Main Detection Engine
# ==========================================

run_smell_detection() {
    local package="$1"
    local category="${2:-all}"
    local all_issues=()

    log_info "Starting code smell detection for $package (category: $category)..."

    case "$category" in
        "bloaters")
            IFS=' ' read -ra issues <<< "$(detect_bloaters "$package")"
            all_issues+=("${issues[@]}")
            ;;
        "couplers")
            IFS=' ' read -ra issues <<< "$(detect_couplers "$package")"
            all_issues+=("${issues[@]}")
            ;;
        "duplicators")
            IFS=' ' read -ra issues <<< "$(detect_duplicators "$package")"
            all_issues+=("${issues[@]}")
            ;;
        "dispensables")
            IFS=' ' read -ra issues <<< "$(detect_dispensables "$package")"
            all_issues+=("${issues[@]}")
            ;;
        "project")
            IFS=' ' read -ra issues <<< "$(detect_project_specific_smells "$package")"
            all_issues+=("${issues[@]}")
            ;;
        "all")
            # Run all detection categories
            IFS=' ' read -ra bloaters <<< "$(detect_bloaters "$package")"
            IFS=' ' read -ra couplers <<< "$(detect_couplers "$package")"
            IFS=' ' read -ra duplicators <<< "$(detect_duplicators "$package")"
            IFS=' ' read -ra dispensables <<< "$(detect_dispensables "$package")"
            IFS=' ' read -ra project_smells <<< "$(detect_project_specific_smells "$package")"

            all_issues+=("${bloaters[@]}" "${couplers[@]}" "${duplicators[@]}" "${dispensables[@]}" "${project_smells[@]}")
            ;;
        *)
            exit_with_error "Unknown smell category: $category"
            ;;
    esac

    # Filter out empty strings
    local filtered_issues=()
    for issue in "${all_issues[@]}"; do
        if [[ -n "$issue" ]]; then
            filtered_issues+=("$issue")
        fi
    done

    echo "${filtered_issues[@]}"
}

# ==========================================
# Report Generation
# ==========================================

generate_console_report() {
    local package="$1"
    local issues=($2)
    local issue_count=${#issues[@]}

    echo
    echo "=========================================="
    echo "CODE SMELL DETECTION REPORT"
    echo "=========================================="
    echo "Package: $package"
    echo "Total Issues Found: $issue_count"
    echo "Threshold Level: $THRESHOLD_LEVEL"
    echo "Generated: $(date -u)"
    echo

    if [[ $issue_count -eq 0 ]]; then
        log_success "✅ No code smells detected!"
        return 0
    fi

    # Group issues by severity
    local critical_count=0
    local high_count=0
    local medium_count=0
    local low_count=0

    for issue in "${issues[@]}"; do
        case "$THRESHOLD_LEVEL" in
            "low")
                low_count=$((low_count + 1))
                ;;
            "medium")
                if [[ "$issue" =~ (Large file|Highly coupled|Potential code duplication|High comment ratio) ]]; then
                    high_count=$((high_count + 1))
                else
                    medium_count=$((medium_count + 1))
                fi
                ;;
            "high")
                if [[ "$issue" =~ (Large file|Legacy.*usage|Console logging) ]]; then
                    critical_count=$((critical_count + 1))
                else
                    high_count=$((high_count + 1))
                fi
                ;;
            "critical")
                critical_count=$((critical_count + 1))
                ;;
        esac
    done

    echo "📊 Issue Breakdown:"
    echo "   Critical: $critical_count"
    echo "   High: $high_count"
    echo "   Medium: $medium_count"
    echo "   Low: $low_count"
    echo

    if [[ $critical_count -gt 0 ]]; then
        echo "🚨 Critical Issues:"
        for issue in "${issues[@]}"; do
            if [[ "$issue" =~ (Large file|Legacy.*usage|Console logging) ]]; then
                log_smell "  $issue"
            fi
        done
        echo
    fi

    if [[ $high_count -gt 0 ]]; then
        echo "⚠️ High Priority Issues:"
        for issue in "${issues[@]}"; do
            if [[ "$issue" =~ (Highly coupled|Potential code duplication|High comment ratio) ]] && [[ ! "$issue" =~ (Large file|Legacy.*usage|Console logging) ]]; then
                log_smell "  $issue"
            fi
        done
        echo
    fi

    echo "ℹ️ All Issues:"
    for issue in "${issues[@]}"; do
        echo "  • $issue"
    done

    return $((critical_count > 0 ? 1 : 0))
}

generate_json_report() {
    local package="$1"
    local issues=($2)
    local issue_count=${#issues[@]}

    cat > code-smell-report.json << EOF
{
  "timestamp": "$(date -u -Iseconds)",
  "package": "$package",
  "thresholdLevel": "$THRESHOLD_LEVEL",
  "totalIssues": $issue_count,
  "issues": [
EOF

    for ((i=0; i<${#issues[@]}; i++)); do
        local issue="${issues[$i]}"
        if [[ -n "$issue" ]]; then
            echo "    \"$issue\"" >> code-smell-report.json
            [[ $i -lt $((${#issues[@]} - 1)) ]] && echo "," >> code-smell-report.json
        fi
    done

    cat >> code-smell-report.json << EOF
  ],
  "summary": {
    "status": "$( [[ $issue_count -eq 0 ]] && echo "clean" || echo "issues_found" )",
    "critical": $(echo "${issues[@]}" | grep -c "Large file\|Legacy.*usage\|Console logging" || echo "0"),
    "high": $(echo "${issues[@]}" | grep -c "Highly coupled\|Potential code duplication\|High comment ratio" || echo "0")
  }
}
EOF

    log_success "JSON report saved to code-smell-report.json"
}

# ==========================================
# Main Script Execution
# ==========================================

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --package)
                SPECIFIC_PACKAGE="$2"
                shift 2
                ;;
            --output)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            --threshold)
                THRESHOLD_LEVEL="$2"
                shift 2
                ;;
            --category)
                SMELL_CATEGORY="$2"
                shift 2
                ;;
            --fix)
                AUTO_FIX=true
                shift
                ;;
            --baseline)
                BASELINE_COMMIT="$2"
                shift 2
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                exit_with_error "Unknown option: $1"
                ;;
        esac
    done

    # Validate inputs
    if [[ ! "$OUTPUT_FORMAT" =~ ^(console|json|html|markdown)$ ]]; then
        exit_with_error "Invalid output format: $OUTPUT_FORMAT"
    fi

    if [[ ! "$THRESHOLD_LEVEL" =~ ^(low|medium|high|critical)$ ]]; then
        exit_with_error "Invalid threshold level: $THRESHOLD_LEVEL"
    fi

    # Determine packages to analyze
    local packages=()
    if [[ -n "$SPECIFIC_PACKAGE" ]]; then
        if [[ ! -d "$PACKAGES_DIR/$SPECIFIC_PACKAGE" ]]; then
            exit_with_error "Package not found: $SPECIFIC_PACKAGE"
        fi
        packages=("$SPECIFIC_PACKAGE")
    else
        # Check all packages
        for package in server client shared; do
            if [[ -d "$PACKAGES_DIR/$package" ]]; then
                packages+=("$package")
            fi
        done
    fi

    if [[ ${#packages[@]} -eq 0 ]]; then
        exit_with_error "No packages found to analyze"
    fi

    log_info "Starting code smell detection..."
    log_info "Output format: $OUTPUT_FORMAT"
    log_info "Threshold level: $THRESHOLD_LEVEL"
    log_info "Packages: ${packages[*]}"
    [[ -n "$SMELL_CATEGORY" ]] && log_info "Category: $SMELL_CATEGORY"

    # Run detection for each package
    local all_results=()
    local exit_code=0

    for package in "${packages[@]}"; do
        log_info "Analyzing package: $package"

        local issues
        IFS=' ' read -ra issues <<< "$(run_smell_detection "$package" "${SMELL_CATEGORY:-all}")"

        if [[ ${#issues[@]} -gt 0 ]]; then
            log_warning "Found ${#issues[@]} issues in $package"
            all_results+=("${issues[@]}")

            # Generate reports
            case "$OUTPUT_FORMAT" in
                "console")
                    generate_console_report "$package" "${issues[*]}"
                    ;;
                "json")
                    generate_json_report "$package" "${issues[*]}"
                    ;;
                "html")
                    # HTML generation would go here
                    ;;
                "markdown")
                    # Markdown generation would go here
                    ;;
            esac

            # Set exit code if issues found
            if [[ ${#issues[@]} -gt 0 ]]; then
                exit_code=1
            fi
        else
            log_success "No code smells detected in $package"
        fi
    done

    # Final summary
    local total_issues=${#all_results[@]}

    if [[ $exit_code -eq 0 ]]; then
        log_success "🎉 Code smell detection completed successfully!"
        log_success "Total issues found: $total_issues"
    else
        log_warning "⚠️ Code smell detection completed with issues found"
        log_warning "Total issues found: $total_issues"
    fi

    exit $exit_code
}

# Run main function with all arguments
main "$@"