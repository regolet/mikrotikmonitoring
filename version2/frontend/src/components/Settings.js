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
    return <div className="loading">Loading settings...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="settings">
      <h2>Settings</h2>
      
      <div className="settings-section">
        <h3>Routers</h3>
        <div className="router-list">
          {routers.map((router, index) => (
            <div key={router.id || `router-${index}`} className={`router-item ${activeRouter === router.id ? 'active' : ''}`}>
              <span>{router.name} ({router.host}:{router.port})</span>
              <button 
                onClick={() => handleRouterChange(router.id)}
                className="btn btn-primary"
              >
                {activeRouter === router.id ? 'Active' : 'Set Active'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>Categories</h3>
        <div className="category-list">
          {categories.map((category, index) => (
            <div key={category.id || `category-${index}`} className="category-item">
              <span>{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Settings; 