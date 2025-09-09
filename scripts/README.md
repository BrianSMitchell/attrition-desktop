# Scripts Directory

This directory contains various utility scripts organized by purpose.

## Directory Structure

### `dev/`
Development utilities and tools:
- `test-feedback-system.js` - Test the feedback and notification system

### `maintenance/`
Database and administrative scripts:
- `create-admin.js` - Create an administrative user
- `clean-database.js` - Clean and reset database
- `inspect-db.js` - Database inspection utility
- `temp-admin-script.js` - Temporary admin operations

### `build/`
Build and deployment scripts (future use):
- Reserved for CI/CD and automated build scripts

## Usage

### Development Scripts
```bash
node scripts/dev/<script-name>.js
```

### Maintenance Scripts
```bash
node scripts/maintenance/<script-name>.js
```

## Adding New Scripts

1. Place scripts in the appropriate subdirectory based on purpose
2. Include proper error handling and logging
3. Add usage documentation in script comments
4. Update this README when adding new scripts

## Environment Variables

Many scripts require environment variables to be set:
- Copy `.env.example` to `.env` in the project root or relevant package
- Configure database connections and API keys as needed
- Use `NODE_ENV` to control behavior across environments

## Best Practices

- Always test scripts in development before running in production
- Use proper error handling and exit codes
- Log operations for debugging and audit purposes
- Make scripts idempotent where possible
- Include help text or usage instructions
