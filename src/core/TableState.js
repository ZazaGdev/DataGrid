/**
 * TableState - Centralized state management with change tracking
 *
 * Manages all table data and state with efficient change detection
 * and cascade update support for totals, groups, and computed values.
 */

import { EventBus, TableEvents } from "./EventBus.js"
import { deepClone, deepEqual, generateId } from "../utils/helpers.js"

export class TableState {
  /**
   * @param {EventBus} eventBus - Event bus instance
   * @param {Object} initialState - Initial state configuration
   */
  constructor(eventBus, initialState = {}) {
    /** @type {EventBus} */
    this._eventBus = eventBus

    /** @type {Object} Internal state */
    this._state = {
      // Core data
      data: [],
      originalData: [],

      // Column definitions
      columns: [],

      // UI state
      mode: "view", // 'view' | 'edit'

      // Group state
      groups: {},
      groupedData: null,
      collapsedGroups: new Set(),

      // Focus state
      focusedCell: null,

      // Computed values cache
      computedCache: new Map(),

      // Dirty tracking
      dirtyRows: new Set(),
      dirtyColumns: new Map(),

      // Configuration
      config: {
        fixedFirstColumn: false,
        enableGrouping: false,
        groupBy: null,
        enableInfoRows: false,
        enableRowTotals: false,
        ...initialState.config,
      },
    }

    // Apply initial data
    if (initialState.data) {
      this.setData(initialState.data)
    }
    if (initialState.columns) {
      this.setColumns(initialState.columns)
    }
  }

  // ============================================
  // Data Management
  // ============================================

  /**
   * Set table data
   * @param {Array<Object>} data - Row data array
   */
  setData(data) {
    this._state.originalData = deepClone(data)
    this._state.data = this._normalizeData(data)
    this._state.dirtyRows.clear()
    this._invalidateCache()

    if (this._state.config.enableGrouping && this._state.config.groupBy) {
      this._computeGroups()
    }

    this._eventBus.emit(TableEvents.DATA_CHANGE, {
      data: this._state.data,
      source: "setData",
    })
  }

  /**
   * Get current data (returns a copy to prevent mutation)
   * @returns {Array<Object>}
   */
  getData() {
    return deepClone(this._state.data)
  }

  /**
   * Get a single row by ID
   * @param {string|number} rowId - Row identifier
   * @returns {Object|null}
   */
  getRow(rowId) {
    const row = this._state.data.find((r) => r._id === rowId)
    return row ? deepClone(row) : null
  }

  /**
   * Update a specific cell value
   * @param {string|number} rowId - Row identifier
   * @param {string} columnName - Column name
   * @param {any} value - New value
   * @param {Object} options - Update options
   */
  updateCell(rowId, columnName, value, options = {}) {
    const rowIndex = this._state.data.findIndex((r) => r._id === rowId)
    if (rowIndex === -1) return

    const row = this._state.data[rowIndex]
    const oldValue = row[columnName]

    // Skip if value hasn't changed
    if (deepEqual(oldValue, value)) return

    // Update the value
    row[columnName] = value

    // Mark as dirty
    this._state.dirtyRows.add(rowId)
    if (!this._state.dirtyColumns.has(rowId)) {
      this._state.dirtyColumns.set(rowId, new Set())
    }
    this._state.dirtyColumns.get(rowId).add(columnName)

    // Invalidate affected cache
    this._invalidateCacheForRow(rowId, columnName)

    // Emit cell change event
    this._eventBus.emit(TableEvents.CELL_CHANGE, {
      rowId,
      rowIndex,
      columnName,
      oldValue,
      newValue: value,
      row: deepClone(row),
    })

    // Emit row change event
    this._eventBus.emit(TableEvents.ROW_CHANGE, {
      rowId,
      rowIndex,
      columnName,
      row: deepClone(row),
      dirtyColumns: Array.from(this._state.dirtyColumns.get(rowId) || []),
    })

    // Trigger cascade updates if needed
    if (!options.skipCascade) {
      this._triggerCascadeUpdate(rowId, columnName, value)
    }
  }

  /**
   * Batch update multiple cells (more efficient for bulk changes)
   * @param {Array<{rowId, columnName, value}>} updates - Array of updates
   */
  batchUpdate(updates) {
    this._eventBus.startBatch()

    updates.forEach(({ rowId, columnName, value }) => {
      this.updateCell(rowId, columnName, value, { skipCascade: true })
    })

    // Compute cascade updates once for all changes
    this._computeAllCascades()

    this._eventBus.endBatch()

    this._eventBus.emit(TableEvents.DATA_CHANGE, {
      data: this._state.data,
      source: "batchUpdate",
      updatedRows: updates.map((u) => u.rowId),
    })
  }

