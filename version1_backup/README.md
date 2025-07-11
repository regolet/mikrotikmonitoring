# MikroTik Monitoring Web Application

A comprehensive Python web application for monitoring MikroTik routers using Flask and the RouterOS API.

## 🚀 Features

### Core Monitoring
- **Real-time system resources** (CPU, memory, disk usage)
- **Network interfaces** status and traffic statistics
- **PPPoE interfaces** with detailed traffic monitoring
- **Active hotspot users** management
- **DHCP lease information** tracking
- **PPP connections** monitoring and management

### Advanced Features
- **Group management** for organizing accounts
- **Real-time data updates** with configurable refresh intervals
- **Connection testing** before saving settings
- **Data export** functionality (JSON format)
- **Performance monitoring** and statistics
- **Comprehensive logging** with debug mode
- **Responsive web interface** using Bootstrap 5

### Security & Reliability
- **Connection status indicators** with detailed error reporting
- **Health check endpoints** for monitoring
- **Security headers** implementation
- **Configuration validation** and error handling
- **Graceful error recovery** and user feedback

## 📋 Requirements

- **Python 3.7+**
- **MikroTik router** with API access enabled
- **Network connectivity** to your MikroTik router

## 🛠️ Installation

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Configure router settings** (see Configuration section below)
4. **Run the application**:
   ```bash
   python app.py
   ```
5. **Access the web interface** at `http://127.0.0.1:5000/`

## ⚙️ Configuration

### Router Settings
The application uses `settings.json` for configuration. You can also create a `.env` file:

```env
MIKROTIK_HOST=192.168.88.1
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=your_password
MIKROTIK_PORT=8728
```

### MikroTik Router Setup

1. **Enable API service**:
   - Navigate to `IP → Services`
   - Ensure "api" service is enabled
   - For SSL connections, enable "api-ssl" service

2. **Create dedicated API user** (recommended):
   ```
   /tool user-manager user add username=monitor password=secure_pass
   /tool user-manager user print where username=monitor
   ```

3. **Configure firewall rules** (optional but recommended):
   ```
   /ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=YOUR_MONITORING_IP action=accept comment="API Access"
   ```

## 🎯 Usage

### Dashboard
- **Network Summary**: Overview of total accounts, online/offline status
- **PPPoE Interfaces**: Real-time traffic monitoring with pagination
- **System Resources**: CPU, memory, and disk usage with visual indicators
- **Auto-refresh**: Configurable intervals (5s, 10s, 30s, 1min)

### Groups Management
- **Create groups** to organize PPP accounts
- **Monitor group status** with color-coded indicators
- **Track online/offline** accounts within groups

### Settings
- **Test connection** before saving new settings
- **Update router credentials** securely
- **View connection tips** and troubleshooting information

### Data Export
- **Export monitoring data** as JSON files
- **Include all system information** and statistics
- **Timestamped exports** for historical analysis

## 🔧 API Endpoints

### Health & Status
- `GET /api/health` - Check router connectivity
- `POST /api/health` - Test connection with custom parameters
- `GET /api/performance` - Application performance statistics

### Data Export
- `GET /api/export` - Download complete monitoring data

### Logging
- `GET /api/logs` - Retrieve application logs
- `GET /api/logs?clear=true` - Clear log buffer

### PPPoE Monitoring
- `GET /api/pppoe_interfaces` - Real-time PPPoE interface data

## 🐛 Troubleshooting

### Connection Issues
1. **Check router accessibility**:
   ```bash
   ping 192.168.88.1
   telnet 192.168.88.1 8728
   ```

2. **Verify API service**:
   - Login to MikroTik WebFig or WinBox
   - Check `IP → Services → api` is enabled

3. **Test credentials**:
   - Use the "Test Connection" button in Settings
   - Check username/password are correct

4. **Check firewall rules**:
   - Ensure port 8728 (or 8729 for SSL) is accessible
   - Verify source IP is allowed

### Common Errors
- **"Connection refused"**: API service not enabled
- **"Authentication failed"**: Incorrect username/password
- **"No data returned"**: Router doesn't have PPPoE/hotspot configured

### Debug Mode
Enable debug mode to see detailed logs:
```bash
export DEBUG=True
python app.py
```

Then open browser console to view real-time logs.

## 📊 Performance Monitoring

The application tracks:
- **Connection success/failure rates**
- **Average response times**
- **Total API requests**
- **Application uptime**

Access performance data via `/api/performance` endpoint.

## 🔒 Security Features

- **Security headers** implementation
- **Input validation** for all settings
- **Error message sanitization**
- **Session management**
- **Rate limiting** considerations

## 📈 Future Enhancements

- [ ] **Email notifications** for critical events
- [ ] **Historical data storage** and trending
- [ ] **Mobile app** companion
- [ ] **Multi-router support**
- [ ] **Advanced alerting** system
- [ ] **Backup/restore** functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is released under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Test router connectivity manually
4. Create an issue with detailed error information
