import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useRouter, useSocket } from '../App';

const API_BASE_URL = 'http://localhost:80/api';

const normalizeName = (name) => {
  if (!name) return '';
  // Remove angle brackets and pppoe- prefix if present
  const match = name.match(/^<?pppoe-?([^>]+)>?$/i);
  if (match && match[1]) return match[1].toLowerCase();
  return name.replace(/[<>]/g, '').replace(/^pppoe-/, '').trim().toLowerCase();
};

// Helper function to format bytes (for stat cards)
function formatBytes(bytes, decimals = 2) {
  if (!bytes || isNaN(bytes)) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const Dashboard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Add state for search, pagination, and stats
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({});
  // Add state for total speeds
  const [totalUploadMbps, setTotalUploadMbps] = useState('0.00');
  const [totalDownloadMbps, setTotalDownloadMbps] = useState('0.00');
  // Add at the top:
  const { routers, activeRouterId, handleRouterChange } = useRouter();
  const socket = useSocket();

  // Helper to process dashboard data and update state
  const processDashboardData = (data) => {
    setStats(data.aggregate_stats || {});
    const pppoeIfaces = (data.pppoe_interfaces || []).filter(i => i.type === 'pppoe-in');
    const accounts = data.ppp_accounts || [];
    const active = data.ppp_active || [];
    // Build maps for fast lookup
    const accountMap = {};
    accounts.forEach(acc => {
      if (acc.name) accountMap[normalizeName(acc.name)] = acc;
      if (acc.username) accountMap[normalizeName(acc.username)] = acc;
    });
    const activeMap = {};
    active.forEach(a => {
      if (a.name) activeMap[normalizeName(a.name)] = a;
    });
    // Build table rows and calculate total speeds
    const now = Date.now();
    let totalUpload = 0;
    let totalDownload = 0;
    const newRows = pppoeIfaces.map(iface => {
      const username = normalizeName(iface.name);
      const acc = accountMap[username] || {};
      const act = activeMap[username] || {};
      // Speed calculation (localStorage, v1 logic)
      const rxBytes = parseFloat(iface['rx-byte'] || 0);
      const txBytes = parseFloat(iface['tx-byte'] || 0);
      const storageKey = `pppoe_stats_${username}`;
      const prevStatsStr = localStorage.getItem(storageKey);
      let downloadMbps = '0.00', uploadMbps = '0.00';
      if (prevStatsStr) {
        try {
          const prevStats = JSON.parse(prevStatsStr);
          const dt = (now - prevStats.t) / 1000;
          if (dt > 0) {
            const rxDiff = rxBytes - prevStats.rx;
            const txDiff = txBytes - prevStats.tx;
            downloadMbps = ((rxDiff * 8) / dt / 1e6).toFixed(2);
            uploadMbps = ((txDiff * 8) / dt / 1e6).toFixed(2);
            // Sum for total speeds
            totalDownload += rxDiff > 0 ? (rxDiff * 8) / dt : 0;
            totalUpload += txDiff > 0 ? (txDiff * 8) / dt : 0;
          }
        } catch {}
      }
      localStorage.setItem(storageKey, JSON.stringify({ rx: rxBytes, tx: txBytes, t: now }));
      return {
        name: username,
        profile: acc.profile || acc.plan || '-',
        status: iface.running === 'true' ? 'Running' : 'Offline',
        downloadMbps,
        uploadMbps,
        address: act.address || '-',
        uptime: act.uptime || '-',
      };
    });
    setRows(newRows);
    setTotalDownloadMbps((totalDownload / 1e6).toFixed(2));
    setTotalUploadMbps((totalUpload / 1e6).toFixed(2));
    setLastUpdated(new Date());
    setLoading(false);
  };

  // Fetch routers and active router on mount
  useEffect(() => {
    const fetchRouters = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/routers`);
        // setRouters(res.data.routers); // Removed as per edit hint
      } catch {}
    };
    const fetchActiveRouter = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/routers/active`);
        // setActiveRouterId(res.data.active_router_id); // Removed as per edit hint
      } catch {}
    };
    fetchRouters();
    fetchActiveRouter();
  }, []);

  // Refetch dashboard data when activeRouterId changes
  useEffect(() => {
    if (!activeRouterId) return;
    setLoading(true);
    setError(null);
    axios.get(`${API_BASE_URL}/dashboard?router_id=${activeRouterId}`)
      .then(res => {
        processDashboardData(res.data);
      })
      .catch(() => setError('Failed to fetch dashboard data'));
    if (!socket) return;
    const handler = (data) => {
      processDashboardData(data);
    };
    socket.on('dashboard_update', handler);
    return () => {
      socket.off('dashboard_update', handler);
    };
  }, [activeRouterId, socket]);

  // Filter and paginate rows
  const filteredRows = rows.filter(row =>
    row.name.toLowerCase().includes(search.toLowerCase()) ||
    row.profile.toLowerCase().includes(search.toLowerCase()) ||
    row.status.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = rowsPerPage > 0 ? Math.ceil(filteredRows.length / rowsPerPage) : 1;
  const paginatedRows = rowsPerPage > 0
    ? filteredRows.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : filteredRows;

  // Render table (version1 style)
  return (
    <div className="container-fluid mt-4">
      {/* Network Summary */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="mb-0">Network Summary</h3>
          <div className="d-flex flex-wrap gap-2">
            {/* Auto-refresh controls omitted (always 5s) */}
          </div>
        </div>
        <div className="card-body">
          <div className="seven-cards-row">
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-light">
                <div className="icon-container"><i className="bi bi-people-fill"></i></div>
                <div className="card-content">
                  <h3 className="mb-0">{stats.total_accounts ?? '-'}</h3>
                  <p className="mb-0">Total Accounts</p>
                </div>
              </div>
            </div>
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-success bg-opacity-10">
                <div className="icon-container"><i className="bi bi-wifi text-success"></i></div>
                <div className="card-content">
                  <h3 className="mb-0 text-success">{stats.online_accounts ?? '-'}</h3>
                  <p className="mb-0">Online</p>
                </div>
              </div>
            </div>
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-danger bg-opacity-10">
                <div className="icon-container"><i className="bi bi-wifi-off text-danger"></i></div>
                <div className="card-content">
                  <h3 className="mb-0 text-danger">{stats.offline_accounts ?? '-'}</h3>
                  <p className="mb-0">Offline</p>
                </div>
              </div>
            </div>
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-info bg-opacity-10">
                <div className="icon-container"><i className="bi bi-toggle-on text-info"></i></div>
                <div className="card-content">
                  <h3 className="mb-0 text-info">{stats.enabled_accounts ?? '-'}</h3>
                  <p className="mb-0">Enabled</p>
                </div>
              </div>
            </div>
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-secondary bg-opacity-10">
                <div className="icon-container"><i className="bi bi-toggle-off text-secondary"></i></div>
                <div className="card-content">
                  <h3 className="mb-0 text-secondary">{stats.disabled_accounts ?? '-'}</h3>
                  <p className="mb-0">Disabled</p>
                </div>
              </div>
            </div>
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-info bg-opacity-10">
                <div className="icon-container"><i className="bi bi-cloud-arrow-up text-info"></i></div>
                <div className="card-content">
                  <h5 className="mb-0 text-info" style={{ fontSize: '1.25rem' }}>{totalDownloadMbps} Mbps</h5>
                  <p className="mb-0">Total Upload</p>
                </div>
              </div>
            </div>
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-primary bg-opacity-10">
                <div className="icon-container"><i className="bi bi-cloud-arrow-down text-primary"></i></div>
                <div className="card-content">
                  <h5 className="mb-0 text-primary" style={{ fontSize: '1.25rem' }}>{totalUploadMbps} Mbps</h5>
                  <p className="mb-0">Total Download</p>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-12 text-end">
              <small className="text-muted">Last updated: <span>{lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</span></small>
            </div>
          </div>
        </div>
      </div>

      {/* PPPoE Interfaces Table Section */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2 flex-grow-1">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search..."
              style={{ maxWidth: 350, width: '100%' }}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <select
              className="form-select form-select-sm"
              value={rowsPerPage}
              onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={0}>All</option>
            </select>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped table-hover table-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Profile Plan</th>
                  <th>Status</th>
                  <th>Download Speed (Mbps)</th>
                  <th>Upload Speed (Mbps)</th>
                  <th>Address</th>
                  <th>Uptime</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted">No PPPoE interfaces found.</td></tr>
                ) : (
                  paginatedRows.map((row, idx) => (
                    <tr key={row.name + '-' + idx}>
                      <td>{row.name}</td>
                      <td>{row.profile}</td>
                      <td><span className={`badge bg-${row.status === 'Running' ? 'success' : 'secondary'}`}>{row.status}</span></td>
                      <td>{row.downloadMbps}</td>
                      <td>{row.uploadMbps}</td>
                      <td>{row.address}</td>
                      <td>{row.uptime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {rowsPerPage > 0 && totalPages > 1 && (
            <nav>
              <ul className="pagination pagination-sm justify-content-end">
                {Array.from({ length: totalPages }, (_, i) => (
                  <li key={i} className={`page-item${page === i + 1 ? ' active' : ''}`}>
                    <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 