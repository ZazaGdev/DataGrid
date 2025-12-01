/**
 * ColumnManager - Handles column-related operations
 *
 * Manages column visibility, ordering, and configuration.
 */

import { TableEvents } from "../core/EventBus.js"

export class ColumnManager {
  /**
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   */
  constructor(state, eventBus) {
    this._state = state
    this._eventBus = eventBus

    /** @type {Map<string, Object>} Column overrides */
    this._overrides = new Map()
  }

  /**
   * Set column visibility
   * @param {string} columnId - Column identifier
   * @param {boolean} visible - Visibility state
   */
  setVisibility(columnId, visible) {
    const columns = this._state.getColumns()
    const updatedColumns = columns.map((col) => {
      if (col._id === columnId || col.data === columnId) {
        return { ...col, visible }
      }
      return col
    })

    this._state.setColumns(updatedColumns)
  }

  /**
   * Toggle column visibility
   * @param {string} columnId - Column identifier
   * @returns {boolean} New visibility state
   */
  toggleVisibility(columnId) {
    const column = this._state.getColumn(columnId)
    if (column) {
      const newVisibility = column.visible === false
      this.setVisibility(columnId, newVisibility)
      return newVisibility
    }
    return false
  }

  /**
   * Get visible columns
   * @returns {Array<Object>}
   */
  getVisibleColumns() {
    return this._state.getColumns().filter((col) => col.visible !== false)
  }

  /**
   * Get hidden columns
   * @returns {Array<Object>}
   */
  getHiddenColumns() {
    return this._state.getColumns().filter((col) => col.visible === false)
  }

  /**
   * Reorder columns
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   */
  reorderColumns(fromIndex, toIndex) {
    const columns = [...this._state.getColumns()]
    const [movedColumn] = columns.splice(fromIndex, 1)
    columns.splice(toIndex, 0, movedColumn)

    // Update indices
    columns.forEach((col, index) => {
      col._index = index
    })

    this._state.setColumns(columns)
  }

  /**
   * Update column configuration
   * @param {string} columnId - Column identifier
   * @param {Object} config - Configuration updates
   */
  updateColumn(columnId, config) {
    const columns = this._state.getColumns()
    const updatedColumns = columns.map((col) => {
      if (col._id === columnId || col.data === columnId) {
        return { ...col, ...config }
      }
      return col
    })

    this._state.setColumns(updatedColumns)
  }

  /**
   * Resize column
   * @param {string} columnId - Column identifier
   * @param {number|string} width - New width
   */
  resizeColumn(columnId, width) {
    this.updateColumn(columnId, { width })
  }

  /**
   * Get columns with aggregate functions
   * @returns {Array<Object>}
   */
  getAggregateColumns() {
    return this._state.getColumns().filter((col) => col.aggregate)
  }

  /**
   * Get editable columns
   * @returns {Array<Object>}
   */
  getEditableColumns() {
    return this._state.getColumns().filter((col) => col.editable !== false)
  }

  /**
   * Reset column configuration to defaults
   * @param {string} [columnId] - Specific column, or all if not provided
   */
  resetColumns(columnId = null) {
    if (columnId) {
      this._overrides.delete(columnId)
    } else {
      this._overrides.clear()
    }

    this._eventBus.emit(TableEvents.STATE_CHANGE, {
      property: "columns",
      action: "reset",
    })
  }

  /**
   * Cleanup
   */
  destroy() {
    this._overrides.clear()
  }
}
