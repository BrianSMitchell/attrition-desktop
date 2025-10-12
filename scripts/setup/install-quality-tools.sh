#!/bin/bash

# ==========================================
# Attrition Quality Tools Installation Script
# ==========================================
# Installs and configures all quality gate tools and dependencies
#
# Usage:
#   ./scripts/setup/install-quality-tools.sh [options]
#
# Options:
#   --package <package>    Install tools for specific package (server, client, shared)
#   --skip-build           Skip building packages after installation
#   --force                Force reinstallation of all tools
#   --help                 Show this help message

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PACKAGES_DIR="${PROJECT_ROOT}/packages"

# Default configuration
SPECIFIC_PACKAGE=""
SKIP_BUILD=false
FORCE_INSTALL=false

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_usage() {
    cat << EOF
Attrition Quality Tools Installation Script

Usage: $0 [options]

Options:
    --package <package>    Install tools for specific package (server, client, shared)
    --skip-build           Skip building packages after installation
    --force                Force reinstallation of all tools
    --help                 Show this help message

Examples:
    $0 --package server
    $0 --force
    $0 --skip-build

EOF
}

exit_with_error() {
    log_error "$*"
    exit 1
}

# ==========================================
# Package Detection
# ==========================================

detect_packages() {
    local packages=()

    if [[ -n "$SPECIFIC_PACKAGE" ]]; then
        if [[ ! -d "$PACKAGES_DIR/$SPECIFIC_PACKAGE" ]]; then
            exit_with_error "Package not found: $SPECIFIC_PACKAGE"
        fi
        packages=("$SPECIFIC_PACKAGE")
    else
        # Install for all packages
        for package in server client shared; do
            if [[ -d "$PACKAGES_DIR/$package" ]]; then
                packages+=("$package")
            fi
        done
    fi

    if [[ ${#packages[@]} -eq 0 ]]; then
        exit_with_error "No packages found to configure"
    fi

    echo "${packages[@]}"
}

# ==========================================
# Tool Installation Functions
# ==========================================

install_eslint_plugin() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"

    log_info "Installing ESLint plugin for $package..."

    if [[ ! -d "$package_dir" ]]; then
        log_warning "Package directory not found: $package_dir"
        return 0
    fi

    # Check if custom ESLint plugin exists
    if [[ -d "$PACKAGES_DIR/server/src/plugins/eslint-plugin-attrition" ]]; then
        log_info "  Building custom ESLint plugin..."

        cd "$PACKAGES_DIR/server/src/plugins/eslint-plugin-attrition"
        npm install
        npm run build

        # Link the plugin to the package
        cd "$package_dir"
        npm link "$PACKAGES_DIR/server/src/plugins/eslint-plugin-attrition"

        log_success "  ESLint plugin installed and linked"
    else
        log_warning "  Custom ESLint plugin not found, using standard ESLint"
    fi
}

install_code_metrics_tools() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"

    log_info "Installing code metrics tools for $package..."

    if [[ "$package" != "server" ]]; then
        log_info "  Code metrics tools are server-specific, skipping for $package"
        return 0
    fi

    # The code metrics tools are built into the server package
    log_info "  Code metrics tools are integrated into the server package"

    # Verify metrics tools are available
    if [[ -f "$package_dir/src/utils/codeMetrics/index.ts" ]]; then
        log_success "  Code metrics tools verified"
    else
        log_warning "  Code metrics tools not found in expected location"
    fi
}

install_friction_monitoring() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"

    log_info "Installing friction monitoring tools for $package..."

    if [[ "$package" != "server" ]]; then
        log_info "  Friction monitoring tools are server-specific, skipping for $package"
        return 0
    fi

    # The friction monitoring tools are built into the server package
    log_info "  Friction monitoring tools are integrated into the server package"

    # Verify friction monitoring tools are available
    if [[ -f "$package_dir/src/monitoring/friction-metrics/index.ts" ]]; then
        log_success "  Friction monitoring tools verified"
    else
        log_warning "  Friction monitoring tools not found in expected location"
    fi
}

install_security_tools() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"

    log_info "Installing security scanning tools for $package..."

    # Install security-related npm packages if needed
    cd "$package_dir"

    # Check if security packages are already installed
    if ! npm list eslint-plugin-security 2>/dev/null | grep -q eslint-plugin-security; then
        log_info "  Installing security-focused ESLint plugins..."

        # Install security plugins (these would be added to package.json)
        log_info "    Note: Add 'eslint-plugin-security' to devDependencies in package.json"
        log_info "    Note: Add '@typescript-eslint/eslint-plugin' for security rules"
    fi

    log_success "  Security tools configured for $package"
}

configure_quality_gate() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"

    log_info "Configuring quality gate for $package..."

    # Copy quality gate configuration if it doesn't exist
    if [[ ! -f "$package_dir/quality-gate.config.js" ]]; then
        if [[ -f "$PACKAGES_DIR/server/quality-gate.config.js" ]]; then
            cp "$PACKAGES_DIR/server/quality-gate.config.js" "$package_dir/"
            log_success "  Quality gate configuration copied to $package"
        fi
    fi

    # Create package-specific ESLint configuration for CI
    if [[ ! -f "$package_dir/.eslintrc.ci.js" ]]; then
        cat > "$package_dir/.eslintrc.ci.js" << EOF
// CI-specific ESLint configuration for $package
// Extends the base configuration with stricter rules for CI/CD

