@echo off

cd /d "%~dp0"

if not exist "package.json" (

  echo HATA: package.json bulunamadi. Bu klasorde degilsiniz.

  echo Dogru yol: D:\OneDrive\Belgeler\Yeni klasör\OneDrive\Desktop\medikal-app

  pause

  exit /b 1

)

echo.

echo ========================================

echo   MDRpilot dev server baslatiliyor...

echo   URL: http://localhost:3000

echo   Ilk acilis 30-60 sn surebilir.

echo   Kapatmak icin bu pencerede Ctrl+C

echo.

echo   Sayfa stillenmemisse: npm run dev:clean

echo   Sonra tarayicida Ctrl+F5 (sert yenileme)

echo ========================================

echo.

npm run dev

pause

