# Pokemon Tracker Beta - Known Issues

This document tracks known issues in the current beta release. Please check this list before reporting bugs to avoid duplicates.

## Critical Issues

### 🔴 Data Synchronization
**Issue**: Cloud sync occasionally fails on slow connections  
**Status**: Under Investigation  
**Workaround**: Retry sync after ensuring stable connection  
**Affects**: All platforms  
**Reported**: 2025-01-15  
**Expected Fix**: Beta 1.0.0-beta.3  

### 🔴 macOS Gatekeeper
**Issue**: Application blocked by Gatekeeper on macOS Sequoia  
**Status**: Investigating Code Signing  
**Workaround**: Right-click app → Open → Confirm in dialog  
**Affects**: macOS 15.0+  
**Reported**: 2025-01-12  
**Expected Fix**: Beta 1.0.0-beta.2  

## High Priority Issues

### 🟠 Memory Usage Growth
**Issue**: Memory usage increases during extended sessions  
**Status**: Fix in Progress  
**Workaround**: Restart app every 4-6 hours of continuous use  
**Affects**: All platforms  
**Reported**: 2025-01-10  
**Expected Fix**: Beta 1.0.0-beta.4  

### 🟠 Search Performance
**Issue**: Search becomes slow with large datasets (5000+ Pokemon)  
**Status**: Optimization in Progress  
**Workaround**: Use filters to narrow search scope  
**Affects**: All platforms with large datasets  
**Reported**: 2025-01-14  
**Expected Fix**: Beta 1.0.0-beta.3  

### 🟠 Windows Installation
**Issue**: Installer fails if WebView2 not pre-installed  
**Status**: Testing Bundled Solution  
**Workaround**: Install WebView2 manually before Pokemon Tracker  
**Affects**: Windows 10/11  
**Reported**: 2025-01-08  
**Expected Fix**: Beta 1.0.0-beta.2  

## Medium Priority Issues

### 🟡 Linux Package Dependencies
**Issue**: Missing dependency errors on some Linux distributions  
**Status**: Investigating Package Requirements  
**Workaround**: Use AppImage version instead of native packages  
**Affects**: Debian/Ubuntu/Fedora packages  
**Reported**: 2025-01-13  
**Expected Fix**: Beta 1.0.0-beta.3  

### 🟡 High DPI Scaling
**Issue**: UI elements appear too small on 4K displays with 150%+ scaling  
**Status**: Testing DPI Awareness Fixes  
**Workaround**: Adjust system display scaling to 125%  
**Affects**: Windows/Linux with high DPI displays  
**Reported**: 2025-01-11  
**Expected Fix**: Beta 1.0.0-beta.4  

### 🟡 Import Validation
**Issue**: CSV import doesn't validate Pokemon name spelling  
**Status**: Adding Validation Logic  
**Workaround**: Manually verify imported Pokemon names  
**Affects**: All platforms during CSV import  
**Reported**: 2025-01-09  
**Expected Fix**: Beta 1.0.0-beta.3  

### 🟡 Keyboard Navigation
**Issue**: Tab navigation skips some UI elements  
**Status**: Fixing Tab Order  
**Workaround**: Use mouse for affected elements  
**Affects**: All platforms  
**Reported**: 2025-01-07  
**Expected Fix**: Beta 1.0.0-beta.2  

## Low Priority Issues

### 🟢 Visual Glitches
**Issue**: Window resize causes temporary UI artifacts  
**Status**: Cosmetic Fix Planned  
**Workaround**: Window will correct itself after resize completes  
**Affects**: All platforms  
**Reported**: 2025-01-12  
**Expected Fix**: Beta 1.0.0-beta.5  

### 🟢 Theme Switching
**Issue**: Dark mode toggle requires application restart  
**Status**: Implementing Real-time Theme Switching  
**Workaround**: Restart app after changing theme  
**Affects**: All platforms  
**Reported**: 2025-01-06  
**Expected Fix**: Beta 1.0.0-beta.4  

### 🟢 Export Filename
**Issue**: Default export filename doesn't include timestamp  
**Status**: Enhancement Planned  
**Workaround**: Manually rename exported files  
**Affects**: All platforms  
**Reported**: 2025-01-05  
**Expected Fix**: Beta 1.0.0-beta.5  

