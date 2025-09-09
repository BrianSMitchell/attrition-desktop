# Configuration Directory

This directory contains all configuration files for the Attrition project.

## Files

### `electron-builder.yml`
Electron Builder configuration for creating desktop application installers and distributables:
- Platform-specific build settings (Windows, macOS, Linux)
- Output directory configuration (points to `../releases/`)
- Code signing and auto-updater settings
- Asset and resource bundling rules

### `development.yml`
Development environment configuration:
- Relaxed security settings for local development
- Faster game loops for testing
- Debug logging enabled
- Local database connections
- Disabled rate limiting

### `production.yml`
Production environment configuration:
- Strict security settings
- Production-optimized game timing
- Minimal logging for performance
- Production database configuration
- Full rate limiting enabled

### `test.yml`
Test environment configuration:
- Fast execution for automated testing
- Test-specific database (separate from dev/prod)
- Minimal logging to reduce noise
- Disabled external integrations
- Higher limits for test scenarios

## Usage

### Environment-Specific Configs
These YAML files can be loaded by application code based on `NODE_ENV`:

```javascript
const config = require(`../config/${process.env.NODE_ENV || 'development'}.yml`);
```

### Build Configuration
The electron-builder configuration is referenced in package.json scripts:

```json
{
  "build": "electron-builder --config ../../config/electron-builder.yml"
}
```

## Adding New Configurations

1. Create new `.yml` files for environment-specific settings
2. Follow the existing structure and naming conventions
3. Update application code to load the new configurations
4. Document new configuration options in this README

## Environment Variables

Configuration files may reference environment variables using template syntax:
- `{{VARIABLE_NAME}}` - Will be replaced at runtime
- Use actual environment variables for sensitive data like database URLs and API keys

## Security Notes

- Never commit sensitive data directly in config files
- Use environment variable templating for secrets
- Keep production configurations separate from development
- Regularly review and audit configuration changes
