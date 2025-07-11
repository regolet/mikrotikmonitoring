import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useRouter } from "../App";
// Remove: import { Modal, Button, Form } from 'react-bootstrap';

const API_BASE_URL = "http://localhost:80/api";

function Categories() {
  const { activeRouterId } = useRouter();
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState("add"); // 'add' or 'edit'
  const [categoryModalIdx, setCategoryModalIdx] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcategoryModalMode, setSubcategoryModalMode] = useState("add");
  const [subcategoryModalCatIdx, setSubcategoryModalCatIdx] = useState(null);
  const [subcategoryModalIdx, setSubcategoryModalIdx] = useState(null);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryError, setSubcategoryError] = useState("");

  const [showAssignGroupsModal, setShowAssignGroupsModal] = useState(false);
  const [assignCatIdx, setAssignCatIdx] = useState(null);
  const [assignSubIdx, setAssignSubIdx] = useState(null);
  const [assignGroups, setAssignGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [assignError, setAssignError] = useState("");

  // Helper to get group object by ID
  const getGroupById = (gid) => groups.find((g) => g.id === gid);

  // Helper to calculate members/max for category or subcategory
  const getMembersStats = (groupIds) => {
    let totalMembers = 0;
    let totalMax = 0;
    let hasAllMax = true;
    groupIds.forEach((gid) => {
      const g = getGroupById(gid);
      if (g) {
        totalMembers += g.accounts ? g.accounts.length : 0;
        if (typeof g.max_members === "number") {
          totalMax += g.max_members;
        } else {
          hasAllMax = false;
        }
      }
    });
    return { totalMembers, totalMax, hasAllMax };
  };

  // Category actions
  const handleShowAddCategory = () => {
    setCategoryModalMode("add");
    setCategoryName("");
    setCategoryError("");
    setShowCategoryModal(true);
  };
  const handleShowEditCategory = (catIdx) => {
    setCategoryModalMode("edit");
    setCategoryModalIdx(catIdx);
    setCategoryName(categories[catIdx]?.category || "");
    setCategoryError("");
    setShowCategoryModal(true);
  };
  const handleDeleteCategory = async (catIdx) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await axios.delete(
        `${API_BASE_URL}/categories/${catIdx}?router_id=${activeRouterId}`,
      );
      fetchData();
    } catch {
      setError("Failed to delete category");
    }
  };
  const handleCategoryModalSave = async () => {
    if (!categoryName.trim()) return setCategoryError("Category name required");
    try {
      if (categoryModalMode === "add") {
        // For add, we need to update the entire categories structure
        const newCategories = [
          ...categories,
          { category: categoryName, subcategories: [] },
        ];
        await axios.post(
          `${API_BASE_URL}/categories?router_id=${activeRouterId}`,
          {
            router_id: activeRouterId,
            categories: newCategories,
          },
        );
      } else {
        // For edit, update the specific category
        await axios.put(
          `${API_BASE_URL}/categories/${categoryModalIdx}?router_id=${activeRouterId}`,
          { category: categoryName },
        );
      }
      setShowCategoryModal(false);
      fetchData();
    } catch {
      setCategoryError("Failed to save category");
    }
  };

  // Subcategory actions
  const handleShowAddSubcategory = (catIdx) => {
    setSubcategoryModalMode("add");
    setSubcategoryModalCatIdx(catIdx);
    setSubcategoryName("");
    setSubcategoryError("");
    setShowSubcategoryModal(true);
  };
  const handleShowEditSubcategory = (catIdx, subIdx) => {
    setSubcategoryModalMode("edit");
    setSubcategoryModalCatIdx(catIdx);
    setSubcategoryModalIdx(subIdx);
    setSubcategoryName(
      categories[catIdx].subcategories[subIdx]?.subcategory || "",
    );
    setSubcategoryError("");
    setShowSubcategoryModal(true);
  };
  const handleDeleteSubcategory = async (catIdx, subIdx) => {
    if (!window.confirm("Delete this subcategory?")) return;
    try {
      await axios.delete(
        `${API_BASE_URL}/categories/${catIdx}/subcategories/${subIdx}?router_id=${activeRouterId}`,
      );
      fetchData();
    } catch {
      setError("Failed to delete subcategory");
    }
  };
  const handleSubcategoryModalSave = async () => {
    if (!subcategoryName.trim())
      return setSubcategoryError("Subcategory name required");
    try {
      if (subcategoryModalMode === "add") {
        await axios.post(
          `${API_BASE_URL}/categories/${subcategoryModalCatIdx}/subcategories?router_id=${activeRouterId}`,
          { subcategory: subcategoryName },
        );
      } else {
        await axios.put(
          `${API_BASE_URL}/categories/${subcategoryModalCatIdx}/subcategories/${subcategoryModalIdx}?router_id=${activeRouterId}`,
          { subcategory: subcategoryName },
        );
      }
      setShowSubcategoryModal(false);
      fetchData();
    } catch {
      setSubcategoryError("Failed to save subcategory");
    }
  };

  // Assign Groups actions
  const handleShowAssignGroups = async (catIdx, subIdx) => {
    setAssignCatIdx(catIdx);
    setAssignSubIdx(subIdx);
    setAssignError("");
    // Load all groups for this router
    try {
      const res = await axios.get(
        `${API_BASE_URL}/groups?router_id=${activeRouterId}`,
      );
      setAllGroups(res.data.groups || []);
      // Preselect assigned groups
      setAssignGroups(categories[catIdx].subcategories[subIdx].groups || []);
      setShowAssignGroupsModal(true);
    } catch {
      setAssignError("Failed to load groups");
    }
  };
  const handleAssignGroupsSave = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/categories/${assignCatIdx}/subcategories/${assignSubIdx}/groups?router_id=${activeRouterId}`,
        { groups: assignGroups },
      );
      setShowAssignGroupsModal(false);
      fetchData();
    } catch {
      setAssignError("Failed to assign groups");
    }
  };

  // Helper for modal show/hide
  const modalShowClass = (show) =>
    show ? "modal fade show d-block" : "modal fade";
  const modalBackdrop = (show) =>
    show ? <div className="modal-backdrop fade show"></div> : null;

  // Move fetchData definition above useEffect and wrap in useCallback
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch groups for mapping group IDs to names
      const groupsRes = await axios.get(
        `${API_BASE_URL}/groups?router_id=${activeRouterId}`,
      );
      setGroups(groupsRes.data.groups || []);
      // Fetch categories
      const catRes = await axios.get(
        `${API_BASE_URL}/categories?router_id=${activeRouterId}`,
      );
      if (!catRes.data.success) {
        setCategories([]);
        setError(catRes.data.error || "Failed to load categories");
      } else {
        setCategories(catRes.data.categories || []);
      }
    } catch (err) {
      setError("Error loading categories or groups.");
      setCategories([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [activeRouterId]);

  useEffect(() => {
    fetchData();
  }, [activeRouterId, fetchData]);

  // UI rendering
  if (loading) {
    return (
      <div className="container-fluid mt-4 text-center">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container-fluid mt-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }
  if (!activeRouterId) {
    return (
      <div className="container-fluid mt-4">
        <div className="alert alert-warning">No router selected.</div>
      </div>
    );
  }
  if (!categories.length) {
    return (
      <div className="container-fluid mt-4">
        <div className="alert alert-info">
          No categories found for this router.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Categories</h2>
        <button
          className="btn btn-sm btn-outline-primary"
          style={{ background: "transparent" }}
          onClick={handleShowAddCategory}
        >
          <i className="bi bi-plus-circle"></i> Add Category
        </button>
      </div>
      <div className="categories-list">
        {categories.map((cat, catIdx) => {
          // Category-level stats
          let catGroupIds = [];
          if (Array.isArray(cat.subcategories)) {
            cat.subcategories.forEach((sub) => {
              if (Array.isArray(sub.groups)) catGroupIds.push(...sub.groups);
            });
          }
          const {
            totalMembers: catTotalMembers,
            totalMax: catTotalMax,
            hasAllMax: catHasAllMax,
          } = getMembersStats(catGroupIds);
          let catCountStr = "";
          if (catTotalMembers > 0) {
            if (catHasAllMax && catTotalMax > 0) {
              const catVacant = catTotalMax - catTotalMembers;
              catCountStr = `members: ${catTotalMembers}/${catTotalMax}, vacant: ${catVacant}`;
            } else {
              catCountStr = `members: ${catTotalMembers}`;
            }
          }
          return (
            <div className="category-card card mb-3" key={catIdx}>
              <div className="card-header d-flex justify-content-between align-items-center fw-bold">
                <span>
                  {cat.category}{" "}
                  {catCountStr && (
                    <span className="badge bg-primary ms-2">{catCountStr}</span>
                  )}
                </span>
                <span>
                  <button
                    className="btn btn-sm btn-outline-success me-1"
                    style={{ background: "transparent" }}
                    title="Add Subcategory"
                    onClick={() => handleShowAddSubcategory(catIdx)}
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary me-1"
                    style={{ background: "transparent" }}
                    title="Edit Category"
                    onClick={() => handleShowEditCategory(catIdx)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    style={{ background: "transparent" }}
                    title="Delete Category"
                    onClick={() => handleDeleteCategory(catIdx)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </span>
              </div>
              {Array.isArray(cat.subcategories) &&
              cat.subcategories.length > 0 ? (
                <div className="row g-2 px-2 pb-2">
                  {cat.subcategories.map((sub, subIdx) => {
                    const {
                      totalMembers: subTotalMembers,
                      totalMax: subTotalMax,
                      hasAllMax,
                    } = getMembersStats(sub.groups || []);
                    let subcatCountStr = "";
                    if (sub.groups && sub.groups.length > 0) {
                      if (hasAllMax && subTotalMax > 0) {
                        const vacant = subTotalMax - subTotalMembers;
                        subcatCountStr = `members: ${subTotalMembers}/${subTotalMax}, vacant: ${vacant}`;
                      } else {
                        subcatCountStr = `members: ${subTotalMembers}`;
                      }
                    }
                    return (
                      <div className="col-12 col-md-6 col-lg-4" key={subIdx}>
                        <div className="card h-100">
                          <div className="card-header d-flex justify-content-between align-items-center">
                            <span>
                              {sub.subcategory}{" "}
                              {subcatCountStr && (
                                <span className="badge bg-primary ms-2">
                                  {subcatCountStr}
                                </span>
                              )}
                            </span>
                            <span>
                              <button
                                className="btn btn-sm btn-outline-primary me-1"
                                style={{ background: "transparent" }}
                                title="Assign Groups"
                                onClick={() =>
                                  handleShowAssignGroups(catIdx, subIdx)
                                }
                              >
                                <i className="bi bi-collection"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary me-1"
                                style={{ background: "transparent" }}
                                title="Edit Subcategory"
                                onClick={() =>
                                  handleShowEditSubcategory(catIdx, subIdx)
                                }
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                style={{ background: "transparent" }}
                                title="Delete Subcategory"
                                onClick={() =>
                                  handleDeleteSubcategory(catIdx, subIdx)
                                }
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </span>
                          </div>
                          <div className="card-body">
                            {Array.isArray(sub.groups) &&
                            sub.groups.length > 0 ? (
                              <div>
                                {sub.groups.map((gid, gidx) => {
                                  const g = getGroupById(gid);
                                  if (g) {
                                    const total = g.accounts
                                      ? g.accounts.length
                                      : 0;
                                    return (
                                      <div key={gidx} className="mb-1">
                                        <span className="badge bg-info text-dark">
                                          {g.name} ({total}
                                          {typeof g.max_members === "number"
                                            ? `/${g.max_members}`
                                            : ""}
                                          )
                                        </span>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div key={gidx} className="mb-1">
                                        <span className="badge bg-info text-dark">
                                          {gid}
                                        </span>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            ) : (
                              <span className="text-muted">
                                <em>No groups assigned</em>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card-body text-muted">No subcategories</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Category Modal */}
      <>
        <div
          className={modalShowClass(showCategoryModal)}
          tabIndex="-1"
          style={{
            background: showCategoryModal ? "rgba(0,0,0,0.3)" : undefined,
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {categoryModalMode === "add"
                    ? "Add New Category"
                    : "Edit Category"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCategoryModal(false)}
                ></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCategoryModalSave();
                }}
              >
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Category Name</label>
                    <input
                      type="text"
                      className={`form-control${categoryError ? " is-invalid" : ""}`}
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                    />
                    {categoryError && (
                      <div className="invalid-feedback">{categoryError}</div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCategoryModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {modalBackdrop(showCategoryModal)}
      </>

      {/* Subcategory Modal */}
      <>
        <div
          className={modalShowClass(showSubcategoryModal)}
          tabIndex="-1"
          style={{
            background: showSubcategoryModal ? "rgba(0,0,0,0.3)" : undefined,
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {subcategoryModalMode === "add"
                    ? "Add New Subcategory"
                    : "Edit Subcategory"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSubcategoryModal(false)}
                ></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubcategoryModalSave();
                }}
              >
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Subcategory Name</label>
                    <input
                      type="text"
                      className={`form-control${subcategoryError ? " is-invalid" : ""}`}
                      value={subcategoryName}
                      onChange={(e) => setSubcategoryName(e.target.value)}
                    />
                    {subcategoryError && (
                      <div className="invalid-feedback">{subcategoryError}</div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSubcategoryModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {modalBackdrop(showSubcategoryModal)}
      </>

      {/* Assign Groups Modal */}
      <>
        <div
          className={modalShowClass(showAssignGroupsModal)}
          tabIndex="-1"
          style={{
            background: showAssignGroupsModal ? "rgba(0,0,0,0.3)" : undefined,
          }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Assign Groups to Subcategory</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAssignGroupsModal(false)}
                ></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAssignGroupsSave();
                }}
              >
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Subcategory:{" "}
                      {categories[assignCatIdx]?.subcategories[assignSubIdx]
                        ?.subcategory || ""}
                    </label>
                  </div>
                  <div className="row">
                    <div className="col-5">
                      <label className="form-label text-muted">
                        Available Groups
                      </label>
                      <select
                        id="assign-available-groups"
                        className="form-select"
                        size="8"
                        multiple
                      >
                        {allGroups
                          .filter((g) => !assignGroups.includes(g.id))
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({g.accounts ? g.accounts.length : 0}
                              {typeof g.max_members === "number"
                                ? `/${g.max_members}`
                                : ""}
                              )
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="col-2 d-flex flex-column justify-content-center align-items-center">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mb-2"
                        onClick={() => {
                          const availableSelect = document.querySelector(
                            "#assign-available-groups",
                          );
                          const selected = Array.from(
                            availableSelect?.selectedOptions || [],
                          ).map((opt) => opt.value);
                          const newAssignGroups = [
                            ...assignGroups,
                            ...selected,
                          ];
                          setAssignGroups(newAssignGroups);
                        }}
                      >
                        <i className="bi bi-arrow-right"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          const selectedSelect = document.querySelector(
                            "#assign-selected-groups",
                          );
                          const selected = Array.from(
                            selectedSelect?.selectedOptions || [],
                          ).map((opt) => opt.value);
                          const newAssignGroups = assignGroups.filter(
                            (g) => !selected.includes(g),
                          );
                          setAssignGroups(newAssignGroups);
                        }}
                      >
                        <i className="bi bi-arrow-left"></i>
                      </button>
                    </div>
                    <div className="col-5">
                      <label className="form-label text-muted">
                        Assigned Groups
                      </label>
                      <select
                        id="assign-selected-groups"
                        className="form-select"
                        size="8"
                        multiple
                      >
                        {assignGroups.map((gid) => {
                          const g = allGroups.find((gr) => gr.id === gid);
                          return (
                            <option key={gid} value={gid}>
                              {g ? g.name : gid} (
                              {g ? (g.accounts ? g.accounts.length : 0) : 0}
                              {g && typeof g.max_members === "number"
                                ? `/${g.max_members}`
                                : ""}
                              )
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  {assignError && (
                    <div className="alert alert-danger mt-3">{assignError}</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAssignGroupsModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {modalBackdrop(showAssignGroupsModal)}
      </>
    </div>
  );
}

export default Categories;
