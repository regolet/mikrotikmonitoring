from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
import json
import os
from datetime import datetime
import logging
from mikrotik_client import MikroTikClient
from logger import log, info, error, warning, debug

app = Flask(__name__)
CORS(app)  # Enable CORS for API endpoints

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
router_ip = None
router_user = None
router_password = None
router_port = None

def load_settings():
    """Load router settings from JSON file"""
    global router_ip, router_user, router_password, router_port
    try:
        with open('settings.json', 'r') as f:
            settings = json.load(f)
            router_ip = settings.get('router_ip', '192.168.88.1')
            router_user = settings.get('router_user', 'admin')
            router_password = settings.get('router_password', '')
            router_port = settings.get('router_port', 8728)
        info(f"Settings loaded: {router_ip}:{router_port}")
    except FileNotFoundError:
        warning("Settings file not found, using defaults")
        router_ip = '192.168.88.1'
        router_user = 'admin'
        router_password = ''
        router_port = 8728
    except Exception as e:
        error(f"Error loading settings: {e}")

def get_mikrotik_client():
    """Create and return a MikroTik client instance"""
    client = MikroTikClient(router_ip, router_user, router_password, router_port)
    client.connect()  # Ensure connection is established!
    return client

@app.route('/')
def index():
    """Serve the main SPA HTML page"""
    response = send_file('static/index.html')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/settings')
def settings():
    """Serve the settings page - handled by client-side routing"""
    return index()

@app.route('/groups')
def groups():
    """Serve the groups page - handled by client-side routing"""
    return index()

# Catch-all route for SPA navigation
@app.route('/<path:path>')
def catch_all(path):
    """Catch-all route for SPA navigation"""
    return index()

