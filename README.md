# MikroTik Monitoring Web Application

A Python web application for monitoring MikroTik routers using Flask and the RouterOS API.

## Features

- Real-time monitoring of MikroTik router resources
- System resources monitoring (CPU, memory, disk usage)
- Network interfaces status and information
- Active hotspot users list
- DHCP lease information
- Responsive web interface using Bootstrap
- Auto-refresh functionality to keep data current

## Requirements

- Python 3.7+
- MikroTik router with API access enabled

## Installation

1. Clone or download this repository
2. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file from the provided `.env.example`:
   ```
   copy .env.example .env
   ```
4. Edit the `.env` file with your MikroTik router credentials:
   ```
   MIKROTIK_HOST=192.168.88.1  # Your MikroTik IP address
   MIKROTIK_USER=admin         # Your MikroTik username
   MIKROTIK_PASSWORD=password  # Your MikroTik password
   MIKROTIK_PORT=8728          # Default API port (use 8729 for API-SSL)
   ```

## Usage

1. Run the Flask application:
   ```
   python app.py
   ```
2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000/
   ```
3. The page will auto-refresh every 60 seconds to show the latest data
4. Use the Settings page to update router connection details

## MikroTik Router Configuration

1. Enable the API service on your MikroTik router:
   - Navigate to IP → Services
   - Ensure the "api" service is enabled
   - Restrict access to specific IP addresses for security

2. For better security:
   - Create a dedicated read-only user for the monitoring application
   - Use API-SSL (port 8729) instead of the regular API port
   - Implement firewall rules to restrict API access

## Troubleshooting

- **Connection errors**: Ensure API access is enabled on your MikroTik router
- **Missing data**: Some sections may not appear if that feature is not configured on your router (e.g., no hotspot users if hotspot is not configured)
- **API errors**: Check router logs for any API-related error messages

## License

This project is released under the MIT License.
