# \# Desktop App Logging

# 

# \## Viewing Logs

# tail -100 logs/app.log     # View last 100 lines of the app log (recommended for quick checks)

# 

# cat logs/app.log           # View entire app log

# 

# \## Log Rotation

# ./scripts/rotate-logs.sh   # Manually rotate logs (archives old ones, cleans up after 7+ days)

# 

# \## Consolidated Logging Setup

# \# For desktop apps, use a logging library to send both front-end (UI events, errors) and back-end (core logic, API calls) output to a single file.

# \# Recommended libraries:

# \# - Electron: Use electron-log or Winston to pipe console output and errors to logs/app.log.

# \# - Unity: Integrate a logger like Debug.Log redirecting to a file via a custom handler.

# \# - Native (e.g., C++/Java): Use libraries like spdlog or java.util.logging to unify streams.

# 

# \# Example Setup (adapt to your framework):

# \# 1. Initialize a central logger in your app entry point.

# \# 2. Redirect console output (e.g., System.out in Java, or process.stdout in Node-based apps) to the logger.

# \# 3. Log all errors, warnings, and info to logs/app.log.

# 

# \# This consolidates logs in one place for faster debugging and allows agents (e.g., AI tools or scripts) to read/analyze them.

# 

# \# Note: No browser integration needed since this is a desktop app. If your game has a server component, ensure server logs are appended or synced to the same file/system.

