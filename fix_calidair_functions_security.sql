-- Corrección de seguridad para funciones CalidAir
-- Problema: obtener_lecturas_agrupadas no tiene search_path fijo

-- 1. Corregir función principal CalidAir (la que falta seguridad)
CREATE OR REPLACE FUNCTION public.obtener_lecturas_agrupadas(
  p_interval text, 
  p_nodo text, 
  p_limit integer
)
RETURNS TABLE(
  intervalo timestamp with time zone,
  temperatura numeric(6,2),
  humedad numeric(6,2),
  pm25 numeric(6,2),
  pm10 numeric(6,2),
  co numeric(10,2),
  no2 numeric(10,2)
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- 🔒 Fijar search_path para seguridad CalidAir
  SET LOCAL search_path = public, pg_catalog;
  
  RETURN QUERY
  SELECT
    date_trunc('minute', l.fecha_hora) - 
    ((EXTRACT(minute FROM l.fecha_hora)::int % 
      CASE 
        WHEN p_interval = '5 minutes' THEN 5
        WHEN p_interval = '30 minutes' THEN 30
        WHEN p_interval = '2 hours' THEN 120
        ELSE 5
      END) * interval '1 minute') AS intervalo,
    AVG(l.temperatura)::numeric(6,2) AS temperatura,
    AVG(l.humedad)::numeric(6,2) AS humedad,
    AVG(l.pm25)::numeric(6,2) AS pm25,
    AVG(l.pm10)::numeric(6,2) AS pm10,
    AVG(l.co)::numeric(10,2) AS co,
    AVG(l.no2)::numeric(10,2) AS no2
  FROM public.lecturas l
  WHERE l.fecha_hora IS NOT NULL
    AND l.nodo <= p_nodo
  GROUP BY intervalo
  ORDER BY intervalo DESC
  LIMIT p_limit;
END;
$$;

-- 2. Mejorar la función con stats (cambiar set_config por SET LOCAL)
CREATE OR REPLACE FUNCTION public.obtener_lecturas_agrupadas_con_stats(
  p_interval text, 
  p_nodo text, 
  p_limit integer
)
RETURNS TABLE(
  intervalo timestamp with time zone,
  temperatura numeric(6,2),
  humedad numeric(6,2),
  pm25 numeric(6,2),
  pm10 numeric(6,2),
  co numeric(10,2),
  no2 numeric(10,2),
  temp_min numeric(6,2),
  temp_max numeric(6,2),
  temp_avg numeric(6,2),
  hum_min numeric(6,2),
  hum_max numeric(6,2),
  hum_avg numeric(6,2),
  pm25_min numeric(6,2),
  pm25_max numeric(6,2),
  pm25_avg numeric(6,2),
  pm10_min numeric(6,2),
  pm10_max numeric(6,2),
  pm10_avg numeric(6,2),
  co_min numeric(10,2),
  co_max numeric(10,2),
  co_avg numeric(10,2),
  no2_min numeric(10,2),
  no2_max numeric(10,2),
  no2_avg numeric(10,2)
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- 🔒 Método correcto para fijar search_path
  SET LOCAL search_path = public, pg_catalog;

  RETURN QUERY
  WITH time_filtered AS (
    SELECT *
    FROM public.lecturas l
    WHERE l.fecha_hora IS NOT NULL 
      AND l.nodo <= p_nodo
    ORDER BY l.fecha_hora DESC
    LIMIT p_limit * 10
  ),
  stats AS (
    SELECT 
      MIN(tf.temperatura)::numeric(6,2) AS temp_min,
      MAX(tf.temperatura)::numeric(6,2) AS temp_max,
      AVG(tf.temperatura)::numeric(6,2) AS temp_avg,
      MIN(tf.humedad)::numeric(6,2) AS hum_min,
      MAX(tf.humedad)::numeric(6,2) AS hum_max,
      AVG(tf.humedad)::numeric(6,2) AS hum_avg,
      MIN(tf.pm25)::numeric(6,2) AS pm25_min,
      MAX(tf.pm25)::numeric(6,2) AS pm25_max,
      AVG(tf.pm25)::numeric(6,2) AS pm25_avg,
      MIN(tf.pm10)::numeric(6,2) AS pm10_min,
      MAX(tf.pm10)::numeric(6,2) AS pm10_max,
      AVG(tf.pm10)::numeric(6,2) AS pm10_avg,
      MIN(tf.co)::numeric(10,2) AS co_min,
      MAX(tf.co)::numeric(10,2) AS co_max,
      AVG(tf.co)::numeric(10,2) AS co_avg,
      MIN(tf.no2)::numeric(10,2) AS no2_min,
      MAX(tf.no2)::numeric(10,2) AS no2_max,
      AVG(tf.no2)::numeric(10,2) AS no2_avg
    FROM time_filtered tf
  ),
  aggregated AS (
    SELECT
      date_trunc('minute', tf.fecha_hora) -
      ((EXTRACT(minute FROM tf.fecha_hora)::int %
        CASE 
          WHEN p_interval = '5 minutes' THEN 5
          WHEN p_interval = '30 minutes' THEN 30
          WHEN p_interval = '2 hours' THEN 120
          ELSE 5
        END) * interval '1 minute') AS intervalo,
      AVG(tf.temperatura)::numeric(6,2) AS temperatura,
      AVG(tf.humedad)::numeric(6,2) AS humedad,
      AVG(tf.pm25)::numeric(6,2) AS pm25,
      AVG(tf.pm10)::numeric(6,2) AS pm10,
      AVG(tf.co)::numeric(10,2) AS co,
      AVG(tf.no2)::numeric(10,2) AS no2
    FROM time_filtered tf
    GROUP BY intervalo
    ORDER BY intervalo DESC
    LIMIT p_limit
  )
  SELECT 
    a.intervalo,
    a.temperatura,
    a.humedad,
    a.pm25,
    a.pm10,
    a.co,
    a.no2,
    s.temp_min,
    s.temp_max,
    s.temp_avg,
    s.hum_min,
    s.hum_max,
    s.hum_avg,
    s.pm25_min,
    s.pm25_max,
    s.pm25_avg,
    s.pm10_min,
    s.pm10_max,
    s.pm10_avg,
    s.co_min,
    s.co_max,
    s.co_avg,
    s.no2_min,
    s.no2_max,
    s.no2_avg
  FROM aggregated a
  CROSS JOIN stats s;
END;
$$;