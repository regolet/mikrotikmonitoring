import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import Settings from './components/Settings';
import Groups from './components/Groups';
import Dashboard from './components/Dashboard';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function Navigation() {
  const location = useLocation();
  const [routers, setRouters] = useState([]);
  const [activeRouter, setActiveRouter] = useState('');

  useEffect(() => {
    // Fetch routers for the dropdown
    fetch('http://localhost:80/api/routers')
      .then(res => res.json())
      .then(data => {
        if (data.routers) {
          setRouters(data.routers);
          if (data.routers.length > 0) {
            setActiveRouter(data.routers[0].id);
          }
        }
      })
      .catch(err => console.error('Error fetching routers:', err));
  }, []);

  const handleRouterChange = (routerId) => {
    setActiveRouter(routerId);
    // You can add logic here to change the active router globally
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">MikroTik Monitoring</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} 
                to="/"
              >
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/groups' ? 'active' : ''}`} 
                to="/groups"
              >
                Groups
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`} 
                to="/settings"
              >
                Settings
              </Link>
            </li>
          </ul>
          <ul className="navbar-nav">
            <li className="nav-item">
              <div className="d-flex align-items-center">
                <label htmlFor="router-selector" className="text-light me-2">Router:</label>
                <select 
                  id="router-selector" 
                  className="form-select form-select-sm" 
                  style={{width: 'auto'}}
                  value={activeRouter}
                  onChange={(e) => handleRouterChange(e.target.value)}
                >
                  {routers.length === 0 ? (
                    <option value="">Loading...</option>
                  ) : (
                    routers.map(router => (
                      <option key={router.id} value={router.id}>
                        {router.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <div id="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/groups" element={<Groups />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
