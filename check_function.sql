-- Consulta para ver la función actual que necesita corrección de seguridad
SELECT 
    proname as function_name,
    prosrc as function_body,
    proargnames as argument_names,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'obtener_lecturas_agrupadas_con_stats'
   OR proname = 'obtener_lecturas_agrupadas';

-- También verificar si existe alguna función relacionada con CalidAir
SELECT proname, prosrc 
FROM pg_proc 
WHERE prosrc LIKE '%lecturas%' 
   OR prosrc LIKE '%sincronizacion%';