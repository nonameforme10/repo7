@echo off
setlocal

cd /d "%~dp0"

set "VPS_HOST=root@134.209.75.49"
set "VPS_DIR=/root/repo7"
set "VPS_API_URL=https://api.caretrack.website"

echo CareTrack deployment starting from:
echo %CD%
echo.
echo Frontend: https://caretrack.website on Vercel
echo Firebase: Auth, RTD, Storage, Functions
echo VPS API:  %VPS_API_URL%
echo.

echo [1/6] Validating local Next.js build...
call npm run build || goto :fail

echo.
echo [2/6] Checking server and Firebase Functions JavaScript...

node --check ".\server.js" || goto :fail
node --check ".\functions\index.js" || goto :fail

if exist ".\functions\src" (
  for /r ".\functions\src" %%F in (*.js) do (
    node --check "%%F" || goto :fail
  )
)

echo.
echo [3/6] Launching Vercel production frontend deployment...
start "CareTrack - Vercel Frontend" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%CD%'; npm run deploy:vercel:prod; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Vercel frontend deployment failed.' -ForegroundColor Red } else { Write-Host ''; Write-Host 'Vercel frontend deployed: https://caretrack.website' -ForegroundColor Green }"

echo.
echo [4/6] Launching Firebase Functions API deployment...
start "CareTrack - Firebase Functions" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%CD%'; npm run deploy:functions; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Firebase Functions deployment failed.' -ForegroundColor Red } else { Write-Host ''; Write-Host 'Firebase Functions deployed.' -ForegroundColor Green }"

echo.
echo [5/6] Launching Realtime Database and Storage rules deployment...
start "CareTrack - Firebase Rules" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%CD%'; npm run deploy:rules; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Firebase rules deployment failed.' -ForegroundColor Red } else { Write-Host ''; Write-Host 'Firebase rules deployed.' -ForegroundColor Green }"

echo.
echo [6/6] Launching GitHub push, then VPS API deployment...
start "CareTrack - GitHub and VPS API" powershell -NoExit -NoProfile -Command "Set-Location -LiteralPath '%CD%'; git add .; git diff --cached --quiet; if ($LASTEXITCODE -eq 1) { git commit -m 'deploy update'; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Git commit failed.' -ForegroundColor Red; exit $LASTEXITCODE } } else { Write-Host 'No staged source changes to commit.' }; git push; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'Git push failed. VPS deploy skipped.' -ForegroundColor Red; exit $LASTEXITCODE }; Write-Host ''; Write-Host 'Deploying VPS API from GitHub...' -ForegroundColor Cyan; ssh %VPS_HOST% 'cd %VPS_DIR% && bash scripts/deploy-vps.sh'; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'VPS API deployment failed.' -ForegroundColor Red } else { Write-Host ''; Write-Host 'VPS API deployed: %VPS_API_URL%' -ForegroundColor Green; Write-Host 'Health check: %VPS_API_URL%/api/health' }"

echo.
echo Deployment windows launched.
echo Check each opened window for progress/errors.
echo.
echo Final checks after deployment:
echo   https://caretrack.website
echo   %VPS_API_URL%/api/health
echo.
pause
exit /b 0

:fail
echo.
echo Deployment launch failed. Check the error above.
pause
exit /b 1
