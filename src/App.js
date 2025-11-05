// === src/App.jsx - Router Principal ===
import React, { useState } from "react";
import Home from "./Home";
import CalidAirDashboard from "./CalidAirDashboard";
import AirBeamDashboard from "./AirBeamDashboard";

// === COMPONENTE PRINCIPAL - ROUTER ===
function App() {
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Función para manejar selección de marca
  const handleBrandSelect = (brandId) => {
    setSelectedBrand(brandId);
  };

  // Función para volver al inicio o cambiar dashboard
  const handleBack = (newBrand) => {
    if (newBrand && newBrand !== selectedBrand) {
      setSelectedBrand(newBrand);
    } else {
      setSelectedBrand(null);
    }
  };

  // Renderizar componente según selección
  if (selectedBrand === 'calidair') {
    return <CalidAirDashboard onBack={handleBack} />;
  }
  
  if (selectedBrand === 'airbeam') {
    return <AirBeamDashboard onBack={handleBack} />;
  }

  // Si no hay selección, mostrar página de inicio
  return <Home onSelectBrand={handleBrandSelect} />;
}

export default App;