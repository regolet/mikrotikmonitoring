import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:80/api';

function Dashboard() {
  const [status, setStatus] = useState(null);
  const [resources, setResources] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statusResponse, resourcesResponse, interfacesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/status`),
        axios.get(`${API_BASE_URL}/resources`),
        axios.get(`${API_BASE_URL}/interfaces`)
      ]);

      setStatus(statusResponse.data);
      setResources(resourcesResponse.data.resources);
      setInterfaces(interfacesResponse.data.interfaces || []);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      {/* Connection Status */}
      <div className="status-section">
        <h3>Connection Status</h3>
        {status && (
          <div className={`status-card ${status.connected ? 'connected' : 'disconnected'}`}>
            <div className="status-indicator">
              {status.connected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
            {status.router_name && (
              <div className="router-info">
                <strong>Router:</strong> {status.router_name} ({status.router_ip}:{status.router_port})
              </div>
            )}
            {status.identity && (
              <div className="identity">
                <strong>Identity:</strong> {status.identity}
              </div>
            )}
            {status.current_time && (
              <div className="timestamp">
                <strong>Last Update:</strong> {status.current_time}
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Resources */}
      {resources && (
        <div className="resources-section">
          <h3>System Resources</h3>
          <div className="resources-grid">
            <div className="resource-card">
              <h4>CPU Load</h4>
              <div className="resource-value">{resources.cpu_load || 'N/A'}%</div>
            </div>
            <div className="resource-card">
              <h4>Memory Usage</h4>
              <div className="resource-value">{resources.memory_usage || 'N/A'}%</div>
            </div>
            <div className="resource-card">
              <h4>Free Memory</h4>
              <div className="resource-value">{resources.free_memory || 'N/A'} MB</div>
            </div>
            <div className="resource-card">
              <h4>Uptime</h4>
              <div className="resource-value">{resources.uptime || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Network Interfaces */}
      <div className="interfaces-section">
        <h3>Network Interfaces</h3>
        <div className="interfaces-grid">
          {interfaces.map((iface, index) => (
            <div key={`${iface.name}-${index}`} className="interface-card">
              <h4>{iface.name}</h4>
              <div className="interface-details">
                <div><strong>Type:</strong> {iface.type}</div>
                <div><strong>Status:</strong> {iface.running ? '🟢 Running' : '🔴 Down'}</div>
                {iface.address && (
                  <div><strong>Address:</strong> {iface.address}</div>
                )}
                {iface.mac_address && (
                  <div><strong>MAC:</strong> {iface.mac_address}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {interfaces.length === 0 && (
        <div className="no-interfaces">
          <p>No interfaces found or unable to fetch interface data.</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard; 