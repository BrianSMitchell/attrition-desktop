!macro customInstall
  # Create desktop shortcut for Attrition Launcher
  CreateShortcut "$DESKTOP\Attrition Launcher.lnk" "$INSTDIR\Attrition Launcher.exe" "" "" 0
  
  # Create start menu shortcut
  CreateDirectory "$SMPROGRAMS\Attrition"
  CreateShortcut "$SMPROGRAMS\Attrition\Attrition Launcher.lnk" "$INSTDIR\Attrition Launcher.exe" "" "" 0
!macroend

!macro customUnInstall
  # Remove desktop shortcut
  Delete "$DESKTOP\Attrition Launcher.lnk"
  
  # Remove start menu shortcuts
  RMDir /r "$SMPROGRAMS\Attrition"
!macroend
