@echo off
chcp 65001 >nul
title ScoreAR v3.3.0 - Instant Firebase Hosting Deployment
echo ===============================================================================
echo    🚀 منصة سكور آر (ScoreAR v3.3.0) - الرفع السريع المتكامل
echo ===============================================================================
echo.
cd /d "%~dp0"

set NODE_TLS_REJECT_UNAUTHORIZED=0

echo [1/3] جاري بناء وتزامن كافة ملفات المنصة والعوالم والشخصيات...
call node build.js

echo.
echo [2/3] جاري فحص ملفات الجافاسكربت ومطابقة المتطلبات...
call node "C:\Users\Ahmed Romih\.gemini\antigravity\brain\37cfadfe-728c-4d48-aa00-5433ce9cb355\scratch\check_all_js_syntax.js"

echo.
echo [3/3] جاري الرفع المباشر إلى Firebase Hosting (scorear-e4186)...
call firebase deploy --only hosting

if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo ✅ تم رفع ونشر منصة سكور آر بنجاح تام 100%%!
    echo 🌐 رابط موقعك المباشر: https://scorear-e4186.web.app
    echo ===============================================================================
) else (
    echo.
    echo ❌ حدث خطأ أثناء الرفع، جاري فتح جلسة المصادقة...
    call firebase login --reauth
    call firebase deploy --only hosting
)

pause
