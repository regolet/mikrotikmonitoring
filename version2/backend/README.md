# MikroTik Monitoring v2 - Flask API Backend

A robust Flask API backend for real-time MikroTik router monitoring and management. Provides RESTful endpoints and WebSocket support for the React frontend.

## Features
- RESTful API endpoints for router management, groups, categories, and PPPoE data
- Real-time WebSocket connections for live updates
- Multi-router support with router-aware API calls
- MikroTik API integration for router communication
- JSON-based data storage (routers, groups, categories)
- CORS enabled for frontend communication
- Comprehensive error handling and logging

## API Endpoints

### Router Management
- `GET /api/routers` - Get all routers
- `POST /api/routers` - Add new router
- `PUT /api/routers/<id>` - Update router
- `DELETE /api/routers/<id>` - Delete router
- `GET /api/routers/active` - Get active router
- `POST /api/routers/active` - Set active router
- `POST /api/routers/test` - Test router connection

### Dashboard & Monitoring
- `GET /api/dashboard` - Get aggregated dashboard data (stats + PPPoE)
- `GET /api/ppp_active` - Get active PPPoE connections
- `GET /api/stats` - Get router statistics

### Groups & Categories
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Add new group
- `PUT /api/groups/<id>` - Update group
- `DELETE /api/groups/<id>` - Delete group
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Add new category
- `PUT /api/categories/<id>` - Update category
- `DELETE /api/categories/<id>` - Delete category

### WebSocket
- `ws://localhost/ws` - Real-time updates for dashboard and groups

## Development Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the Flask development server:
   ```bash
   python app.py
   ```

3. The API will be available at [http://localhost](http://localhost)

## Production Deployment

1. Set environment variables:
   ```bash
   export FLASK_ENV=production
   export FLASK_DEBUG=0
   ```

2. Run with a production WSGI server:
   ```bash
   gunicorn app:app
   ```

3. The backend will serve the React frontend from the `build/` directory in production mode.

## Project Structure
- `app.py` - Main Flask application with routes and WebSocket
- `mikrotik_client.py` - MikroTik API client for router communication
- `router_manager.py` - Router management and connection logic
- `logger.py` - Logging utilities and configuration
- `data/` - JSON data files (routers, groups, categories)
- `requirements.txt` - Python dependencies

## Data Files
- `data/routers.json` - Router configurations
- `data/groups.json` - Group definitions
- `data/categories.json` - Category and subcategory structure
- `data/groups_backup.json` - Backup of groups data

## Dependencies
- Flask - Web framework
- Flask-SocketIO - WebSocket support
- requests - HTTP client for MikroTik API
- python-dotenv - Environment variable management

## Configuration
The backend uses JSON files for data storage and configuration. All data is stored in the `data/` directory and is automatically loaded/saved by the application.

## Error Handling
- Comprehensive error handling for MikroTik API calls
- Graceful fallbacks for connection failures
- Detailed logging for debugging
- User-friendly error messages returned to frontend

## Security
- CORS enabled for frontend communication
- Input validation on all endpoints
- Safe JSON file operations
- No sensitive data exposed in API responses 