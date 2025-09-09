# Custom NSIS installer script for Attrition with Launcher support
# This script installs the launcher executable and creates appropriate shortcuts

!macro customInstall
  # Copy launcher executable to a user-accessible location  
  SetOutPath "$LOCALAPPDATA\Attrition"
  File "$INSTDIR\resources\launcher\Attrition Launcher.exe"
  
  # Create desktop shortcut for the launcher (not the game)
  CreateShortcut "$DESKTOP\Attrition.lnk" "$LOCALAPPDATA\Attrition\Attrition Launcher.exe" \
    "" "" 0 SW_SHOWNORMAL \
    "" "Launch Attrition - Strategic Space Empire Game"
  
  # Create start menu shortcut for the launcher
  CreateDirectory "$SMPROGRAMS\Attrition"
  CreateShortcut "$SMPROGRAMS\Attrition\Attrition.lnk" "$LOCALAPPDATA\Attrition\Attrition Launcher.exe" \
    "" "" 0 SW_SHOWNORMAL \
    "" "Launch Attrition - Strategic Space Empire Game"
    
  # Create uninstaller shortcut in start menu
  CreateShortcut "$SMPROGRAMS\Attrition\Uninstall Attrition.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"
!macroend

!macro customUnInstall
  # Remove launcher executable
  Delete "$LOCALAPPDATA\Attrition\Attrition Launcher.exe"
  RMDir "$LOCALAPPDATA\Attrition"
  
  # Remove desktop shortcut
  Delete "$DESKTOP\Attrition.lnk"
  
  # Remove start menu shortcuts
  RMDir /r "$SMPROGRAMS\Attrition"
!macroend
