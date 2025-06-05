@echo off
echo 🚀 Ejecutando tests de performance de VersaCompiler...
echo.

REM Ejecutar tests de performance
echo 📊 1/3 - Ejecutando tests de performance...
npm run perf:test
if %errorlevel% neq 0 (
    echo ❌ Error en los tests de performance
    exit /b %errorlevel%
)

REM Generar reportes
echo 📈 2/3 - Generando reportes...
npm run perf:report
if %errorlevel% neq 0 (
    echo ❌ Error generando reportes
    exit /b %errorlevel%
)

REM Abrir dashboard
echo 🌐 3/3 - Abriendo dashboard...
npm run perf:open

echo.
echo ✅ ¡Performance testing completado! Dashboard abierto en tu navegador.
echo 📁 Resultados guardados en: performance-results/
