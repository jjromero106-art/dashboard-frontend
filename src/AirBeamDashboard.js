import React, { useState } from 'react';
import Header from './Header';
import AirBeamStation1 from './AirBeamStation1';
import AirBeamStation2 from './AirBeamStation2';
import AirBeamStation3 from './AirBeamStation3';
import AirBeamStation4 from './AirBeamStation4';
import AirBeamStation5 from './AirBeamStation5';

function AirBeamDashboard({ onBack }) {
  const [selectedStation, setSelectedStation] = useState(() => {
    return localStorage.getItem('airbeam_selected_station') || 'airbeam3_1';
  });

  // Guardar la estación seleccionada en localStorage
  const handleStationSelect = (stationId) => {
    setSelectedStation(stationId);
    localStorage.setItem('airbeam_selected_station', stationId);
  };



  switch (selectedStation) {
    case 'airbeam3_1': return <AirBeamStation1 onBack={onBack} onSelectStation={handleStationSelect} />;
    case 'airbeam3_2': return <AirBeamStation2 onBack={onBack} onSelectStation={handleStationSelect} />;
    case 'airbeam3_3': return <AirBeamStation3 onBack={onBack} onSelectStation={handleStationSelect} />;
    case 'airbeam3_4': return <AirBeamStation4 onBack={onBack} onSelectStation={handleStationSelect} />;
    case 'airbeam3_5': return <AirBeamStation5 onBack={onBack} onSelectStation={handleStationSelect} />;
    default: return <AirBeamStation1 onBack={onBack} onSelectStation={handleStationSelect} />;
  }
}

export default AirBeamDashboard;