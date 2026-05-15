@echo off
setlocal

cd /d "%~dp0"

echo CareTrack deployment starting from:
echo %CD%
echo.

echo [1/5] Updating sw.js VERSION...

powershell -NoProfile -Command ^
"$q=[char]34; ^
$path='sw.js'; ^
if(Test-Path $path){ ^
  $lines=Get-Content $path; ^
  $out=foreach($line in $lines){ ^
    if($line -match ('const VERSION = '+$q+'(.*?)'+$q)){ ^
      $v=$matches[1]; ^
      $p=$v.Split('.'); ^
      if($p.Length -ge 2){ ^
        $m=[int]$p[1]+1; ^
        $nV=$p[0]+'.'+$m ^
      }else{ ^
        $nV=$v+'.1' ^
      } ^
      $line.Replace($v,$nV) ^
    }else{ ^
      $line ^
    } ^
  }; ^
  Set-Content $path -Value $out; ^
  Write-Host 'sw.js VERSION updated.' ^
}else{ ^
  Write-Host 'sw.js not found, skipping VERSION update.' ^
}"

if errorlevel 1 goto :fail

echo.
echo [2/5] Checking Firebase Functions JavaScript...

node --check ".\functions\index.js" || goto :fail

if exist ".\functions\src" (
  for /r ".\functions\src" %%F in (*.js) do (
    node --check "%%F" || goto :fail
  )
)

echo.
echo [3/5] Launching Firebase functions deployment in new window...
start "CareTrack - Firebase Functions" powershell -NoExit -Command "npm run deploy:functions"

echo.
echo [4/5] Launching Firebase rules and indexes deployment in new window...
start "CareTrack - Firebase Rules" powershell -NoExit -Command "npm run deploy:rules"

echo.
echo [5/5] Launching Vercel production deployment in new window...
start "CareTrack - Vercel Production" powershell -NoExit -Command "npm run deploy:vercel:prod"

echo.
echo Launching GitHub push in new window...
start "CareTrack - GitHub Push" powershell -NoExit -Command "git add .; git commit -m 'deploy update'; git push"

echo.
echo All deployment tasks launched in separate windows.
echo Check each opened window for progress/errors.
pause
exit /b 0

:fail
echo.
echo Deployment launch failed. Check the error above.
pause
exit /b 1