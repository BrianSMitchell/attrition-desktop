# Pokemon Tracker Beta Installation Guide

Welcome to the Pokemon Tracker Beta Program! This guide will help you install and set up the beta version on your system.

## Prerequisites

Before installing the Pokemon Tracker beta, ensure your system meets the following requirements:

### Windows
- **OS**: Windows 10 version 1903 or later / Windows 11
- **Architecture**: x64 (Intel/AMD) or ARM64
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB free space
- **Additional**: Microsoft Edge WebView2 runtime

### macOS
- **OS**: macOS 10.15 (Catalina) or later
- **Architecture**: Intel x64 or Apple Silicon (M1/M2)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB free space
- **Additional**: Signed binaries require macOS Gatekeeper approval

### Linux
- **Distributions**: Ubuntu 18.04+, Fedora 32+, Arch Linux, openSUSE Leap 15.2+
- **Desktop Environment**: GNOME, KDE, XFCE, or compatible
- **Display Server**: X11 or Wayland
- **Architecture**: x64 or ARM64
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB free space

## Installation Instructions

### Step 1: Access the Beta Portal

1. Visit the beta portal: [https://beta.pokemon-tracker.app](https://beta.pokemon-tracker.app)
2. Enter your beta access key (provided in your invitation email)
3. Click "Validate Access Key"

### Step 2: Download the Installer

Once your access key is validated:

1. Select your operating system from the download options
2. Choose the appropriate architecture (if multiple options are available)
3. Click "Download Beta Build"
4. Wait for the download to complete

### Step 3: Install Pokemon Tracker Beta

#### Windows Installation

1. **Run the Installer**
   - Double-click the downloaded `.exe` file
   - If Windows SmartScreen appears, click "More info" then "Run anyway"

2. **Installation Wizard**
   - Accept the license agreement
   - Choose installation directory (default recommended)
   - Select "Create desktop shortcut" if desired
   - Click "Install"

3. **First Launch Setup**
   - Launch Pokemon Tracker from the Start menu or desktop shortcut
   - Enter your beta access key when prompted
   - Complete the initial setup wizard

#### macOS Installation

1. **Mount the DMG**
   - Double-click the downloaded `.dmg` file
   - Wait for the disk image to mount

2. **Install the Application**
   - Drag "Pokemon Tracker Beta" to the Applications folder
   - Eject the disk image

3. **Gatekeeper Approval** (First launch only)
   - Right-click "Pokemon Tracker Beta" in Applications
   - Select "Open" from the context menu
   - Click "Open" when macOS asks for confirmation

4. **First Launch Setup**
   - Enter your beta access key when prompted
   - Complete the initial setup wizard

#### Linux Installation

##### AppImage (Recommended)
1. **Make Executable**
   ```bash
   chmod +x PokemonTracker-Beta-*.AppImage
   ```

2. **Run the Application**
   ```bash
   ./PokemonTracker-Beta-*.AppImage
   ```

3. **Optional: Desktop Integration**
   - Right-click the AppImage and select "Integrate and run"
   - Or manually copy to `/usr/local/bin/` for system-wide access

##### Debian/Ubuntu (.deb package)
1. **Install Package**
   ```bash
   sudo dpkg -i pokemon-tracker-beta_*.deb
   sudo apt-get install -f  # Fix dependencies if needed
   ```

2. **Launch from Applications Menu**
   - Find "Pokemon Tracker Beta" in your applications menu
   - Or run from terminal: `pokemon-tracker-beta`

##### Fedora/RHEL (.rpm package)
1. **Install Package**
   ```bash
   sudo rpm -i pokemon-tracker-beta-*.rpm
   # Or using dnf
   sudo dnf install pokemon-tracker-beta-*.rpm
   ```

2. **Launch from Applications Menu**
   - Find "Pokemon Tracker Beta" in your applications menu
   - Or run from terminal: `pokemon-tracker-beta`

## Initial Configuration

### Beta Access Key Setup

1. **First Launch**
   - When launching for the first time, you'll be prompted for your beta access key
   - Enter the key exactly as provided in your invitation email
   - Click "Validate and Continue"

2. **Account Linking** (Optional)
   - Link your existing Pokemon Tracker account if you have one
   - Or create a new account for beta testing
   - Beta data may not transfer to the final release

### Data Import

1. **Existing Data**
   - If you have data from the web version, you can import it
   - Go to Settings > Data > Import from Web
   - Follow the import wizard

2. **Fresh Start**
   - Start with a clean slate for thorough beta testing
   - Recommended for finding UI/UX issues

### Settings Configuration

1. **Beta Settings**
   - Enable "Debug Mode" for additional logging
   - Configure "Crash Reporting" preferences
   - Set up "Automatic Updates" for beta builds

2. **Privacy Settings**
   - Review telemetry data collection settings
   - Configure feedback submission preferences
   - Set crash report sharing options

## Verification

### Installation Verification

1. **Check Version**
   - Go to Help > About
   - Verify the version shows "Beta" designation
   - Note the build number for bug reports

2. **Feature Access**
   - Verify beta-exclusive features are available
   - Test core functionality works as expected
   - Check for any obvious UI issues

3. **Connectivity**
   - Ensure the app can connect to beta servers
   - Test data synchronization if applicable
   - Verify feedback submission works

## Troubleshooting

### Common Issues

#### "Invalid Access Key" Error
- **Solution**: Double-check the key for typos
- **Alternative**: Request a new key from beta-support@pokemon-tracker.app

#### Installation Fails on Windows
- **Cause**: Missing WebView2 runtime
- **Solution**: Download and install WebView2 from Microsoft
- **Alternative**: Run the installer as administrator

#### macOS Won't Open (Security Warning)
- **Cause**: Gatekeeper protection
- **Solution**: Right-click app, select "Open", confirm in dialog
- **Alternative**: Temporarily disable Gatekeeper (not recommended)

#### Linux AppImage Won't Run
- **Cause**: Missing execute permissions or FUSE
- **Solution**: `chmod +x file.AppImage` and install FUSE
- **Alternative**: Extract and run the binary directly

#### Crash on Startup
- **Solution**: Delete config directory and restart
  - Windows: `%APPDATA%/Pokemon Tracker Beta`
  - macOS: `~/Library/Application Support/Pokemon Tracker Beta`
  - Linux: `~/.config/pokemon-tracker-beta`

### Debug Information

When reporting issues, please include:

1. **System Information**
   - Operating system and version
   - Architecture (x64, ARM64)
   - Available RAM and storage

2. **Application Information**
   - Beta version and build number
   - Installation method used
   - Access key (first 8 characters only)

3. **Error Details**
   - Exact error message
   - Steps to reproduce
   - Screenshots if applicable

## Getting Help

### Support Channels

1. **Email Support**
   - beta-support@pokemon-tracker.app
   - Include debug information in your message

2. **Discord Community**
   - Join: [https://discord.gg/pokemon-tracker-beta](https://discord.gg/pokemon-tracker-beta)
   - Real-time help from other beta testers

3. **Beta Forum** (INTERNAL/CLOSED_ALPHA only)
   - [https://forum.pokemon-tracker.app/beta](https://forum.pokemon-tracker.app/beta)
   - Detailed technical discussions

### Response Times

- **Critical Issues**: 4-8 hours
- **High Priority**: 1-2 business days
- **Normal Issues**: 2-5 business days
- **Feature Requests**: Next planning cycle

## Next Steps

After successful installation:

1. **Read the Beta Testing Guide** - Learn how to effectively test and report issues
2. **Join the Community** - Connect with other beta testers on Discord
3. **Explore New Features** - Check out beta-exclusive functionality
4. **Provide Feedback** - Help shape the final product with your input

---

**Last Updated**: January 2025
**Guide Version**: 1.0
**Applicable Beta Versions**: 1.0.0-beta.1 and later