  // ============================================
  // Column Management
  // ============================================

  /**
   * Set column definitions
   * @param {Array<Object>} columns - Column configuration array
   */
  setColumns(columns) {
    this._state.columns = columns.map((col, index) => ({
      ...col,
      _index: index,
      _id: col.id || col.data || `col_${index}`,
    }))

    this._eventBus.emit(TableEvents.STATE_CHANGE, {
      property: "columns",
      value: this._state.columns,
    })
  }

  /**
   * Get column definitions
   * @returns {Array<Object>}
   */
  getColumns() {
    const columns = [...this._state.columns]

    // Append row total column if enabled
    if (this._state.config.enableRowTotals) {
      // Default format: $X,XXX
      const defaultFormat = (value) =>
        value !== null && value !== undefined
          ? `$${Number(value).toLocaleString()}`
          : "$0"

      columns.push({
        data: "_rowTotal",
        title: "Total",
        type: "number",
        editable: false,
        aggregate: "sum",
        _id: "_rowTotal",
        _index: columns.length,
        _isRowTotal: true,
        format: this._state.config.rowTotalsFormat || defaultFormat,
      })
    }

    return columns
  }

  /**
   * Get a column by name/id
   * @param {string} columnId - Column identifier
   * @returns {Object|null}
   */
  getColumn(columnId) {
    // Check for row total column
    if (columnId === "_rowTotal" && this._state.config.enableRowTotals) {
      // Default format: $X,XXX
      const defaultFormat = (value) =>
        value !== null && value !== undefined
          ? `$${Number(value).toLocaleString()}`
          : "$0"

      return {
        data: "_rowTotal",
        title: "Total",
        type: "number",
        editable: false,
        aggregate: "sum",
        _id: "_rowTotal",
        _isRowTotal: true,
        format: this._state.config.rowTotalsFormat || defaultFormat,
      }
    }

    return this._state.columns.find(
      (c) => c._id === columnId || c.data === columnId
    )
  }

  // ============================================
  // Mode Management
  // ============================================

  /**
   * Set table mode
   * @param {'view'|'edit'} mode - Table mode
   */
  setMode(mode) {
    if (mode !== "view" && mode !== "edit") {
      console.warn(`Invalid mode: ${mode}. Must be 'view' or 'edit'.`)
      return
    }

    const oldMode = this._state.mode
    this._state.mode = mode

    this._eventBus.emit(TableEvents.MODE_CHANGE, {
      oldMode,
      newMode: mode,
    })
  }

  /**
   * Get current mode
   * @returns {'view'|'edit'}
   */
  getMode() {
    return this._state.mode
  }

  /**
   * Check if in edit mode
   * @returns {boolean}
   */
  isEditMode() {
    return this._state.mode === "edit"
  }

  // ============================================
  // Group Management
  // ============================================

  /**
   * Toggle group visibility
   * @param {string} groupId - Group identifier
   */
  toggleGroup(groupId) {
    if (this._state.collapsedGroups.has(groupId)) {
      this._state.collapsedGroups.delete(groupId)
    } else {
      this._state.collapsedGroups.add(groupId)
    }

    this._eventBus.emit(TableEvents.GROUP_TOGGLE, {
      groupId,
      collapsed: this._state.collapsedGroups.has(groupId),
    })
  }

  /**
   * Check if a group is collapsed
   * @param {string} groupId - Group identifier
   * @returns {boolean}
   */
  isGroupCollapsed(groupId) {
    return this._state.collapsedGroups.has(groupId)
  }

  /**
   * Get grouped data structure
   * @returns {Object|null}
   */
  getGroupedData() {
    return this._state.groupedData
  }

  /**
   * Get ungrouped rows (rows without a group value)
   * @returns {Array}
   */
  getUngroupedRows() {
    return this._state.ungroupedRows || []
  }

  /**
   * Get info rows (informational header rows)
   * @returns {Array}
   */
  getInfoRows() {
    return this._state.infoRows || []
  }

  /**
   * Expand all groups
   */
  expandAllGroups() {
    this._state.collapsedGroups.clear()
    this._eventBus.emit(TableEvents.GROUP_EXPAND_ALL, {})
  }

  /**
   * Collapse all groups
   */
  collapseAllGroups() {
    if (this._state.groupedData) {
      Object.keys(this._state.groupedData).forEach((groupId) => {
        this._state.collapsedGroups.add(groupId)
      })
    }
    this._eventBus.emit(TableEvents.GROUP_COLLAPSE_ALL, {})
  }

