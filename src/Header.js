import React from 'react';
import Footer from './Footer';

function Header({ selectedPage, onSelectBrand, children }) {
  return (
    <>
      {/* Franja Superior Gobierno */}
      <div className="h-12 flex items-center" style={{ backgroundColor: '#3366CC' }}>
        <a 
          href="https://www.gov.co/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="transition-opacity duration-300 hover:opacity-70"
          style={{ marginLeft: '5vw' }}
        >
          <img 
            src="/images/logo-gobierno.png" 
            alt="Gobierno de Colombia" 
            style={{ width: '111.89px', height: '27px' }}
          />
        </a>
      </div>

      {/* Header Secretaría de Ambiente */}
      <header id="banner" role="banner" className="header" style={{ height: '259.31px' }}>
        <div className="container">
          <div className="logos-header">
            <div className="buscador">
              <p>&nbsp;</p>
              <div className="gsc-control-cse gsc-control-cse-es">
                <div className="gsc-control-wrapper-cse">
                  <form className="gsc-search-box gsc-search-box-tools" acceptCharset="utf-8">
                    <table cellSpacing="0" cellPadding="0" role="presentation" className="gsc-search-box">
                      <tbody>
                        <tr>
                          <td className="gsc-input">
                            <div className="gsc-input-box" id="gsc-iw-id1">
                              <table cellSpacing="0" cellPadding="0" role="presentation" id="gs_id50" className="gstl_50 gsc-input" style={{width: '100%', padding: '0px'}}>
                                <tbody>
                                  <tr>
                                    <td id="gs_tti50" className="gsib_a">
                                      <input 
                                        autoComplete="off" 
                                        type="text" 
                                        size="10" 
                                        className="gsc-input" 
                                        name="search" 
                                        title="buscar" 
                                        aria-label="buscar" 
                                        id="gsc-i-id1"
                                        style={{
                                          width: '100%', 
                                          padding: '0px', 
                                          border: 'none', 
                                          margin: '0px', 
                                          height: 'auto', 
                                          background: 'url("https://www.google.com/cse/static/images/1x/es/branding.png") left center no-repeat rgb(255, 255, 255)', 
                                          outline: 'none'
                                        }}
                                        dir="ltr" 
                                        spellCheck="false"
                                      />
                                    </td>
                                    <td className="gsib_b">
                                      <div className="gsst_b" id="gs_st50" dir="ltr">
                                        <button className="gsst_a" style={{display: 'none'}} title="Borrar contenido del cuadro de búsqueda" type="button">
                                          <span className="gscb_a" id="gs_cb50" aria-hidden="true">×</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                          <td className="gsc-search-button">
                            <button className="gsc-search-button gsc-search-button-v2">
                              <svg width="13" height="13" viewBox="0 0 13 13">
                                <title>buscar</title>
                                <path d="m4.8495 7.8226c0.82666 0 1.5262-0.29146 2.0985-0.87438 0.57232-0.58292 0.86378-1.2877 0.87438-2.1144 0.010599-0.82666-0.28086-1.5262-0.87438-2.0985-0.59352-0.57232-1.293-0.86378-2.0985-0.87438-0.8055-0.010599-1.5103 0.28086-2.1144 0.87438-0.60414 0.59352-0.8956 1.293-0.87438 2.0985 0.021197 0.8055 0.31266 1.5103 0.87438 2.1144 0.56172 0.60414 1.2665 0.8956 2.1144 0.87438zm4.4695 0.2115 3.681 3.6819-1.259 1.284-3.6817-3.7 0.0019784-0.69479-0.090043-0.098846c-0.87973 0.76087-1.92 1.1413-3.1207 1.1413-1.3553 0-2.5025-0.46363-3.4417-1.3909s-1.4088-2.0686-1.4088-3.4239c0-1.3553 0.4696-2.4966 1.4088-3.4239 0.9392-0.92727 2.0864-1.3969 3.4417-1.4088 1.3553-0.011889 2.4906 0.45771 3.406 1.4088 0.9154 0.95107 1.379 2.0924 1.3909 3.4239 0 1.2126-0.38043 2.2588-1.1413 3.1385l0.098834 0.090049z"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <img 
            src="/images/sda2025.png" 
            alt="Logo Secretaria de Ambiente" 
          />
          <p>&nbsp;</p>
        </div>
      </header>

      {/* Navbar */}
      <div id="wrap-nav">
        <ul id="menu">
          <li className={selectedPage === 'home' ? 'selected' : ''}>
            <a href="http://localhost:3000/" tabIndex="0">
              <span>Inicio</span>
            </a>
          </li>
          <li className={selectedPage === 'calidair' ? 'selected' : ''}>
            <a href="#" tabIndex="0" onClick={(e) => { e.preventDefault(); onSelectBrand('calidair'); }}>
              <span>CalidAir</span>
            </a>
          </li>
          <li className={selectedPage === 'airbeam' ? 'selected' : ''} style={{ position: 'relative' }}>
            <a href="#" tabIndex="0" onClick={(e) => { e.preventDefault(); onSelectBrand('airbeam'); }}>
              <span>AirBeam</span>
            </a>
          </li>
        </ul>
      </div>
      
      {/* Page Content */}
      {children}
      
      {/* Footer */}
      <Footer />
    </>
  );
}

export default Header;