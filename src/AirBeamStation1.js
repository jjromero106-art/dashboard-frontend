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
import html2canvas from "html2canvas";
import Header from './Header';
import { supabaseAirBeam } from './supabaseAirBeamClient';

function AirBeamStation1({ onBack, onSelectStation }) {
  const [latestData, setLatestData] = useState(null);
  const [previousData, setPreviousData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [selectedVar, setSelectedVar] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [stats, setStats] = useState({});
  const cache = useRef({});

  const stationId = 'airbeam3_1';
  const stationName = 'Estación 1';
  const sensorId = 'AirBeam3-40915110766c';

  const variables = useMemo(() => [
    { key: "temperature", label: "Temperatura", unit: "°C", color: "#FF7A00", category: "environmental", maxValue: 50 },
    { key: "humidity", label: "Humedad", unit: "%", color: "#4DA8DA", category: "environmental", maxValue: 100 },
    { key: "pm1", label: "PM1", unit: "µg/m³", color: "#FFD166", category: "pollutants", maxValue: 100 },
    { key: "pm25", label: "PM2.5", unit: "µg/m³", color: "#FFD166", category: "pollutants", maxValue: 150 },
    { key: "pm10", label: "PM10", unit: "µg/m³", color: "#FFD166", category: "pollutants", maxValue: 250 },
  ], []);

  const categories = {
    environmental: { title: "Condiciones Ambientales" },
    pollutants: { title: "Contaminantes" }
  };

  useEffect(() => {
    const fetchLatestData = async () => {
      const { data } = await supabaseAirBeam
        .from(stationId)
        .select('*')
        .not('timestamp', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(2);
      
      if (!data || data.length === 0) {
        setLatestData([0, 0, 0, 0, 0, new Date().toISOString()]);
        return;
      }
      
      const latest = data[0];
      const previous = data[1];
      
      const formatted = [
        latest.temperature || 0,
        latest.humidity || 0, 
        latest.pm1 || 0,
        latest.pm25 || 0,
        latest.pm10 || 0,
        latest.timestamp
      ];
      
      const prevFormatted = previous ? [
        previous.temperature || 0,
        previous.humidity || 0, 
        previous.pm1 || 0,
        previous.pm25 || 0,
        previous.pm10 || 0,
      ] : null;
      
      setLatestData(formatted);
      setPreviousData(prevFormatted);
      setLastSyncTime(latest.timestamp);
    };

    fetchLatestData();
    const interval = setInterval(fetchLatestData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchChartDataByRange = useCallback(async (range, forceRefresh = false) => {
    const cacheKey = `station1_${range}`;
    const cacheTimeKey = `station1_${range}_time`;
    const CACHE_DURATION = {
      '24h': 5 * 60 * 1000,
      '7d': 15 * 60 * 1000,
      '1m': 30 * 60 * 1000
    };
    
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
    
    if (cache.current[cacheKey] && !forceRefresh) {
      setChartData(cache.current[cacheKey].data);
      setStats(cache.current[cacheKey].stats);
      return;
    }
    
    let hoursBack;
    switch (range) {
      case '24h': hoursBack = 24; break;
      case '7d': hoursBack = 168; break;
      case '1m': hoursBack = 720; break;
      default: hoursBack = 24;
    }
    
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabaseAirBeam
      .from(stationId)
      .select('*')
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: true });
    
    if (data && !error && data.length > 0) {
      const formatted = data.map(d => ({
        timestamp: d.timestamp,
        temperature: parseFloat(d.temperature) || 0,
        humidity: parseFloat(d.humidity) || 0,
        pm1: parseFloat(d.pm1) || 0,
        pm25: parseFloat(d.pm25) || 0,
        pm10: parseFloat(d.pm10) || 0,
      }));
      
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
      cache.current[cacheKey] = cacheData;
      
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
      } catch (e) {}
      
      setChartData(formatted);
      setStats(newStats);
    } else {
      setChartData([]);
      setStats({});
    }
  }, [variables]);

  useEffect(() => {
    fetchChartDataByRange(timeRange);
    
    let updateInterval;
    switch (timeRange) {
      case '24h': updateInterval = 300000; break;
      case '7d': updateInterval = 900000; break;
      case '1m': updateInterval = 1800000; break;
      default: updateInterval = 300000;
    }
    
    const interval = setInterval(() => {
      fetchChartDataByRange(timeRange, true);
    }, updateInterval);
    
    return () => clearInterval(interval);
  }, [timeRange, fetchChartDataByRange]);

  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return { symbol: "—", change: 0, color: "#9CA3AF" };
    const diff = current - previous;
    const symbol = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
    const color = diff > 0 ? "#10B981" : diff < 0 ? "#EF4444" : "#9CA3AF";
    return { symbol, change: Math.abs(diff), color };
  };

  const downloadChart = () => {
    if (!chartData.length || !selectedVar) return;
    
    const firstDate = new Date(chartData[0].timestamp).toLocaleDateString('es-ES');
    const lastDate = new Date(chartData[chartData.length - 1].timestamp).toLocaleDateString('es-ES');
    const filename = `AirBeam_${stationName}_${selectedVar.label}_${timeRange}_${firstDate}_${lastDate}.png`;
    
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
      link.href = canvas.toDataURL();
      link.click();
    });
  };



  return (
    <div className="min-h-screen">
      <Header selectedPage="airbeam" onSelectBrand={onBack}>
        <div className="min-h-screen p-6" style={{ backgroundColor: '#FFFFFF', color: '#4E4E4E' }}>
          {/* Encabezado */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
                <span className="text-white font-bold text-sm">AB</span>
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold" style={{ color: '#2563EB' }}>{stationName}</h1>
                <p className="text-sm" style={{ color: '#4E4E4E' }}>Monitoreo de Calidad del Aire</p>
              </div>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {['airbeam3_1', 'airbeam3_2', 'airbeam3_3', 'airbeam3_4', 'airbeam3_5'].map((id, idx) => (
                <button
                  key={id}
                  onClick={() => onSelectStation && onSelectStation(id)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    id === stationId ? 'shadow-md' : 'hover:shadow-sm'
                  }`}
                  style={{
                    backgroundColor: id === stationId ? '#2563EB' : '#F3F4F6',
                    color: id === stationId ? 'white' : '#6B7280'
                  }}
                >
                  E{idx + 1}
                </button>
              ))}
            </div>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Última actualización: {lastSyncTime ? new Date(lastSyncTime).toLocaleString('es-ES', { timeZone: 'UTC' }) : "—"}
            </p>
          </div>

          {/* Tarjetas por categorías */}
          {Object.entries(categories).map(([categoryKey, category]) => (
            <div key={categoryKey} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{category.title}</h2>
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

          {/* Modal de gráfico */}
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
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      {stationName} - AirBeam3
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedVar(null)}
                    className="text-gray-400 hover:text-white text-xl transition-colors ml-4"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
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
        </div>
      </Header>
    </div>
  );
}

export default AirBeamStation1;