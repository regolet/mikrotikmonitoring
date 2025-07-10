# MikroTik Monitoring v2

A modern, real-time monitoring dashboard for MikroTik routers with React frontend and Flask backend.

## 🚀 Features

### Dashboard
- **Real-time PPP Account Monitoring**: Live status of online/offline accounts
- **Network Statistics**: Total accounts, online/offline counts, enabled/disabled status
- **Speed Monitoring**: Real-time upload/download speeds for active connections
- **Auto-refresh**: Dashboard updates every 5 seconds
- **Sortable Tables**: Sort by any column (name, status, speeds, uptime, downtime)
- **Search & Filter**: Find specific accounts quickly
- **Pagination**: Handle large numbers of accounts efficiently

### PPP Account Management
- **Status Detection**: Automatically detects "Disabled" vs "Offline" accounts
- **Downtime Tracking**: Human-readable downtime format (e.g., "2h 3m 4s")
- **Last Uptime**: Shows when accounts were last online
- **Real-time Updates**: Live status changes without page refresh

### Router Management
- **Multi-router Support**: Manage multiple MikroTik routers
- **Connection Testing**: Test router connectivity before adding
- **Active Router Selection**: Switch between routers seamlessly
- **SSL Support**: Secure connections with SSL/TLS

### Groups & Categories
- **Account Grouping**: Organize accounts into logical groups
- **Category Management**: Hierarchical category system
- **Member Management**: Add/remove accounts from groups
- **Router-specific Groups**: Separate groups per router

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Quick Start
1. **Clone/Download** the project
2. **Run the setup script**:
   ```bash
   # Windows
   setup_and_run.bat
   
   # Or manually:
   cd version2
   cd backend && pip install -r requirements.txt
   cd ../frontend && npm install
   ```
3. **Start the servers**:
   ```bash
   # Backend (port 80)
   cd backend && python app.py
   
   # Frontend (port 3000) - in another terminal
   cd frontend && npm start
   ```
4. **Access the dashboard**: http://localhost:3000

### Configuration
1. **Add your first router**:
   - Go to Settings → Routers
   - Click "Add Router"
   - Enter router details (IP, username, password)
   - Test connection
   - Save

2. **Set as active router**:
   - Select your router from the dropdown in the navbar
   - The dashboard will automatically load data

## 🚀 Deployment

### Lightweight Deployment Package
The project includes a deployment system to create lightweight packages for sharing:

**Original size**: ~387 MB (includes `node_modules`)
**Deployment package**: ~1 MB (99.7% size reduction)

### Creating a Deployment Package
```bash
# Run the deployment script
deploy.bat
```

This creates a `deployment/` folder containing:
- All source code (excluding `node_modules`)
- Installation script (`install.bat`)
- Setup script (`setup_and_run.bat`)
- Documentation

### Deploying on Another Computer
1. **Copy the `deployment` folder** to the target machine
2. **Run `install.bat`** to install dependencies
3. **Run `setup_and_run.bat`** to start the application

**Requirements on target machine**:
- Node.js (for npm install)
- Python 3.8+ (for Flask backend)

### Version Control
The project includes `.gitignore` to exclude:
- `node_modules/` (386+ MB of dependencies)
- Build files and logs
- Environment files
- IDE-specific files

## 📊 Dashboard Features

### Network Summary Cards
- **Total Accounts**: All PPP accounts
- **Online**: Currently connected accounts
- **Offline**: Disconnected accounts
- **Enabled**: Active accounts (not disabled)
- **Disabled**: Inactive accounts
- **Total Upload/Download**: Aggregate speeds

### Online Accounts Table
- **Real-time speeds**: Live upload/download speeds
- **Sortable columns**: Click headers to sort
- **Search**: Filter by name, profile, status, etc.
- **Pagination**: Handle large datasets

### Offline Accounts Table
- **Status badges**: "Disabled" (gray) vs "Offline" (red)
- **Downtime tracking**: Human-readable format
- **Last uptime**: When account was last online
- **Auto-refresh**: Updates every 5 seconds
- **Sortable**: By name, status, last uptime, downtime

## 🔧 Technical Details

### Backend (Flask)
- **Port**: 80
- **APIs**: RESTful endpoints for all operations
- **WebSocket**: Real-time updates via Socket.IO
- **RouterOS API**: Direct MikroTik communication
- **Data Storage**: JSON files for configuration

### Frontend (React)
- **Port**: 3000
- **Framework**: React 19 with hooks
- **UI**: Bootstrap 5 + Bootstrap Icons
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **WebSocket**: Socket.IO client

### Key Endpoints
- `/api/ppp_accounts_summary`: PPP account statistics
- `/api/dashboard`: Real-time dashboard data
- `/api/routers`: Router management
- `/api/groups`: Group management
- `/api/categories`: Category management

## 🐛 Troubleshooting

### Common Issues

1. **Backend won't start**:
   - Check if port 80 is available
   - Run as administrator if needed
   - Verify Python dependencies: `pip install -r requirements.txt`

2. **Frontend won't start**:
   - Check Node.js version: `node --version`
   - Install dependencies: `npm install`
   - Check port 3000 availability

3. **Can't connect to router**:
   - Verify router IP and credentials
   - Check firewall settings
   - Ensure RouterOS API is enabled
   - Test with RouterOS WinBox first

4. **No data showing**:
   - Check router connection status
   - Verify PPP accounts exist
   - Check browser console for errors
   - Test API endpoints directly

### Testing
Run the comprehensive test suite:
```bash
python test_system.py
```

## 📁 File Structure
```
version2/
├── backend/
│   ├── app.py              # Flask application
│   ├── router_manager.py   # Router management
│   ├── mikrotik_client.py  # RouterOS API client
│   ├── requirements.txt    # Python dependencies
│   └── data/              # Configuration files
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   ├── package.json       # Node.js dependencies
│   └── public/            # Static files
├── setup_and_run.bat      # Setup script
├── deploy.bat             # Deployment script
├── .gitignore             # Version control exclusions
├── test_system.py         # System tests
└── README.md              # This file
```

## 🔄 Updates & Maintenance

### Adding New Features
1. Backend: Add endpoints in `app.py`
2. Frontend: Create components in `src/components/`
3. Test: Update `test_system.py`

### Data Backup
- Configuration: `backend/data/`
- Groups: `backend/data/groups/`
- Categories: `backend/data/categories.json`

### Deployment Updates
- Update `deploy.bat` if adding new files
- Test deployment package on clean machine
- Update `.gitignore` for new file types

## 📝 Changelog

### v2.0.1
- Added lightweight deployment system
- Created `deploy.bat` for easy sharing
- Added `.gitignore` for version control
- 99.7% size reduction for deployment packages
- Fixed ESLint warnings and errors
- Improved uptime sorting in tables

### v2.0.0
- Complete rewrite with React frontend
- Real-time WebSocket updates
- Enhanced PPP account monitoring
- Multi-router support
- Improved UI/UX with Bootstrap 5
- Comprehensive error handling
- Auto-refresh functionality
- Human-readable downtime format

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the changelog
3. Create an issue on GitHub
4. Contact the maintainers

---

**Note**: The deployment system makes sharing this webapp much easier by reducing the package size from 387MB to just 1MB! 