## Platform-Specific Issues

### Windows
- **WebView2 Dependency**: Installer should bundle WebView2 runtime
- **Smart Screen Warnings**: Executable not yet code-signed for trust
- **Start Menu Integration**: Beta app appears in regular app list

### macOS
- **Code Signing**: Developer ID signature needs updating
- **Dock Integration**: App icon doesn't show progress indicators
- **File Associations**: .pokemon files don't auto-open with beta app

### Linux
- **Desktop Integration**: .desktop file not installed properly
- **Package Dependencies**: Some distros missing required libraries
- **Wayland Compatibility**: Minor rendering issues under Wayland

## Limitations (By Design)

### Current Beta Limitations

#### Feature Limitations
- **Cloud Sync**: Limited to 5000 Pokemon per account
- **Export Formats**: Only CSV and JSON supported (no Excel yet)
- **Offline Mode**: Some features require internet connection
- **Multi-User**: Single user mode only (no family sharing)

#### Performance Limitations
- **Large Datasets**: Optimal performance with <10,000 Pokemon
- **Import Speed**: Large CSV imports may take several minutes
- **Search Results**: Limited to 1000 results per search
- **Image Processing**: Pokemon images limited to 5MB each

#### Platform Limitations
- **Mobile Sync**: No mobile app sync yet
- **Web Integration**: Limited web app feature parity
- **Cloud Storage**: 100MB storage limit per beta user
- **Backup Frequency**: Automatic backups limited to daily

## Fixed in Recent Builds

### Fixed in 1.0.0-beta.1 (2025-01-15)
- ✅ Crash when importing malformed CSV files
- ✅ Search box losing focus after typing
- ✅ Settings not saving on application close
- ✅ Pokemon images not loading from cache

### Fixed in 1.0.0-alpha.5 (2025-01-10)
- ✅ Installation directory permission errors
- ✅ Database corruption on unexpected shutdown
- ✅ Memory leak in image loading system
- ✅ Keyboard shortcuts conflicting with system shortcuts

## Reporting New Issues

### Before Reporting
1. **Check this document** for existing known issues
2. **Search Discord** for recent discussions about the problem
3. **Test reproduction** with a fresh installation if possible
4. **Gather information** about your system and the issue

### Information to Include
- **Beta version number** (Help > About)
- **Operating system** and version
- **Hardware specifications** (RAM, CPU, GPU if relevant)
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots or videos** if helpful

### Where to Report
- **Critical Issues**: Email beta-support@pokemon-tracker.app immediately
- **General Bugs**: Use in-app feedback (Help > Send Feedback)
- **Discussion**: Discord #beta-testing channel
- **Feature Requests**: Discord #feature-requests channel

## Issue Tracking

### Status Definitions
- **🔍 Under Investigation**: Issue confirmed, root cause being identified
- **🔨 Fix in Progress**: Solution being developed
- **✅ Fixed**: Resolved in upcoming or current build
- **📋 Planned**: Acknowledged, will be addressed in future release
- **❌ Won't Fix**: Issue determined to be out of scope

### Priority Levels
- **🔴 Critical**: Blocks core functionality or causes data loss
- **🟠 High**: Significantly impacts user experience
- **🟡 Medium**: Affects some users or specific scenarios
- **🟢 Low**: Minor issues or cosmetic problems

## Workaround Success Tips

### General Tips
1. **Keep backups** of your Pokemon data before trying workarounds
2. **Test workarounds** in a non-critical environment first
3. **Document results** to help improve the permanent fixes
4. **Share effective workarounds** with other beta testers

### When Workarounds Don't Work
- Try the workaround on a fresh installation
- Check if you're running the latest beta build
- Verify your system meets the minimum requirements
- Contact support with details about the failed workaround

## Update Information

### How to Check for Updates
- **Automatic**: Enable "Check for updates" in Settings
- **Manual**: Help > Check for Updates
- **Discord**: Follow #beta-announcements channel

### Update Best Practices
- **Backup data** before major version updates
- **Close all instances** of Pokemon Tracker before updating
- **Restart system** if update requires it
- **Verify installation** after update completes

---

**Document Updated**: 2025-01-15  
**Current Beta Version**: 1.0.0-beta.1  
**Next Update Planned**: 2025-01-22
