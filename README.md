# MikroTik Monitoring System

A comprehensive monitoring solution for MikroTik routers with real-time dashboard, PPP account management, and multi-router support.

## 🚀 Main Application

The main application is located in the `version2/` directory. This is a modern React + Flask application with advanced features:

### Features
- **Real-time PPP Account Monitoring**: Live status of online/offline accounts
- **Network Statistics**: Total accounts, online/offline counts, enabled/disabled status
- **Speed Monitoring**: Real-time upload/download speeds for active connections
- **Multi-router Support**: Manage multiple MikroTik routers
- **Groups & Categories**: Organize accounts into logical groups
- **Modern UI**: React frontend with Bootstrap 5
- **Auto-refresh**: Dashboard updates every 5 seconds
- **Sortable Tables**: Sort by any column
- **Search & Filter**: Find specific accounts quickly

## 📁 Project Structure

```
mikrotik monitoring/
├── version2/                 # Main application (React + Flask)
│   ├── backend/             # Flask API server
│   ├── frontend/            # React application
│   ├── setup_and_run.bat    # Quick setup script
│   └── README.md            # Detailed documentation
├── version1_backup/         # Backup of original simple version
└── README.md               # This file
```

## 🛠️ Quick Start

1. **Navigate to version2**:
   ```bash
   cd version2
   ```

2. **Run the setup script**:
   ```bash
   # Windows
   setup_and_run.bat
   ```

3. **Or manually**:
   ```bash
   # Backend
   cd backend && pip install -r requirements.txt && python app.py
   
   # Frontend (in another terminal)
   cd frontend && npm install && npm start
   ```

4. **Access the dashboard**: http://localhost:3000

## 📖 Documentation

- **Main Documentation**: See `version2/README.md` for detailed setup and usage instructions
- **API Documentation**: Available in the backend code
- **Deployment Guide**: Included in version2 for lightweight deployment packages

## 🔧 Configuration

1. **Add your first router**:
   - Go to Settings → Routers
   - Click "Add Router"
   - Enter router details (IP, username, password)
   - Test connection and save

2. **Set as active router**:
   - Select your router from the dropdown in the navbar
   - The dashboard will automatically load data

## 🚀 Deployment

The version2 includes a deployment system to create lightweight packages:

```bash
cd version2
deploy.bat
```

This creates a `deployment/` folder with a 99.7% size reduction (from ~387MB to ~1MB).

## 📊 Features Overview

### Dashboard
- Real-time PPP account monitoring
- Network statistics and speed monitoring
- Auto-refresh every 5 seconds
- Sortable and searchable tables

### Router Management
- Multi-router support
- Connection testing
- SSL/TLS support
- Active router selection

### Groups & Categories
- Account organization
- Hierarchical category system
- Router-specific groups
- Member management

## 🐛 Troubleshooting

For issues and support:
1. Check the detailed documentation in `version2/README.md`
2. Review the troubleshooting section
3. Test router connectivity manually
4. Check browser console for errors

## 📄 License

This project is released under the MIT License.

---

**Note**: The original simple version has been backed up to `version1_backup/` for reference. The main development and features are now in `version2/`. 