import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:80/api';

function Dashboard() {
  const [status, setStatus] = useState(null);
  const [resources, setResources] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [pppData, setPppData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('-');

  useEffect(() => {
    fetchDashboardData();
    let interval;
    if (refreshInterval > 0) {
      interval = setInterval(fetchDashboardData, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshInterval]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statusResponse, resourcesResponse, interfacesResponse, pppActiveResponse, pppAccountsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/status`),
        axios.get(`${API_BASE_URL}/resources`),
        axios.get(`${API_BASE_URL}/interfaces`),
        axios.get(`${API_BASE_URL}/ppp_active`),
        axios.get(`${API_BASE_URL}/ppp_accounts`)
      ]);

      setStatus(statusResponse.data);
      setResources(resourcesResponse.data.resources);
      setInterfaces(interfacesResponse.data.interfaces || []);
      setPppData({
        active: pppActiveResponse.data.ppp_active || [],
        accounts: pppAccountsResponse.data.ppp_accounts || []
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshIntervalChange = (interval) => {
    setRefreshInterval(parseInt(interval));
  };

  const handleRefreshNow = () => {
    fetchDashboardData();
  };

  if (loading && !status) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid mt-4">
        <div className="alert alert-danger" role="alert">
          Error: {error}
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalAccounts = pppData.accounts?.length || 0;
  const onlineAccounts = pppData.active?.length || 0;
  const offlineAccounts = totalAccounts - onlineAccounts;
  const enabledAccounts = pppData.accounts?.filter(acc => acc.profile !== 'disabled')?.length || 0;
  const disabledAccounts = totalAccounts - enabledAccounts;
  
  // Calculate total speeds
  const totalUploadSpeed = pppData.active?.reduce((sum, acc) => sum + (parseFloat(acc['limit-bytes-out']) || 0), 0) || 0;
  const totalDownloadSpeed = pppData.active?.reduce((sum, acc) => sum + (parseFloat(acc['limit-bytes-in']) || 0), 0) || 0;

  return (
    <div className="container-fluid mt-4">
      {/* Network Summary */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="mb-0">Network Summary</h3>
          <div className="d-flex flex-wrap gap-2">
            <div className="btn-group">
              <button type="button" className="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                Auto-refresh: <span id="refresh-interval-display">
                  {refreshInterval === 0 ? 'Off' : 
                   refreshInterval === 5 ? '5 seconds' :
                   refreshInterval === 10 ? '10 seconds' :
                   refreshInterval === 30 ? '30 seconds' :
                   refreshInterval === 60 ? '1 minute' : `${refreshInterval} seconds`}
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={() => handleRefreshIntervalChange(0)}>Off</a></li>
                <li><a className="dropdown-item" href="#" onClick={() => handleRefreshIntervalChange(5)}>5 seconds</a></li>
                <li><a className="dropdown-item" href="#" onClick={() => handleRefreshIntervalChange(10)}>10 seconds</a></li>
                <li><a className="dropdown-item" href="#" onClick={() => handleRefreshIntervalChange(30)}>30 seconds</a></li>
                <li><a className="dropdown-item" href="#" onClick={() => handleRefreshIntervalChange(60)}>1 minute</a></li>
              </ul>
            </div>
            <button className="btn btn-primary" onClick={handleRefreshNow}>
              <i className="bi bi-arrow-clockwise"></i> Refresh Now
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="seven-cards-row">
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card">
                <div className="icon-container">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="card-content">
                  <h3 className="mb-0">{totalAccounts}</h3>
                  <p className="mb-0">Total Accounts</p>
                </div>
              </div>
            </div>
            
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-success bg-opacity-10">
                <div className="icon-container">
                  <i className="bi bi-wifi text-success"></i>
                </div>
                <div className="card-content">
                  <h3 className="mb-0 text-success">{onlineAccounts}</h3>
                  <p className="mb-0">Online</p>
                </div>
              </div>
            </div>
            
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-danger bg-opacity-10">
                <div className="icon-container">
                  <i className="bi bi-wifi-off text-danger"></i>
                </div>
                <div className="card-content">
                  <h3 className="mb-0 text-danger">{offlineAccounts}</h3>
                  <p className="mb-0">Offline</p>
                </div>
              </div>
            </div>
            
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-info bg-opacity-10">
                <div className="icon-container">
                  <i className="bi bi-toggle-on text-info"></i>
                </div>
                <div className="card-content">
                  <h3 className="mb-0 text-info">{enabledAccounts}</h3>
                  <p className="mb-0">Enabled</p>
                </div>
              </div>
            </div>
            
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-secondary bg-opacity-10">
                <div className="icon-container">
                  <i className="bi bi-toggle-off text-secondary"></i>
                </div>
                <div className="card-content">
                  <h3 className="mb-0 text-secondary">{disabledAccounts}</h3>
                  <p className="mb-0">Disabled</p>
                </div>
              </div>
            </div>
            
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-info bg-opacity-10">
                <div className="icon-container">
                  <i className="bi bi-cloud-arrow-up text-info"></i>
                </div>
                <div className="card-content">
                  <h3 className="mb-0 text-info">{formatBytes(totalUploadSpeed)}</h3>
                  <p className="mb-0">Total Upload Speed</p>
                </div>
              </div>
            </div>
            
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-primary bg-opacity-10">
                <div className="icon-container">
                  <i className="bi bi-cloud-arrow-down text-primary"></i>
                </div>
                <div className="card-content">
                  <h3 className="mb-0 text-primary">{formatBytes(totalDownloadSpeed)}</h3>
                  <p className="mb-0">Total Download Speed</p>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-12 text-end">
              <small className="text-muted">Last updated: <span>{lastUpdated}</span></small>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {status && (
        <div className="card mb-4">
          <div className="card-header">
            <h4 className="mb-0">Connection Status</h4>
          </div>
          <div className="card-body">
            <div className={`alert ${status.connected ? 'alert-success' : 'alert-danger'}`}>
              <div className="d-flex align-items-center">
                <i className={`bi ${status.connected ? 'bi-wifi' : 'bi-wifi-off'} me-2`}></i>
                <strong>{status.connected ? 'Connected' : 'Disconnected'}</strong>
              </div>
              {status.router_name && (
                <div className="mt-2">
                  <strong>Router:</strong> {status.router_name} ({status.router_ip}:{status.router_port})
                </div>
              )}
              {status.identity && (
                <div>
                  <strong>Identity:</strong> {status.identity}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* System Resources */}
      {resources && (
        <div className="card mb-4">
          <div className="card-header">
            <h4 className="mb-0">System Resources</h4>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <div className="text-center">
                  <h5>CPU Load</h5>
                  <div className="h3 text-primary">{resources.cpu_load || 'N/A'}%</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <h5>Memory Usage</h5>
                  <div className="h3 text-warning">{resources.memory_usage || 'N/A'}%</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <h5>Free Memory</h5>
                  <div className="h3 text-info">{resources.free_memory || 'N/A'} MB</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <h5>Uptime</h5>
                  <div className="h3 text-success">{resources.uptime || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default Dashboard; 