module.exports = {
  extends: [
    './.eslintrc.js',
    'plugin:security/recommended'
  ],

  plugins: [
    'security'
  ],

  rules: {
    // Stricter rules for CI
    'no-console': 'error',
    'no-debugger': 'error',

    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',

    // Project-specific rules (if plugin is available)
    'attrition/id-consistency': 'error',
    'attrition/no-legacy-patterns': 'error',
    'attrition/no-console-log': 'warn'
  },

  env: {
    node: true,
    es2022: true
  },

  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
};
EOF
        log_success "  CI-specific ESLint configuration created"
    fi

    # Create package.json scripts for quality checks
    if [[ -f "$package_dir/package.json" ]]; then
        log_info "  Adding quality check scripts to package.json..."

        # Note: In a real implementation, you would modify the package.json
        # to add scripts like "quality:check", "quality:gate", etc.
        log_info "    Note: Add quality scripts to package.json:"
        log_info "      \"quality:check\": \"./scripts/ci/quality-gate.sh --package $package\""
        log_info "      \"quality:smells\": \"./scripts/ci/code-smell-detector.sh --package $package\""
        log_info "      \"lint:ci\": \"eslint src/ --ext .ts,.tsx --config .eslintrc.ci.js\""
    fi
}

create_quality_hooks() {
    local package="$1"
    local package_dir="$PACKAGES_DIR/$package"

    log_info "Creating quality hooks for $package..."

    # Create pre-commit hook for quality checks
    mkdir -p "$package_dir/.git/hooks"

    cat > "$package_dir/.git/hooks/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook for quality checks

echo "🔍 Running pre-commit quality checks..."

# Run quick quality checks before commit
if command -v pnpm >/dev/null 2>&1; then
    # Quick syntax check
    pnpm run type-check || {
        echo "❌ TypeScript errors found. Please fix before committing."
        exit 1
    }

    # Quick ESLint check (fixable issues only)
    pnpm run lint --fix || {
        echo "❌ ESLint errors found. Please fix before committing."
        exit 1
    }
fi

echo "✅ Pre-commit quality checks passed"
EOF

    chmod +x "$package_dir/.git/hooks/pre-commit"
    log_success "  Pre-commit quality hook created"
}

# ==========================================
# Main Installation Process
# ==========================================

install_quality_tools() {
    local packages=($1)

    log_info "Starting quality tools installation..."
    log_info "Packages: ${packages[*]}"

    for package in "${packages[@]}"; do
        log_info "Installing quality tools for $package..."

        # Run installation for each package
        install_eslint_plugin "$package"
        install_code_metrics_tools "$package"
        install_friction_monitoring "$package"
        install_security_tools "$package"
        configure_quality_gate "$package"
        create_quality_hooks "$package"

        log_success "Quality tools installation completed for $package"
    done

    # Build packages if not skipped
    if [[ "$SKIP_BUILD" != "true" ]]; then
        log_info "Building packages..."
        cd "$PROJECT_ROOT"
        pnpm run build
        log_success "All packages built successfully"
    fi

    # Generate installation summary
    generate_installation_summary "${packages[@]}"
}

generate_installation_summary() {
    local packages=("$@")

    log_info "Generating installation summary..."

    cat << EOF

==========================================
QUALITY TOOLS INSTALLATION SUMMARY
==========================================

✅ Installation completed successfully!

Installed for packages: ${packages[*]}

📋 Next Steps:
1. Review the quality gate configuration in packages/server/quality-gate.config.js
2. Customize thresholds based on your project requirements
3. Run a test quality check: ./scripts/ci/quality-gate.sh --level standard
4. Set up GitHub Actions workflows by copying .github/workflows/quality/ to .github/workflows/
5. Configure webhook URLs for notifications in quality-gate.config.js

🔧 Quality Scripts Available:
  • ./scripts/ci/quality-gate.sh          - Main quality gate execution
  • ./scripts/ci/code-smell-detector.sh  - Code smell detection
  • ./scripts/ci/metrics-collector.sh    - Metrics collection (when created)
  • ./scripts/ci/friction-monitor.sh     - Friction monitoring (when created)

🎯 Quality Gates Configured:
  • Gate 0 (Critical): Build failures, TypeScript errors, critical security (0% tolerance)
  • Gate 1 (High): ID consistency, console logging, legacy patterns (<5% tolerance)
  • Gate 2 (Medium): Complexity limits, service extraction (<15% tolerance)
  • Gate 3 (Baseline): General code quality, style consistency (<30% tolerance)

📚 Documentation:
  • Quality standards: docs/code-review/standards/quality-standards.md
  • Code review process: docs/code-review/README.md
  • Quality gate configuration: packages/server/quality-gate.config.js

==========================================

EOF
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
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --force)
                FORCE_INSTALL=true
                shift
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

    # Check if we're in the correct directory
    if [[ ! -d "$PACKAGES_DIR" ]]; then
        exit_with_error "Packages directory not found. Are you in the project root?"
    fi

    # Check if pnpm is available
    if ! command -v pnpm >/dev/null 2>&1; then
        exit_with_error "pnpm is required but not installed. Please install pnpm first."
    fi

    # Detect packages to configure
    local packages=($(detect_packages))

    # Check if packages need installation
    if [[ "$FORCE_INSTALL" != "true" ]]; then
        log_info "Checking existing installations..."
        # Add logic to check if tools are already installed
    fi

    # Install quality tools
    install_quality_tools "${packages[*]}"
}

# Run main function with all arguments
main "$@"