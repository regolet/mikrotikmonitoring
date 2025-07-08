import routeros_api
import ssl
import socket
import traceback
from typing import Dict, List, Union, Optional
from datetime import datetime
import logger

class MikroTikClient:
    """
    Client for interacting with MikroTik routers using the RouterOS API.
    """
    
    def __init__(self, host: str, user: str, password: str, port: int = 8728, use_ssl: bool = False):
        """
        Initialize the MikroTik client.
        
        Args:
            host: Router IP address or hostname
            user: Router username
            password: Router password
            port: Router API port (default: 8728, SSL: 8729)
            use_ssl: Whether to use SSL for the connection
        """
        self.host = host
        self.user = user
        self.password = password
        self.port = port
        self.use_ssl = use_ssl
        self.connection = None
        self.api = None
        self.connected = False
        self.error_message = None
    
    def connect(self) -> bool:
        """
        Connect to the MikroTik router.
        
        Returns:
            bool: True if connection was successful, False otherwise
        """
        logger.debug(f"Attempting to connect to {self.host}:{self.port} as {self.user}", "MikroTikClient.connect")
        try:
            if self.use_ssl:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                
                connection_params = {
                    'host': self.host,
                    'username': self.user,
                    'password': self.password,
                    'port': self.port,
                    'ssl_wrapper': ssl_context.wrap_socket,
                    'plaintext_login': True
                }
            else:
                connection_params = {
                    'host': self.host,
                    'username': self.user,
                    'password': self.password,
                    'port': self.port,
                    'plaintext_login': True
                }
            
            logger.debug(f"Connection parameters: { {k: '*****' if k == 'password' else v for k, v in connection_params.items()} }", "MikroTikClient.connect")
            
            self.api = routeros_api.RouterOsApiPool(**connection_params)
            logger.debug("Created RouterOS API pool", "MikroTikClient.connect")
            
            # Test the connection with a simple command
            try:
                self.connection = self.api.get_api()
                logger.debug("Successfully obtained API connection", "MikroTikClient.connect")
                
                # Test if we can actually execute a command
                test = self.connection.get_resource('/system/resource').get()
                logger.debug(f"Test command result: {test}", "MikroTikClient.connect")
                
                self.connected = True
                logger.info("Connection successful!", "MikroTikClient.connect")
                return True
                
            except Exception as e:
                logger.error(f"Failed to get API connection: {str(e)}", "MikroTikClient.connect")
                self.error_message = f"API Connection failed: {str(e)}"
                self.connected = False
                return False
            
        except Exception as e:
            error_details = traceback.format_exc()
            logger.error(f"Connection failed: {str(e)}", "MikroTikClient.connect")
            logger.debug(f"Error details: {error_details}", "MikroTikClient.connect")
            self.error_message = str(e)
            self.connected = False
            return False
    
    def disconnect(self) -> None:
        """
        Disconnect from the MikroTik router.
        """
        if self.api:
            self.api.disconnect()
            self.connected = False
    
    def get_system_resources(self) -> Optional[Dict]:
        """
        Get system resources (CPU, memory, etc.).
        
        Returns:
            dict: System resources information or None if failed
        """
        if not self.connected:
            return None
            
        try:
            resource_list = self.connection.get_resource('/system/resource')
            return resource_list[0] if resource_list else None
        except Exception as e:
            self.error_message = str(e)
            return None
    
    def get_resources(self) -> Optional[Dict]:
        """
        Get system resources - alias for get_system_resources.
        
        Returns:
            dict: System resources information or None if failed
        """
        return self.get_system_resources()
    
    def get_system_identity(self) -> Optional[str]:
        """
        Get router identity (name).
        
        Returns:
            str: Router name or None if failed
        """
        if not self.connected:
            return None
            
        try:
            identity = self.connection.get_resource('/system/identity')
            return identity[0].get('name') if identity else None
        except Exception as e:
            self.error_message = str(e)
            return None
    
    def get_identity(self) -> Optional[str]:
        """
        Get router identity (name) - alias for get_system_identity.
        
        Returns:
            str: Router name or None if failed
        """
        return self.get_system_identity()
    
    def get_interfaces(self) -> Optional[List[Dict]]:
        """
        Get network interfaces information.
        
        Returns:
            list: List of interfaces information or None if failed
        """
        if not self.connected:
            logger.error("get_interfaces: Not connected to router", "MikroTikClient.get_interfaces")
            return None
            
        try:
            logger.debug("Fetching network interfaces...", "MikroTikClient.get_interfaces")
            # Get interface resource and convert to a list before returning
            resource = self.connection.get_resource('/interface')
            
            if resource is None:
                logger.debug("No interfaces resource found", "MikroTikClient.get_interfaces")
                return []
                
            # Convert to list explicitly with get() method
            interfaces = list(resource.get())
            logger.debug(f"Found {len(interfaces)} interfaces", "MikroTikClient.get_interfaces")
            return interfaces
            
        except Exception as e:
            error_msg = f"Error getting interfaces: {str(e)}"
            logger.error(error_msg, "MikroTikClient.get_interfaces")
            logger.debug(traceback.format_exc(), "MikroTikClient.get_interfaces")
            self.error_message = error_msg
            return None
    
    def get_interface_traffic(self, interface_name: str = None) -> Optional[List[Dict]]:
        """
        Get interface traffic information.
        
        Args:
            interface_name: Name of the interface to get traffic for (or None for all)
            
        Returns:
            list: Traffic information or None if failed
        """
        if not self.connected:
            return None
            
        try:
            if interface_name:
                return self.connection.get_resource('/interface/monitor-traffic', 
                                                 {'interface': interface_name, 'once': ''})
            else:
                return self.connection.get_resource('/interface/monitor-traffic', 
                                                 {'once': ''})
        except Exception as e:
            self.error_message = str(e)
            return None
    
    def get_active_hotspot_users(self) -> Optional[List[Dict]]:
        """
        Get active hotspot users.
        
        Returns:
            list: List of active hotspot users or None if failed
        """
        if not self.connected:
            return None
            
        try:
            # Convert resource to a list before returning
            resource = self.connection.get_resource('/ip/hotspot/active')
            return list(resource) if resource else []
        except Exception as e:
            self.error_message = str(e)
            return None
    
    def get_hotspot_users(self) -> Optional[List[Dict]]:
        """
        Get active hotspot users - alias for get_active_hotspot_users.
        
        Returns:
            list: List of active hotspot users or None if failed
        """
        return self.get_active_hotspot_users()
    
    def get_dhcp_leases(self) -> Optional[List[Dict]]:
        """
        Get DHCP leases.
        
        Returns:
            list: DHCP leases information or None if failed
        """
        if not self.connected:
            return None
            
        try:
            # Convert resource to a list before returning
            resource = self.connection.get_resource('/ip/dhcp-server/lease')
            return list(resource) if resource else []
        except Exception as e:
            self.error_message = str(e)
            return None
    
    def get_ppp_secrets(self) -> Optional[List[Dict]]:
        """
        Get PPP secrets (accounts).
        Returns:
            list: List of PPP secrets or empty list if none found
        """
        if not self.connected:
            logger.error("get_ppp_secrets: Not connected to router", "MikroTikClient.get_ppp_secrets")
            return []
        try:
            logger.debug("Fetching PPP secrets...", "MikroTikClient.get_ppp_secrets")
            resource = self.connection.get_resource('/ppp/secret')
            if resource is None:
                logger.debug("No PPP secrets resource found", "MikroTikClient.get_ppp_secrets")
                return []
            raw_secrets = resource.get()
            secrets = list(raw_secrets)
            logger.debug(f"Found {len(secrets)} PPP secrets", "MikroTikClient.get_ppp_secrets")
            return secrets
        except Exception as e:
            error_msg = f"Error getting PPP secrets: {str(e)}"
            logger.error(error_msg, "MikroTikClient.get_ppp_secrets")
            import traceback
            logger.debug(traceback.format_exc(), "MikroTikClient.get_ppp_secrets")
            self.error_message = error_msg
            return []
    
    def get_active_ppp_connections(self) -> Optional[List[Dict]]:
        """
        Get active PPP connections.
        
        Returns:
            list: List of active PPP connections or empty list if none found
        """
        if not self.connected:
            logger.error("get_active_ppp_connections: Not connected to router", "MikroTikClient.get_active_ppp_connections")
            return []
        try:
            logger.debug("Fetching active PPP connections...", "MikroTikClient.get_active_ppp_connections")
            resource = self.connection.get_resource('/ppp/active')
            if resource is None:
                logger.debug("No active PPP connections resource found", "MikroTikClient.get_active_ppp_connections")
                return []
            connections = list(resource.get())
            logger.debug(f"Found {len(connections)} active PPP connections", "MikroTikClient.get_active_ppp_connections")
            return connections
        except Exception as e:
            error_msg = f"Error getting active PPP connections: {str(e)}"
            logger.error(error_msg, "MikroTikClient.get_active_ppp_connections")
            import traceback
            logger.debug(traceback.format_exc(), "MikroTikClient.get_active_ppp_connections")
            self.error_message = error_msg
            return []
    
    def get_ppp_active(self) -> Optional[List[Dict]]:
        """
        Get active PPP connections - alias for get_active_ppp_connections.
        
        Returns:
            list: List of active PPP connections or None if failed
        """
        return self.get_active_ppp_connections()
    
    def get_pppoe_interfaces_with_stats(self) -> Optional[List[Dict]]:
        """
        Get PPPoE-in interfaces with their traffic statistics.
        
        Returns:
            list: List of PPPoE-in interfaces with traffic stats or None if failed
        """
        if not self.connected:
            logger.error("get_pppoe_interfaces_with_stats: Not connected to router", "MikroTikClient.get_pppoe_interfaces_with_stats")
            return None
            
        try:
            logger.debug("Fetching PPPoE-in interfaces...", "MikroTikClient.get_pppoe_interfaces_with_stats")
            # Get all interfaces first
            interfaces_resource = self.connection.get_resource('/interface')
            if interfaces_resource is None:
                return None
            all_interfaces = list(interfaces_resource.get())
            
            # Filter for PPPoE-in interfaces
            pppoe_interfaces = [iface for iface in all_interfaces if iface.get('type') == 'pppoe-in']
            logger.debug(f"Found {len(pppoe_interfaces)} PPPoE-in interfaces", "MikroTikClient.get_pppoe_interfaces_with_stats")
            
            # Get the interface statistics from the /interface/print stats command
            # This is a more reliable way to get interface statistics than monitor-traffic
            try:
                # Get detailed interface statistics including bytes
                api_path = '/interface/print'
                params = {
                    'stats': '',  # This flag is important to get statistics
                }
                interface_stats_cmd = self.connection.path(api_path)
                interface_stats_result = interface_stats_cmd(**params)
                
                logger.debug(f"Fetched interface statistics using {api_path}", "MikroTikClient.get_pppoe_interfaces_with_stats")
                
                # Create a mapping of interface name to stats
                interface_stats_map = {}
                for stat in interface_stats_result:
                    interface_stats_map[stat.get('name')] = stat
                    
                logger.debug(f"Created stats map for {len(interface_stats_map)} interfaces", "MikroTikClient.get_pppoe_interfaces_with_stats")
            except Exception as e:
                logger.error(f"Error getting interface statistics: {str(e)}", "MikroTikClient.get_pppoe_interfaces_with_stats")
                interface_stats_map = {}
            
            # Enhance with traffic statistics
            result = []
            for iface in pppoe_interfaces:
                interface_name = iface.get('name')
                logger.debug(f"Processing stats for interface: {interface_name}", "MikroTikClient.get_pppoe_interfaces_with_stats")
                
                # Default to zero for stats
                iface['rx_bytes'] = '0'
                iface['tx_bytes'] = '0'
                iface['rx_rate'] = '0'
                iface['tx_rate'] = '0'
                
                # Try to get stats from the stats map
                if interface_name in interface_stats_map:
                    stats = interface_stats_map[interface_name]
                    logger.debug(f"Found stats for {interface_name}", "MikroTikClient.get_pppoe_interfaces_with_stats")
                    
                    # Get total bytes
                    iface['rx_bytes'] = stats.get('rx-byte', '0')
                    iface['tx_bytes'] = stats.get('tx-byte', '0')
                    
                    # Get current rates
                    iface['rx_rate'] = stats.get('rx-bits-per-second', '0')
                    iface['tx_rate'] = stats.get('tx-bits-per-second', '0')
                    
                    # Ensure important fields are preserved from original interface data
                    # Use the exact same field names as expected in the template
                    if 'client-mac-address' in stats:
                        iface['mac-address'] = stats.get('client-mac-address')
                    if 'last-link-up-time' in stats:
                        iface['last-link-up-time'] = stats.get('last-link-up-time')
                    
                    logger.debug(f"Stats for {interface_name}: RX={iface['rx_bytes']} bytes, TX={iface['tx_bytes']} bytes", 
                               "MikroTikClient.get_pppoe_interfaces_with_stats")
                    logger.debug(f"Rates for {interface_name}: RX={iface['rx_rate']} bps, TX={iface['tx_rate']} bps", 
                               "MikroTikClient.get_pppoe_interfaces_with_stats")
                else:
                    # If interface isn't in the stats map, try to get stats directly
                    # using the monitor-traffic command as fallback
                    try:
                        logger.debug(f"Trying monitor-traffic for {interface_name}", "MikroTikClient.get_pppoe_interfaces_with_stats")
                        traffic_resource = self.connection.path('/interface/monitor-traffic')
                        traffic_stats = traffic_resource('once', {'interface': interface_name})
                        
                        if traffic_stats and len(traffic_stats) > 0:
                            # Add traffic stats to the interface data
                            iface['rx_bytes'] = traffic_stats[0].get('rx-byte', '0')
                            iface['tx_bytes'] = traffic_stats[0].get('tx-byte', '0')
                            iface['rx_rate'] = traffic_stats[0].get('rx-bits-per-second', '0')
                            iface['tx_rate'] = traffic_stats[0].get('tx-bits-per-second', '0')
                            
                            logger.debug(f"Monitor-traffic stats for {interface_name}: RX={iface['rx_bytes']} bytes, TX={iface['tx_bytes']} bytes", 
                                       "MikroTikClient.get_pppoe_interfaces_with_stats")
                    except Exception as e:
                        logger.error(f"Error getting monitor-traffic stats for {interface_name}: {str(e)}", 
                                    "MikroTikClient.get_pppoe_interfaces_with_stats")
                
                result.append(iface)
            
            return result
            
        except Exception as e:
            error_msg = f"Error getting PPPoE-in interfaces: {str(e)}"
            logger.error(error_msg, "MikroTikClient.get_pppoe_interfaces_with_stats")
            import traceback
            logger.debug(traceback.format_exc(), "MikroTikClient.get_pppoe_interfaces_with_stats")
            self.error_message = error_msg
            return None
    
    def get_pppoe_interfaces(self) -> Optional[List[Dict]]:
        """
        Get PPPoE interfaces - alias for get_pppoe_interfaces_with_stats.
        
        Returns:
            list: List of PPPoE interfaces or None if failed
        """
        return self.get_pppoe_interfaces_with_stats()
    
    def get_aggregate_statistics(self) -> Dict:
        """
        Calculate aggregate statistics from various sources
        
        Returns:
            dict: Dictionary containing aggregate statistics
        """
        if not self.connected:
            logger.error("get_aggregate_statistics: Not connected to router", "MikroTikClient.get_aggregate_statistics")
            return {}
            
        try:
            logger.debug("Calculating aggregate statistics...", "MikroTikClient.get_aggregate_statistics")
            
            stats = {
                'total_accounts': 0,
                'online_accounts': 0,
                'offline_accounts': 0,
                'total_download_bytes': 0,
                'total_upload_bytes': 0,
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # Get PPP secrets (accounts)
            ppp_secrets = self.get_ppp_secrets()
            if ppp_secrets:
                stats['total_accounts'] = len(ppp_secrets)
                # Count enabled/disabled accounts
                stats['enabled_accounts'] = len([s for s in ppp_secrets if s.get('disabled') != 'true'])
                stats['disabled_accounts'] = stats['total_accounts'] - stats['enabled_accounts']
            
            # Get active PPP connections
            active_ppp = self.get_active_ppp_connections()
            if active_ppp:
                stats['online_accounts'] = len(active_ppp)
            
            # Calculate offline accounts (total - online)
            if 'total_accounts' in stats and 'online_accounts' in stats:
                stats['offline_accounts'] = stats['total_accounts'] - stats['online_accounts']
            
            # Get PPPoE interfaces to calculate total traffic
            pppoe_interfaces = self.get_pppoe_interfaces_with_stats()
            if pppoe_interfaces:
                for iface in pppoe_interfaces:
                    # Add up rx/tx bytes across all interfaces
                    rx_bytes = iface.get('rx_bytes', '0')
                    tx_bytes = iface.get('tx_bytes', '0')
                    
                    # Convert to integers for summing
                    try:
                        stats['total_download_bytes'] += int(rx_bytes)
                    except (ValueError, TypeError):
                        pass
                        
                    try:
                        stats['total_upload_bytes'] += int(tx_bytes)
                    except (ValueError, TypeError):
                        pass
            
            return stats
            
        except Exception as e:
            error_msg = f"Error calculating aggregate statistics: {str(e)}"
            logger.error(error_msg, "MikroTikClient.get_aggregate_statistics")
            logger.debug(traceback.format_exc(), "MikroTikClient.get_aggregate_statistics")
            self.error_message = error_msg
            return {}
    
    def get_error(self) -> Optional[str]:
        """
        Get the last error message.
        
        Returns:
            str: Error message or None if no error
        """
        return self.error_message

    def test_connection(self) -> bool:
        """
        Test connection to the MikroTik router without maintaining a persistent connection.
        
        Returns:
            bool: True if connection test was successful, False otherwise
        """
        try:
            logger.debug(f"Testing connection to {self.host}:{self.port} as {self.user}", "MikroTikClient.test_connection")
            if self.use_ssl:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                
                connection_params = {
                    'host': self.host,
                    'username': self.user,
                    'password': self.password,
                    'port': self.port,
                    'ssl_wrapper': ssl_context.wrap_socket,
                    'plaintext_login': True
                }
            else:
                connection_params = {
                    'host': self.host,
                    'username': self.user,
                    'password': self.password,
                    'port': self.port,
                    'plaintext_login': True
                }
            
            # Create a temporary API pool for testing
            temp_api = routeros_api.RouterOsApiPool(**connection_params)
            temp_connection = temp_api.get_api()
            
            # Test with a simple command
            test = temp_connection.get_resource('/system/resource').get()
            
            # Clean up
            temp_api.disconnect()
            
            logger.info("Connection test successful!", "MikroTikClient.test_connection")
            return True
            
        except Exception as e:
            error_details = traceback.format_exc()
            logger.error(f"Connection test failed: {str(e)}", "MikroTikClient.test_connection")
            logger.debug(f"Error details: {error_details}", "MikroTikClient.test_connection")
            self.error_message = str(e)
            return False
