@echo off
setlocal

cd /d "%~dp0"

echo CareTrack deployment starting from:
echo %CD%
echo.

echo [1/6] Validating local Next.js build...
call npm run build || goto :fail

echo.
echo [2/6] Checking Firebase Functions JavaScript...

node --check ".\functions\index.js" || goto :fail

if exist ".\functions\src" (
  for /r ".\functions\src" %%F in (*.js) do (
    node --check "%%F" || goto :fail
  )
)

echo.
echo [3/6] Deploying Firebase Functions API...
call npm run deploy:functions || goto :fail

echo.
echo [4/6] Deploying Firebase rules and indexes...
call npm run deploy:rules || goto :fail

echo.
echo [5/6] Pushing latest source to GitHub...
git add . || goto :fail
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "deploy update" || goto :fail
) else (
  echo No staged source changes to commit.
)
git push || goto :fail

echo.
echo [6/6] VPS deploy reminder...
echo SSH into the server and run:
echo   cd ~/repo7
echo   bash scripts/deploy-vps.sh
echo.
echo If you still want Vercel, make sure Project Settings uses Framework Preset Next.js and Output Directory is empty.

echo.
echo Deployment prep complete.
pause
exit /b 0

:fail
echo.
echo Deployment launch failed. Check the error above.
pause
exit /b 1
