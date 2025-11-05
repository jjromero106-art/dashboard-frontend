import React from 'react';
import Header from './Header';

function Home({ onSelectBrand }) {
  return (
    <div className="min-h-screen">
      <Header selectedPage="home" onSelectBrand={onSelectBrand}>
        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-20rem)] p-6">
          <div className="text-center max-w-4xl">
            <h1 className="text-5xl font-bold mb-6" style={{ color: '#E4E7EB' }}>
              Dashboard de Monitoreo Ambiental
            </h1>
          </div>
        </div>
      </Header>
    </div>
  );
}

export default Home;