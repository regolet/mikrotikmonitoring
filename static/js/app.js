// SPA Navigation
function showSection(sectionId) {
    // Hide all sections
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('groups-section').style.display = 'none';
    document.getElementById('settings-section').style.display = 'none';
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`#${sectionId.replace('-section', '-tab')}`).classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
    // Set initial section based on URL
    const path = window.location.pathname;
    if (path === '/groups') {
        showSection('groups-section');
    } else if (path === '/settings') {
        showSection('settings-section');
    } else {
        showSection('dashboard-section');
    }
    // Navigation event listeners
    document.getElementById('dashboard-tab').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('dashboard-section');
        history.pushState({}, '', '/');
    });
    document.getElementById('groups-tab').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('groups-section');
        history.pushState({}, '', '/groups');
    });
    document.getElementById('settings-tab').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('settings-section');
        history.pushState({}, '', '/settings');
    });
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const path = window.location.pathname;
        if (path === '/' || path === '') {
            showSection('dashboard-section');
        } else if (path === '/groups') {
            showSection('groups-section');
        } else if (path === '/settings') {
            showSection('settings-section');
        }
    });
    // Placeholders for section logic
    document.getElementById('dashboard-section').innerHTML = '<div class="alert alert-info">Dashboard content will load here.</div>';
    document.getElementById('groups-section').innerHTML = '<div class="alert alert-info">Groups content will load here.</div>';
    document.getElementById('settings-section').innerHTML = '<div class="alert alert-info">Settings content will load here.</div>';
}); 