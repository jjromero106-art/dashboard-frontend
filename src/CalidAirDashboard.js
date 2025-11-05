// Renombrar App.js actual a CalidAirDashboard.js
// Este será el dashboard específico de CalidAir
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { supabase } from "./supabaseClient";
import html2canvas from "html2canvas";
import Header from './Header';

// === COMPONENTE DASHBOARD CALIDAIR ===
function CalidAirDashboard({ onBack }) {
  const [latestData, setLatestData] = useState(null);
  const [previousData, setPreviousData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [selectedVar, setSelectedVar] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [stats, setStats] = useState({});
  const cache = useRef({});

  // Variables con nueva paleta de colores y límites reales
  const variables = useMemo(() => [
    { key: "temp", label: "Temperatura", unit: "°C", color: "#FF7A00", category: "environmental", maxValue: 50 },
    { key: "hum", label: "Humedad", unit: "%", color: "#4DA8DA", category: "environmental", maxValue: 100 },
    { key: "pm25", label: "PM2.5", unit: "µg/m³", color: "#FFD166", category: "pollutants", maxValue: 150 },
    { key: "pm10", label: "PM10", unit: "µg/m³", color: "#FFD166", category: "pollutants", maxValue: 250 },
    { key: "co", label: "CO", unit: "ppb", color: "#E84545", category: "pollutants", maxValue: 1000 },
    { key: "no2", label: "NO₂", unit: "ppb", color: "#E84545", category: "pollutants", maxValue: 200 },
  ], []);

  const categories = {
    environmental: { title: "Condiciones Ambientales" },
    pollutants: { title: "Contaminantes" }
  };

  // === Lectura del último dato con tendencias ===
  useEffect(() => {
    const fetchLatestData = async () => {
      const { data: syncData } = await supabase
        .from('sincronizacion')
        .select('ultimo_nodo')
        .eq('id', 1)
        .single();
      
      if (!syncData?.ultimo_nodo) {
        setLatestData([0, 0, 0, 0, 0, 0, new Date().toISOString()]);
        return;
      }
      
      // Obtener últimos 2 registros para calcular tendencia
      const { data } = await supabase
        .from('lecturas')
        .select('*')
        .not('fecha_hora', 'is', null)
        .lte('nodo', syncData.ultimo_nodo)
        .order('nodo', { ascending: false })
        .limit(2);
      
      if (!data || data.length === 0) {
        setLatestData([0, 0, 0, 0, 0, 0, new Date().toISOString()]);
        return;
      }
      
      const latest = data[0];
      const previous = data[1];
      
      const formatted = [
        latest.temperatura || 0,
        latest.humedad || 0, 
        latest.pm25 || 0,
        latest.pm10 || 0,
        latest.co || 0,
        latest.no2 || 0,
        latest.fecha_hora
      ];
      
      const prevFormatted = previous ? [
        previous.temperatura || 0,
        previous.humedad || 0, 
        previous.pm25 || 0,
        previous.pm10 || 0,
        previous.co || 0,
        previous.no2 || 0,
      ] : null;
      
      setLatestData(formatted);
      setPreviousData(prevFormatted);
      setLastSyncTime(latest.fecha_hora);
    };

    fetchLatestData();
    // Datos principales cada 1 minuto para tiempo real
    const interval = setInterval(fetchLatestData, 60000);
    return () => clearInterval(interval);
  }, []);

  // === Función para obtener datos con estadísticas (con caché compartido) ===
  const fetchChartDataByRange = useCallback(async (range, forceRefresh = false) => {
    const cacheKey = `chart_${range}`;
    const cacheTimeKey = `chart_${range}_time`;
    const CACHE_DURATION = {
      '24h': 5 * 60 * 1000,   // 5 minutos
      '7d': 15 * 60 * 1000,  // 15 minutos
      '1m': 30 * 60 * 1000   // 30 minutos
    };
    
    // Verificar caché compartido en localStorage
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const now = Date.now();
    
    if (cachedData && cachedTime && !forceRefresh) {
      const age = now - parseInt(cachedTime);
      if (age < CACHE_DURATION[range]) {
        const parsed = JSON.parse(cachedData);
        setChartData(parsed.data);
        setStats(parsed.stats);
        return;
      }
    }
    
    // Verificar caché local como fallback
    if (cache.current[range] && !forceRefresh) {
      setChartData(cache.current[range].data);
      setStats(cache.current[range].stats);
      return;
    }
    
    const { data: syncData } = await supabase
      .from('sincronizacion')
      .select('ultimo_nodo')
      .eq('id', 1)
      .single();
    
    if (!syncData?.ultimo_nodo) {
      setChartData([]);
      setStats({});
      return;
    }
    
    // Configuración de intervalos optimizados
    const intervalMap = {
      '24h': { interval: '5 minutes', limit: 288 },
      '7d': { interval: '30 minutes', limit: 336 },
      '1m': { interval: '2 hours', limit: 360 },
    };
    
    const { interval, limit } = intervalMap[range] || intervalMap['24h'];
    
    // Llamada a función SQL optimizada
    const { data, error } = await supabase.rpc('obtener_lecturas_agrupadas', {
      p_interval: interval,
      p_nodo: syncData.ultimo_nodo,
      p_limit: limit,
    });
    
    if (data && !error && data.length > 0) {
      const formatted = data.reverse().map(d => ({
        timestamp: d.intervalo,
        temp: parseFloat(d.temperatura) || 0,
        hum: parseFloat(d.humedad) || 0,
        pm25: parseFloat(d.pm25) || 0,
        pm10: parseFloat(d.pm10) || 0,
        co: parseFloat(d.co) || 0,
        no2: parseFloat(d.no2) || 0,
      }));
      
      // Calcular estadísticas en JavaScript
      const calculateStats = (key) => {
        const values = formatted.map(d => d[key]).filter(v => v > 0);
        if (values.length === 0) return { min: 0, max: 0, avg: 0 };
        return {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length
        };
      };
      
      const newStats = {};
      variables.forEach(v => {
        newStats[v.key] = calculateStats(v.key);
      });
      
      const cacheData = { data: formatted, stats: newStats };
      
      // Guardar en caché local
      cache.current[range] = cacheData;
      
      // Guardar en caché compartido (localStorage)
      try {
        localStorage.setItem(`chart_${range}`, JSON.stringify(cacheData));
        localStorage.setItem(`chart_${range}_time`, Date.now().toString());
      } catch (e) {
        // Ignorar errores de localStorage (cuota excedida, etc.)
      }
      
      setChartData(formatted);
      setStats(newStats);
    }
  }, [variables]);

  // === Limpiar caché cuando cambia el rango temporal ===
  useEffect(() => {
    // Limpiar caché para forzar nueva consulta con estadísticas actualizadas
    Object.keys(cache.current).forEach(key => {
      delete cache.current[key];
    });
  }, [timeRange]);

  // === Lectura de datos para la gráfica ===
  useEffect(() => {
    fetchChartDataByRange(timeRange);
    
    // Intervalos optimizados para plan gratuito de Supabase
    let updateInterval;
    switch (timeRange) {
      case '24h': updateInterval = 300000; break;  // 5 min (era 1 min)
      case '7d': updateInterval = 900000; break;   // 15 min (era 5 min)
      case '1m': updateInterval = 1800000; break;  // 30 min (era 10 min)
      default: updateInterval = 300000;
    }
    
    const interval = setInterval(() => {
      delete cache.current[timeRange];
      fetchChartDataByRange(timeRange, true);
    }, updateInterval);
    
    return () => clearInterval(interval);
  }, [timeRange, fetchChartDataByRange]);

  // Función para calcular tendencia
  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return { symbol: "—", change: 0, color: "#9CA3AF" };
    const diff = current - previous;
    const symbol = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
    const color = diff > 0 ? "#10B981" : diff < 0 ? "#EF4444" : "#9CA3AF";
    return { symbol, change: Math.abs(diff), color };
  };

  // Función para descargar gráfica y estadísticas como PNG
  const downloadChart = () => {
    if (!chartData.length || !selectedVar) return;
    
    const firstDate = new Date(chartData[0].timestamp).toLocaleDateString('es-ES');
    const lastDate = new Date(chartData[chartData.length - 1].timestamp).toLocaleDateString('es-ES');
    const filename = `CalidAir_${selectedVar.label}_${timeRange}_${firstDate}_${lastDate}.png`;
    
    const modalContent = document.querySelector('.fixed.inset-0 .rounded-2xl');
    if (!modalContent) return;
    
    html2canvas(modalContent, {
      backgroundColor: '#1E2635',
      scale: 2,
      useCORS: true,
      allowTaint: true
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(() => {
      // Fallback al método anterior si html2canvas falla
      const svg = document.querySelector('.recharts-wrapper svg');
      if (!svg) return;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      
      canvas.width = svg.clientWidth;
      canvas.height = svg.clientHeight;
      
      img.onload = () => {
        ctx.fillStyle = '#1E2635';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  };



  return (
    <div className="min-h-screen">
      <Header selectedPage="calidair" onSelectBrand={onBack}>
        {/* Dashboard Content */}
        <div className="min-h-screen p-6" style={{ backgroundColor: '#FFFFFF', color: '#4E4E4E' }}>
        {/* Encabezado con branding CalidAir */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3C672C' }}>
              <span className="text-white font-bold text-xl">CA</span>
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold" style={{ color: '#3C672C' }}>CalidAir</h1>
              <p className="text-sm" style={{ color: '#4E4E4E' }}>Monitoreo de Calidad del Aire</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Última actualización: {lastSyncTime ? new Date(lastSyncTime).toLocaleString('es-ES', { timeZone: 'UTC' }) : "—"}
          </p>
        </div>

      {/* Tarjetas por categorías */}
      {Object.entries(categories).map(([categoryKey, category]) => (
        <div key={categoryKey} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {category.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {variables.filter(v => v.category === categoryKey).map((v, i) => {
              const dataIndex = variables.findIndex(variable => variable.key === v.key);
              const val = latestData ? latestData[dataIndex] : 0;
              const prevVal = previousData ? previousData[dataIndex] : null;
              const trend = getTrend(val, prevVal);
              
              return (
                <div
                  key={v.key}
                  onClick={() => setSelectedVar(v)}
                  className="rounded-xl shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105"
                  style={{ backgroundColor: '#F6F8F9', border: '1px solid #E0E0E0' }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-medium" style={{ color: '#4E4E4E' }}>{v.label}</h3>
                    <div className="flex items-center gap-1">
                      <span style={{ color: trend.color, fontSize: '16px' }}>{trend.symbol}</span>
                      {trend.change > 0 && (
                        <span className="text-xs" style={{ color: trend.color }}>
                          {trend.change.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold transition-all duration-300" style={{ color: '#4E4E4E' }}>
                      {val && val > 0 ? val.toFixed(1) : "—"}
                    </span>
                    <span className="text-sm" style={{ color: '#4E4E4E' }}>{v.unit}</span>
                  </div>
                  <div className="mt-3 h-1 rounded-full" style={{ backgroundColor: '#E0E0E0' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ backgroundColor: v.color, width: `${Math.min((val / v.maxValue) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Modal de gráfico mejorado */}
      {selectedVar && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="rounded-2xl p-6 w-[95%] max-w-6xl shadow-2xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold" style={{ color: selectedVar.color }}>
                    {selectedVar.label}
                  </h2>
                  <button
                    onClick={downloadChart}
                    className="px-2 py-1 rounded text-xs border transition-colors"
                    style={{ 
                      borderColor: selectedVar.color, 
                      color: selectedVar.color,
                      backgroundColor: 'transparent'
                    }}
                  >
                    ↓ Descargar PNG
                  </button>
                </div>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>Análisis temporal - CalidAir</p>
              </div>
              <button
                onClick={() => setSelectedVar(null)}
                className="text-gray-400 hover:text-white text-xl transition-colors ml-4"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Gráfica */}
              <div className="flex-1">
                {/* Botones de rango estilo segmented control */}
                <div className="flex justify-center mb-4">
                  <div className="flex rounded-lg p-1" style={{ backgroundColor: '#374151' }}>
                    {[{key: '24h', label: '24h'}, {key: '7d', label: '7d'}, {key: '1m', label: '30d'}].map(range => (
                      <button
                        key={range.key}
                        onClick={() => setTimeRange(range.key)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                          timeRange === range.key
                            ? 'text-white shadow-sm'
                            : 'hover:bg-gray-600'
                        }`}
                        style={{
                          backgroundColor: timeRange === range.key ? selectedVar.color : 'transparent',
                          color: timeRange === range.key ? '#fff' : '#9CA3AF'
                        }}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    {stats[selectedVar.key] && (
                      <>
                        <ReferenceLine y={stats[selectedVar.key].avg} stroke="#6B7280" strokeDasharray="5 5" />
                        <ReferenceLine y={stats[selectedVar.key].max} stroke="#EF4444" strokeDasharray="2 2" />
                        <ReferenceLine y={stats[selectedVar.key].min} stroke="#10B981" strokeDasharray="2 2" />
                      </>
                    )}
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        if (timeRange === '24h') {
                          return date.toLocaleTimeString('es-ES', { hour: "2-digit", minute: "2-digit", timeZone: 'UTC' });
                        } else {
                          return date.toLocaleDateString('es-ES', { day: "2-digit", month: "2-digit", timeZone: 'UTC' });
                        }
                      }}
                    />
                    <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: "#374151", 
                        border: "none", 
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
                      }}
                      labelStyle={{ color: "#E4E7EB" }}
                      formatter={(value) => [`${value.toFixed(2)} ${selectedVar.unit}`, selectedVar.label]}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleString('es-ES', { 
                          timeZone: 'UTC',
                          day: '2-digit',
                          month: '2-digit', 
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={selectedVar.key}
                      stroke={selectedVar.color}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: selectedVar.color }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Panel de estadísticas */}
              {stats[selectedVar.key] && (
                <div className="w-full lg:w-64 space-y-4">
                  <h3 className="text-lg font-semibold" style={{ color: '#E4E7EB' }}>Estadísticas</h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#374151' }}>
                      <div className="text-sm" style={{ color: '#9CA3AF' }}>Máximo</div>
                      <div className="text-xl font-bold" style={{ color: '#EF4444' }}>
                        {stats[selectedVar.key].max.toFixed(2)} {selectedVar.unit}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#374151' }}>
                      <div className="text-sm" style={{ color: '#9CA3AF' }}>Promedio</div>
                      <div className="text-xl font-bold" style={{ color: '#6B7280' }}>
                        {stats[selectedVar.key].avg.toFixed(2)} {selectedVar.unit}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#374151' }}>
                      <div className="text-sm" style={{ color: '#9CA3AF' }}>Mínimo</div>
                      <div className="text-xl font-bold" style={{ color: '#10B981' }}>
                        {stats[selectedVar.key].min.toFixed(2)} {selectedVar.unit}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Footer con branding CalidAir */}
        <div className="mt-12 pt-8 border-t text-center" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3C672C' }}>
              <span className="text-white font-bold text-xs">CA</span>
            </div>
            <span className="text-sm font-medium" style={{ color: '#3C672C' }}>CalidAir</span>
          </div>
          <p className="text-xs" style={{ color: '#4E4E4E' }}>
            Datos proporcionados por sensores CalidAir • Sistema de monitoreo ambiental
          </p>
        </div>
        </div>
      </Header>
    </div>
  );
}

export default CalidAirDashboard;