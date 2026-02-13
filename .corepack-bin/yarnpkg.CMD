@SETLOCAL
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "C:\Program Files\nodejs\node_modules\corepack\dist\yarnpkg.js" %*
) ELSE (
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "C:\Program Files\nodejs\node_modules\corepack\dist\yarnpkg.js" %*
)
