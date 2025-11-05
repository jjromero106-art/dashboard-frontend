@echo off
echo Instalando Supabase client...
npm install @supabase/supabase-js
echo.
echo Desinstalando Firebase...
npm uninstall firebase
echo.
echo ¡Listo! Firebase eliminado y Supabase instalado.
pause