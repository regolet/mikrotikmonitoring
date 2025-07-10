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

// Helper to parse uptime string (e.g., '1d2h3m4s') to total seconds
function parseUptimeToSeconds(uptime) {
  if (!uptime || typeof uptime !== 'string') return 0;
  let total = 0;
  const regex = /(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
  const match = uptime.match(regex);
  if (!match) return 0;
  const [, d, h, m, s] = match.map(x => parseInt(x) || 0);
  total += d * 86400 + h * 3600 + m * 60 + s;
  return total;
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
  // Add sorting state
  const [sortField, setSortField] = useState('downloadMbps');
  const [sortDirection, setSortDirection] = useState('desc');
  // Add at the top:
  const { routers, activeRouterId, handleRouterChange } = useRouter();
  const socket = useSocket();
  const [pppAccounts, setPppAccounts] = useState([]); // all accounts
  const [pppActive, setPppActive] = useState([]); // online accounts
  const [pppOffline, setPppOffline] = useState([]); // offline accounts
  // Add state for offline accounts pagination
  const [offlineRowsPerPage, setOfflineRowsPerPage] = useState(20);
  const [offlinePage, setOfflinePage] = useState(1);
  // Offline table sorting state
  const [offlineSortField, setOfflineSortField] = useState('last_uptime');
  const [offlineSortDirection, setOfflineSortDirection] = useState('desc');

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
            // SWAP: downloadMbps = txDiff, uploadMbps = rxDiff
            downloadMbps = ((txDiff * 8) / dt / 1e6).toFixed(2);
            uploadMbps = ((rxDiff * 8) / dt / 1e6).toFixed(2);
            // Sum for total speeds
            totalDownload += txDiff > 0 ? (txDiff * 8) / dt : 0;
            totalUpload += rxDiff > 0 ? (rxDiff * 8) / dt : 0;
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

  // Sort function
  const sortRows = (rowsToSort, field, direction) => {
    return [...rowsToSort].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      // Handle numeric values (speeds)
      if (field === 'downloadMbps' || field === 'uploadMbps') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
        if (isNaN(aVal)) aVal = 0;
        if (isNaN(bVal)) bVal = 0;
      } else if (field === 'uptime') {
        // Sort uptime as seconds
        aVal = parseUptimeToSeconds(aVal);
        bVal = parseUptimeToSeconds(bVal);
      } else {
        // Handle string values
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  };

  // Handle sort click
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortField !== field) return <i className="bi bi-arrow-down-up text-muted"></i>;
    return sortDirection === 'asc' 
      ? <i className="bi bi-arrow-up text-primary"></i>
      : <i className="bi bi-arrow-down text-primary"></i>;
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

  // Fetch PPP accounts summary (all, online, offline)
  useEffect(() => {
    const fetchAccountsSummary = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/ppp_accounts_summary?router_id=${activeRouterId}`);
        if (res.data.success) {
          setPppAccounts(res.data.all_accounts || []);
          setPppActive(res.data.online_accounts || []);
          setPppOffline(res.data.offline_accounts || []);
          setStats(res.data.statistics || {}); // <-- Use statistics from backend
        }
      } catch (e) {
        // handle error
      }
    };
    if (activeRouterId) fetchAccountsSummary();
  }, [activeRouterId]);

  // Auto-refresh PPP accounts summary every 5 seconds
  useEffect(() => {
    if (!activeRouterId) return;
    let isMounted = true;
    const fetchAccountsSummary = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/ppp_accounts_summary?router_id=${activeRouterId}`);
        if (isMounted && res.data.success) {
          setPppAccounts(res.data.all_accounts || []);
          setPppActive(res.data.online_accounts || []);
          setPppOffline(res.data.offline_accounts || []);
          setStats(res.data.statistics || {});
        }
      } catch (e) {
        // handle error
      }
    };
    fetchAccountsSummary();
    const interval = setInterval(fetchAccountsSummary, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeRouterId]);

  // Use the accounts from the summary endpoint
  // onlineAccounts and offlineAccounts are now computed on the backend
  const onlineAccounts = pppActive; // These are the online accounts from the summary
  const offlineAccounts = pppOffline; // These are the offline accounts from the summary

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

  // Filter, sort, and paginate rows
  const filteredRows = rows.filter(row => {
    const searchLower = search.toLowerCase();
    return (
      row.name.toLowerCase().includes(searchLower) ||
      row.profile.toLowerCase().includes(searchLower) ||
      row.status.toLowerCase().includes(searchLower) ||
      String(row.downloadMbps).toLowerCase().includes(searchLower) ||
      String(row.uploadMbps).toLowerCase().includes(searchLower) ||
      String(row.address).toLowerCase().includes(searchLower) ||
      String(row.uptime).toLowerCase().includes(searchLower)
    );
  });
  
  // Sort filtered rows
  const sortedRows = sortRows(filteredRows, sortField, sortDirection);
  
  const totalPages = rowsPerPage > 0 ? Math.ceil(sortedRows.length / rowsPerPage) : 1;
  const paginatedRows = rowsPerPage > 0
    ? sortedRows.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : sortedRows;

  // Update onlineRows and offlineRows logic
  const paginatedOnlineAccounts = rowsPerPage > 0
    ? onlineAccounts.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : onlineAccounts;
  
  // Split rows into online and offline
  // const onlineRows = sortedRows.filter(row => row.status === 'Running');
  // const offlineRows = sortedRows.filter(row => row.status !== 'Running');

  // Build a set of online account names
  const onlineAccountNames = new Set(sortedRows.filter(row => row.status === 'Running').map(row => row.name));
  // All account names
  const allAccountNames = sortedRows.map(row => row.name);
  // Offline accounts: those not in the online set
  // const offlineAccounts = sortedRows.filter(row => !onlineAccountNames.has(row.name)); // This line is now redundant

  // For offline table pagination
  const offlineTotalPages = offlineRowsPerPage > 0 ? Math.ceil(offlineAccounts.length / offlineRowsPerPage) : 1;

  // Helper to parse date string
  function parseDate(dateStr) {
    if (!dateStr || dateStr === '-') return null;
    // Accepts 'YYYY-MM-DD HH:mm:ss'
    const parts = dateStr.split(/[- :]/);
    if (parts.length < 6) return null;
    // Parse as local time (not UTC)
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  }

  // Compute downtime live for each offline account
  const offlineAccountsWithDowntime = offlineAccounts.map(acc => {
    let downtime = '-';
    const lastUptimeDate = parseDate(acc.last_uptime);
    if (lastUptimeDate) {
      const now = new Date();
      downtime = Math.floor((now.getTime() - lastUptimeDate.getTime()) / 1000);
      if (downtime < 0) downtime = 0;
    }
    return { ...acc, downtime };
  });

  // Sort offline accounts
  const sortedOfflineAccounts = [...offlineAccountsWithDowntime].sort((a, b) => {
    let aVal = a[offlineSortField];
    let bVal = b[offlineSortField];
    if (offlineSortField === 'downtime') {
      aVal = aVal === '-' ? -1 : parseInt(aVal, 10);
      bVal = bVal === '-' ? -1 : parseInt(bVal, 10);
    } else if (offlineSortField === 'last_uptime') {
      aVal = parseDate(aVal)?.getTime() || 0;
      bVal = parseDate(bVal)?.getTime() || 0;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }
    if (offlineSortDirection === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  // Paginate sorted offline accounts
  const paginatedOfflineAccounts = offlineRowsPerPage > 0
    ? sortedOfflineAccounts.slice((offlinePage - 1) * offlineRowsPerPage, offlinePage * offlineRowsPerPage)
    : sortedOfflineAccounts;

  // Helper for sort indicator
  const getOfflineSortIndicator = (field) => {
    if (offlineSortField !== field) return <i className="bi bi-arrow-down-up text-muted"></i>;
    return offlineSortDirection === 'asc'
      ? <i className="bi bi-arrow-up text-primary"></i>
      : <i className="bi bi-arrow-down text-primary"></i>;
  };

  // Helper to format downtime in y,M,w,d,h,m,s
  function formatDowntime(seconds) {
    if (seconds === '-' || seconds == null || isNaN(seconds)) return '-';
    seconds = parseInt(seconds, 10);
    if (seconds < 0) return '-';
    const y = Math.floor(seconds / (365 * 24 * 3600));
    seconds %= 365 * 24 * 3600;
    const M = Math.floor(seconds / (30 * 24 * 3600));
    seconds %= 30 * 24 * 3600;
    const w = Math.floor(seconds / (7 * 24 * 3600));
    seconds %= 7 * 24 * 3600;
    const d = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const h = Math.floor(seconds / 3600);
    seconds %= 3600;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    let str = '';
    if (y) str += `${y}y `;
    if (M) str += `${M}M `;
    if (w) str += `${w}w `;
    if (d) str += `${d}d `;
    if (h) str += `${h}h `;
    if (m) str += `${m}m `;
    if (s || !str) str += `${s}s`;
    return str.trim();
  }

  // Render table (version1 style)
  return (
    <div className="container-fluid mt-4">
      {/* Network Summary */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="mb-0">Network Summary</h3>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {/* Auto-refresh controls omitted (always 5s) */}
            <small className="text-muted">Last updated: <span>{lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}</span></small>
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
                  <h5 className="mb-0 text-info" style={{ fontSize: '1.25rem' }}>{totalUploadMbps} Mbps</h5>
                  <p className="mb-0">Total Upload</p>
                </div>
              </div>
            </div>
            <div className="stat-card-wrapper">
              <div className="stat-card horizontal-card bg-primary bg-opacity-10">
                <div className="icon-container"><i className="bi bi-cloud-arrow-down text-primary"></i></div>
                <div className="card-content">
                  <h5 className="mb-0 text-primary" style={{ fontSize: '1.25rem' }}>{totalDownloadMbps} Mbps</h5>
                  <p className="mb-0">Total Download</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PPPoE Interfaces Table Section */}
      <div className="row">
        <div className="col-lg-7 col-12 mb-4 mb-lg-0">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Online Accounts</h5>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search..."
                  style={{ width: 200 }}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                <select
                  className="form-select form-select-sm"
                  style={{ width: 120 }}
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
                      <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }} className="sortable-header">Name {getSortIndicator('name')}</th>
                      <th onClick={() => handleSort('profile')} style={{ cursor: 'pointer' }} className="sortable-header">Profile Plan {getSortIndicator('profile')}</th>
                      <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }} className="sortable-header">Status {getSortIndicator('status')}</th>
                      <th onClick={() => handleSort('uploadMbps')} style={{ cursor: 'pointer' }} className="sortable-header">Upload Speed (Mbps) {getSortIndicator('uploadMbps')}</th>
                      <th onClick={() => handleSort('downloadMbps')} style={{ cursor: 'pointer' }} className="sortable-header">Download Speed (Mbps) {getSortIndicator('downloadMbps')}</th>
                      <th onClick={() => handleSort('address')} style={{ cursor: 'pointer' }} className="sortable-header">Address {getSortIndicator('address')}</th>
                      <th onClick={() => handleSort('uptime')} style={{ cursor: 'pointer' }} className="sortable-header">Uptime {getSortIndicator('uptime')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-muted">No online accounts found.</td></tr>
                    ) : (
                      paginatedRows.map((row, idx) => (
                        <tr key={row.name + '-' + idx}>
                          <td>{row.name}</td>
                          <td>{row.profile}</td>
                          <td><span className={`badge bg-success`}>Online</span></td>
                          <td>{row.uploadMbps} Mbps</td>
                          <td>{row.downloadMbps} Mbps</td>
                          <td>{row.address}</td>
                          <td>{row.uptime}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination (if needed) */}
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
        <div className="col-lg-5 col-12">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Offline Accounts</h5>
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 120 }}
                  value={offlineRowsPerPage}
                  onChange={e => { setOfflineRowsPerPage(Number(e.target.value)); setOfflinePage(1); }}
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
                      <th onClick={() => {
                        if (offlineSortField === 'name') setOfflineSortDirection(offlineSortDirection === 'asc' ? 'desc' : 'asc');
                        else { setOfflineSortField('name'); setOfflineSortDirection('asc'); }
                      }} style={{ cursor: 'pointer' }}>Name {getOfflineSortIndicator('name')}</th>
                      <th onClick={() => {
                        if (offlineSortField === 'status') setOfflineSortDirection(offlineSortDirection === 'asc' ? 'desc' : 'asc');
                        else { setOfflineSortField('status'); setOfflineSortDirection('asc'); }
                      }} style={{ cursor: 'pointer' }}>Status {getOfflineSortIndicator('status')}</th>
                      <th onClick={() => {
                        if (offlineSortField === 'last_uptime') setOfflineSortDirection(offlineSortDirection === 'asc' ? 'desc' : 'asc');
                        else { setOfflineSortField('last_uptime'); setOfflineSortDirection('desc'); }
                      }} style={{ cursor: 'pointer' }}>Last Uptime {getOfflineSortIndicator('last_uptime')}</th>
                      <th onClick={() => {
                        if (offlineSortField === 'downtime') setOfflineSortDirection(offlineSortDirection === 'asc' ? 'desc' : 'asc');
                        else { setOfflineSortField('downtime'); setOfflineSortDirection('desc'); setOfflinePage(1); }
                      }} style={{ cursor: 'pointer' }}>Downtime {getOfflineSortIndicator('downtime')}</th>
                      {/* Row menu/actions column can be added here if needed */}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOfflineAccounts.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted">No offline accounts found.</td></tr>
                    ) : (
                      paginatedOfflineAccounts.map((acc, idx) => (
                        <tr key={acc.name + '-' + idx}>
                          <td>{acc.name}</td>
                          <td>
                            {acc.status === 'Disabled' ? (
                              <span className="badge bg-secondary">Disabled</span>
                            ) : (
                              <span className="badge bg-danger">Offline</span>
                            )}
                          </td>
                          <td>{acc.last_uptime || '-'}</td>
                          <td>{formatDowntime(acc.downtime)}</td>
                          {/* Action buttons can be added here if needed */}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination for offline table */}
              {offlineRowsPerPage > 0 && offlineTotalPages > 1 && (
                <nav>
                  <ul className="pagination pagination-sm justify-content-end">
                    {Array.from({ length: offlineTotalPages }, (_, i) => (
                      <li key={i} className={`page-item${offlinePage === i + 1 ? ' active' : ''}`}>
                        <button className="page-link" onClick={() => setOfflinePage(i + 1)}>{i + 1}</button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 