@app.route('/api/status')
def api_status():
    """Get connection status and basic router info"""
    try:
        client = get_mikrotik_client()
        connected = client.test_connection()
        
        if connected:
            identity = client.get_identity()
            return jsonify({
                'success': True,
                'connected': True,
                'router_ip': router_ip,
                'router_port': router_port,
                'identity': identity,
                'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
        else:
            return jsonify({
                'success': False,
                'connected': False,
                'router_ip': router_ip,
                'router_port': router_port,
                'error': 'Connection failed',
                'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
    except Exception as e:
        error(f"Error in status API: {e}")
        return jsonify({
            'success': False,
            'connected': False,
            'error': str(e),
            'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })

@app.route('/api/resources')
def api_resources():
    """Get system resources"""
    try:
        client = get_mikrotik_client()
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        resources = client.get_resources()
        return jsonify({
            'success': True,
            'resources': resources,
            'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        error(f"Error in resources API: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/interfaces')
def api_interfaces():
    """Get network interfaces"""
    try:
        client = get_mikrotik_client()
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        interfaces = client.get_interfaces()
        return jsonify({
            'success': True,
            'interfaces': interfaces,
            'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        error(f"Error in interfaces API: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/export')
def api_export():
    """Export all data as JSON"""
    try:
        client = get_mikrotik_client()
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        # Gather all data
        data = {
            'export_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'router_info': {
                'ip': router_ip,
                'port': router_port,
                'identity': client.get_identity()
            },
            'resources': client.get_resources(),
            'interfaces': client.get_interfaces(),
            'pppoe_interfaces': client.get_pppoe_interfaces(),
            'ppp_secrets': client.get_ppp_secrets(),
            'ppp_active': client.get_ppp_active(),
            'ppp_accounts': client.get_ppp_secrets()
        }
        
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        error(f"Error in export API: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/health')
def api_health():
    """Health check endpoint"""
    try:
        client = get_mikrotik_client()
        connected = client.test_connection()
        
        return jsonify({
            'success': True,
            'status': 'healthy' if connected else 'unhealthy',
            'connected': connected,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        error(f"Error in health check: {e}")
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        })

@app.route('/api/logs')
def api_logs():
    """Get application logs"""
    from logger import get_logs, clear_logs
    
    count = request.args.get('count', 50, type=int)
    clear = request.args.get('clear', False, type=bool)
    
    if clear:
        clear_logs()
        return jsonify({'success': True, 'message': 'Logs cleared'})
    
    logs = get_logs(count=count)
    
    return jsonify({
        'success': True,
        'logs': logs
    })

@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    """Get or update router settings"""
    global router_ip, router_user, router_password, router_port
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data:
                error('No JSON data received in settings POST')
                return jsonify({'success': False, 'error': 'No data received'}), 400
            
            info(f'Received settings update: {list(data.keys())}')
            
            router_ip = data.get('router_ip', router_ip)
            router_user = data.get('router_user', router_user)
            router_password = data.get('router_password', router_password)
            router_port = int(data.get('router_port', router_port))
            
            # Save to settings.json
            settings_data = {
                'router_ip': router_ip,
                'router_user': router_user,
                'router_password': router_password,
                'router_port': router_port
            }
            
            with open('settings.json', 'w') as f:
                json.dump(settings_data, f, indent=2)
            
            load_settings()  # Reload settings
            info('Settings updated via API')
            return jsonify({'success': True, 'message': 'Settings updated'})
        except Exception as e:
            error(f'Error updating settings: {e}')
            return jsonify({'success': False, 'error': str(e)}), 400
    else:
        # GET: return current settings (do not include password for security)
        return jsonify({
            'success': True,
            'router_ip': router_ip,
            'router_user': router_user,
            'router_port': router_port
        })

@app.route('/api/ppp_active')
def api_ppp_active():
    """Get active PPP connections"""
    try:
        client = get_mikrotik_client()
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        ppp_active = client.get_ppp_active()
        return jsonify({
            'success': True,
            'ppp_active': ppp_active,
            'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        error(f"Error in PPP active API: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/ppp_accounts')
def api_ppp_accounts():
    """Get PPP accounts (secrets)"""
    try:
        client = get_mikrotik_client()
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        ppp_accounts = client.get_ppp_secrets()
        return jsonify({
            'success': True,
            'ppp_accounts': ppp_accounts,
            'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        error(f"Error in PPP accounts API: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/pppoe')
def api_pppoe():
    """Get PPPoE interfaces and related data"""
    try:
        client = get_mikrotik_client()
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        pppoe_interfaces = client.get_pppoe_interfaces()
        ppp_secrets = client.get_ppp_secrets()
        ppp_active = client.get_ppp_active()
        
        # Calculate aggregate stats
        total_accounts = len(ppp_secrets) if ppp_secrets else 0
        online_accounts = len(pppoe_interfaces) if pppoe_interfaces else 0
        offline_accounts = total_accounts - online_accounts
        
        enabled_accounts = len([s for s in ppp_secrets if s.get('disabled') != 'true']) if ppp_secrets else 0
        disabled_accounts = total_accounts - enabled_accounts
        
        return jsonify({
            'success': True,
            'pppoe_interfaces': pppoe_interfaces,
            'ppp_secrets': ppp_secrets,
            'ppp_active': ppp_active,
            'aggregate_stats': {
                'total_accounts': total_accounts,
                'online_accounts': online_accounts,
                'offline_accounts': offline_accounts,
                'enabled_accounts': enabled_accounts,
                'disabled_accounts': disabled_accounts,
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            },
            'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        error(f"Error in PPPoE API: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/groups', methods=['GET', 'POST', 'PUT', 'DELETE'])
def api_groups():
    """CRUD operations for groups"""
    groups_file = 'data/groups.json'
    
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    if request.method == 'GET':
        try:
            if os.path.exists(groups_file):
                with open(groups_file, 'r') as f:
                    groups = json.load(f)
            else:
                groups = []
            return jsonify({'success': True, 'groups': groups})
        except Exception as e:
            error(f"Error reading groups: {e}")
            return jsonify({'success': False, 'error': str(e)})
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'name' not in data:
                return jsonify({'success': False, 'error': 'Group name is required'}), 400
            
            # Load existing groups
            if os.path.exists(groups_file):
                with open(groups_file, 'r') as f:
                    groups = json.load(f)
            else:
                groups = []
            
            # Check for duplicate names
            if any(g['name'] == data['name'] for g in groups):
                return jsonify({'success': False, 'error': 'Group name already exists'}), 400
            
            # Add new group
            new_group = {
                'id': str(len(groups) + 1),
                'name': data['name'],
                'description': data.get('description', ''),
                'created_at': datetime.now().isoformat()
            }
            groups.append(new_group)
            
            # Save to file
            with open(groups_file, 'w') as f:
                json.dump(groups, f, indent=2)
            
            return jsonify({'success': True, 'group': new_group})
        except Exception as e:
            error(f"Error creating group: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400
    
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            if not data or 'id' not in data or 'name' not in data:
                return jsonify({'success': False, 'error': 'Group ID and name are required'}), 400
            
            # Load existing groups
            if os.path.exists(groups_file):
                with open(groups_file, 'r') as f:
                    groups = json.load(f)
            else:
                return jsonify({'success': False, 'error': 'No groups found'}), 404
            
            # Find and update group
            for group in groups:
                if group['id'] == data['id']:
                    group['name'] = data['name']
                    group['description'] = data.get('description', group.get('description', ''))
                    group['updated_at'] = datetime.now().isoformat()
                    
                    # Save to file
                    with open(groups_file, 'w') as f:
                        json.dump(groups, f, indent=2)
                    
                    return jsonify({'success': True, 'group': group})
            
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        except Exception as e:
            error(f"Error updating group: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400
    
    elif request.method == 'DELETE':
        try:
            group_id = request.args.get('id')
            if not group_id:
                return jsonify({'success': False, 'error': 'Group ID is required'}), 400
            
            # Load existing groups
            if os.path.exists(groups_file):
                with open(groups_file, 'r') as f:
                    groups = json.load(f)
            else:
                return jsonify({'success': False, 'error': 'No groups found'}), 404
            
            # Find and remove group
            for i, group in enumerate(groups):
                if group['id'] == group_id:
                    deleted_group = groups.pop(i)
                    
                    # Save to file
                    with open(groups_file, 'w') as f:
                        json.dump(groups, f, indent=2)
                    
                    return jsonify({'success': True, 'message': 'Group deleted'})
            
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        except Exception as e:
            error(f"Error deleting group: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    load_settings()
    app.run(host='0.0.0.0', port=5000, debug=True)
