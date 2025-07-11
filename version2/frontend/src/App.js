import React, { createContext, useContext, useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import "./App.css";
import Settings from "./components/Settings";
import Groups from "./components/Groups";
import Dashboard from "./components/Dashboard";
import Categories from "./components/Categories";
import axios from "axios";
import io from "socket.io-client";

// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export const RouterContext = createContext();

export function useRouter() {
  return useContext(RouterContext);
}

export const SocketContext = createContext();
export function useSocket() {
  return useContext(SocketContext);
}

function Navigation() {
  const location = useLocation();
  const { routers, activeRouterId, handleRouterChange } = useRouter();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">
          MikroTik Monitoring
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
                to="/"
              >
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === "/groups" ? "active" : ""}`}
                to="/groups"
              >
                Groups
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === "/categories" ? "active" : ""}`}
                to="/categories"
              >
                Categories
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === "/settings" ? "active" : ""}`}
                to="/settings"
              >
                Settings
              </Link>
            </li>
          </ul>
          <ul className="navbar-nav">
            <li className="nav-item">
              <div className="d-flex align-items-center">
                <label htmlFor="router-selector" className="text-light me-2">
                  Router:
                </label>
                <select
                  id="router-selector"
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={activeRouterId}
                  onChange={handleRouterChange}
                >
                  {routers.length === 0 ? (
                    <option value="">Loading...</option>
                  ) : (
                    routers.map((router) => (
                      <option key={router.id} value={router.id}>
                        {router.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [routers, setRouters] = useState([]);
  const [activeRouterId, setActiveRouterId] = useState("");
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const fetchRouters = async () => {
      try {
        const res = await axios.get("http://localhost:80/api/routers");
        if (res.data.success) setRouters(res.data.routers);
      } catch (error) {
        console.error("Failed to fetch routers:", error);
      }
    };
    const fetchActiveRouter = async () => {
      try {
        const res = await axios.get("http://localhost:80/api/routers/active");
        if (res.data.active_router_id)
          setActiveRouterId(res.data.active_router_id);
      } catch (error) {
        console.error("Failed to fetch active router:", error);
      }
    };
    fetchRouters();
    fetchActiveRouter();
  }, []);

  useEffect(() => {
    const s = io("http://localhost:80");
    setSocket(s);
    return () => s.disconnect();
  }, []);

  const handleRouterChange = async (e) => {
    const newId = e.target.value;
    setActiveRouterId(newId);
    await axios.post("http://localhost:80/api/routers/active", {
      router_id: newId,
    });
  };

  return (
    <RouterContext.Provider
      value={{ routers, activeRouterId, handleRouterChange }}
    >
      <SocketContext.Provider value={socket}>
        <Router>
          <div className="App">
            <Navigation />
            <div id="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/categories" element={<Categories />} />
                {/* Redirect old /groups-summary to /categories for backward compatibility */}
                <Route path="/groups-summary" element={<Categories />} />
              </Routes>
            </div>
          </div>
        </Router>
      </SocketContext.Provider>
    </RouterContext.Provider>
  );
}

export default App;
