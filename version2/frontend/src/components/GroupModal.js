import React from "react";
import PropTypes from "prop-types";
import DualListSelector from "./DualListSelector";

function GroupModal({
  show,
  isEdit,
  newGroup,
  modalError,
  availableAccounts,
  selectedAccounts,
  availableSearch,
  selectedSearch,
  setNewGroup,
  setAvailableSearch,
  setSelectedSearch,
  handleSave,
  handleCancel,
  addMembers,
  removeMembers,
  addMembersEdit,
  removeMembersEdit,
  availableSelectRef,
  selectedSelectRef,
  availableEditSelectRef,
  selectedEditSelectRef,
  // selectedAvailable, // Not currently used
  // setSelectedAvailable, // Not currently used
  // selectedSelected, // Not currently used
  // setSelectedSelected, // Not currently used
  // selectedAvailableEdit, // Not currently used
  // setSelectedAvailableEdit, // Not currently used
  // selectedSelectedEdit, // Not currently used
  // setSelectedSelectedEdit, // Not currently used
  getFilteredAvailableAccounts,
  // ...rest // Not currently used
}) {
  if (!show) return null;
  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div
        className={`modal fade show`}
        style={{ display: "block" }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {isEdit ? "Edit Group" : "Add New Group"}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleCancel}
              ></button>
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
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Enter a description for this group (optional)"
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Max Members{" "}
                  <span className="text-muted small">
                    (optional, blank = no limit)
                  </span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  placeholder="Leave blank for no limit"
                  value={newGroup.max_members}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, max_members: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Group Members</label>
                <DualListSelector
                  isEdit={isEdit}
                  availableAccounts={availableAccounts}
                  selectedAccounts={selectedAccounts}
                  availableSearch={availableSearch}
                  selectedSearch={selectedSearch}
                  setAvailableSearch={setAvailableSearch}
                  setSelectedSearch={setSelectedSearch}
                  addMembers={addMembers}
                  removeMembers={removeMembers}
                  addMembersEdit={addMembersEdit}
                  removeMembersEdit={removeMembersEdit}
                  availableSelectRef={availableSelectRef}
                  selectedSelectRef={selectedSelectRef}
                  availableEditSelectRef={availableEditSelectRef}
                  selectedEditSelectRef={selectedEditSelectRef}
                  getFilteredAvailableAccounts={getFilteredAvailableAccounts}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
              >
                {isEdit ? "Save Changes" : "Save Group"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

GroupModal.propTypes = {
  show: PropTypes.bool.isRequired,
  isEdit: PropTypes.bool.isRequired,
  newGroup: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    max_members: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  modalError: PropTypes.string,
  availableAccounts: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedAccounts: PropTypes.arrayOf(PropTypes.string).isRequired,
  availableSearch: PropTypes.string.isRequired,
  selectedSearch: PropTypes.string.isRequired,
  setNewGroup: PropTypes.func.isRequired,
  setAvailableSearch: PropTypes.func.isRequired,
  setSelectedSearch: PropTypes.func.isRequired,
  handleSave: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired,
  addMembers: PropTypes.func.isRequired,
  removeMembers: PropTypes.func.isRequired,
  addMembersEdit: PropTypes.func.isRequired,
  removeMembersEdit: PropTypes.func.isRequired,
  availableSelectRef: PropTypes.object.isRequired,
  selectedSelectRef: PropTypes.object.isRequired,
  availableEditSelectRef: PropTypes.object.isRequired,
  selectedEditSelectRef: PropTypes.object.isRequired,
  getFilteredAvailableAccounts: PropTypes.func.isRequired,
};

export default GroupModal;
