"""
Logger module for MikroTik monitoring app.
Stores logs in memory and makes them available via API.
"""

import time
from typing import Dict, List

# In-memory log storage
logs = []
max_logs = 1000  # Maximum number of logs to store


def log(level: str, message: str, source: str = None) -> None:
    """
    Add a log entry to the in-memory log store.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR)
        message: Log message
        source: Source of the log (function name, class, etc.)
    """
    global logs
    
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    log_entry = {
        'timestamp': timestamp,
        'level': level,
        'message': message,
        'source': source or 'app'
    }
    
    # Add to log store
    logs.append(log_entry)
    
    # Keep log size under control
    if len(logs) > max_logs:
        logs = logs[-max_logs:]


def get_logs(count: int = None, level: str = None) -> List[Dict]:
    """
    Get logs from the in-memory store.
    
    Args:
        count: Number of logs to return (default: all)
        level: Filter by log level
        
    Returns:
        List of log entries
    """
    filtered_logs = logs
    
    # Filter by level if specified
    if level:
        filtered_logs = [log for log in filtered_logs if log['level'] == level]
    
    # Return specified count or all
    if count is not None:
        return filtered_logs[-count:]
    return filtered_logs


def clear_logs() -> None:
    """Clear all logs from memory."""
    global logs
    logs = []


# Log level convenience functions
def debug(message: str, source: str = None) -> None:
    """Log a debug message."""
    log('DEBUG', message, source)


def info(message: str, source: str = None) -> None:
    """Log an info message."""
    log('INFO', message, source)


def warning(message: str, source: str = None) -> None:
    """Log a warning message."""
    log('WARNING', message, source)


def error(message: str, source: str = None) -> None:
    """Log an error message."""
    log('ERROR', message, source)
