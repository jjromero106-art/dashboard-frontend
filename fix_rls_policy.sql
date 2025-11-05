-- Solución para optimizar la política RLS de la tabla sincronizacion
-- Problema: auth.role() se ejecuta por cada fila (lento)
-- Solución: (SELECT auth.role()) se ejecuta una vez por query (rápido)

-- 1. Eliminar la política actual
DROP POLICY IF EXISTS "Solo backend puede acceder" ON public.sincronizacion;

-- 2. Crear la política optimizada
CREATE POLICY "Solo backend puede acceder" 
ON public.sincronizacion
FOR ALL 
TO public 
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Verificar que la política se aplicó correctamente
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sincronizacion';