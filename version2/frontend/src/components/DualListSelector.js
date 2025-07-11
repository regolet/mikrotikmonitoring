import React from "react";
import PropTypes from "prop-types";

function DualListSelector({
  isEdit,
  availableAccounts,
  selectedAccounts,
  availableSearch,
  selectedSearch,
  setAvailableSearch,
  // setSelectedSearch, // Not currently used
  addMembers,
  removeMembers,
  addMembersEdit,
  removeMembersEdit,
  availableSelectRef,
  selectedSelectRef,
  availableEditSelectRef,
  selectedEditSelectRef,
  // getFilteredAvailableAccounts, // Not currently used
}) {
  const filteredAvailable = availableAccounts.filter(
    (acc) => !selectedAccounts.includes(acc),
  );
  return (
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
        <select
          ref={isEdit ? availableEditSelectRef : availableSelectRef}
          className="form-select"
          size="12"
          multiple
        >
          {filteredAvailable
            .filter((acc) =>
              acc.toLowerCase().includes(availableSearch.toLowerCase()),
            )
            .map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
        </select>
      </div>
      <div className="col-md-2 d-flex flex-column justify-content-center align-items-center">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary mb-2"
          onClick={isEdit ? addMembersEdit : addMembers}
        >
          <i className="bi bi-arrow-right"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={isEdit ? removeMembersEdit : removeMembers}
        >
          <i className="bi bi-arrow-left"></i>
        </button>
      </div>
      <div className="col-md-5">
        <label className="form-label text-muted">Selected Members</label>
        <select
          ref={isEdit ? selectedEditSelectRef : selectedSelectRef}
          className="form-select"
          size="12"
          multiple
        >
          {selectedAccounts
            .filter((acc) =>
              acc.toLowerCase().includes(selectedSearch.toLowerCase()),
            )
            .map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

DualListSelector.propTypes = {
  isEdit: PropTypes.bool.isRequired,
  availableAccounts: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedAccounts: PropTypes.arrayOf(PropTypes.string).isRequired,
  availableSearch: PropTypes.string.isRequired,
  selectedSearch: PropTypes.string.isRequired,
  setAvailableSearch: PropTypes.func.isRequired,
  // setSelectedSearch: PropTypes.func.isRequired, // Not currently used
  addMembers: PropTypes.func.isRequired,
  removeMembers: PropTypes.func.isRequired,
  addMembersEdit: PropTypes.func.isRequired,
  removeMembersEdit: PropTypes.func.isRequired,
  availableSelectRef: PropTypes.object.isRequired,
  selectedSelectRef: PropTypes.object.isRequired,
  availableEditSelectRef: PropTypes.object.isRequired,
  selectedEditSelectRef: PropTypes.object.isRequired,
  // getFilteredAvailableAccounts: PropTypes.func.isRequired, // Not currently used
};

export default DualListSelector;
