import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:80/api';

function Settings() {
  const [routers, setRouters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRouter, setActiveRouter] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routersResponse, categoriesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/routers`),
        axios.get(`${API_BASE_URL}/categories`)
      ]);

      setRouters(routersResponse.data.routers || []);
      setCategories(categoriesResponse.data.categories || []);
      
      // Set first router as active if available
      if (routersResponse.data.routers && routersResponse.data.routers.length > 0) {
        setActiveRouter(routersResponse.data.routers[0].id);
      }
    } catch (err) {
      setError('Failed to fetch settings data');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRouterChange = async (routerId) => {
    try {
      await axios.post(`${API_BASE_URL}/routers/active`, { router_id: routerId });
      setActiveRouter(routerId);
    } catch (err) {
      setError('Failed to change active router');
      console.error('Error changing router:', err);
    }
  };

  const handleAddRouter = async (routerData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/routers`, routerData);
      setRouters([...routers, response.data.router]);
    } catch (err) {
      setError('Failed to add router');
      console.error('Error adding router:', err);
    }
  };

  const handleAddCategory = async (categoryData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/categories`, categoryData);
      setCategories([...categories, response.data.category]);
    } catch (err) {
      setError('Failed to add category');
      console.error('Error adding category:', err);
    }
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
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">Settings</h2>
        </div>
      </div>

      {/* Routers Section */}
      <div className="row">
        <div className="col-12">
          <div className="card mb-4">
            <div className="card-header">
              <h4 className="mb-0">Routers</h4>
            </div>
            <div className="card-body">
              {routers.length === 0 ? (
                <div className="text-center text-muted">
                  <i className="bi bi-router display-4"></i>
                  <p className="mt-2">No routers configured</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Host</th>
                        <th>Port</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routers.map((router, index) => (
                        <tr key={router.id || `router-${index}`}>
                          <td>
                            <strong>{router.name}</strong>
                          </td>
                          <td>{router.host}</td>
                          <td>{router.port}</td>
                          <td>
                            <span className={`badge ${activeRouter === router.id ? 'bg-success' : 'bg-secondary'}`}>
                              {activeRouter === router.id ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button 
                              onClick={() => handleRouterChange(router.id)}
                              className={`btn btn-sm ${activeRouter === router.id ? 'btn-success' : 'btn-outline-primary'}`}
                              disabled={activeRouter === router.id}
                            >
                              {activeRouter === router.id ? 'Active' : 'Set Active'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="row">
        <div className="col-12">
          <div className="card mb-4">
            <div className="card-header">
              <h4 className="mb-0">Categories</h4>
            </div>
            <div className="card-body">
              {categories.length === 0 ? (
                <div className="text-center text-muted">
                  <i className="bi bi-tags display-4"></i>
                  <p className="mt-2">No categories configured</p>
                </div>
              ) : (
                <div className="row">
                  {categories.map((category, index) => (
                    <div key={category.id || `category-${index}`} className="col-md-4 col-lg-3 mb-3">
                      <div className="card h-100">
                        <div className="card-body text-center">
                          <i className="bi bi-tag display-6 text-primary"></i>
                          <h5 className="card-title mt-2">{category.name}</h5>
                          {category.description && (
                            <p className="card-text text-muted">{category.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings; 