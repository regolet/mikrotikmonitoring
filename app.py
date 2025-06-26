import os
import re
import math
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, redirect, url_for, request, session, flash, jsonify
from dotenv import load_dotenv
from mikrotik_client import MikroTikClient
import logger

# Load environment variables from .env file
load_dotenv()

# Initialize Flask application
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'default_secret_key')

# File path for storing groups data
GROUPS_DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'groups.json')

# Ensure data directory exists
os.makedirs(os.path.dirname(GROUPS_DATA_FILE), exist_ok=True)

# MikroTik connection settings
MIKROTIK_HOST = os.getenv('MIKROTIK_HOST', '192.168.88.1')
MIKROTIK_USER = os.getenv('MIKROTIK_USER', 'admin')
MIKROTIK_PASSWORD = os.getenv('MIKROTIK_PASSWORD', 'password')

# Parse port number - handle any comments or extra text after the port
port_value = os.getenv('MIKROTIK_PORT', '8728')
try:
    # Extract just the number part (first integer in the string)
    port_match = re.search(r'^\d+', port_value.strip())
    if port_match:
        MIKROTIK_PORT = int(port_match.group(0))
    else:
        MIKROTIK_PORT = 8728  # Default if no valid port found
except (ValueError, AttributeError):
    MIKROTIK_PORT = 8728  # Default on error

def format_bytes(bytes_value, precision=2):
    """Format bytes to human-readable format"""
    if bytes_value is None:
        return "N/A"
    
    bytes_value = float(bytes_value)
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    
    bytes_value = max(bytes_value, 0)
    pow_value = min(int(bytes_value and bytes_value.bit_length() / 10 or 0), len(units) - 1)
    bytes_value /= (1 << (pow_value * 10))
    
    return f"{bytes_value:.{precision}f} {units[pow_value]}"

