!macro customInit
  ; Attempt to uninstall any previously installed version before proceeding
  DetailPrint "Checking for existing Attrition installation..."

  ; Try common uninstall registry keys (per-user first, then per-machine)
  StrCpy $0 ""
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ${If} $0 == ""
    ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString"
  ${EndIf}
  ${If} $0 == ""
    ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ${EndIf}
  ${If} $0 == ""
    ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString"
  ${EndIf}

  ${If} $0 != ""
    DetailPrint "Existing installation found. Uninstalling previous version..."
    ExecWait '$0 /S' $1
    DetailPrint "Previous uninstall finished with code $1"
    Sleep 1000
  ${Else}
    DetailPrint "No previous installation detected."
  ${EndIf}
!macroend
