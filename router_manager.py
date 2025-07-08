import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from mikrotik_client import MikroTikClient
from logger import log, info, error, warning, debug

class RouterManager:
    """
    Manages multiple MikroTik router configurations and connections.
    """
    
    def __init__(self):
        self.routers_file = 'data/routers.json'
        self.routers = {}
        self.active_router_id = None
        self.load_routers()
    
    def load_routers(self) -> None:
        """Load router configurations from file"""
        try:
            if os.path.exists(self.routers_file):
                with open(self.routers_file, 'r') as f:
                    routers_data = json.load(f)
                    self.routers = {router['id']: router for router in routers_data}
                    info(f"Loaded {len(self.routers)} routers")
            else:
                warning("No routers file found, creating default")
                self.create_default_router()
        except Exception as e:
            error(f"Error loading routers: {e}")
            self.create_default_router()
    
    def create_default_router(self) -> None:
        """Create a default router configuration"""
        default_router = {
            "id": "router_001",
            "name": "Default Router",
            "description": "Default MikroTik router",
            "host": "192.168.88.1",
            "username": "admin",
            "password": "",
            "port": 8728,
            "use_ssl": False,
            "enabled": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "last_connection": None,
            "connection_status": "unknown"
        }
        self.routers = {"router_001": default_router}
        self.save_routers()
    
    def save_routers(self) -> None:
        """Save router configurations to file"""
        try:
            os.makedirs('data', exist_ok=True)
            with open(self.routers_file, 'w') as f:
                json.dump(list(self.routers.values()), f, indent=2)
            info("Routers saved successfully")
        except Exception as e:
            error(f"Error saving routers: {e}")
    
    def get_router(self, router_id: str) -> Optional[Dict]:
        """Get router configuration by ID"""
        return self.routers.get(router_id)
    
    def get_all_routers(self) -> List[Dict]:
        """Get all router configurations"""
        return list(self.routers.values())
    
    def add_router(self, router_data: Dict) -> bool:
        """Add a new router configuration"""
        try:
            router_id = router_data.get('id')
            if not router_id:
                router_id = f"router_{len(self.routers) + 1:03d}"
                router_data['id'] = router_id
            
            if router_id in self.routers:
                error(f"Router ID {router_id} already exists")
                return False
            
            router_data['created_at'] = datetime.now().isoformat()
            router_data['updated_at'] = datetime.now().isoformat()
            router_data['last_connection'] = None
            router_data['connection_status'] = 'unknown'
            
            self.routers[router_id] = router_data
            self.save_routers()
            
            # Create groups directory for new router
            groups_dir = f"data/groups/{router_id}"
            os.makedirs(groups_dir, exist_ok=True)
            
            # Create empty groups file
            groups_file = f"{groups_dir}/groups.json"
            if not os.path.exists(groups_file):
                with open(groups_file, 'w') as f:
                    json.dump([], f, indent=2)
            
            info(f"Added router: {router_data.get('name', router_id)}")
            return True
        except Exception as e:
            error(f"Error adding router: {e}")
            return False
    
    def update_router(self, router_id: str, router_data: Dict) -> bool:
        try:
            if router_id not in self.routers:
                error(f"Router {router_id} not found")
                return False

            # Only update fields that are present and not None/empty
            for key in ['name', 'description', 'host', 'port', 'username', 'use_ssl']:
                if key in router_data and router_data[key] not in [None, '']:
                    self.routers[router_id][key] = router_data[key]
            # Special handling for password: only update if provided and not empty
            if 'password' in router_data and router_data['password']:
                self.routers[router_id]['password'] = router_data['password']

            self.routers[router_id]['updated_at'] = datetime.now().isoformat()
            self.save_routers()

            info(f"Updated router: {router_id}")
            return True
        except Exception as e:
            error(f"Error updating router: {e}")
            return False
    
    def delete_router(self, router_id: str) -> bool:
        """Delete router configuration"""
        try:
            if router_id not in self.routers:
                error(f"Router {router_id} not found")
                return False
            
            # Remove router from configuration
            del self.routers[router_id]
            self.save_routers()
            
            # Remove groups directory
            groups_dir = f"data/groups/{router_id}"
            if os.path.exists(groups_dir):
                import shutil
                shutil.rmtree(groups_dir)
            
            info(f"Deleted router: {router_id}")
            return True
        except Exception as e:
            error(f"Error deleting router: {e}")
            return False
    
    def get_mikrotik_client(self, router_id: str) -> Optional[MikroTikClient]:
        """Get MikroTik client for specific router"""
        router = self.get_router(router_id)
        if not router:
            error_msg = f"Router {router_id} not found"
            error(error_msg)
            self.last_client_error = error_msg
            return None
        try:
            client = MikroTikClient(
                host=router['host'],
                user=router['username'],
                password=router['password'],
                port=router['port'],
                use_ssl=router.get('use_ssl', False)
            )
            if client.connect():
                self.last_client_error = None
                return client
            else:
                error_msg = f"Failed to connect to router {router_id}: {client.get_error()}"
                error(error_msg)
                self.last_client_error = error_msg
                return None
        except Exception as e:
            error_msg = f"Error creating client for router {router_id}: {e}"
            error(error_msg)
            self.last_client_error = error_msg
            return None
    
    def test_router_connection(self, router_id: str) -> Dict:
        """Test connection to a specific router"""
        router = self.get_router(router_id)
        if not router:
            return {'success': False, 'error': 'Router not found'}
        
        try:
            client = self.get_mikrotik_client(router_id)
            if not client:
                return {'success': False, 'error': 'Failed to create client'}
            
            connected = client.test_connection()
            
            # Update router status
            router['last_connection'] = datetime.now().isoformat()
            router['connection_status'] = 'connected' if connected else 'disconnected'
            self.save_routers()
            
            if connected:
                identity = client.get_identity()
                return {
                    'success': True,
                    'connected': True,
                    'identity': identity,
                    'router_name': router['name']
                }
            else:
                return {
                    'success': False,
                    'connected': False,
                    'error': client.get_error() or 'Connection failed'
                }
        except Exception as e:
            error(f"Error testing connection to router {router_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_groups_file_path(self, router_id: str) -> str:
        """Get the groups file path for a specific router"""
        return f"data/groups/{router_id}/groups.json"
    
    def get_groups(self, router_id: str) -> List[Dict]:
        """Get groups for a specific router"""
        groups_file = self.get_groups_file_path(router_id)
        try:
            if os.path.exists(groups_file):
                with open(groups_file, 'r') as f:
                    return json.load(f)
            else:
                # Create directory and empty groups file
                os.makedirs(os.path.dirname(groups_file), exist_ok=True)
                with open(groups_file, 'w') as f:
                    json.dump([], f, indent=2)
                return []
        except Exception as e:
            error(f"Error loading groups for router {router_id}: {e}")
            return []
    
    def save_groups(self, router_id: str, groups: List[Dict]) -> bool:
        """Save groups for a specific router"""
        groups_file = self.get_groups_file_path(router_id)
        try:
            os.makedirs(os.path.dirname(groups_file), exist_ok=True)
            with open(groups_file, 'w') as f:
                json.dump(groups, f, indent=2)
            return True
        except Exception as e:
            error(f"Error saving groups for router {router_id}: {e}")
            return False
    
    def get_all_routers_status(self) -> List[Dict]:
        """Get status for all routers"""
        status_list = []
        for router_id, router in self.routers.items():
            status = {
                'id': router_id,
                'name': router['name'],
                'host': router['host'],
                'enabled': router.get('enabled', True),
                'connection_status': router.get('connection_status', 'unknown'),
                'last_connection': router.get('last_connection'),
                'description': router.get('description', '')
            }
            status_list.append(status)
        return status_list

# Global router manager instance
router_manager = RouterManager() 