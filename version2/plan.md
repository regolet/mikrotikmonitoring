# Migration Plan: Flask API + React Frontend (Hybrid Architecture)

## Overview
This document outlines the migration plan from a monolithic Flask/Jinja2 webapp to a hybrid architecture using Flask for the backend API and React for the frontend UI. This plan ensures maintainability, scalability, and a modern user experience.

---

## 1. Project Structure

```
version2/
  backend/      # Flask API (copied from v1 backend)
  frontend/     # React app (created with create-react-app)
  plan.md       # This migration plan
```

---

## 2. Backend (Flask API)
- Copy all backend logic and data files to `version2/backend/`.
- Remove old static HTML/JS from backend.
- Enable CORS for API endpoints.
- Expose endpoints like `/api/settings`, `/api/groups`, `/api/categories`, etc.
- Run with: `cd backend && python app.py`

---

## 3. Frontend (React)
- Create React app in `version2/frontend/`:
  - `npx create-react-app frontend`
- Implement each page/tab as a React component (e.g., Settings, Groups, Dashboard).
- Use React Router for navigation.
- Fetch data from Flask API using `fetch` or `axios`.
- Example: `fetch('http://localhost:5000/api/settings')`
- Run with: `cd frontend && npm start`

---

## 4. Dev Workflow
- Use `run_dev.bat` to start both Flask and React dev servers:
  ```bat
  @echo off
  start cmd /k "cd backend && python app.py"
  start cmd /k "cd frontend && npm start"
  ```
- React runs on port 3000, Flask on port 5000.

---

## 5. Migration Steps
1. Commit and push all v1 changes.
2. Create `version2/` folder and copy backend.
3. Scaffold React app in `frontend/`.
4. Migrate Settings page first (API + React component).
5. Test end-to-end (React <-> Flask).
6. Repeat for other pages (Groups, Dashboard, etc.).
7. Update this plan as needed.

---

## 6. Tips
- Document new endpoints/components as you go.
- Use environment variables for API URLs in React.
- Keep this plan updated for future reference or new team members.

---

**Last updated:** [Update this date as you make changes] 