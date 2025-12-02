/**
 * RowManager - Handles row-related operations
 *
 * Manages row CRUD operations and row types.
 */

import { TableEvents } from "../core/EventBus.js"
import { generateId, deepClone } from "../utils/helpers.js"

export class RowManager {
  /**
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   */
  constructor(state, eventBus) {
    this._state = state
    this._eventBus = eventBus

    /** @type {Array<Function>} - Unsubscribe functions for cleanup */
    this._unsubscribers = []

    // Setup event listeners
    this._setupListeners()
  }

  /**
   * Add a new row
   * @param {Object} rowData - Row data
   * @param {Object} [options] - Options
   * @param {number} [options.index] - Insert at specific index
   * @param {string} [options.groupId] - Group to add row to
   * @param {string} [options.afterRowId] - Insert after specific row
   * @param {string} [options.type='data'] - Row type
   * @returns {Object} Added row
   */
  addRow(rowData, options = {}) {
    const data = this._state.getData()
    const { index, groupId, afterRowId, type = "data" } = options

    const newRow = {
      ...rowData,
      _id: rowData._id || generateId(),
      _type: type,
    }

    let insertIndex = data.length

    if (index !== undefined) {
      insertIndex = Math.max(0, Math.min(index, data.length))
    } else if (afterRowId) {
      const afterIndex = data.findIndex((r) => r._id === afterRowId)
      if (afterIndex !== -1) {
        insertIndex = afterIndex + 1
      }
    } else if (groupId) {
      // Find last row in group
      const config = this._state.getConfig()
      const groupBy = config.groupBy
      for (let i = data.length - 1; i >= 0; i--) {
        const rowGroup =
          typeof groupBy === "function" ? groupBy(data[i]) : data[i][groupBy]
        if (rowGroup === groupId) {
          insertIndex = i + 1
          break
        }
      }

      // Set group key on new row
      if (typeof groupBy === "string") {
        newRow[groupBy] = groupId
      }
    }

    // Insert row
    data.splice(insertIndex, 0, newRow)

    // Update indices
    data.forEach((row, idx) => {
      row._index = idx
    })

    this._state.setData(data)

    this._eventBus.emit(TableEvents.ROW_ADD, {
      row: newRow,
      index: insertIndex,
    })

    return newRow
  }

  /**
   * Add a sub-row (informational row)
   * @param {string} parentRowId - Parent row ID
   * @param {Object} subRowData - Sub-row data
   * @returns {Object} Added sub-row
   */
  addSubRow(parentRowId, subRowData) {
    return this.addRow(subRowData, {
      afterRowId: parentRowId,
      type: "subrow",
    })
  }

  /**
   * Delete a row
   * @param {string} rowId - Row ID to delete
   * @returns {boolean} Success
   */
  deleteRow(rowId) {
    const data = this._state.getData()
    const rowIndex = data.findIndex((r) => r._id === rowId)

    if (rowIndex === -1) {
      return false
    }

    const deletedRow = data[rowIndex]
    data.splice(rowIndex, 1)

    // Update indices
    data.forEach((row, idx) => {
      row._index = idx
    })

    this._state.setData(data)

    this._eventBus.emit(TableEvents.ROW_DELETE, {
      rowId,
      row: deletedRow,
      index: rowIndex,
    })

    return true
  }

  /**
   * Delete multiple rows
   * @param {Array<string>} rowIds - Row IDs to delete
   * @returns {number} Number of deleted rows
   */
  deleteRows(rowIds) {
    let deletedCount = 0
    const rowIdSet = new Set(rowIds)
    const data = this._state.getData()

    const filteredData = data.filter((row) => {
      if (rowIdSet.has(row._id)) {
        deletedCount++
        return false
      }
      return true
    })

    if (deletedCount > 0) {
      // Update indices
      filteredData.forEach((row, idx) => {
        row._index = idx
      })

      this._state.setData(filteredData)
    }

    return deletedCount
  }

  /**
   * Duplicate a row
   * @param {string} rowId - Row ID to duplicate
   * @returns {Object|null} Duplicated row
   */
  duplicateRow(rowId) {
    const row = this._state.getRow(rowId)
    if (!row) return null

    const { _id, _index, ...rowData } = row

    return this.addRow(rowData, {
      afterRowId: rowId,
    })
  }

  /**
   * Move row to a new position
   * @param {string} rowId - Row ID to move
   * @param {number} newIndex - New index
   * @returns {boolean} Success
   */
  moveRow(rowId, newIndex) {
    const data = this._state.getData()
    const currentIndex = data.findIndex((r) => r._id === rowId)

    if (currentIndex === -1) return false

    const [movedRow] = data.splice(currentIndex, 1)
    data.splice(newIndex, 0, movedRow)

    // Update indices
    data.forEach((row, idx) => {
      row._index = idx
    })

    this._state.setData(data)

    return true
  }

  /**
   * Get rows by type
   * @param {string} type - Row type ('data', 'subrow', 'total', etc.)
   * @returns {Array<Object>}
   */
  getRowsByType(type) {
    return this._state.getData().filter((row) => row._type === type)
  }

  /**
   * Get data rows only (excludes sub-rows, totals, etc.)
   * @returns {Array<Object>}
   */
  getDataRows() {
    return this.getRowsByType("data")
  }

  /**
   * Get sub-rows for a parent row
   * @param {string} parentRowId - Parent row ID
   * @returns {Array<Object>}
   */
  getSubRows(parentRowId) {
    const data = this._state.getData()
    const parentIndex = data.findIndex((r) => r._id === parentRowId)

    if (parentIndex === -1) return []

    const subRows = []
    for (let i = parentIndex + 1; i < data.length; i++) {
      if (data[i]._type === "subrow") {
        subRows.push(data[i])
      } else {
        break // Sub-rows are contiguous after parent
      }
    }

    return subRows
  }

  /**
   * Setup internal event listeners
   * @private
   */
  _setupListeners() {
    // No event listeners needed currently
  }

  /**
   * Cleanup
   */
  destroy() {
    // Unsubscribe from all event listeners
    this._unsubscribers.forEach((unsubscribe) => unsubscribe())
    this._unsubscribers = []
  }
}