  // ============================================
  // Dirty State Management
  // ============================================

  /**
   * Get all dirty (modified) rows
   * @returns {Array<Object>}
   */
  getDirtyRows() {
    return this._state.data
      .filter((row) => this._state.dirtyRows.has(row._id))
      .map((row) => deepClone(row))
  }

  /**
   * Check if a row is dirty
   * @param {string|number} rowId - Row identifier
   * @returns {boolean}
   */
  isRowDirty(rowId) {
    return this._state.dirtyRows.has(rowId)
  }

  /**
   * Clear dirty state (e.g., after save)
   */
  clearDirty() {
    this._state.dirtyRows.clear()
    this._state.dirtyColumns.clear()
    this._state.originalData = deepClone(this._state.data)
  }

  /**
   * Revert all changes to original data
   */
  revertChanges() {
    this.setData(this._state.originalData)
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Update configuration
   * @param {Object} config - Configuration updates
   */
  setConfig(config) {
    this._state.config = { ...this._state.config, ...config }

    if (config.groupBy !== undefined) {
      this._computeGroups()
    }

    this._eventBus.emit(TableEvents.STATE_CHANGE, {
      property: "config",
      value: this._state.config,
    })
  }

  /**
   * Get current configuration
   * @returns {Object}
   */
  getConfig() {
    return { ...this._state.config }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Normalize data by adding internal IDs
   * @private
   */
  _normalizeData(data) {
    return data.map((row, index) => ({
      ...row,
      _id: row._id || row.id || generateId(),
      _index: index,
      _type: row._type || "data", // 'data' | 'infoRow' | 'group-header' | 'total'
    }))
  }

  /**
   * Compute group structure from data
   * @private
   */
  _computeGroups() {
    const { groupBy } = this._state.config
    if (!groupBy) {
      this._state.groupedData = null
      return
    }

    const groups = {}
    const ungroupedRows = []
    const infoRows = []

    this._state.data.forEach((row) => {
      // Info rows are rendered separately at the top
      if (row._type === "infoRow") {
        infoRows.push(row)
        return
      }

      // Only include data rows in groups
      if (row._type !== "data") return

      const groupKey =
        typeof groupBy === "function" ? groupBy(row) : row[groupBy]

      // Handle rows without a group value
      if (groupKey === null || groupKey === undefined || groupKey === "") {
        ungroupedRows.push(row)
        return
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          label: groupKey,
          rows: [],
          totals: {},
        }
      }
      groups[groupKey].rows.push(row)
    })

    // Store ungrouped rows and info rows separately
    this._state.groupedData = groups
    this._state.ungroupedRows = ungroupedRows
    this._state.infoRows = infoRows
  }

  /**
   * Invalidate entire computed cache
   * @private
   */
  _invalidateCache() {
    this._state.computedCache.clear()
  }

  /**
   * Invalidate cache for specific row/column
   * @private
   */
  _invalidateCacheForRow(rowId, columnName) {
    // Invalidate direct cache
    this._state.computedCache.delete(`${rowId}:${columnName}`)

    // Invalidate dependent caches (totals, cumulative, etc.)
    const column = this.getColumn(columnName)
    if (column && column.affectsColumns) {
      column.affectsColumns.forEach((affectedCol) => {
        this._state.computedCache.forEach((_, key) => {
          if (key.includes(`:${affectedCol}`)) {
            this._state.computedCache.delete(key)
          }
        })
      })
    }
  }

  /**
   * Trigger cascade updates for dependent rows/cells
   * @private
   */
  _triggerCascadeUpdate(rowId, columnName, value) {
    const column = this.getColumn(columnName)
    if (!column) return

    // Check for cascade configuration
    if (column.cascade) {
      column.cascade({
        rowId,
        columnName,
        value,
        state: this,
        updateCell: (rId, cName, val) => {
          this.updateCell(rId, cName, val, { skipCascade: true })
        },
      })
    }

    // Note: Group totals are recalculated by GroupManager which listens for CELL_CHANGE events
  }

  /**
   * Compute all cascade updates (for batch operations)
   * @private
   */
  _computeAllCascades() {
    // Note: Group totals are recalculated by GroupManager which listens for DATA_CHANGE events
  }

  /**
   * Destroy state and cleanup
   */
  destroy() {
    this._state.data = []
    this._state.columns = []
    this._state.computedCache.clear()
    this._state.dirtyRows.clear()
    this._state.dirtyColumns.clear()
    this._state.collapsedGroups.clear()
  }
}
