from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
import json
import os
from datetime import datetime
import logging
from mikrotik_client import MikroTikClient
from router_manager import router_manager
from logger import log, info, error, warning, debug
from flask_socketio import SocketIO, emit
import threading, time

app = Flask(__name__)
CORS(app)  # Enable CORS for API endpoints
socketio = SocketIO(app, cors_allowed_origins="*")

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
active_router_id = None

def get_active_router_id():
    """Get the currently active router ID"""
    global active_router_id
    if not active_router_id:
        # Get first available router
        routers = router_manager.get_all_routers()
        if routers:
            active_router_id = routers[0]['id']
        else:
            active_router_id = 'router_001'
    return active_router_id

def get_mikrotik_client(router_id=None):
    """Create and return a MikroTik client instance for the specified router"""
    if not router_id:
        router_id = get_active_router_id()
    return router_manager.get_mikrotik_client(router_id)

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
        router_id = request.args.get('router_id', get_active_router_id())
        client = get_mikrotik_client(router_id)
        if client is None:
            return jsonify({'success': False, 'connected': False, 'error': router_manager.last_client_error or 'Failed to connect to router', 'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')})
        connected = client.test_connection()
        
        router = router_manager.get_router(router_id)
        if not router:
            return jsonify({
                'success': False,
                'connected': False,
                'error': 'Router not found',
                'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
        
        if connected:
            identity = client.get_identity()
            return jsonify({
                'success': True,
                'connected': True,
                'router_id': router_id,
                'router_name': router['name'],
                'router_ip': router['host'],
                'router_port': router['port'],
                'identity': identity,
                'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
        else:
            return jsonify({
                'success': False,
                'connected': False,
                'router_id': router_id,
                'router_name': router['name'],
                'router_ip': router['host'],
                'router_port': router['port'],
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
        router_id = request.args.get('router_id', get_active_router_id())
        client = get_mikrotik_client(router_id)
        if client is None:
            return jsonify({'success': False, 'error': router_manager.last_client_error or 'Failed to connect to router'})
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        resources = client.get_resources()
        router = router_manager.get_router(router_id)
        return jsonify({
            'success': True,
            'router_id': router_id,
            'router_name': router['name'] if router else 'Unknown',
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
        router_id = request.args.get('router_id', get_active_router_id())
        client = get_mikrotik_client(router_id)
        if client is None:
            return jsonify({'success': False, 'error': router_manager.last_client_error or 'Failed to connect to router'})
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        interfaces = client.get_interfaces()
        router = router_manager.get_router(router_id)
        return jsonify({
            'success': True,
            'router_id': router_id,
            'router_name': router['name'] if router else 'Unknown',
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
        router_id = request.args.get('router_id', get_active_router_id())
        client = get_mikrotik_client(router_id)
        if client is None:
            return jsonify({'success': False, 'error': router_manager.last_client_error or 'Failed to connect to router'})
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        router = router_manager.get_router(router_id)
        
        # Gather all data
        data = {
            'export_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'router_info': {
                'id': router_id,
                'name': router['name'] if router else 'Unknown',
                'host': router['host'] if router else '',
                'port': router['port'] if router else 8728,
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
        router_id = request.args.get('router_id', get_active_router_id())
        client = get_mikrotik_client(router_id)
        if client is None:
            return jsonify({'success': False, 'status': 'unhealthy', 'error': router_manager.last_client_error or 'Failed to connect to router', 'timestamp': datetime.now().isoformat()})
        connected = client.test_connection()
        
        router = router_manager.get_router(router_id)
        return jsonify({
            'success': True,
            'router_id': router_id,
            'router_name': router['name'] if router else 'Unknown',
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
    """Get or update router settings (legacy, now proxies to active router)"""
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data:
                error('No JSON data received in settings POST')
                return jsonify({'success': False, 'error': 'No data received'}), 400
            
            # Update the active router's settings
            active_router_id = get_active_router_id()
            router = router_manager.get_router(active_router_id)
            if not router:
                return jsonify({'success': False, 'error': 'Active router not found'}), 404
            
            update_data = {}
            if 'router_ip' in data:
                update_data['host'] = data['router_ip']
            if 'router_user' in data:
                update_data['username'] = data['router_user']
            if 'router_port' in data:
                update_data['port'] = int(data['router_port'])
            # Only update password if provided and not empty
            if 'router_password' in data and data['router_password']:
                update_data['password'] = data['router_password']
            
            success = router_manager.update_router(active_router_id, update_data)
            if success:
                info('Settings updated via legacy API')
                return jsonify({'success': True, 'message': 'Settings updated'})
            else:
                return jsonify({'success': False, 'error': 'Failed to update settings'}), 400
        except Exception as e:
            error(f'Error updating settings: {e}')
            return jsonify({'success': False, 'error': str(e)}), 400
    else:
        # GET: return current settings for the active router (do not include password for security)
        active_router_id = get_active_router_id()
        router = router_manager.get_router(active_router_id)
        if not router:
            return jsonify({'success': False, 'error': 'Active router not found'}), 404
        return jsonify({
            'success': True,
            'router_ip': router.get('host', ''),
            'router_user': router.get('username', ''),
            'router_port': router.get('port', 8728)
        })

@app.route('/api/ppp_active')
def api_ppp_active():
    """Get active PPP connections"""
    try:
        router_id = request.args.get('router_id', get_active_router_id())
        client = get_mikrotik_client(router_id)
        if client is None:
            return jsonify({'success': False, 'error': router_manager.last_client_error or 'Failed to connect to router'})
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        ppp_active = client.get_ppp_active()
        router = router_manager.get_router(router_id)
        return jsonify({
            'success': True,
            'router_id': router_id,
            'router_name': router['name'] if router else 'Unknown',
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
        router_id = request.args.get('router_id', get_active_router_id())
        client = get_mikrotik_client(router_id)
        if client is None:
            return jsonify({'success': False, 'error': router_manager.last_client_error or 'Failed to connect to router'})
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected'})
        
        ppp_accounts = client.get_ppp_secrets()
        router = router_manager.get_router(router_id)
        return jsonify({
            'success': True,
            'router_id': router_id,
            'router_name': router['name'] if router else 'Unknown',
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
        router_id = request.args.get('router_id', get_active_router_id())
        client = get_mikrotik_client(router_id)
        if client is None:
            return jsonify({'success': False, 'error': router_manager.last_client_error or 'Failed to connect to router'})
        if not client.test_connection():
            return jsonify({'success': False, 'error': 'Not connected', 'error_message': client.get_error()})
        
        pppoe_interfaces = client.get_pppoe_interfaces()
        ppp_secrets = client.get_ppp_secrets()
        ppp_active = client.get_ppp_active()
        
        # Calculate aggregate stats
        total_accounts = len(ppp_secrets) if ppp_secrets else 0
        online_accounts = len(pppoe_interfaces) if pppoe_interfaces else 0
        offline_accounts = total_accounts - online_accounts
        
        enabled_accounts = len([s for s in ppp_secrets if s.get('disabled') != 'true']) if ppp_secrets else 0
        disabled_accounts = total_accounts - enabled_accounts
        
        router = router_manager.get_router(router_id)
        return jsonify({
            'success': True,
            'router_id': router_id,
            'router_name': router['name'] if router else 'Unknown',
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
            'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'error_message': client.get_error()
        })
    except Exception as e:
        error(f"Error in PPPoE API: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/groups', methods=['GET', 'POST', 'PUT', 'DELETE'])
def api_groups():
    """
    CRUD operations for groups.
    
    GET: Returns all groups for the specified router.
        Query param: router_id (optional, defaults to active router)
        Response: { success: bool, groups: [ {id, name, description, accounts, created_at, updated_at} ] }
    POST: Create a new group.
        Payload: { name: str, description?: str, accounts?: [str, ...], router_id?: str }
        Response: { success: bool, group: {...} }
    PUT: Update an existing group.
        Payload: { id: str, name: str, description?: str, accounts?: [str, ...], router_id?: str }
        Response: { success: bool, group: {...} }
    DELETE: Delete a group by id.
        Query param: id: str, router_id?: str
        Response: { success: bool, message: str }
    """
    router_id = request.args.get('router_id', get_active_router_id())
    
    if request.method == 'GET':
        try:
            groups = router_manager.get_groups(router_id)
            return jsonify({'success': True, 'groups': groups, 'router_id': router_id})
        except Exception as e:
            error(f"Error reading groups: {e}")
            return jsonify({'success': False, 'error': str(e)})
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'name' not in data:
                return jsonify({'success': False, 'error': 'Group name is required'}), 400
            
            # Use router_id from request or default to active router
            group_router_id = data.get('router_id', router_id)
            groups = router_manager.get_groups(group_router_id)
            
            # Check for duplicate names
            if any(g['name'] == data['name'] for g in groups):
                return jsonify({'success': False, 'error': 'Group name already exists'}), 400
            
            # Add new group
            import uuid
            new_group = {
                'id': str(uuid.uuid4()),
                'router_id': group_router_id,
                'name': data['name'],
                'description': data.get('description', ''),
                'accounts': data.get('accounts', []),
                'created_at': datetime.now().isoformat()
            }
            if 'max_members' in data and data['max_members']:
                new_group['max_members'] = data['max_members']
            groups.append(new_group)
            
            # Save to file
            router_manager.save_groups(group_router_id, groups)
            
            return jsonify({'success': True, 'group': new_group})
        except Exception as e:
            error(f"Error creating group: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400
    
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            if not data or 'id' not in data or 'name' not in data:
                return jsonify({'success': False, 'error': 'Group ID and name are required'}), 400
            
            # Use router_id from request or default to active router
            group_router_id = data.get('router_id', router_id)
            groups = router_manager.get_groups(group_router_id)
            
            # Find and update group
            for group in groups:
                if group['id'] == data['id']:
                    group['name'] = data['name']
                    group['description'] = data.get('description', group.get('description', ''))
                    group['accounts'] = data.get('accounts', group.get('accounts', []))
                    if 'max_members' in data and data['max_members']:
                        group['max_members'] = data['max_members']
                    elif 'max_members' in group:
                        # Remove max_members if not provided in update
                        group.pop('max_members', None)
                    group['updated_at'] = datetime.now().isoformat()
                    
                    # Save to file
                    router_manager.save_groups(group_router_id, groups)
                    
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
            
            groups = router_manager.get_groups(router_id)
            
            # Find and remove group
            for i, group in enumerate(groups):
                if group['id'] == group_id:
                    deleted_group = groups.pop(i)
                    
                    # Save to file
                    router_manager.save_groups(router_id, groups)
                    
                    return jsonify({'success': True, 'message': 'Group deleted'})
            
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        except Exception as e:
            error(f"Error deleting group: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/groups/members', methods=['POST'])
def api_groups_members():
    """
    Update group membership (accounts) for a group.
    
    POST: Update the list of accounts for a group.
        Payload: { group_id: str, accounts: [str, ...] }
        Response: { success: bool, group: {...} }
    """
    try:
        data = request.get_json()
        group_id = data.get('group_id')
        accounts = data.get('accounts')
        router_id = data.get('router_id', get_active_router_id())
        
        if not group_id or not isinstance(accounts, list):
            return jsonify({'success': False, 'error': 'group_id and accounts (list) are required'}), 400
        
        groups = router_manager.get_groups(router_id)
        for group in groups:
            if group['id'] == group_id:
                group['accounts'] = accounts
                group['updated_at'] = datetime.now().isoformat()
                router_manager.save_groups(router_id, groups)
                return jsonify({'success': True, 'group': group})
        return jsonify({'success': False, 'error': 'Group not found'}), 404
    except Exception as e:
        error(f"Error updating group members: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/categories', methods=['GET', 'POST'])
def api_categories():
    """
    GET: Returns all categories for the specified router.
        Query param: router_id (optional, defaults to active router)
        Response: { success: bool, categories: [ ... ] }
    POST: Update categories for a router.
        Payload: { router_id: str, categories: [ ... ] }
        Response: { success: bool }
    """
    categories_file = 'data/categories.json'
    router_id = request.args.get('router_id', get_active_router_id())

    # Ensure categories file exists
    if not os.path.exists(categories_file):
        with open(categories_file, 'w') as f:
            json.dump({}, f)

    if request.method == 'GET':
        try:
            with open(categories_file, 'r') as f:
                all_categories = json.load(f)
            categories = all_categories.get(router_id, [])
            return jsonify({'success': True, 'categories': categories, 'router_id': router_id})
        except Exception as e:
            error(f"Error reading categories: {e}")
            return jsonify({'success': False, 'error': str(e)})

    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'categories' not in data:
                return jsonify({'success': False, 'error': 'Categories data is required'}), 400
            post_router_id = data.get('router_id', router_id)
            with open(categories_file, 'r') as f:
                all_categories = json.load(f)
            all_categories[post_router_id] = data['categories']
            with open(categories_file, 'w') as f:
                json.dump(all_categories, f, indent=2)
            return jsonify({'success': True})
        except Exception as e:
            error(f"Error updating categories: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400

# Router Management API Endpoints
@app.route('/api/routers', methods=['GET', 'POST', 'PUT', 'DELETE'])
def api_routers():
    """
    CRUD operations for routers.
    
    GET: Returns all routers.
        Response: { success: bool, routers: [ {id, name, host, enabled, connection_status, ...} ] }
    POST: Create a new router.
        Payload: { name: str, host: str, username: str, password: str, port?: int, description?: str }
        Response: { success: bool, router: {...} }
    PUT: Update an existing router.
        Payload: { id: str, name?: str, host?: str, username?: str, password?: str, port?: int, description?: str }
        Response: { success: bool, router: {...} }
    DELETE: Delete a router by id.
        Query param: id: str
        Response: { success: bool, message: str }
    """
    if request.method == 'GET':
        try:
            routers = router_manager.get_all_routers_status()
            return jsonify({'success': True, 'routers': routers})
        except Exception as e:
            error(f"Error getting routers: {e}")
            return jsonify({'success': False, 'error': str(e)})
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'name' not in data or 'host' not in data or 'username' not in data:
                return jsonify({'success': False, 'error': 'Router name, host, and username are required'}), 400
            
            success = router_manager.add_router(data)
            if success:
                router_id = data.get('id', f"router_{len(router_manager.routers):03d}")
                router = router_manager.get_router(router_id)
                return jsonify({'success': True, 'router': router})
            else:
                return jsonify({'success': False, 'error': 'Failed to add router'}), 400
        except Exception as e:
            error(f"Error creating router: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400
    
    elif request.method == 'PUT':
        try:
            data = request.get_json()
    
            if not data or 'id' not in data:
                return jsonify({'success': False, 'error': 'Router ID is required'}), 400
            
            success = router_manager.update_router(data['id'], data)
            if success:
                router = router_manager.get_router(data['id'])
                return jsonify({'success': True, 'router': router})
            else:
                return jsonify({'success': False, 'error': 'Failed to update router'}), 400
        except Exception as e:
            error(f"Error updating router: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400
    
    elif request.method == 'DELETE':
        try:
            router_id = request.args.get('id')
            if not router_id:
                return jsonify({'success': False, 'error': 'Router ID is required'}), 400
            
            success = router_manager.delete_router(router_id)
            if success:
                return jsonify({'success': True, 'message': 'Router deleted'})
            else:
                return jsonify({'success': False, 'error': 'Failed to delete router'}), 400
        except Exception as e:
            error(f"Error deleting router: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/routers/<router_id>', methods=['GET'])
def api_router_detail(router_id):
    router = router_manager.get_router(router_id)
    if router:
        return jsonify({'success': True, 'router': router})
    else:
        return jsonify({'success': False, 'error': 'Router not found'}), 404

@app.route('/api/routers/test', methods=['POST'])
def api_test_router():
    """
    Test connection to a specific router.
    
    POST: Test router connection.
        Payload: { router_id: str }
        Response: { success: bool, connected: bool, identity?: str, error?: str }
    """
    try:
        data = request.get_json()
        router_id = data.get('router_id')
        if not router_id:
            return jsonify({'success': False, 'error': 'Router ID is required'}), 400
        
        result = router_manager.test_router_connection(router_id)
        return jsonify(result)
    except Exception as e:
        error(f"Error testing router: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/routers/active', methods=['GET', 'POST'])
def api_active_router():
    """
    Get or set the active router.
    
    GET: Returns the currently active router ID.
    POST: Set the active router.
        Payload: { router_id: str }
        Response: { success: bool, active_router_id: str }
    """
    global active_router_id
    
    if request.method == 'GET':
        return jsonify({
            'success': True,
            'active_router_id': get_active_router_id()
        })
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            router_id = data.get('router_id')
            if not router_id:
                return jsonify({'success': False, 'error': 'Router ID is required'}), 400
            
            # Verify router exists
            router = router_manager.get_router(router_id)
            if not router:
                return jsonify({'success': False, 'error': 'Router not found'}), 404
            
            active_router_id = router_id
            return jsonify({
                'success': True,
                'active_router_id': router_id,
                'router_name': router['name']
            })
        except Exception as e:
            error(f"Error setting active router: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400

# Helper to gather all dashboard data

def get_dashboard_data():
    try:
        router_id = get_active_router_id()
        client = get_mikrotik_client(router_id)
        if client is None or not client.test_connection():
            return {
                'success': False,
                'error': router_manager.last_client_error or 'Failed to connect to router',
                'current_time': datetime.now().isoformat()
            }
        router = router_manager.get_router(router_id)
        # Gather all data
        pppoe_ifaces = client.get_pppoe_interfaces() or []
        ppp_accounts = client.get_ppp_secrets() or []
        ppp_active = client.get_ppp_active() or []
        aggregate_stats = client.get_aggregate_statistics() or {}
        return {
            'success': True,
            'router_id': router_id,
            'router_name': router['name'] if router else 'Unknown',
            'pppoe_interfaces': pppoe_ifaces,
            'ppp_accounts': ppp_accounts,
            'ppp_active': ppp_active,
            'aggregate_stats': aggregate_stats,
            'current_time': datetime.now().isoformat(),
            'error_message': client.get_error()
        }
    except Exception as e:
        error(f"Error in dashboard data aggregation: {e}")
        return {
            'success': False,
            'error': str(e),
            'current_time': datetime.now().isoformat()
        }

@app.route('/api/dashboard')
def dashboard():
    return jsonify(get_dashboard_data())

# WebSocket background broadcast

def dashboard_broadcast_loop():
    while True:
        data = get_dashboard_data()
        socketio.emit('dashboard_update', data)
        time.sleep(3)

threading.Thread(target=dashboard_broadcast_loop, daemon=True).start()

# Main entry point
if __name__ == '__main__':
    # Initialize router manager
    info("Starting MikroTik Monitoring Application")
    info(f"Loaded {len(router_manager.routers)} routers")
    app.run(host='0.0.0.0', port=80)
