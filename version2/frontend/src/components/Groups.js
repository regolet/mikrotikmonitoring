import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:80/api';

function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(20);

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

  const handleSelectAll = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(filteredGroups.map(group => group.id));
    }
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

  // Filter groups based on search term
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginate groups
  const paginatedGroups = rowsPerPage > 0 
    ? filteredGroups.slice(0, rowsPerPage) 
    : filteredGroups;

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid mt-4">
        <div className="alert alert-danger" role="alert">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-0">Groups</h4>
              {selectedGroups.length > 0 && (
                <button 
                  onClick={handleDeleteGroups}
                  className="btn btn-danger btn-sm"
                >
                  <i className="bi bi-trash me-1"></i>
                  Delete Selected ({selectedGroups.length})
                </button>
              )}
            </div>
            <div className="card-body">
              {/* Search and Controls */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6 text-md-end">
                  <select 
                    className="form-select form-select-sm d-inline-block w-auto"
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                  >
                    <option value={10}>10 rows</option>
                    <option value={20}>20 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                    <option value={0}>All</option>
                  </select>
                </div>
              </div>

              {/* Groups Table */}
              {filteredGroups.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-people display-4"></i>
                  <p className="mt-2">
                    {searchTerm ? 'No groups found matching your search.' : 'No groups found. Create your first group to get started.'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-sm">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedGroups.length === filteredGroups.length && filteredGroups.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Members</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedGroups.map(group => (
                        <tr key={group.id}>
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedGroups.includes(group.id)}
                              onChange={() => handleGroupToggle(group.id)}
                            />
                          </td>
                          <td>
                            <strong>{group.name}</strong>
                          </td>
                          <td>
                            <span className="text-muted">
                              {group.description || 'No description'}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {group.members ? group.members.length : 0} members
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-primary">
                                <i className="bi bi-eye"></i>
                              </button>
                              <button className="btn btn-outline-secondary">
                                <i className="bi bi-pencil"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Info */}
              {filteredGroups.length > 0 && (
                <div className="row mt-3">
                  <div className="col-12 text-end">
                    <small className="text-muted">
                      Showing {paginatedGroups.length} of {filteredGroups.length} groups
                      {searchTerm && ` matching "${searchTerm}"`}
                    </small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Groups; 