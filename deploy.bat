@echo off
setlocal

cd /d "%~dp0"

echo CareTrack deployment starting from:
echo %CD%
echo.

echo [1/5] Validating local Next.js build...
call npm run build || goto :fail

echo.
echo [2/5] Checking Firebase Functions JavaScript...

node --check ".\functions\index.js" || goto :fail

if exist ".\functions\src" (
  for /r ".\functions\src" %%F in (*.js) do (
    node --check "%%F" || goto :fail
  )
)

echo.
echo [3/5] Launching Firebase Functions API deployment in a new window...
start "CareTrack - Firebase Functions" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%CD%'; npm run deploy:functions; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Firebase Functions deployment failed.' -ForegroundColor Red }"

echo.
echo [4/5] Launching Firebase rules and indexes deployment in a new window...
start "CareTrack - Firebase Rules" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%CD%'; npm run deploy:rules; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Firebase rules deployment failed.' -ForegroundColor Red }"

echo.
echo [5/5] Launching GitHub push in a new window...
start "CareTrack - GitHub Push" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%CD%'; git add .; git diff --cached --quiet; if ($LASTEXITCODE -eq 1) { git commit -m 'deploy update'; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Git commit failed.' -ForegroundColor Red; exit $LASTEXITCODE } } else { Write-Host 'No staged source changes to commit.' }; git push; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Git push failed.' -ForegroundColor Red }"

echo.
echo Launching VPS deployment reminder in a new window...
start "CareTrack - VPS Deploy" powershell -NoExit -NoProfile -Command "Write-Host 'SSH into the server and run:'; Write-Host ''; Write-Host 'cd ~/repo7'; Write-Host 'bash scripts/deploy-vps.sh'; Write-Host ''; Write-Host 'This app is now VPS/Next.js focused. Vercel must use Framework Preset Next.js with Output Directory empty.'"
echo.
echo If you still want Vercel, make sure Project Settings uses Framework Preset Next.js and Output Directory is empty.

echo.
echo Deployment windows launched.
echo Check each opened window for progress/errors.
pause
exit /b 0

:fail
echo.
echo Deployment launch failed. Check the error above.
pause
exit /b 1
