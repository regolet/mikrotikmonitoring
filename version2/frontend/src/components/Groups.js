import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/groups`);
      setGroups(response.data.groups || []);
    } catch (err) {
      setError('Failed to fetch groups');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleAddGroup = async (groupData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/groups`, groupData);
      setGroups([...groups, response.data.group]);
    } catch (err) {
      setError('Failed to add group');
      console.error('Error adding group:', err);
    }
  };

  const handleDeleteGroups = async () => {
    try {
      await Promise.all(
        selectedGroups.map(groupId => 
          axios.delete(`${API_BASE_URL}/groups/${groupId}`)
        )
      );
      setGroups(groups.filter(group => !selectedGroups.includes(group.id)));
      setSelectedGroups([]);
    } catch (err) {
      setError('Failed to delete groups');
      console.error('Error deleting groups:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading groups...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="groups">
      <div className="groups-header">
        <h2>Groups</h2>
        {selectedGroups.length > 0 && (
          <button 
            onClick={handleDeleteGroups}
            className="btn btn-danger"
          >
            Delete Selected ({selectedGroups.length})
          </button>
        )}
      </div>

      <div className="groups-list">
        {groups.map(group => (
          <div key={group.id} className="group-item">
            <input
              type="checkbox"
              checked={selectedGroups.includes(group.id)}
              onChange={() => handleGroupToggle(group.id)}
            />
            <div className="group-info">
              <h3>{group.name}</h3>
              <p>{group.description || 'No description'}</p>
              <div className="group-members">
                Members: {group.members ? group.members.length : 0}
              </div>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="no-groups">
          <p>No groups found. Create your first group to get started.</p>
        </div>
      )}
    </div>
  );
}

export default Groups; 