@app.route('/')
def index():
    """Main dashboard page"""
    # Create MikroTik client
    client = MikroTikClient(
        host=MIKROTIK_HOST,
        user=MIKROTIK_USER,
        password=MIKROTIK_PASSWORD,
        port=MIKROTIK_PORT
    )
    
    # Initialize data
    connected = client.connect()
    error = client.get_error()
    resources = None
    identity = None
    interfaces = None
    pppoe_interfaces = None  # Added for PPPoE-in interfaces
    hotspot_users = None
    dhcp_leases = None
    ppp_secrets = None
    active_ppp = None
    aggregate_stats = None  # Added for aggregate statistics
    
    # If connected, fetch data
    if connected:
        resources = client.get_system_resources()
        print(f"System resources: {resources}")
        identity = client.get_system_identity()
        print(f"System identity: {identity}")
        interfaces = client.get_interfaces()
        logger.info(f"Fetched interfaces: {interfaces is not None}", "app.py")
        if interfaces:
            logger.info(f"Number of interfaces: {len(interfaces)}", "app.py")
            logger.debug(f"Interface data: {interfaces}", "app.py")
        else:
            logger.warning("No interfaces data returned", "app.py")
            
        # Get PPPoE-in interfaces with traffic stats
        pppoe_interfaces = client.get_pppoe_interfaces_with_stats()
        logger.info(f"Fetched PPPoE-in interfaces: {pppoe_interfaces is not None}", "app.py")
        if pppoe_interfaces:
            logger.info(f"Number of PPPoE-in interfaces: {len(pppoe_interfaces)}", "app.py")
            logger.debug(f"PPPoE interface data: {pppoe_interfaces}", "app.py")
        else:
            logger.warning("No PPPoE-in interfaces data returned", "app.py")
            
        # Get aggregate statistics
        aggregate_stats = client.get_aggregate_statistics()
        logger.info(f"Fetched aggregate statistics: {aggregate_stats is not None}", "app.py")
        if aggregate_stats:
            logger.debug(f"Aggregate statistics: {aggregate_stats}", "app.py")
        else:
            logger.warning("No aggregate statistics returned", "app.py")
        hotspot_users = client.get_active_hotspot_users()
        print(f"Hotspot users: {hotspot_users}")
        dhcp_leases = client.get_dhcp_leases()
        print(f"DHCP leases: {dhcp_leases}")
        
        # Get PPP data
        ppp_secrets = client.get_ppp_secrets()
        active_ppp = client.get_active_ppp_connections()
        
        # Calculate memory usage percentage if data is available
        if resources and 'total-memory' in resources and 'free-memory' in resources:
            total_memory = int(resources['total-memory'])
            free_memory = int(resources['free-memory'])
            resources['memory_used'] = total_memory - free_memory
            resources['memory_percentage'] = (resources['memory_used'] / total_memory) * 100
        
        # Calculate disk usage percentage if data is available
        if resources and 'total-hdd-space' in resources and 'free-hdd-space' in resources:
            total_hdd = int(resources['total-hdd-space'])
            free_hdd = int(resources['free-hdd-space'])
            resources['hdd_used'] = total_hdd - free_hdd
            resources['hdd_percentage'] = (resources['hdd_used'] / total_hdd) * 100
        
        client.disconnect()
    
    # Render dashboard with data
    return render_template(
        'index.html',
        connected=connected,
        error=error,
        router_ip=MIKROTIK_HOST,
        router_user=MIKROTIK_USER,
        router_port=MIKROTIK_PORT,
        identity=identity,
        resources=resources,
        interfaces=interfaces,
        pppoe_interfaces=pppoe_interfaces,  # Added PPPoE-in interfaces
        aggregate_stats=aggregate_stats,    # Added aggregate statistics
        hotspot_users=hotspot_users,
        dhcp_leases=dhcp_leases,
        ppp_secrets=ppp_secrets,
        active_ppp=active_ppp,
        current_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        format_bytes=format_bytes,
        debug=os.getenv('DEBUG', 'True').lower() == 'true'
    )

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    """Settings page to update MikroTik connection details"""
    global MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD, MIKROTIK_PORT
    
    if request.method == 'POST':
        # Update connection settings
        MIKROTIK_HOST = request.form.get('host', MIKROTIK_HOST)
        MIKROTIK_USER = request.form.get('user', MIKROTIK_USER)
        MIKROTIK_PASSWORD = request.form.get('password', MIKROTIK_PASSWORD)
        MIKROTIK_PORT = int(request.form.get('port', MIKROTIK_PORT))
        
        # Create MikroTik client
        client = MikroTikClient(MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD, MIKROTIK_PORT)
        connected = client.connect()
        error = client.get_error()
        logger.info(f"Connection status: {connected}, Error: {error}", 'app.py')
        
        flash('Settings updated successfully', 'success')
        return redirect(url_for('index'))
    
    # Display settings form
    return render_template(
        'settings.html',
        host=MIKROTIK_HOST,
        user=MIKROTIK_USER,
        password=MIKROTIK_PASSWORD,
        port=MIKROTIK_PORT,
        current_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )

