import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter, useSocket } from '../App';

const API_BASE_URL = 'http://localhost:80/api';

function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', max_members: '' });

  // --- MODAL STATE AND LOGIC ---
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [modalError, setModalError] = useState('');

  const { activeRouterId } = useRouter();
  const socket = useSocket();

  // Move fetchGroups definition above useEffect and wrap in useCallback
  const fetchGroups = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [groupsRes, pppActiveRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/groups?router_id=${activeRouterId}`),
        axios.get(`${API_BASE_URL}/ppp_active`)
      ]);

      if (groupsRes.data.success) {
        const groupsData = groupsRes.data.groups || [];
        const pppActiveData = pppActiveRes.data.success ? pppActiveRes.data.ppp_active || [] : [];
        const onlineUsernames = new Set(pppActiveData.map(conn => conn.name));
        const processedGroups = groupsData.map(group => ({
          ...group,
          accounts: (group.accounts || []).map(account => ({
            name: typeof account === 'string' ? account : account.name,
            online: onlineUsernames.has(typeof account === 'string' ? account : account.name)
          }))
        }));
        setGroups(processedGroups);
        setError(null);
      } else {
        setError(groupsRes.data.error || 'Failed to load groups');
      }
    } catch (err) {
      setError('Failed to load groups');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [activeRouterId]);

  // Update all useEffect hooks to include fetchGroups in dependency array
  useEffect(() => {
    fetchGroups(true); // Show spinner on first load or router change
  }, [activeRouterId, fetchGroups]);

  // Add 5-second polling for groups updates (background, no spinner)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGroups(false); // Don't show spinner on polling
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRouterId, fetchGroups]);

  // If you want real-time group updates:
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      fetchGroups(false);
    };
    socket.on('groups_update', handler);
    return () => {
      socket.off('groups_update', handler);
    };
  }, [activeRouterId, socket, fetchGroups]);

  // Helper: Get all accounts already assigned to other groups (except current group in edit)
  const getUsedAccounts = (excludeGroupId = null) => {
    let used = new Set();
    groups.forEach(g => {
      if (!excludeGroupId || g.id !== excludeGroupId) {
        (g.accounts || []).forEach(acc => {
          const accountName = typeof acc === 'string' ? acc : acc.name;
          if (accountName) used.add(accountName);
        });
      }
    });
    return used;
  };

  // Helper: Load all PPP accounts (usernames)
  const loadAllAccounts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/ppp_accounts`);
      if (res.data.success && Array.isArray(res.data.ppp_accounts)) {
        return res.data.ppp_accounts.map(a => a.name);
      }
    } catch {}
    return [];
  };

  // Helper: Get filtered available accounts (always exclude selected)
  const getFilteredAvailableAccounts = () => {
    return availableAccounts.filter(acc => !selectedAccounts.includes(acc));
  };

  // Open Add Group Modal
  const openAddModal = async () => {
    setShowAddModal(true);
    setNewGroup({ name: '', description: '', max_members: '' });
    setSelectedAccounts([]);
    setAvailableSearch('');
    setSelectedSearch('');
    setModalError('');
    
    // Load all accounts and exclude those already in any group
    const allAccounts = await loadAllAccounts();
    const usedAccounts = getUsedAccounts();
    const availableAccounts = allAccounts.filter(acc => !usedAccounts.has(acc));
    setAvailableAccounts(availableAccounts);
  };

  // Open Edit Group Modal
  const openEditModal = async (group) => {
    setEditingGroup(group);
    setShowEditModal(true);
    setNewGroup({
      name: group.name,
      description: group.description || '',
      max_members: group.max_members || ''
    });
    
    // Get current group's account names
    const currentGroupAccounts = (group.accounts || []).map(acc => 
      typeof acc === 'string' ? acc : acc.name
    );
    setSelectedAccounts(currentGroupAccounts);
    setAvailableSearch('');
    setSelectedSearch('');
    setModalError('');
    
    // Load all accounts and exclude those in other groups, but include current group's members
    const allAccounts = await loadAllAccounts();
    const usedAccounts = getUsedAccounts(group.id);
    const availableAccounts = allAccounts.filter(acc => 
      !usedAccounts.has(acc) || currentGroupAccounts.includes(acc)
    );
    setAvailableAccounts(availableAccounts);
  };

  // Transfer members between lists
  const addMembers = () => {
    const toAdd = availableAccounts.filter(a => a.toLowerCase().includes(availableSearch.toLowerCase()));
    const newSelected = [...selectedAccounts, ...toAdd];
    setSelectedAccounts(newSelected);
    setAvailableAccounts(availableAccounts.filter(a => !toAdd.includes(a)));
  };
  
  const removeMembers = () => {
    const toRemove = selectedAccounts.filter(a => a.toLowerCase().includes(selectedSearch.toLowerCase()));
    const newSelected = selectedAccounts.filter(a => !toRemove.includes(a));
    setSelectedAccounts(newSelected);
    setAvailableAccounts([...availableAccounts, ...toRemove]);
  };

  // Update available accounts when editing (to exclude accounts from other groups)
  const updateAvailableAccountsForEdit = async () => {
    if (!editingGroup) return;
    
    const allAccounts = await loadAllAccounts();
    const usedAccounts = getUsedAccounts(editingGroup.id);
    const currentSelected = selectedAccounts;
    
    // Filter out accounts used in other groups, but keep current group's members
    const available = allAccounts.filter(acc => 
      !usedAccounts.has(acc) || currentSelected.includes(acc)
    );
    
    setAvailableAccounts(available);
  };

  // Enhanced transfer functions for edit modal
  const addMembersEdit = () => {
    const toAdd = availableAccounts.filter(a => a.toLowerCase().includes(availableSearch.toLowerCase()));
    const newSelected = [...selectedAccounts, ...toAdd];
    setSelectedAccounts(newSelected);
    setAvailableAccounts(availableAccounts.filter(a => !toAdd.includes(a)));
  };
  
  const removeMembersEdit = () => {
    const toRemove = selectedAccounts.filter(a => a.toLowerCase().includes(selectedSearch.toLowerCase()));
    const newSelected = selectedAccounts.filter(a => !toRemove.includes(a));
    setSelectedAccounts(newSelected);
    setAvailableAccounts([...availableAccounts, ...toRemove]);
    
    // Update available list to maintain exclusion rules
    setTimeout(() => {
      updateAvailableAccountsForEdit();
    }, 0);
  };

  // Validation
  const validateGroup = (isEdit = false) => {
    if (!newGroup.name.trim()) return 'Group name is required.';
    if (!isEdit && groups.some(g => g.name.toLowerCase() === newGroup.name.trim().toLowerCase())) return 'Group name must be unique.';
    if (newGroup.max_members && selectedAccounts.length > parseInt(newGroup.max_members)) return 'Selected members exceed max members.';
    return '';
  };

  // Save/Add Group
  const handleSaveGroup = async () => {
    const err = validateGroup(false);
    if (err) return setModalError(err);
    try {
      const payload = {
        name: newGroup.name.trim(),
        description: newGroup.description,
        max_members: newGroup.max_members ? parseInt(newGroup.max_members) : undefined,
        accounts: selectedAccounts
      };
      const res = await axios.post(`${API_BASE_URL}/groups?router_id=${activeRouterId}`, payload);
      if (res.data.success) {
        setShowAddModal(false);
        setModalError('');
        fetchGroups();
      } else {
        setModalError(res.data.error || 'Failed to save group.');
      }
    } catch (e) {
      setModalError('Failed to save group.');
    }
  };

  // Update/Edit Group
  const handleUpdateGroup = async () => {
    const err = validateGroup(true);
    if (err) return setModalError(err);
    try {
      const payload = {
        id: editingGroup.id,
        name: newGroup.name.trim(),
        description: newGroup.description,
        max_members: newGroup.max_members ? parseInt(newGroup.max_members) : undefined,
        accounts: selectedAccounts
      };
      const res = await axios.put(`${API_BASE_URL}/groups?router_id=${activeRouterId}`, payload);
      if (res.data.success) {
        setShowEditModal(false);
        setModalError('');
        fetchGroups();
      } else {
        setModalError(res.data.error || 'Failed to update group.');
      }
    } catch (e) {
      setModalError('Failed to update group.');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    
    try {
      const res = await axios.delete(`${API_BASE_URL}/groups?id=${groupId}&router_id=${activeRouterId}`);
      if (res.data.success) {
        fetchGroups();
      } else {
        setError(res.data.error || 'Failed to delete group.');
      }
    } catch (err) {
      setError('Failed to delete group.');
    }
  };

  // Filter and sort groups
  const filteredAndSortedGroups = groups
    .filter(group => {
      const members = group.accounts || [];
      return (
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        members.some(member => member.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })
    .sort((a, b) => {
      // Sort by priority: Red (offline) first, then Orange, then Blue, then Green
      const getPriority = (group) => {
        const totalMembers = group.accounts ? group.accounts.length : 0;
        if (totalMembers === 0) return 3; // Blue for no members
        
        const onlineMembers = group.accounts ? group.accounts.filter(acc => acc.online).length : 0;
        const offlineMembers = totalMembers - onlineMembers;
        const onlinePercentage = (onlineMembers / totalMembers) * 100;
        
        if (onlinePercentage === 0 || offlineMembers >= totalMembers * 0.5) {
          return 0; // Red - highest priority
        } else if (offlineMembers === totalMembers * 0.5) {
          return 1; // Orange
        } else if (onlinePercentage === 100) {
          return 3; // Green - lowest priority
        } else {
          return 2; // Blue
        }
      };
      
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower priority number = higher display priority
      }
      
      // If same priority, sort by name
      return (a.name || '').localeCompare(b.name || '');
    });

  if (loading && isInitialLoad) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid mt-4">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Groups Management</h3>
            <button className="btn btn-primary" onClick={openAddModal}>
              <i className="bi bi-plus-circle"></i> Add Group
            </button>
          </div>
          <div className="row">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search groups by name, description, or members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button" 
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {filteredAndSortedGroups.length === 0 ? (
            <div className="alert alert-info">
              {searchTerm ? `No groups found matching "${searchTerm}".` : 'No groups found. Create your first group!'}
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {filteredAndSortedGroups.map(group => {
                // Calculate online/offline status
                const totalMembers = group.accounts ? group.accounts.length : 0;
                const onlineMembers = group.accounts ? group.accounts.filter(acc => acc.online).length : 0;
                const offlineMembers = totalMembers - onlineMembers;
                
                // Determine header color based on status
                let headerClass = 'bg-primary'; // default
                if (totalMembers > 0) {
                  const onlinePercentage = (onlineMembers / totalMembers) * 100;
                  if (onlinePercentage === 100) {
                    headerClass = 'bg-success'; // All online - Green
                  } else if (onlinePercentage === 0) {
                    headerClass = 'bg-danger'; // All offline - Red
                  } else if (offlineMembers >= totalMembers * 0.5) {
                    headerClass = 'bg-danger'; // >50% offline - Red
                  } else if (offlineMembers === totalMembers * 0.5) {
                    headerClass = 'bg-warning'; // Exactly 50% offline - Orange
                  } else {
                    headerClass = 'bg-primary'; // <50% offline - Blue
                  }
                }
                
                return (
                  <div key={group.id} className="col">
                    <div className="card h-100 shadow-sm">
                      <div className={`card-header ${headerClass} text-white`}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-3">
                            <h5 className="card-title mb-0">{group.name}</h5>
                            <span className={`badge ${onlineMembers === 0 ? 'bg-danger' : 'bg-success'}`}>
                              Online: {onlineMembers}
                            </span>
                            <span className={`badge ${offlineMembers === 0 ? 'bg-success' : 'bg-secondary'}`}>
                              Offline: {offlineMembers}
                            </span>
                            {typeof group.max_members === 'number' ? (
                              <span className="badge bg-info text-dark">{totalMembers}/{group.max_members}</span>
                            ) : (
                              <span className="badge bg-info text-dark">{totalMembers}</span>
                            )}
                          </div>
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-sm btn-outline-light"
                              onClick={() => openEditModal(group)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-light"
                              onClick={() => handleDeleteGroup(group.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="card-body">
                        {group.description && (
                          <p className="card-text text-muted mb-3">
                            <em>{group.description}</em>
                          </p>
                        )}
                        <p className="card-text">
                          <strong>Members:</strong><br />
                          <span>
                            {group.accounts && group.accounts.length > 0 ? (
                              group.accounts.map(acc => (
                                <span 
                                  key={acc.name} 
                                  className={`badge me-1 ${acc.online ? 'bg-success' : 'bg-danger'}`}
                                >
                                  {acc.name}
                                </span>
                              ))
                            ) : (
                              'No members'
                            )}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Group Modal */}
      <div className={`modal fade ${showAddModal ? 'show' : ''}`} 
           style={{ display: showAddModal ? 'block' : 'none' }} 
           tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add New Group</h5>
              <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
            </div>
            <div className="modal-body">
              {modalError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {modalError}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Group Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Enter a description for this group (optional)"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Max Members <span className="text-muted small">(optional, blank = no limit)</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  placeholder="Leave blank for no limit"
                  value={newGroup.max_members}
                  onChange={(e) => setNewGroup({...newGroup, max_members: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Group Members</label>
                <div className="row">
                  <div className="col-md-5">
                    <label className="form-label text-muted">Available Accounts</label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="Search accounts..."
                      value={availableSearch}
                      onChange={(e) => setAvailableSearch(e.target.value)}
                    />
                    <select className="form-select" size="12" multiple>
                      {getFilteredAvailableAccounts()
                        .filter(acc => acc.toLowerCase().includes(availableSearch.toLowerCase()))
                        .map(acc => (
                          <option key={acc} value={acc}>{acc}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="col-md-2 d-flex flex-column justify-content-center align-items-center">
                    <button type="button" className="btn btn-sm btn-outline-primary mb-2" onClick={addMembers}>
                      <i className="bi bi-arrow-right"></i>
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={removeMembers}>
                      <i className="bi bi-arrow-left"></i>
                    </button>
                  </div>
                  <div className="col-md-5">
                    <label className="form-label text-muted">Selected Members</label>
                    <select className="form-select" size="12" multiple>
                      {selectedAccounts
                        .filter(acc => acc.toLowerCase().includes(selectedSearch.toLowerCase()))
                        .map(acc => (
                          <option key={acc} value={acc}>{acc}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveGroup}>
                Save Group
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Group Modal */}
      <div className={`modal fade ${showEditModal ? 'show' : ''}`} 
           style={{ display: showEditModal ? 'block' : 'none' }} 
           tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Group</h5>
              <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
            </div>
            <div className="modal-body">
              {modalError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {modalError}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Group Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Enter a description for this group (optional)"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Max Members <span className="text-muted small">(optional, blank = no limit)</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  placeholder="Leave blank for no limit"
                  value={newGroup.max_members}
                  onChange={(e) => setNewGroup({...newGroup, max_members: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Group Members</label>
                <div className="row">
                  <div className="col-md-5">
                    <label className="form-label text-muted">Available Accounts</label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="Search accounts..."
                      value={availableSearch}
                      onChange={(e) => setAvailableSearch(e.target.value)}
                    />
                    <select className="form-select" size="12" multiple>
                      {getFilteredAvailableAccounts()
                        .filter(acc => acc.toLowerCase().includes(availableSearch.toLowerCase()))
                        .map(acc => (
                          <option key={acc} value={acc}>{acc}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="col-md-2 d-flex flex-column justify-content-center align-items-center">
                    <button type="button" className="btn btn-sm btn-outline-primary mb-2" onClick={addMembersEdit}>
                      <i className="bi bi-arrow-right"></i>
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={removeMembersEdit}>
                      <i className="bi bi-arrow-left"></i>
                    </button>
                  </div>
                  <div className="col-md-5">
                    <label className="form-label text-muted">Selected Members</label>
                    <select className="form-select" size="12" multiple>
                      {selectedAccounts
                        .filter(acc => acc.toLowerCase().includes(selectedSearch.toLowerCase()))
                        .map(acc => (
                          <option key={acc} value={acc}>{acc}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleUpdateGroup}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Backdrop */}
      {(showAddModal || showEditModal) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
}

export default Groups; 