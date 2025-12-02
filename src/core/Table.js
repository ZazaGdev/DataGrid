/**
 * Table - Main orchestrator class for the editable table
 *
 * This is the primary entry point that coordinates all modules,
 * manages the lifecycle, and exposes the public API.
 */

import { EventBus, TableEvents } from "./EventBus.js"
import { TableState } from "./TableState.js"
import { TableRenderer } from "./TableRenderer.js"
import { ColumnManager } from "../modules/ColumnManager.js"
import { RowManager } from "../modules/RowManager.js"
import { GroupManager } from "../modules/GroupManager.js"
import { EditManager } from "../modules/EditManager.js"
import { ScrollManager } from "../modules/ScrollManager.js"
import { ExportManager } from "../modules/ExportManager.js"
import { ThemeManager } from "../modules/ThemeManager.js"
import { addClass, removeClass } from "../utils/dom.js"

/**
 * @typedef {Object} TableConfig
 * @property {HTMLElement|string} container - Container element or selector
 * @property {Array<Object>} columns - Column definitions
 * @property {Array<Object>} data - Table data
 * @property {boolean} [fixedFirstColumn=false] - Enable fixed first column
 * @property {boolean} [enableGrouping=false] - Enable row grouping
 * @property {string|Function} [groupBy] - Group by column name or function
 * @property {boolean} [enableSubRows=false] - Enable sub-rows
 * @property {'view'|'edit'} [mode='view'] - Initial mode
 * @property {Function} [onRowClick] - Row click callback
 * @property {Function} [onRender] - Render complete callback
 * @property {Function} [onChange] - Table data change callback
 * @property {Function} [onRowChange] - Individual row change callback
 * @property {Object} [theme] - Theme customization
 */

export class Table {
  /**
   * Create a new Table instance
   * @param {TableConfig} config - Table configuration
   */
  constructor(config) {
    this._validateConfig(config)

    // Store configuration
    this._config = {
      fixedFirstColumn: false,
      enableGrouping: false,
      enableSubRows: false,
      mode: "view",
      ...config,
    }

    // Get container element
    this._container =
      typeof config.container === "string"
        ? document.querySelector(config.container)
        : config.container

    if (!this._container) {
      throw new Error("Table: Container element not found")
    }

    // Initialize core systems
    this._eventBus = new EventBus()
    this._state = new TableState(this._eventBus, {
      data: config.data || [],
      columns: config.columns || [],
      config: {
        fixedFirstColumn: config.fixedFirstColumn,
        enableGrouping: config.enableGrouping,
        groupBy: config.groupBy,
        enableSubRows: config.enableSubRows,
      },
    })

    // Initialize modules
    this._initModules()

    // Set initial mode
    this._state.setMode(config.mode || "view")

    // Register callbacks
    this._registerCallbacks()

    // Initial render
    this._render()
  }

  // ============================================
  // Public API - Data
  // ============================================

  /**
   * Get current table data
   * @returns {Array<Object>}
   */
  getData() {
    return this._state.getData()
  }

  /**
   * Set table data
   * @param {Array<Object>} data - New data array
   */
  setData(data) {
    this._state.setData(data)
    this._render()
  }

  /**
   * Get a single row by ID
   * @param {string|number} rowId - Row identifier
   * @returns {Object|null}
   */
  getRow(rowId) {
    return this._state.getRow(rowId)
  }

  /**
   * Update a specific cell
   * @param {string|number} rowId - Row identifier
   * @param {string} columnName - Column name
   * @param {any} value - New value
   */
  updateCell(rowId, columnName, value) {
    this._state.updateCell(rowId, columnName, value)
  }

  /**
   * Batch update multiple cells
   * @param {Array<{rowId, columnName, value}>} updates - Updates array
   */
  batchUpdate(updates) {
    this._state.batchUpdate(updates)
  }

  /**
   * Add a new row
   * @param {Object} rowData - Row data
   * @param {Object} [options] - Options (position, groupId, etc.)
   */
  addRow(rowData, options = {}) {
    this._rowManager.addRow(rowData, options)
  }

  /**
   * Delete a row
   * @param {string|number} rowId - Row identifier
   */
  deleteRow(rowId) {
    this._rowManager.deleteRow(rowId)
  }

  /**
   * Get all modified rows
   * @returns {Array<Object>}
   */
  getDirtyRows() {
    return this._state.getDirtyRows()
  }

  /**
   * Clear dirty state
   */
  clearDirty() {
    this._state.clearDirty()
  }

  /**
   * Revert all changes
   */
  revertChanges() {
    this._state.revertChanges()
    this._render()
  }

  // ============================================
  // Public API - Columns
  // ============================================

  /**
   * Get column definitions
   * @returns {Array<Object>}
   */
  getColumns() {
    return this._state.getColumns()
  }

  /**
   * Update column definitions
   * @param {Array<Object>} columns - New column definitions
   */
  setColumns(columns) {
    this._state.setColumns(columns)
    this._render()
  }

  /**
   * Show/hide a column
   * @param {string} columnId - Column identifier
   * @param {boolean} visible - Visibility state
   */
  setColumnVisibility(columnId, visible) {
    this._columnManager.setVisibility(columnId, visible)
  }

  // ============================================
  // Public API - Mode
  // ============================================

