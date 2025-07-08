// SPA Navigation
function showSection(sectionId) {
    // Hide all sections
    document.getElementById('dashboard-page').style.display = 'none';
    document.getElementById('groups-page').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`#${sectionId.replace('-page', '-tab')}`).classList.add('active');
}

// --- Dashboard Data Fetch & Update Logic ---
function getSelectedRouterId() {
    const selector = document.getElementById('router-selector');
    return selector && selector.value ? selector.value : '';
}

function updateDashboardStats(stats) {
    document.getElementById('total-accounts').textContent = stats.total_accounts ?? '-';
    document.getElementById('online-accounts').textContent = stats.online_accounts ?? '-';
    document.getElementById('offline-accounts').textContent = stats.offline_accounts ?? '-';
    document.getElementById('enabled-accounts').textContent = stats.enabled_accounts ?? '-';
    document.getElementById('disabled-accounts').textContent = stats.disabled_accounts ?? '-';
    document.getElementById('last-updated-time').textContent = stats.last_updated ?? '-';
    // Optionally, update upload/download speed if available in the future
}

async function fetchAndUpdateDashboard() {
    const routerId = getSelectedRouterId();
    let url = '/api/pppoe';
    if (routerId) url += `?router_id=${encodeURIComponent(routerId)}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.aggregate_stats) {
            updateDashboardStats(data.aggregate_stats);
        } else {
            updateDashboardStats({});
        }
    } catch (e) {
        updateDashboardStats({});
    }
}

// --- Auto-refresh and Manual Refresh ---
let refreshInterval = 0;
let refreshTimer = null;

function setRefreshInterval(seconds) {
    refreshInterval = seconds;
    document.getElementById('refresh-interval-display').textContent = seconds > 0 ? `${seconds} seconds` : 'Off';
    if (refreshTimer) clearInterval(refreshTimer);
    if (seconds > 0) {
        refreshTimer = setInterval(fetchAndUpdateDashboard, seconds * 1000);
    }
}

// --- Group Modal Dual List Search & Sort Logic ---
let allAvailableAccounts = [];
let allEditAvailableAccounts = [];
let allEditSelectedMembers = [];

function renderAvailableAccounts(list, selectId, searchValue = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    // Filter (list should already be sorted)
    let filtered = list.filter(acc => acc.toLowerCase().includes(searchValue.toLowerCase()));
    select.innerHTML = '';
    filtered.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc;
        opt.textContent = acc;
        select.appendChild(opt);
    });
}

function renderSelectedMembers(list, selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    let sorted = [...list].sort((a, b) => a.localeCompare(b));
    select.innerHTML = '';
    sorted.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc;
        opt.textContent = acc;
        select.appendChild(opt);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Set initial section based on URL
    const path = window.location.pathname;
    if (path === '/groups') {
        showSection('groups-page');
    } else if (path === '/settings') {
        showSection('settings-page');
    } else {
        showSection('dashboard-page');
    }
    // Navigation event listeners
    document.getElementById('dashboard-tab').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('dashboard-page');
        history.pushState({}, '', '/');
    });
    document.getElementById('groups-tab').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('groups-page');
        history.pushState({}, '', '/groups');
    });
    document.getElementById('settings-tab').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('settings-page');
        history.pushState({}, '', '/settings');
    });
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const path = window.location.pathname;
        if (path === '/' || path === '') {
            showSection('dashboard-page');
        } else if (path === '/groups') {
            showSection('groups-page');
        } else if (path === '/settings') {
            showSection('settings-page');
        }
    });
    // Placeholders for section logic
    document.getElementById('dashboard-page').innerHTML = '<div class="alert alert-info">Dashboard content will load here.</div>';
    document.getElementById('groups-page').innerHTML = '<div class="alert alert-info">Groups content will load here.</div>';
    document.getElementById('settings-page').innerHTML = '<div class="alert alert-info">Settings content will load here.</div>';

    // Fetch routers for selector
    fetch('/api/routers').then(res => res.json()).then(data => {
        const selector = document.getElementById('router-selector');
        selector.innerHTML = '';
        if (data.success && Array.isArray(data.routers)) {
            data.routers.forEach(router => {
                const opt = document.createElement('option');
                opt.value = router.id;
                opt.textContent = router.name;
                selector.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No routers';
            selector.appendChild(opt);
        }
    }).then(() => {
        fetchAndUpdateDashboard();
    });
    // Refresh when router changes
    document.getElementById('router-selector').addEventListener('change', fetchAndUpdateDashboard);
    // Manual refresh
    document.getElementById('refresh-now').addEventListener('click', function() {
        fetchAndUpdateDashboard();
    });
    // Auto-refresh options
    document.querySelectorAll('.refresh-option').forEach(opt => {
        opt.addEventListener('click', function(e) {
            e.preventDefault();
            setRefreshInterval(parseInt(this.dataset.interval, 10));
        });
    });
    // Initial fetch
    fetchAndUpdateDashboard();
    setRefreshInterval(5); // Default to 5 seconds

    // --- Add Group Modal: Populate and search ---
    const addGroupModal = document.getElementById('addGroupModal');
    if (addGroupModal) {
        addGroupModal.addEventListener('show.bs.modal', () => {
            // Store and sort the full list of available accounts
            allAvailableAccounts = Array.from(document.getElementById('available-accounts').options).map(opt => opt.value || opt.textContent);
            allAvailableAccounts.sort((a, b) => a.localeCompare(b));
            renderAvailableAccounts(allAvailableAccounts, 'available-accounts');
            document.getElementById('available-accounts-search').value = '';
        });
        document.getElementById('available-accounts-search').addEventListener('input', function() {
            renderAvailableAccounts(allAvailableAccounts, 'available-accounts', this.value);
        });
    }
    // --- Edit Group Modal: Populate and search ---
    const editGroupModal = document.getElementById('editGroupModal');
    if (editGroupModal) {
        editGroupModal.addEventListener('show.bs.modal', () => {
            // Get all accounts and selected members from the DOM or your data source
            const allOptions = Array.from(document.getElementById('edit-available-accounts').options).map(opt => opt.value || opt.textContent);
            allOptions.sort((a, b) => a.localeCompare(b));
            let selectedMembers = [];
            const selectedInput = document.getElementById('edit-group-id');
            if (selectedInput && selectedInput.dataset && selectedInput.dataset.members) {
                try {
                    selectedMembers = JSON.parse(selectedInput.dataset.members);
                } catch {}
            } else {
                selectedMembers = Array.from(document.getElementById('edit-selected-members').options).map(opt => opt.value || opt.textContent);
            }
            allEditSelectedMembers = selectedMembers;
            // Remove selected members from available
            allEditAvailableAccounts = allOptions.filter(acc => !selectedMembers.includes(acc));
            renderAvailableAccounts(allEditAvailableAccounts, 'edit-available-accounts');
            renderSelectedMembers(allEditSelectedMembers, 'edit-selected-members');
            document.getElementById('edit-available-accounts-search').value = '';
        });
        document.getElementById('edit-available-accounts-search').addEventListener('input', function() {
            renderAvailableAccounts(allEditAvailableAccounts, 'edit-available-accounts', this.value);
        });
    }
}); 