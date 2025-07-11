import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:80/api";

const initialRouterForm = {
  name: "",
  description: "",
  host: "",
  port: 8728,
  username: "",
  password: "",
  use_ssl: false,
};

function Settings() {
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRouter, setEditRouter] = useState(null);
  const [routerForm, setRouterForm] = useState(initialRouterForm);
  const [testConnLoading, setTestConnLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchRouters();
  }, []);

  const fetchRouters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/routers`);
      setRouters(res.data.routers || []);
    } catch (err) {
      setError("Failed to fetch routers");
    } finally {
      setLoading(false);
    }
  };

  const handleRouterFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRouterForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openAddModal = () => {
    setRouterForm(initialRouterForm);
    setShowAddModal(true);
  };

  const openEditModal = (router) => {
    setEditRouter(router);
    setRouterForm({
      name: router.name || "",
      description: router.description || "",
      host: router.host || "",
      port: router.port || 8728,
      username: router.username || router.user || router.router_user || "",
      password: "", // don't prefill password
      use_ssl: !!router.use_ssl,
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditRouter(null);
    setRouterForm(initialRouterForm);
  };

  const handleAddRouter = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/routers`, routerForm);
      setRouters((prev) => [...prev, res.data.router]);
      closeModals();
      showSuccess("Router Added", "Router added successfully");
    } catch (err) {
      showError(
        "Add Error",
        err.response?.data?.error || "Failed to add router",
      );
    }
  };

  const handleEditRouter = async (e) => {
    e.preventDefault();
    if (!editRouter) return;

    const routerData = {
      id: editRouter.id,
      ...routerForm,
    };

    if (
      !routerData.id ||
      !routerData.name ||
      !routerData.host ||
      isNaN(routerData.port) ||
      !routerData.username
    ) {
      showError(
        "Validation Error",
        "All fields except password and description are required.",
      );
      return;
    }

    try {
      const res = await axios.put(`${API_BASE_URL}/routers`, routerData);
      setRouters((prev) =>
        prev.map((r) => (r.id === editRouter.id ? res.data.router : r)),
      );
      closeModals();
      showSuccess("Router Updated", "Router updated successfully");
    } catch (err) {
      showError(
        "Update Error",
        err.response?.data?.error || "Failed to update router",
      );
    }
  };

  const handleDeleteRouter = async (id) => {
    if (!window.confirm("Are you sure you want to delete this router?")) return;
    setDeleteLoading(true);
    setDeleteId(id);
    try {
      await axios.delete(`${API_BASE_URL}/routers/${id}`);
      setRouters((prev) => prev.filter((r) => r.id !== id));
      showSuccess("Router Deleted", "Router deleted successfully");
    } catch (err) {
      showError(
        "Delete Error",
        err.response?.data?.error || "Failed to delete router",
      );
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const handleTestRouterConnection = async (routerId) => {
    setTestConnLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/routers/test`, {
        router_id: routerId,
      });
      if (res.data.success && res.data.connected) {
        showSuccess(
          "Connection Test",
          `Successfully connected to ${res.data.router_name}`,
        );
      } else {
        showError(
          "Connection Test",
          res.data.error || "Failed to connect to router",
        );
      }
    } catch (err) {
      showError("Connection Test", "Failed to test connection");
    } finally {
      setTestConnLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "connected":
        return "bi-wifi";
      case "disconnected":
        return "bi-wifi-off";
      default:
        return "bi-question-circle";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "connected":
        return "text-success";
      case "disconnected":
        return "text-danger";
      default:
        return "text-warning";
    }
  };

  const showSuccess = (title, message) => {
    // Simple success notification
    console.log(`SUCCESS: ${title} - ${message}`);
  };

  const showError = (title, message) => {
    // Simple error notification
    console.log(`ERROR: ${title} - ${message}`);
  };

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading settings...</p>
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
      {/* Router Management Section */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3>Router Management</h3>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openAddModal}
          >
            <i className="bi bi-plus-circle"></i> Add Router
          </button>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table
              className="table table-striped table-hover"
              id="routers-table"
            >
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Host</th>
                  <th>Status</th>
                  <th>Last Connection</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">
                      No routers configured
                    </td>
                  </tr>
                ) : (
                  routers.map((router) => (
                    <tr key={router.id}>
                      <td>{router.name}</td>
                      <td>{router.host}</td>
                      <td>
                        <i
                          className={`bi ${getStatusIcon(router.connection_status)} ${getStatusClass(router.connection_status)}`}
                        ></i>{" "}
                        {router.connection_status || "unknown"}
                      </td>
                      <td>
                        {router.last_connection
                          ? new Date(router.last_connection).toLocaleString()
                          : "Never"}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() =>
                              handleTestRouterConnection(router.id)
                            }
                            disabled={testConnLoading}
                          >
                            <i className="bi bi-wifi"></i> Test
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => openEditModal(router)}
                          >
                            <i className="bi bi-pencil"></i> Edit
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteRouter(router.id)}
                            disabled={deleteLoading && deleteId === router.id}
                          >
                            <i className="bi bi-trash"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Router Modal */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Router</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModals}
                ></button>
              </div>
              <form onSubmit={handleAddRouter}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="router-name" className="form-label">
                      Router Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={routerForm.name}
                      onChange={handleRouterFormChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="router-description" className="form-label">
                      Description
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="description"
                      value={routerForm.description}
                      onChange={handleRouterFormChange}
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label htmlFor="router-host" className="form-label">
                          Host/IP Address
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="host"
                          value={routerForm.host}
                          onChange={handleRouterFormChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="router-port" className="form-label">
                          Port
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          name="port"
                          value={routerForm.port}
                          onChange={handleRouterFormChange}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="router-username" className="form-label">
                          Username
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="username"
                          value={routerForm.username}
                          onChange={handleRouterFormChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="router-password" className="form-label">
                          Password
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          name="password"
                          value={routerForm.password}
                          onChange={handleRouterFormChange}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="use_ssl"
                        checked={routerForm.use_ssl}
                        onChange={handleRouterFormChange}
                        id="router-ssl"
                      />
                      <label className="form-check-label" htmlFor="router-ssl">
                        Use SSL/TLS
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModals}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Router
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Router Modal */}
      {showEditModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Router</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModals}
                ></button>
              </div>
              <form onSubmit={handleEditRouter}>
                <div className="modal-body">
                  <input
                    type="hidden"
                    name="edit-router-id"
                    value={editRouter?.id || ""}
                  />
                  <div className="mb-3">
                    <label htmlFor="edit-router-name" className="form-label">
                      Router Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={routerForm.name}
                      onChange={handleRouterFormChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="edit-router-description"
                      className="form-label"
                    >
                      Description
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="description"
                      value={routerForm.description}
                      onChange={handleRouterFormChange}
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label
                          htmlFor="edit-router-host"
                          className="form-label"
                        >
                          Host/IP Address
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="host"
                          value={routerForm.host}
                          onChange={handleRouterFormChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label
                          htmlFor="edit-router-port"
                          className="form-label"
                        >
                          Port
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          name="port"
                          value={routerForm.port}
                          onChange={handleRouterFormChange}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label
                          htmlFor="edit-router-username"
                          className="form-label"
                        >
                          Username
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="username"
                          value={routerForm.username}
                          onChange={handleRouterFormChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label
                          htmlFor="edit-router-password"
                          className="form-label"
                        >
                          Password
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          name="password"
                          value={routerForm.password}
                          onChange={handleRouterFormChange}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="use_ssl"
                        checked={routerForm.use_ssl}
                        onChange={handleRouterFormChange}
                        id="edit-router-ssl"
                      />
                      <label
                        className="form-check-label"
                        htmlFor="edit-router-ssl"
                      >
                        Use SSL/TLS
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModals}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Router
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