  /**
   * Get current mode
   * @returns {'view'|'edit'}
   */
  getMode() {
    return this._state.getMode()
  }

  /**
   * Set table mode
   * @param {'view'|'edit'} mode - Mode to set
   */
  setMode(mode) {
    this._state.setMode(mode)
  }

  /**
   * Toggle between view and edit mode
   */
  toggleMode() {
    const currentMode = this._state.getMode()
    this._state.setMode(currentMode === "view" ? "edit" : "view")
  }

  // ============================================
  // Public API - Groups
  // ============================================

  /**
   * Toggle a group's visibility
   * @param {string} groupId - Group identifier
   */
  toggleGroup(groupId) {
    this._state.toggleGroup(groupId)
  }

  /**
   * Expand all groups
   */
  expandAllGroups() {
    this._state.expandAllGroups()
  }

  /**
   * Collapse all groups
   */
  collapseAllGroups() {
    this._state.collapseAllGroups()
  }

  // ============================================
  // Public API - Export
  // ============================================

  /**
   * Export table to CSV
   * @param {Object} [options] - Export options
   * @returns {string} CSV string
   */
  exportCSV(options = {}) {
    return this._exportManager.toCSV(options)
  }

  /**
   * Export table to Excel
   * @param {Object} [options] - Export options
   */
  exportExcel(options = {}) {
    return this._exportManager.toExcel(options)
  }

  /**
   * Download export as file
   * @param {'csv'|'excel'} format - Export format
   * @param {string} [filename] - File name
   */
  download(format, filename) {
    this._exportManager.download(format, filename)
  }

  // ============================================
  // Public API - Utilities
  // ============================================

  /**
   * Force re-render of the table
   */
  render() {
    this._render()
  }

  /**
   * Scroll to a specific row
   * @param {string|number} rowId - Row identifier
   */
  scrollToRow(rowId) {
    this._scrollManager.scrollToRow(rowId)
  }

  // ============================================
  // Public API - Theme
  // ============================================

  /**
   * Update theme at runtime
   * @param {Object} theme - Partial theme configuration
   */
  updateTheme(theme) {
    this._themeManager.updateTheme(theme)
  }

  /**
   * Reset to default theme
   */
  resetTheme() {
    this._themeManager.resetTheme()
  }

  /**
   * Get current theme
   * @returns {Object} Current theme configuration
   */
  getTheme() {
    return this._themeManager.getTheme()
  }

  /**
   * Subscribe to table events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    return this._eventBus.on(event, callback)
  }

  /**
   * Unsubscribe from table events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off(event, callback) {
    this._eventBus.off(event, callback)
  }

  /**
   * Destroy the table instance
   */
  destroy() {
    this._eventBus.emit(TableEvents.DESTROY, {})

    // Destroy modules
    this._renderer.destroy()
    this._themeManager.resetTheme()
    this._columnManager.destroy()
    this._rowManager.destroy()
    this._groupManager.destroy()
    this._editManager.destroy()
    this._scrollManager.destroy()
    this._exportManager.destroy()

    // Destroy core
    this._state.destroy()
    this._eventBus.destroy()

    // Clear container
    this._container.innerHTML = ""
    removeClass(this._container, "et-container")
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Validate configuration
   * @private
   */
  _validateConfig(config) {
    if (!config) {
      throw new Error("Table: Configuration object is required")
    }
    if (!config.container) {
      throw new Error("Table: Container element or selector is required")
    }
    if (!config.columns || !Array.isArray(config.columns)) {
      throw new Error("Table: Columns array is required")
    }
  }

  /**
   * Initialize all modules
   * @private
   */
  _initModules() {
    // Initialize renderer first
    this._renderer = new TableRenderer(this._container, this._state)

    // Initialize theme manager
    this._themeManager = new ThemeManager(this._container, this._config.theme)

    // Initialize feature modules
    this._columnManager = new ColumnManager(this._state, this._eventBus)
    this._rowManager = new RowManager(this._state, this._eventBus)
    this._groupManager = new GroupManager(this._state, this._eventBus)
    this._editManager = new EditManager(
      this._state,
      this._eventBus,
      this._renderer
    )
    this._scrollManager = new ScrollManager(
      this._container,
      this._state,
      this._eventBus
    )
    this._exportManager = new ExportManager(this._state, this._eventBus)
  }

  /**
   * Register user callbacks
   * @private
   */
  _registerCallbacks() {
    const { onRowClick, onRender, onChange, onRowChange } = this._config

    if (onRowClick) {
      this._eventBus.on(TableEvents.ROW_CLICK, onRowClick)
    }

    if (onRender) {
      this._eventBus.on(TableEvents.AFTER_RENDER, onRender)
    }

    if (onChange) {
      this._eventBus.on(TableEvents.DATA_CHANGE, onChange)
    }

    if (onRowChange) {
      this._eventBus.on(TableEvents.ROW_CHANGE, onRowChange)
    }
  }

  /**
   * Render the table
   * @private
   */
  _render() {
    this._eventBus.emit(TableEvents.BEFORE_RENDER, {})
    this._renderer.render()
    this._eventBus.emit(TableEvents.RENDER, {})

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this._eventBus.emit(TableEvents.AFTER_RENDER, {
        rowCount: this._state.getData().length,
        columnCount: this._state.getColumns().length,
      })
    })
  }
}

// Expose event types for external use
Table.Events = TableEvents
