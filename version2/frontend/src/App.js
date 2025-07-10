import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Settings from './components/Settings';
import Groups from './components/Groups';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>MikroTik Monitoring v2</h1>
          <nav className="nav-tabs">
            <Link to="/" className="nav-tab">Dashboard</Link>
            <Link to="/settings" className="nav-tab">Settings</Link>
            <Link to="/groups" className="nav-tab">Groups</Link>
          </nav>
        </header>
        
        <main className="App-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/groups" element={<Groups />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