@app.route('/api/pppoe_interfaces')
def get_pppoe_interfaces_data():
    """API endpoint to get PPPoE interface data with traffic stats"""
    client = MikroTikClient(MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD, MIKROTIK_PORT)
    connected = client.connect()
    
    if connected:
        logger.info("Connected to router for PPPoE data API request", "app.py")
        # Get PPPoE interfaces with traffic stats
        pppoe_interfaces = client.get_pppoe_interfaces_with_stats()
        # Get active PPP connections for address data
        active_ppp = client.get_active_ppp_connections()
        # Get aggregate statistics
        aggregate_stats = client.get_aggregate_statistics()
        
        # Create mapping from PPP active user names to addresses
        address_map = {}
        if active_ppp:
            for ppp in active_ppp:
                # In active PPP connections the name is just the username (e.g., 'Bolilla_Engineer')
                ppp_name = ppp.get('name', '')
                address = ppp.get('address', 'N/A')
                if ppp_name and address != 'N/A':
                    address_map[ppp_name] = address
                    logger.debug(f"Found address {address} for PPP active user {ppp_name}", "app.py")
        
        # Add address to each interface
        if pppoe_interfaces:
            for iface in pppoe_interfaces:
                iface_name = iface.get('name', '')
                
                # Extract the username from the PPPoE interface name
                # Format is typically <pppoe-Username>
                import re
                username_match = re.search(r'<pppoe-(.+)>', iface_name)
                extracted_username = username_match.group(1) if username_match else None
                
                # Match address
                if extracted_username and extracted_username in address_map:
                    # Match found using the extracted username
                    iface['address'] = address_map[extracted_username]
                    logger.debug(f"Added address {address_map[extracted_username]} to {iface_name} (matched with {extracted_username})", "app.py")
                else:
                    # Try alternate matching approaches
                    iface_name_no_prefix = iface_name.replace('<pppoe-', '').replace('>', '')
                    
                    # Try exact match
                    if iface_name_no_prefix in address_map:
                        iface['address'] = address_map[iface_name_no_prefix]
                        logger.debug(f"Added address {address_map[iface_name_no_prefix]} to {iface_name} (alternate match)", "app.py")
                    else:
                        # Try case-insensitive match (some systems might have case differences)
                        matched = False
                        for ppp_name, addr in address_map.items():
                            if ppp_name.lower() == iface_name_no_prefix.lower():
                                iface['address'] = addr
                                logger.debug(f"Added address {addr} to {iface_name} (case-insensitive match)", "app.py")
                                matched = True
                                break
                                
                        if not matched:
                            iface['address'] = 'N/A'
                            logger.debug(f"No address found for {iface_name}", "app.py")
                
                # No need to sum up rates here, will be done in frontend
        
        return jsonify({
            'pppoe_interfaces': pppoe_interfaces,
            'aggregate_stats': {
                'total_accounts': aggregate_stats.get('total_accounts', 0),
                'active_sessions': aggregate_stats.get('active_sessions', 0),
                'online_accounts': aggregate_stats.get('online_accounts', 0),
                'offline_accounts': aggregate_stats.get('offline_accounts', 0),
                'enabled_accounts': aggregate_stats.get('enabled_accounts', 0),
                'disabled_accounts': aggregate_stats.get('disabled_accounts', 0),
                'last_updated': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            'current_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'success': True
        })
    else:
        error = client.get_error()
        logger.error(f"Failed to connect to router for API: {error}", "app.py")
        return jsonify({
            'success': False, 
            'error': error or "Failed to connect to router"
        })

@app.route('/api/logs')
def api_logs():
    """API endpoint to get logs"""
    count = request.args.get('count', type=int, default=100)
    level = request.args.get('level', default=None)
    clear = request.args.get('clear', type=bool, default=False)
    
    if clear:
        logger.clear_logs()
        return jsonify({'status': 'success', 'message': 'Logs cleared'})
    
    logs = logger.get_logs(count=count, level=level)
    return jsonify({'logs': logs})

# Helper functions for groups management
def get_all_groups():
    """Get all account groups from the JSON file"""
    try:
        if os.path.exists(GROUPS_DATA_FILE):
            with open(GROUPS_DATA_FILE, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error loading groups data: {e}", "app.py")
        return []

def save_groups(groups):
    """Save all groups to the JSON file"""
    try:
        with open(GROUPS_DATA_FILE, 'w') as f:
            json.dump(groups, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving groups data: {e}", "app.py")
        return False

def get_group_by_id(group_id):
    """Get a single group by its ID"""
    groups = get_all_groups()
    for group in groups:
        if group.get('id') == group_id:
            return group
    return None

@app.route('/groups')
def groups():
    """Groups management page"""
    # Create MikroTik client
    client = MikroTikClient(
        host=MIKROTIK_HOST,
        user=MIKROTIK_USER,
        password=MIKROTIK_PASSWORD,
        port=MIKROTIK_PORT
    )
    
    # Initialize data
    connected = client.connect()
    error = client.get_error()
    ppp_secrets = None
    active_ppp = None
    
    # If connected, fetch data needed for groups page
    if connected:
        # Get PPP data for account selection
        ppp_secrets = client.get_ppp_secrets()
        active_ppp = client.get_active_ppp_connections()
        
        client.disconnect()
    
    # Render groups page with data
    return render_template(
        'groups.html',
        connected=connected,
        error=error,
        ppp_secrets=ppp_secrets,
        active_ppp=active_ppp,
        current_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )

@app.route('/api/groups', methods=['GET'])
def get_groups():
    """API endpoint to get all groups"""
    groups = get_all_groups()
    
    # Create MikroTik client to get active status
    client = MikroTikClient(MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD, MIKROTIK_PORT)
    connected = client.connect()
    
    if connected:
        # Get active PPP connections for status checking
        active_ppp = client.get_active_ppp_connections()
        
        # Create mapping of active usernames
        active_users = set()
        if active_ppp:
            for ppp in active_ppp:
                username = ppp.get('name')
                if username:
                    active_users.add(username)
                    
        # Update online/offline counts for each group
        for group in groups:
            online_count = 0
            offline_count = 0
            accounts = group.get('accounts', [])
            
            for account in accounts:
                if account in active_users:
                    online_count += 1
                else:
                    offline_count += 1
                    
            group['online_count'] = online_count
            group['offline_count'] = offline_count
            
            # Calculate group status
            total = len(accounts)
            if total == 0:
                group['status'] = "neutral"
            elif online_count == total:
                group['status'] = "green"  # All accounts online
            elif offline_count == total:
                group['status'] = "red"    # All accounts offline
            elif offline_count >= total / 2:
                group['status'] = "yellow" # Half or more are offline
            else:
                group['status'] = "yellowgreen" # Less than half are offline
        
        client.disconnect()
        
    return jsonify({
        'groups': groups,
        'success': True,
        'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/api/groups', methods=['POST'])
def create_group():
    """API endpoint to create a new group"""
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
    group_name = data.get('name', '').strip()
    accounts = data.get('accounts', [])
    
    if not group_name:
        return jsonify({'success': False, 'error': 'Group name is required'}), 400
        
    # Generate a unique ID
    group_id = str(uuid.uuid4())
    
    # Create new group
    new_group = {
        'id': group_id,
        'name': group_name,
        'accounts': accounts,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    # Add to existing groups
    groups = get_all_groups()
    groups.append(new_group)
    
    if save_groups(groups):
        return jsonify({'success': True, 'group': new_group})
    else:
        return jsonify({'success': False, 'error': 'Failed to save group'}), 500

@app.route('/api/groups/<group_id>', methods=['GET'])
def get_group(group_id):
    """API endpoint to get a single group by ID"""
    group = get_group_by_id(group_id)
    if not group:
        return jsonify({'success': False, 'error': 'Group not found'}), 404
    
    return jsonify({
        'success': True,
        'group': group
    })

@app.route('/api/groups/<group_id>', methods=['PUT'])
def update_group(group_id):
    """API endpoint to update a group"""
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
    group_name = data.get('name', '').strip()
    accounts = data.get('accounts', [])
    
    if not group_name:
        return jsonify({'success': False, 'error': 'Group name is required'}), 400
    
    # Get all groups
    groups = get_all_groups()
    
    # Find and update the group
    for group in groups:
        if group.get('id') == group_id:
            group['name'] = group_name
            group['accounts'] = accounts
            group['updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            if save_groups(groups):
                return jsonify({'success': True, 'group': group})
            else:
                return jsonify({'success': False, 'error': 'Failed to save group'}), 500
    
    return jsonify({'success': False, 'error': 'Group not found'}), 404

@app.route('/api/groups/<group_id>', methods=['DELETE'])
def delete_group(group_id):
    """API endpoint to delete a group"""
    # Get all groups
    groups = get_all_groups()
    
    # Filter out the group to delete
    updated_groups = [group for group in groups if group.get('id') != group_id]
    
    if len(updated_groups) == len(groups):
        return jsonify({'success': False, 'error': 'Group not found'}), 404
    
    if save_groups(updated_groups):
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Failed to delete group'}), 500

@app.route('/api/accounts')
def get_accounts():
    """API endpoint to get all PPP accounts with their status"""
    # Create MikroTik client
    client = MikroTikClient(MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD, MIKROTIK_PORT)
    connected = client.connect()
    
    accounts = []
    
    if connected:
        # Get PPP secrets (accounts)
        ppp_secrets = client.get_ppp_secrets()
        # Get active PPP connections
        active_ppp = client.get_active_ppp_connections()
        
        # Create mapping of active usernames
        active_users = set()
        if active_ppp:
            for ppp in active_ppp:
                username = ppp.get('name')
                if username:
                    active_users.add(username)
        
        # Create list of accounts with status
        if ppp_secrets:
            for secret in ppp_secrets:
                username = secret.get('name')
                if username:
                    accounts.append({
                        'name': username,
                        'profile': secret.get('profile', 'default'),
                        'status': 'online' if username in active_users else 'offline',
                        'disabled': secret.get('disabled') == 'true'
                    })
        
        client.disconnect()
    
    return jsonify({
        'accounts': accounts,
        'success': connected,
        'error': client.get_error() if not connected else None
    })

if __name__ == '__main__':
    # Log application startup
    logger.info('Application starting', 'app.py')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    app.run(debug=DEBUG, host='0.0.0.0', port=5000)
