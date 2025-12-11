/*!
 * DataGrid v1.0.0
 * A modular, high-performance inline editing table library
 * (c) 2025
 * Released under the MIT License
 */
/**
 * EventBus - Lightweight pub/sub event system for decoupled communication
 *
 * This enables modules to communicate without direct dependencies,
 * improving maintainability and allowing for efficient cascade updates.
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();

    /** @type {Map<string, Function>} */
    this._onceListeners = new Map(); // TODO: Implement once listeners if needed

    /** @type {boolean} */
    this._isBatching = false;

    /** @type {Array<{event: string, data: any}>} */
    this._batchQueue = [];
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   */
  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this._isBatching) {
      this._batchQueue.push({ event, data });
      return
    }

    if (this._listeners.has(event)) {
      this._listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Start batching events (for performance during bulk updates)
   */
  startBatch() {
    this._isBatching = true;
    this._batchQueue = [];
  }

  /**
   * End batching and emit all queued events
   * Deduplicates events of the same type, keeping latest data
   */
  endBatch() {
    this._isBatching = false;

    // Deduplicate: for CELL_CHANGE events, use rowId:columnName as key
    // For other events, use just the event name
    const eventMap = new Map();
    this._batchQueue.forEach(({ event, data }) => {
      let key = event;

      // For cell-specific events, create unique key per cell
      if (event === TableEvents.CELL_CHANGE && data.rowId && data.columnName) {
        key = `${event}:${data.rowId}:${data.columnName}`;
      } else if (event === TableEvents.ROW_CHANGE && data.rowId) {
        key = `${event}:${data.rowId}`;
      }

      eventMap.set(key, { event, data });
    });

    // Emit deduplicated events
    eventMap.forEach(({ event, data }) => {
      this.emit(event, data);
    });

    this._batchQueue = [];
  }

  /**
   * Remove all listeners
   */
  destroy() {
    this._listeners.clear();
    this._batchQueue = [];
  }
}

// Predefined event types for consistency
const TableEvents = {
  // State events
  STATE_CHANGE: "state:change",
  DATA_CHANGE: "data:change",

  // Row events
  ROW_CLICK: "row:click",
  ROW_CHANGE: "row:change",
  ROW_ADD: "row:add",
  ROW_DELETE: "row:delete",

  // Cell events
  CELL_CHANGE: "cell:change",
  CELL_FOCUS: "cell:focus",
  CELL_BLUR: "cell:blur",

  // Action events
  ACTION_CLICK: "action:click",

  // Row total events
  ROW_TOTAL_CHANGE: "rowTotal:change",

  // Group events
  GROUP_TOGGLE: "group:toggle",
  GROUP_EXPAND_ALL: "group:expandAll",
  GROUP_COLLAPSE_ALL: "group:collapseAll",

  // Mode events
  MODE_CHANGE: "mode:change",

  // Lifecycle events
  BEFORE_RENDER: "lifecycle:beforeRender",
  RENDER: "lifecycle:render",
  AFTER_RENDER: "lifecycle:afterRender",
  DESTROY: "lifecycle:destroy",

  // Scroll events
  SCROLL: "scroll:update",

  // Export events
  EXPORT_START: "export:start",
  EXPORT_COMPLETE: "export:complete",
};

/**
 * General Helpers - Utility functions for data manipulation
 */

/**
 * Generate a unique ID
 * @returns {string}
 */
function generateId() {
  return `et_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object/array
 * @param {any} obj - Object to clone
 * @returns {any}
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Set) {
    return new Set([...obj].map(item => deepClone(item)));
  }
  
  if (obj instanceof Map) {
    return new Map([...obj].map(([key, value]) => [deepClone(key), deepClone(value)]));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Deep equality check
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true;
  
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * Parse a value to number safely
 * @param {any} value - Value to parse
 * @param {number} [defaultValue=0] - Default if parsing fails
 * @returns {number}
 */
function toNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Sum values in an array
 * @param {Array<number>} values - Array of numbers
 * @returns {number}
 */
function sum(values) {
  return values.reduce((acc, val) => acc + (toNumber(val)), 0);
}

/**
 * Calculate average of values
 * @param {Array<number>} values - Array of numbers
 * @returns {number}
 */
function average(values) {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Find minimum value
 * @param {Array<number>} values - Array of numbers
 * @returns {number}
 */
function min(values) {
  const nums = values.filter(v => !isNaN(toNumber(v)));
  return nums.length ? Math.min(...nums.map(toNumber)) : 0;
}

/**
 * Find maximum value
 * @param {Array<number>} values - Array of numbers
 * @returns {number}
 */
function max(values) {
  const nums = values.filter(v => !isNaN(toNumber(v)));
  return nums.length ? Math.max(...nums.map(toNumber)) : 0;
}

/**
 * TableState - Centralized state management with change tracking
 *
 * Manages all table data and state with efficient change detection
 * and cascade update support for totals, groups, and computed values.
 */


class TableState {
  /**
   * @param {EventBus} eventBus - Event bus instance
   * @param {Object} initialState - Initial state configuration
   */
  constructor(eventBus, initialState = {}) {
    /** @type {EventBus} */
    this._eventBus = eventBus;

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

      // Batch operation tracking
      isBatchOperation: false,

      // Configuration
      config: {
        fixedFirstColumn: false,
        enableGrouping: false,
        groupBy: null,
        groups: {},
        enableInfoRows: false,
        enableRowTotals: false,
        actions: [],
        ...initialState.config,
      },
    };

    // Apply initial data
    if (initialState.data) {
      this.setData(initialState.data);
    }
    if (initialState.columns) {
      this.setColumns(initialState.columns);
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
    this._state.originalData = deepClone(data);
    this._state.data = this._normalizeData(data);
    this._state.dirtyRows.clear();
    this._invalidateCache();

    if (this._state.config.enableGrouping && this._state.config.groupBy) {
      this._computeGroups();
    }

    this._eventBus.emit(TableEvents.DATA_CHANGE, {
      data: this._state.data,
      source: "setData",
    });
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
    const row = this._state.data.find((r) => r._id === rowId);
    return row ? deepClone(row) : null
  }

  /**
   * Check if currently in a batch operation
   * @returns {boolean}
   */
  isBatchOperation() {
    return this._state.isBatchOperation
  }

  /**
   * Update a specific cell value
   * @param {string|number} rowId - Row identifier
   * @param {string} columnName - Column name
   * @param {any} value - New value
   * @param {Object} options - Update options
   */
  updateCell(rowId, columnName, value, options = {}) {
    const rowIndex = this._state.data.findIndex((r) => r._id === rowId);
    if (rowIndex === -1) return

    const row = this._state.data[rowIndex];
    const oldValue = row[columnName];

    // Skip if value hasn't changed
    if (deepEqual(oldValue, value)) return

    // Update the value
    row[columnName] = value;

    // Mark as dirty
    this._state.dirtyRows.add(rowId);
    if (!this._state.dirtyColumns.has(rowId)) {
      this._state.dirtyColumns.set(rowId, new Set());
    }
    this._state.dirtyColumns.get(rowId).add(columnName);

    // Invalidate affected cache
    this._invalidateCacheForRow(rowId, columnName);

    // Skip emitting individual cell/row change events during batch operations
    // The full render will happen after the batch completes via DATA_CHANGE
    if (!this._state.isBatchOperation) {
      // Emit cell change event
      this._eventBus.emit(TableEvents.CELL_CHANGE, {
        rowId,
        rowIndex,
        columnName,
        oldValue,
        newValue: value,
        row: deepClone(row),
      });

      // Emit row change event
      this._eventBus.emit(TableEvents.ROW_CHANGE, {
        rowId,
        rowIndex,
        columnName,
        row: deepClone(row),
        dirtyColumns: Array.from(this._state.dirtyColumns.get(rowId) || []),
      });
    }

    // Trigger cascade updates if needed
    if (!options.skipCascade) {
      this._triggerCascadeUpdate(rowId, columnName, value);
    }
  }

  /**
   * Batch update multiple cells (more efficient for bulk changes)
   * @param {Array<{rowId, columnName, value}>} updates - Array of updates
   */
  batchUpdate(updates) {
    // Mark that we're in a batch operation
    this._state.isBatchOperation = true;

    this._eventBus.startBatch();

    updates.forEach(({ rowId, columnName, value }) => {
      this.updateCell(rowId, columnName, value, { skipCascade: true });
    });

    // Compute cascade updates once for all changes
    this._computeAllCascades();

    this._eventBus.endBatch();

    // Mark batch operation as complete before emitting DATA_CHANGE
    this._state.isBatchOperation = false;

    this._eventBus.emit(TableEvents.DATA_CHANGE, {
      data: this._state.data,
      source: "batchUpdate",
      updatedRows: updates.map((u) => u.rowId),
    });
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
    }));

    this._eventBus.emit(TableEvents.STATE_CHANGE, {
      property: "columns",
      value: this._state.columns,
    });
  }

  /**
   * Get column definitions
   * @returns {Array<Object>}
   */
  getColumns() {
    const columns = [...this._state.columns];

    // Append row total column if enabled
    if (this._state.config.enableRowTotals) {
      // Default format: $X,XXX
      const defaultFormat = (value) =>
        value !== null && value !== undefined
          ? `$${Number(value).toLocaleString()}`
          : "$0";

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
      });
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
          : "$0";

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
      console.warn(`Invalid mode: ${mode}. Must be 'view' or 'edit'.`);
      return
    }

    const oldMode = this._state.mode;
    this._state.mode = mode;

    this._eventBus.emit(TableEvents.MODE_CHANGE, {
      oldMode,
      newMode: mode,
    });
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
      this._state.collapsedGroups.delete(groupId);
    } else {
      this._state.collapsedGroups.add(groupId);
    }

    this._eventBus.emit(TableEvents.GROUP_TOGGLE, {
      groupId,
      collapsed: this._state.collapsedGroups.has(groupId),
    });
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
    this._state.collapsedGroups.clear();
    this._eventBus.emit(TableEvents.GROUP_EXPAND_ALL, {});
  }

  /**
   * Collapse all groups
   */
  collapseAllGroups() {
    if (this._state.groupedData) {
      Object.keys(this._state.groupedData).forEach((groupId) => {
        this._state.collapsedGroups.add(groupId);
      });
    }
    this._eventBus.emit(TableEvents.GROUP_COLLAPSE_ALL, {});
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
    this._state.dirtyRows.clear();
    this._state.dirtyColumns.clear();
    this._state.originalData = deepClone(this._state.data);
  }

  /**
   * Revert all changes to original data
   */
  revertChanges() {
    this.setData(this._state.originalData);
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Update configuration
   * @param {Object} config - Configuration updates
   */
  setConfig(config) {
    this._state.config = { ...this._state.config, ...config };

    if (config.groupBy !== undefined) {
      this._computeGroups();
    }

    this._eventBus.emit(TableEvents.STATE_CHANGE, {
      property: "config",
      value: this._state.config,
    });
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
    const { groupBy } = this._state.config;
    if (!groupBy) {
      this._state.groupedData = null;
      return
    }

    const groups = {};
    const ungroupedRows = [];
    const infoRows = [];

    this._state.data.forEach((row) => {
      // Info rows are rendered separately at the top
      if (row._type === "infoRow") {
        infoRows.push(row);
        return
      }

      // Only include data rows in groups
      if (row._type !== "data") return

      const groupKey =
        typeof groupBy === "function" ? groupBy(row) : row[groupBy];

      // Handle rows without a group value
      if (groupKey === null || groupKey === undefined || groupKey === "") {
        ungroupedRows.push(row);
        return
      }

      if (!groups[groupKey]) {
        // Check if there's a custom label in config.groups.labels
        const customLabels = this._state.config.groups?.labels || {};
        const customLabel = customLabels[groupKey];

        groups[groupKey] = {
          id: groupKey,
          label: customLabel || groupKey,
          rows: [],
          totals: {},
        };
      }
      groups[groupKey].rows.push(row);
    });

    // Store ungrouped rows and info rows separately
    this._state.groupedData = groups;
    this._state.ungroupedRows = ungroupedRows;
    this._state.infoRows = infoRows;
  }

  /**
   * Invalidate entire computed cache
   * @private
   */
  _invalidateCache() {
    this._state.computedCache.clear();
  }

  /**
   * Invalidate cache for specific row/column
   * @private
   */
  _invalidateCacheForRow(rowId, columnName) {
    // Invalidate direct cache
    this._state.computedCache.delete(`${rowId}:${columnName}`);

    // Invalidate dependent caches (totals, cumulative, etc.)
    const column = this.getColumn(columnName);
    if (column && column.affectsColumns) {
      column.affectsColumns.forEach((affectedCol) => {
        this._state.computedCache.forEach((_, key) => {
          if (key.includes(`:${affectedCol}`)) {
            this._state.computedCache.delete(key);
          }
        });
      });
    }
  }

  /**
   * Trigger cascade updates for dependent rows/cells
   * @private
   */
  _triggerCascadeUpdate(rowId, columnName, value) {
    const column = this.getColumn(columnName);
    if (!column) return

    // Check for cascade configuration
    if (column.cascade) {
      column.cascade({
        rowId,
        columnName,
        value,
        state: this,
        updateCell: (rId, cName, val) => {
          this.updateCell(rId, cName, val, { skipCascade: true });
        },
      });
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
    this._state.data = [];
    this._state.columns = [];
    this._state.computedCache.clear();
    this._state.dirtyRows.clear();
    this._state.dirtyColumns.clear();
    this._state.collapsedGroups.clear();
  }
}

/**
 * DOM Utilities - Helper functions for DOM manipulation
 */

/**
 * Create an element with attributes
 * @param {string} tag - HTML tag name
 * @param {Object} [attributes] - Attributes to set
 * @returns {HTMLElement}
 */
function createElement(tag, attributes = {}) {
  const element = document.createElement(tag);
  setAttributes(element, attributes);
  return element
}

/**
 * Set multiple attributes on an element
 * @param {HTMLElement} element - Target element
 * @param {Object} attributes - Attributes object
 */
function setAttributes(element, attributes) {
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "class") {
      element.className = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(element.style, value);
    } else if (key.startsWith("data-")) {
      element.setAttribute(key, value);
    } else if (key in element) {
      element[key] = value;
    } else {
      element.setAttribute(key, value);
    }
  });
}

/**
 * Add one or more classes to an element
 * @param {HTMLElement} element - Target element
 * @param {...string} classNames - Class names to add
 */
function addClass(element, ...classNames) {
  classNames.forEach((className) => {
    if (className) {
      element.classList.add(className);
    }
  });
}

/**
 * Remove one or more classes from an element
 * @param {HTMLElement} element - Target element
 * @param {...string} classNames - Class names to remove
 */
function removeClass(element, ...classNames) {
  classNames.forEach((className) => {
    if (className) {
      element.classList.remove(className);
    }
  });
}

/**
 * TableRenderer - Handles all DOM rendering operations
 *
 * Responsible for creating and updating the table DOM structure
 * with efficient differential updates for performance.
 */


class TableRenderer {
  /**
   * @param {HTMLElement} container - Container element
   * @param {TableState} state - Table state instance
   */
  constructor(container, state) {
    this._container = container;
    this._state = state;
    this._eventBus = state._eventBus;

    /** @type {HTMLElement} */
    this._tableWrapper = null;

    /** @type {HTMLElement} */
    this._table = null;

    /** @type {HTMLElement} */
    this._thead = null;

    /** @type {HTMLElement} */
    this._tbody = null;

    /** @type {Map<string, HTMLElement>} */
    this._rowElements = new Map();

    /** @type {Map<string, HTMLElement>} */
    this._cellElements = new Map();

    /** @type {Array<Function>} - Unsubscribe functions for cleanup */
    this._unsubscribers = [];

    // Subscribe to state changes
    this._setupEventListeners();
  }

  /**
   * Main render method
   */
  render() {
    const config = this._state.getConfig();

    // Create structure if it doesn't exist
    if (!this._tableWrapper) {
      this._createStructure();
    }

    // Update container classes based on config
    this._updateContainerClasses(config);

    // Render header
    this._renderHeader();

    // Render body based on grouping config
    if (config.enableGrouping && this._state.getGroupedData()) {
      this._renderGroupedBody();
    } else {
      this._renderBody();
    }
  }

  /**
   * Update a single cell without full re-render
   * @param {string} rowId - Row identifier
   * @param {string} columnName - Column name
   * @param {any} value - New value
   */
  updateCell(rowId, columnName, value) {
    const cellKey = `${rowId}:${columnName}`;
    const cell = this._cellElements.get(cellKey);

    if (cell && cell.isConnected) {
      const column = this._state.getColumn(columnName);
      const row = this._state.getRow(rowId);
      if (column && row) {
        this._renderCellContent(cell, value, column, row);
      }
    }
  }

  /**
   * Update a single row without full re-render
   * @param {string} rowId - Row identifier
   */
  updateRow(rowId) {
    const rowElement = this._rowElements.get(rowId);
    const rowData = this._state.getRow(rowId);

    if (rowElement && rowData) {
      const columns = this._state.getColumns();
      columns.forEach((column) => {
        const cellKey = `${rowId}:${column.data}`;
        const cell = this._cellElements.get(cellKey);
        if (cell) {
          this._renderCellContent(cell, rowData[column.data], column, rowData);
        }
      });
    }
  }

  /**
   * Get cell element by row and column
   * @param {string} rowId - Row identifier
   * @param {string} columnName - Column name
   * @returns {HTMLElement|null}
   */
  getCellElement(rowId, columnName) {
    return this._cellElements.get(`${rowId}:${columnName}`) || null
  }

  /**
   * Get row element by ID
   * @param {string} rowId - Row identifier
   * @returns {HTMLElement|null}
   */
  getRowElement(rowId) {
    return this._rowElements.get(rowId) || null
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    // Unsubscribe from all event listeners
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._unsubscribers = [];

    // Clear element caches
    this._rowElements.clear();
    this._cellElements.clear();

    // Remove DOM elements
    if (this._tableWrapper) {
      this._tableWrapper.remove();
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Setup event listeners for state changes
   * @private
   */
  _setupEventListeners() {
    this._unsubscribers.push(
      this._eventBus.on(
        TableEvents.CELL_CHANGE,
        ({ rowId, columnName, newValue }) => {
          // Skip individual cell updates during batch operations
          // The full render will happen after the batch completes
          if (this._state.isBatchOperation && this._state.isBatchOperation()) {
            return
          }
          this.updateCell(rowId, columnName, newValue);
        }
      )
    );

    // Listen for data changes (row add/delete) to re-render
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.DATA_CHANGE, () => {
        this.render();
      })
    );

    // Listen for row total changes (emitted by GroupManager after calculation)
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.ROW_TOTAL_CHANGE, ({ rowId, newValue }) => {
        this.updateCell(rowId, "_rowTotal", newValue);
      })
    );

    // Listen for group totals updates to re-render group headers
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.STATE_CHANGE, ({ property, groupId }) => {
        if (property === "groupTotals") {
          // Re-render group headers to show updated aggregates
          this._updateGroupHeaders(groupId);
        }
      })
    );

    this._unsubscribers.push(
      this._eventBus.on(TableEvents.MODE_CHANGE, () => {
        this.render();
      })
    );

    this._unsubscribers.push(
      this._eventBus.on(TableEvents.GROUP_TOGGLE, ({ groupId, collapsed }) => {
        this._toggleGroupVisibility(groupId, collapsed);
      })
    );

    this._unsubscribers.push(
      this._eventBus.on(TableEvents.GROUP_EXPAND_ALL, () => {
        this._setAllGroupsVisibility(false);
      })
    );

    this._unsubscribers.push(
      this._eventBus.on(TableEvents.GROUP_COLLAPSE_ALL, () => {
        this._setAllGroupsVisibility(true);
      })
    );
  }

  /**
   * Create the base DOM structure
   * @private
   */
  _createStructure() {
    addClass(this._container, "dg-container");

    // Create wrapper for scroll handling
    this._tableWrapper = createElement("div", { class: "dg-table-wrapper" });

    // Create table
    this._table = createElement("table", { class: "dg-table" });

    // Create header
    this._thead = createElement("thead", { class: "dg-thead" });

    // Create body
    this._tbody = createElement("tbody", { class: "dg-tbody" });

    // Assemble
    this._table.appendChild(this._thead);
    this._table.appendChild(this._tbody);
    this._tableWrapper.appendChild(this._table);
    this._container.appendChild(this._tableWrapper);
  }

  /**
   * Update container classes based on config
   * @private
   */
  _updateContainerClasses(config) {
    const mode = this._state.getMode();

    // Mode classes
    removeClass(this._container, "dg-mode-view", "dg-mode-edit");
    addClass(this._container, `dg-mode-${mode}`);

    // Feature classes
    if (config.fixedFirstColumn) {
      addClass(this._container, "dg-fixed-first-column");
    } else {
      removeClass(this._container, "dg-fixed-first-column");
    }

    if (config.enableGrouping) {
      addClass(this._container, "dg-grouped");
    } else {
      removeClass(this._container, "dg-grouped");
    }
  }

  /**
   * Render table header
   * @private
   */
  _renderHeader() {
    const columns = this._state.getColumns();
    const config = this._state.getConfig();

    this._thead.innerHTML = "";

    const headerRow = createElement("tr", { class: "dg-header-row" });

    let visibleIndex = 0;
    columns.forEach((column) => {
      if (column.visible === false) return

      const th = createElement("th", {
        class: "dg-header-cell",
        "data-column": column.data,
        "data-column-index": visibleIndex,
      });

      // Fixed first column
      if (visibleIndex === 0 && config.fixedFirstColumn) {
        addClass(th, "dg-cell-fixed");
      }

      // Row total column header
      if (column._isRowTotal) {
        addClass(th, "dg-header-row-total");
      }

      // Header content
      const headerContent = createElement("div", { class: "dg-header-content" });
      headerContent.textContent = column.title || column.data;
      th.appendChild(headerContent);

      // Column width
      if (column.width) {
        th.style.width =
          typeof column.width === "number" ? `${column.width}px` : column.width;
      }

      headerRow.appendChild(th);
      visibleIndex++;
    });

    this._thead.appendChild(headerRow);
  }

  /**
   * Render table body (ungrouped)
   * @private
   */
  _renderBody() {
    const data = this._state.getData();
    const columns = this._state.getColumns();

    this._tbody.innerHTML = "";
    this._rowElements.clear();
    this._cellElements.clear();

    data.forEach((row) => {
      const rowElement = this._createRowElement(row, columns);
      this._tbody.appendChild(rowElement);
    });
  }

  /**
   * Render table body (grouped)
   * @private
   */
  _renderGroupedBody() {
    const groupedData = this._state.getGroupedData();
    const ungroupedRows = this._state.getUngroupedRows();
    const infoRows = this._state.getInfoRows();
    const columns = this._state.getColumns();

    this._tbody.innerHTML = "";
    this._rowElements.clear();
    this._cellElements.clear();

    // Render info rows first (at the top, not part of any group)
    if (infoRows && infoRows.length > 0) {
      infoRows.forEach((row) => {
        const rowElement = this._createRowElement(row, columns, null);
        addClass(rowElement, "dg-row-info");
        this._tbody.appendChild(rowElement);
      });
    }

    // Render grouped rows
    Object.entries(groupedData).forEach(([groupId, group]) => {
      // Group header row (includes aggregate values)
      const groupHeader = this._createGroupHeaderRow(groupId, group, columns);
      this._tbody.appendChild(groupHeader);

      // Group rows
      const isCollapsed = this._state.isGroupCollapsed(groupId);
      group.rows.forEach((row) => {
        const rowElement = this._createRowElement(row, columns, groupId);
        if (isCollapsed) {
          addClass(rowElement, "dg-row-hidden");
        }
        this._tbody.appendChild(rowElement);
      });
    });

    // Render ungrouped rows at the end (rows without a group value)
    if (ungroupedRows.length > 0) {
      ungroupedRows.forEach((row) => {
        const rowElement = this._createRowElement(row, columns, null);
        addClass(rowElement, "dg-row-ungrouped");
        this._tbody.appendChild(rowElement);
      });
    }
  }

  /**
   * Create a data row element
   * @private
   */
  _createRowElement(row, columns, groupId = null) {
    const config = this._state.getConfig();
    const isInfoRow = row._type === "infoRow";

    const tr = createElement("tr", {
      class: `dg-row ${isInfoRow ? "dg-row-info-row" : "dg-row-data"}`,
      "data-row-id": row._id,
      "data-row-index": row._index,
    });

    if (groupId) {
      tr.setAttribute("data-group", groupId);
    }

    // Mark dirty rows
    if (this._state.isRowDirty(row._id)) {
      addClass(tr, "dg-row-dirty");
    }

    // Row click handler
    tr.addEventListener("click", (e) => {
      if (!e.target.closest(".dg-cell-input")) {
        this._eventBus.emit(TableEvents.ROW_CLICK, {
          rowId: row._id,
          rowIndex: row._index,
          row: this._state.getRow(row._id),
          event: e,
        });
      }
    });

    // Create cells
    let visibleIndex = 0;
    columns.forEach((column) => {
      if (column.visible === false) return

      const td = this._createCellElement(row, column, visibleIndex, config);
      tr.appendChild(td);

      // Store reference
      this._cellElements.set(`${row._id}:${column.data}`, td);
      visibleIndex++;
    });

    // Store reference
    this._rowElements.set(row._id, tr);

    return tr
  }

  /**
   * Create a cell element
   * @private
   */
  _createCellElement(row, column, index, config) {
    const td = createElement("td", {
      class: "dg-cell",
      "data-column": column.data,
    });

    // Fixed first column
    if (index === 0 && config.fixedFirstColumn) {
      addClass(td, "dg-cell-fixed");
    }

    // Row total column
    if (column._isRowTotal) {
      addClass(td, "dg-cell-row-total");
    }

    // Cell type classes
    if (column.type) {
      addClass(td, `dg-cell-${column.type}`);
    }

    // Alignment
    if (column.align) {
      td.style.textAlign = column.align;
    }

    // Render actions for first column FIRST (before content)
    // This ensures actions are at the beginning of the cell
    const actions = config.actions || [];
    const columnHasActions = column.actions !== false; // Default true, can be disabled per column
    // Check if row should have actions (skip infoRows and check showIf callback if provided)
    const rowHasActions =
      row._type !== "infoRow" &&
      (!config.actionsShowIf || config.actionsShowIf(row));
    if (
      index === 0 &&
      actions.length > 0 &&
      columnHasActions &&
      rowHasActions
    ) {
      const actionsWrapper = this._createRowActions(actions, row);
      td.appendChild(actionsWrapper);
      addClass(td, "dg-cell-has-actions");
    }

    // Render content (pass flag to skip action handling since we did it above)
    this._renderCellContent(td, row[column.data], column, row, true);

    // Render badge for first column if row has _badge property
    if (index === 0 && row._badge && row._type !== "infoRow") {
      const badge = this._createBadgeElement(row._badge);
      td.appendChild(badge);
      addClass(td, "dg-cell-has-badge");
    }

    return td
  }

  /**
   * Create badge element for a cell
   * @private
   * @param {string|HTMLElement|Object} badgeConfig - Badge content or config object
   *   - string: Plain text or HTML string
   *   - HTMLElement: Custom element
   *   - Object: { content: string|HTMLElement, position: string }
   *     position values: 'top-end' (default), 'center-end', 'bottom-end',
   *                      'top-start', 'center-start', 'bottom-start'
   * @returns {HTMLElement} Badge element
   */
  _createBadgeElement(badgeConfig) {
    // Extract content and position from config object or use direct value
    let content = badgeConfig;
    let position = null;

    if (
      badgeConfig &&
      typeof badgeConfig === "object" &&
      !(badgeConfig instanceof HTMLElement) &&
      "content" in badgeConfig
    ) {
      content = badgeConfig.content;
      position = badgeConfig.position || null;
    }

    // Check if content contains HTML tags (custom styled element)
    const containsHtml = typeof content === "string" && /<[^>]+>/.test(content);

    let badge;
    if (containsHtml) {
      // Custom HTML provided - create wrapper without default badge styling
      badge = createElement("span", { class: "dg-cell-badge-wrapper" });
      badge.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      // HTMLElement provided - wrap without default styling
      badge = createElement("span", { class: "dg-cell-badge-wrapper" });
      badge.appendChild(content.cloneNode(true));
    } else {
      // Plain text - apply default badge styling
      badge = createElement("span", { class: "dg-cell-badge" });
      badge.textContent = content;
    }

    // Apply position class if specified
    if (position) {
      const positionClass = `dg-badge-${position}`;
      addClass(badge, positionClass);
    }

    return badge
  }

  /**
   * Update badge for a specific row
   * @param {string} rowId - Row identifier
   * @param {string|HTMLElement|null} badgeContent - New badge content (null to remove)
   */
  updateRowBadge(rowId, badgeContent) {
    // Update the badge in the actual state data (not a clone)
    const data = this._state._state.data;
    const row = data.find((r) => r._id === rowId);
    if (!row) return

    // Update the data
    row._badge = badgeContent;

    // Find the first cell of the row
    const columns = this._state.getColumns();
    const firstVisibleColumn = columns.find((col) => col.visible !== false);
    if (!firstVisibleColumn) return

    const cellKey = `${rowId}:${firstVisibleColumn.data}`;
    const td = this._cellElements.get(cellKey);
    if (!td) return

    // Remove existing badge (could be either class)
    const existingBadge = td.querySelector(
      ".dg-cell-badge, .dg-cell-badge-wrapper"
    );
    if (existingBadge) {
      existingBadge.remove();
      removeClass(td, "dg-cell-has-badge");
    }

    // Add new badge if content provided
    if (badgeContent) {
      const badge = this._createBadgeElement(badgeContent);
      td.appendChild(badge);
      addClass(td, "dg-cell-has-badge");
    }
  }

  /**
   * Create row actions container with action icons
   * @private
   * @param {Array} actions - Array of action configurations
   * @param {Object} row - Row data
   * @returns {HTMLElement} Actions wrapper element
   */
  _createRowActions(actions, row) {
    const wrapper = createElement("span", { class: "dg-row-actions" });

    actions.forEach((action, index) => {
      const actionBtn = createElement("span", {
        class: "dg-row-action",
        title: action.tooltip || "",
        "data-action-index": index,
      });

      // Set the icon HTML
      if (action.icon) {
        if (typeof action.icon === "string") {
          actionBtn.innerHTML = action.icon;
        } else if (action.icon instanceof HTMLElement) {
          actionBtn.appendChild(action.icon.cloneNode(true));
        }
      }

      // Click handler
      actionBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent row click

        // Get fresh row data
        const rowData = this._state.getRow(row._id);

        // Call the onClick handler if provided
        if (typeof action.onClick === "function") {
          action.onClick(rowData, e);
        }

        // Emit event for external listeners
        this._eventBus.emit(TableEvents.ACTION_CLICK, {
          actionIndex: index,
          action,
          rowId: row._id,
          row: rowData,
          event: e,
        });
      });

      wrapper.appendChild(actionBtn);
    });

    return wrapper
  }

  /**
   * Render cell content based on mode and column config
   * @private
   * @param {HTMLElement} cell - Cell element
   * @param {any} value - Cell value
   * @param {Object} column - Column configuration
   * @param {Object} row - Row data
   * @param {boolean} skipSpecialElements - Skip handling of actions/badges (used during initial creation)
   */
  _renderCellContent(cell, value, column, row, skipSpecialElements = false) {
    const isEditMode = this._state.isEditMode();
    // Check column, row type, and row-level editable override
    const isEditable =
      column.editable !== false &&
      row._type !== "infoRow" &&
      row._editable !== false;

    if (skipSpecialElements) {
      // During initial creation, just render the content
      // Actions and badges are handled by _createCellElement
      if (isEditMode && isEditable) {
        // Edit mode - render input
        const input = this._createInputElement(value, column, row);
        cell.appendChild(input);
      } else {
        // View mode - render display value
        const displayValue = this._formatDisplayValue(value, column, row);

        if (column.render) {
          // Custom render function
          const rendered = column.render(value, row, column);
          if (typeof rendered === "string") {
            // Create a text node or span for the content
            const content = document.createElement("span");
            content.innerHTML = rendered;
            cell.appendChild(content);
          } else if (rendered instanceof HTMLElement) {
            cell.appendChild(rendered);
          }
        } else {
          // Create text content
          const textNode = document.createTextNode(displayValue);
          cell.appendChild(textNode);
        }
      }
    } else {
      // During updates, we need to preserve actions and badges
      // Find and temporarily remove special elements
      const existingBadge = cell.querySelector(
        ".dg-cell-badge, .dg-cell-badge-wrapper"
      );
      const existingActions = cell.querySelector(".dg-row-actions");

      // Remove special elements temporarily (they keep their references and event listeners)
      if (existingBadge) existingBadge.remove();
      if (existingActions) existingActions.remove();

      // Clear remaining content (text nodes, inputs, spans)
      cell.innerHTML = "";

      // Re-add actions at the beginning (with their original event listeners intact)
      if (existingActions) {
        cell.appendChild(existingActions);
      }

      // Render content
      if (isEditMode && isEditable) {
        // Edit mode - render input
        const input = this._createInputElement(value, column, row);
        cell.appendChild(input);
      } else {
        // View mode - render display value
        const displayValue = this._formatDisplayValue(value, column, row);

        if (column.render) {
          // Custom render function
          const rendered = column.render(value, row, column);
          if (typeof rendered === "string") {
            // Create a text node or span for the content
            const content = document.createElement("span");
            content.innerHTML = rendered;
            cell.appendChild(content);
          } else if (rendered instanceof HTMLElement) {
            cell.appendChild(rendered);
          }
        } else {
          // Create text content
          const textNode = document.createTextNode(displayValue);
          cell.appendChild(textNode);
        }
      }

      // Re-add badge at the end (with its original structure intact)
      if (existingBadge) {
        cell.appendChild(existingBadge);
      }
    }
  }

  /**
   * Create input element for edit mode
   * @private
   */
  _createInputElement(value, column, row) {
    const type = column.inputType || column.type || "text";

    let input;

    if (type === "select" && column.options) {
      input = createElement("select", { class: "dg-cell-input dg-cell-select" });
      column.options.forEach((opt) => {
        const option = createElement("option", { value: opt.value || opt });
        option.textContent = opt.label || opt;
        if ((opt.value || opt) === value) {
          option.selected = true;
        }
        input.appendChild(option);
      });
    } else if (type === "textarea") {
      input = createElement("textarea", {
        class: "dg-cell-input dg-cell-textarea",
        value: value || "",
      });
      input.textContent = value || "";
    } else {
      input = createElement("input", {
        class: "dg-cell-input",
        type: type === "number" ? "number" : "text",
        value: value ?? "",
      });

      if (type === "number") {
        if (column.min !== undefined) input.min = column.min;
        if (column.max !== undefined) input.max = column.max;
        if (column.step !== undefined) input.step = column.step;
      }
    }

    // Input event handlers
    input.addEventListener("focus", () => {
      this._eventBus.emit(TableEvents.CELL_FOCUS, {
        rowId: row._id,
        columnName: column.data,
        value,
      });
    });

    input.addEventListener("blur", () => {
      this._eventBus.emit(TableEvents.CELL_BLUR, {
        rowId: row._id,
        columnName: column.data,
        value: input.value,
      });
    });

    input.addEventListener("change", (e) => {
      let newValue = e.target.value;

      // Type coercion
      if (type === "number") {
        newValue = newValue === "" ? null : parseFloat(newValue);
      }

      this._state.updateCell(row._id, column.data, newValue);

      // Column-specific onChange
      if (column.onChange) {
        column.onChange({
          value: newValue,
          rowId: row._id,
          row: this._state.getRow(row._id),
          column,
        });
      }
    });

    return input
  }

  /**
   * Format value for display
   * @private
   */
  _formatDisplayValue(value, column, row) {
    if (value === null || value === undefined) {
      return column.defaultValue ?? ""
    }

    // Info rows display values as-is without column formatting
    if (row._type === "infoRow") {
      return String(value)
    }

    if (column.format) {
      return column.format(value, row, column)
    }

    if (column.type === "number" && typeof value === "number") {
      return column.decimals !== undefined
        ? value.toFixed(column.decimals)
        : value.toString()
    }

    if (column.type === "currency") {
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: column.currency || "USD",
      }).format(value);
      return formatted
    }

    if (column.type === "date" && value) {
      const date = new Date(value);
      return date.toLocaleDateString()
    }

    return String(value)
  }

  /**
   * Create group header row
   * @private
   */
  _createGroupHeaderRow(groupId, group, columns) {
    const config = this._state.getConfig();
    const isCollapsed = this._state.isGroupCollapsed(groupId);
    const visibleColumns = columns.filter((c) => c.visible !== false);

    const tr = createElement("tr", {
      class: "dg-row dg-row-group-header",
      "data-group": groupId,
    });

    // Use pre-calculated totals from GroupManager
    const aggregates = group.totals || {};

    visibleColumns.forEach((column, index) => {
      const td = createElement("td", {
        class: "dg-cell dg-cell-group-header",
        "data-column": column.data,
      });

      // Fixed first column
      if (index === 0 && config.fixedFirstColumn) {
        addClass(td, "dg-cell-fixed");
      }

      // Row total column
      if (column._isRowTotal) {
        addClass(td, "dg-cell-row-total");
      }

      // First column: show toggle + group label
      if (index === 0) {
        const toggleContent = createElement("div", {
          class: "dg-group-header-content",
        });

        const toggleIcon = createElement("span", {
          class: `dg-group-toggle-icon ${
            isCollapsed ? "dg-collapsed" : "dg-expanded"
          }`,
        });
        toggleIcon.innerHTML = isCollapsed ? "▶" : "▼";

        const groupLabel = createElement("span", { class: "dg-group-label" });
        const labelContent = group.label || groupId;
        // Check if label contains HTML (starts with < or contains < followed by a letter)
        if (typeof labelContent === "string" && labelContent.includes("<")) {
          groupLabel.innerHTML = labelContent;
        } else {
          groupLabel.textContent = labelContent;
        }

        const groupCount = createElement("span", { class: "dg-group-count" });
        groupCount.textContent = `(${group.rows.length})`;

        toggleContent.appendChild(toggleIcon);
        toggleContent.appendChild(groupLabel);
        toggleContent.appendChild(groupCount);
        td.appendChild(toggleContent);
      } else if (column.aggregate && aggregates[column.data] !== undefined) {
        // Show aggregate value from GroupManager
        td.textContent = this._formatDisplayValue(
          aggregates[column.data],
          column,
          {}
        );
        addClass(td, "dg-cell-aggregate");
      }

      // Alignment
      if (column.align) {
        td.style.textAlign = column.align;
      }

      tr.appendChild(td);
    });

    // Click handler for toggle
    tr.addEventListener("click", () => {
      this._state.toggleGroup(groupId);
    });

    return tr
  }

  /**
   * Create totals row for a group
   * @private
   */
  _createTotalsRow(totals, columns, groupId) {
    const config = this._state.getConfig();

    const tr = createElement("tr", {
      class: "dg-row dg-row-totals",
      "data-group": groupId,
    });

    columns.forEach((column, index) => {
      if (column.visible === false) return

      const td = createElement("td", {
        class: "dg-cell dg-cell-total",
        "data-column": column.data,
      });

      if (index === 0 && config.fixedFirstColumn) {
        addClass(td, "dg-cell-fixed");
      }

      if (totals[column.data] !== undefined) {
        td.textContent = this._formatDisplayValue(
          totals[column.data],
          column,
          {}
        );
      }

      tr.appendChild(td);
    });

    return tr
  }

  /**
   * Toggle group visibility
   * @private
   */
  _toggleGroupVisibility(groupId, collapsed) {
    const rows = this._tbody.querySelectorAll(
      `[data-group="${groupId}"]:not(.dg-row-group-header)`
    );
    const header = this._tbody.querySelector(
      `.dg-row-group-header[data-group="${groupId}"]`
    );

    rows.forEach((row) => {
      if (collapsed) {
        addClass(row, "dg-row-hidden");
      } else {
        removeClass(row, "dg-row-hidden");
      }
    });

    // Update toggle icon
    if (header) {
      const icon = header.querySelector(".dg-group-toggle-icon");
      if (icon) {
        icon.innerHTML = collapsed ? "▶" : "▼";
        if (collapsed) {
          removeClass(icon, "dg-expanded");
          addClass(icon, "dg-collapsed");
        } else {
          removeClass(icon, "dg-collapsed");
          addClass(icon, "dg-expanded");
        }
      }
    }
  }

  /**
   * Set visibility for all groups
   * @private
   */
  _setAllGroupsVisibility(collapsed) {
    const groupedData = this._state.getGroupedData();
    if (groupedData) {
      Object.keys(groupedData).forEach((groupId) => {
        this._toggleGroupVisibility(groupId, collapsed);
      });
    }
  }

  /**
   * Update group header cells with new aggregate values
   * @private
   * @param {string} [groupId] - Specific group, or all if not provided
   */
  _updateGroupHeaders(groupId = null) {
    // Guard: ensure tbody exists before trying to update
    if (!this._tbody) return

    const groupedData = this._state.getGroupedData();
    if (!groupedData) return

    const columns = this._state.getColumns();
    const groupsToUpdate = groupId ? [groupId] : Object.keys(groupedData);

    groupsToUpdate.forEach((gId) => {
      const group = groupedData[gId];
      if (!group) return

      const headerRow = this._tbody.querySelector(
        `.dg-row-group-header[data-group="${gId}"]`
      );
      if (!headerRow) return

      // Update each aggregate cell in the header
      columns.forEach((column) => {
        if (column.aggregate && group.totals[column.data] !== undefined) {
          const cell = headerRow.querySelector(`[data-column="${column.data}"]`);
          if (cell && !cell.querySelector(".dg-group-header-content")) {
            cell.textContent = this._formatDisplayValue(
              group.totals[column.data],
              column,
              {}
            );
          }
        }
      });
    });
  }
}

/**
 * RowManager - Handles row-related operations
 *
 * Manages row CRUD operations and row types.
 */


class RowManager {
  /**
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   */
  constructor(state, eventBus) {
    this._state = state;
    this._eventBus = eventBus;

    /** @type {Array<Function>} - Unsubscribe functions for cleanup */
    this._unsubscribers = [];

    // Setup event listeners
    this._setupListeners();
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
    const data = this._state.getData();
    const { index, groupId, afterRowId, type = "data" } = options;

    const newRow = {
      ...rowData,
      _id: rowData._id || generateId(),
      _type: type,
    };

    let insertIndex = data.length;

    if (index !== undefined) {
      insertIndex = Math.max(0, Math.min(index, data.length));
    } else if (afterRowId) {
      const afterIndex = data.findIndex((r) => r._id === afterRowId);
      if (afterIndex !== -1) {
        insertIndex = afterIndex + 1;
      }
    } else if (groupId) {
      // Find last row in group
      const config = this._state.getConfig();
      const groupBy = config.groupBy;
      for (let i = data.length - 1; i >= 0; i--) {
        const rowGroup =
          typeof groupBy === "function" ? groupBy(data[i]) : data[i][groupBy];
        if (rowGroup === groupId) {
          insertIndex = i + 1;
          break
        }
      }

      // Set group key on new row
      if (typeof groupBy === "string") {
        newRow[groupBy] = groupId;
      }
    }

    // Insert row
    data.splice(insertIndex, 0, newRow);

    // Update indices
    data.forEach((row, idx) => {
      row._index = idx;
    });

    this._state.setData(data);

    this._eventBus.emit(TableEvents.ROW_ADD, {
      row: newRow,
      index: insertIndex,
    });

    return newRow
  }

  /**
   * Add an info row (informational row)
   * @param {string} parentRowId - Parent row ID
   * @param {Object} infoRowData - Info row data
   * @returns {Object} Added info row
   */
  addInfoRow(parentRowId, infoRowData) {
    return this.addRow(infoRowData, {
      afterRowId: parentRowId,
      type: "infoRow",
    })
  }

  /**
   * Delete a row
   * @param {string} rowId - Row ID to delete
   * @returns {boolean} Success
   */
  deleteRow(rowId) {
    const data = this._state.getData();
    const rowIndex = data.findIndex((r) => r._id === rowId);

    if (rowIndex === -1) {
      return false
    }

    const deletedRow = data[rowIndex];
    data.splice(rowIndex, 1);

    // Update indices
    data.forEach((row, idx) => {
      row._index = idx;
    });

    this._state.setData(data);

    this._eventBus.emit(TableEvents.ROW_DELETE, {
      rowId,
      row: deletedRow,
      index: rowIndex,
    });

    return true
  }

  /**
   * Delete multiple rows
   * @param {Array<string>} rowIds - Row IDs to delete
   * @returns {number} Number of deleted rows
   */
  deleteRows(rowIds) {
    let deletedCount = 0;
    const rowIdSet = new Set(rowIds);
    const data = this._state.getData();

    const filteredData = data.filter((row) => {
      if (rowIdSet.has(row._id)) {
        deletedCount++;
        return false
      }
      return true
    });

    if (deletedCount > 0) {
      // Update indices
      filteredData.forEach((row, idx) => {
        row._index = idx;
      });

      this._state.setData(filteredData);
    }

    return deletedCount
  }

  /**
   * Duplicate a row
   * @param {string} rowId - Row ID to duplicate
   * @returns {Object|null} Duplicated row
   */
  duplicateRow(rowId) {
    const row = this._state.getRow(rowId);
    if (!row) return null

    const { _id, _index, ...rowData } = row;

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
    const data = this._state.getData();
    const currentIndex = data.findIndex((r) => r._id === rowId);

    if (currentIndex === -1) return false

    const [movedRow] = data.splice(currentIndex, 1);
    data.splice(newIndex, 0, movedRow);

    // Update indices
    data.forEach((row, idx) => {
      row._index = idx;
    });

    this._state.setData(data);

    return true
  }

  /**
   * Get rows by type
   * @param {string} type - Row type ('data', 'infoRow', 'total', etc.)
   * @returns {Array<Object>}
   */
  getRowsByType(type) {
    return this._state.getData().filter((row) => row._type === type)
  }

  /**
   * Get data rows only (excludes info rows, totals, etc.)
   * @returns {Array<Object>}
   */
  getDataRows() {
    return this.getRowsByType("data")
  }

  /**
   * Get info rows for a parent row
   * @param {string} parentRowId - Parent row ID
   * @returns {Array<Object>}
   */
  getInfoRows(parentRowId) {
    const data = this._state.getData();
    const parentIndex = data.findIndex((r) => r._id === parentRowId);

    if (parentIndex === -1) return []

    const infoRows = [];
    for (let i = parentIndex + 1; i < data.length; i++) {
      if (data[i]._type === "infoRow") {
        infoRows.push(data[i]);
      } else {
        break // Info rows are contiguous after parent
      }
    }

    return infoRows
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
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._unsubscribers = [];
  }
}

/**
 * Data Utilities - Functions for data transformation and manipulation
 */


/**
 * Aggregate functions registry
 */
const AggregateTypes = {
  SUM: "sum",
  AVG: "average",
  MIN: "min",
  MAX: "max",
  COUNT: "count",
  FIRST: "first",
  LAST: "last",
};

/**
 * Built-in aggregate functions
 */
const aggregates = {
  [AggregateTypes.SUM]: (values) => sum(values),
  [AggregateTypes.AVG]: (values) => average(values),
  [AggregateTypes.MIN]: (values) => min(values),
  [AggregateTypes.MAX]: (values) => max(values),
  [AggregateTypes.COUNT]: (values) => values.length,
  [AggregateTypes.FIRST]: (values) => values[0],
  [AggregateTypes.LAST]: (values) => values[values.length - 1],
};

/**
 * Get aggregate function by type
 * @param {string|Function} type - Aggregate type or custom function
 * @returns {Function}
 */
function getAggregateFunction(type) {
  if (typeof type === "function") {
    return type
  }
  return aggregates[type] || aggregates[AggregateTypes.SUM]
}

/**
 * Calculate grand totals for all data
 * @param {Array<Object>} data - All data rows
 * @param {Array<Object>} columns - Column definitions
 * @returns {Object} - Grand totals object
 */
function calculateGrandTotals(data, columns) {
  const totals = {};

  columns.forEach((column) => {
    if (column.aggregate) {
      const values = data
        .filter((row) => row._type === "data")
        .map((row) => row[column.data])
        .filter((v) => v !== null && v !== undefined);

      const aggregateFn = getAggregateFunction(column.aggregate);
      totals[column.data] = aggregateFn(values, data);
    }
  });

  return totals
}

/**
 * GroupManager - Handles row grouping operations
 *
 * Manages group creation, expansion/collapse, and group totals.
 */


class GroupManager {
  /**
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   */
  constructor(state, eventBus) {
    this._state = state;
    this._eventBus = eventBus;

    /** @type {Array<Function>} - Unsubscribe functions for cleanup */
    this._unsubscribers = [];

    // Setup event listeners
    this._setupListeners();

    // Calculate initial totals if grouping is enabled
    if (this._state.getConfig().enableGrouping) {
      this.recalculateTotals();
    }

    // Calculate initial row totals if enabled
    if (this._state.getConfig().enableRowTotals) {
      this.recalculateRowTotals();
    }
  }

  /**
   * Calculate row total (sum of all numeric columns with aggregate) for a single row
   * @param {Object} row - Row data
   * @returns {number} Row total
   */
  calculateRowTotal(row) {
    const columns = this._state.getColumns();
    let total = 0;

    columns.forEach((column) => {
      // Only sum columns that have aggregate defined (indicating they're numeric summable columns)
      if (column.aggregate && column.data !== "_rowTotal") {
        const value = row[column.data];
        if (value !== null && value !== undefined && !isNaN(value)) {
          total += Number(value);
        }
      }
    });

    return total
  }

  /**
   * Recalculate row totals for all data rows
   */
  recalculateRowTotals() {
    const config = this._state.getConfig();
    if (!config.enableRowTotals) return

    const data = this._state._state.data;

    data.forEach((row) => {
      if (row._type === "data") {
        row._rowTotal = this.calculateRowTotal(row);
      }
    });
  }

  /**
   * Update row total for a specific row
   * @param {string} rowId - Row identifier
   */
  updateRowTotal(rowId) {
    const config = this._state.getConfig();
    if (!config.enableRowTotals) return

    const data = this._state._state.data;
    const row = data.find((r) => r._id === rowId);

    if (row && row._type === "data") {
      const oldTotal = row._rowTotal;
      row._rowTotal = this.calculateRowTotal(row);

      // Emit event so TableRenderer can update the cell
      if (oldTotal !== row._rowTotal) {
        this._eventBus.emit(TableEvents.ROW_TOTAL_CHANGE, {
          rowId,
          oldValue: oldTotal,
          newValue: row._rowTotal,
        });
      }
    }
  }

  /**
   * Get group information by ID
   * @param {string} groupId - Group identifier
   * @returns {Object|null}
   */
  getGroup(groupId) {
    const groupedData = this._state.getGroupedData();
    return groupedData ? groupedData[groupId] : null
  }

  /**
   * Get all group IDs
   * @returns {Array<string>}
   */
  getGroupIds() {
    const groupedData = this._state.getGroupedData();
    return groupedData ? Object.keys(groupedData) : []
  }

  /**
   * Get rows in a specific group
   * @param {string} groupId - Group identifier
   * @returns {Array<Object>}
   */
  getGroupRows(groupId) {
    const group = this.getGroup(groupId);
    return group ? group.rows : []
  }

  /**
   * Get group totals
   * @param {string} groupId - Group identifier
   * @returns {Object}
   */
  getGroupTotals(groupId) {
    const group = this.getGroup(groupId);
    return group ? group.totals : {}
  }

  /**
   * Calculate and update group totals
   * @param {string} [groupId] - Specific group, or all if not provided
   */
  recalculateTotals(groupId = null) {
    const groupedData = this._state.getGroupedData();
    const columns = this._state.getColumns();
    const config = this._state.getConfig();

    if (!groupedData) return

    const groupsToUpdate = groupId
      ? [groupId].filter((id) => groupedData[id])
      : Object.keys(groupedData);

    groupsToUpdate.forEach((gId) => {
      const group = groupedData[gId];
      const totals = {};

      // Filter to only data rows (exclude infoRows and other special types)
      const dataRows = group.rows.filter((row) => row._type === "data");

      columns.forEach((column) => {
        if (column.aggregate && column.data !== "_rowTotal") {
          const values = dataRows
            .map((row) => row[column.data])
            .filter((v) => v !== null && v !== undefined && !isNaN(v));

          totals[column.data] = this._calculateAggregate(
            column.aggregate,
            values,
            dataRows
          );
        }
      });

      // Calculate row total for the group header (sum of all aggregated column totals)
      if (config.enableRowTotals) {
        let groupRowTotal = 0;
        columns.forEach((column) => {
          if (
            column.aggregate &&
            column.data !== "_rowTotal" &&
            totals[column.data] !== undefined
          ) {
            groupRowTotal += totals[column.data];
          }
        });
        totals._rowTotal = groupRowTotal;
      }

      group.totals = totals;
    });

    this._eventBus.emit(TableEvents.STATE_CHANGE, {
      property: "groupTotals",
      groupId,
    });
  }

  /**
   * Get grand totals (across all groups)
   * @returns {Object}
   */
  getGrandTotals() {
    const data = this._state.getData().filter((r) => r._type === "data");
    const columns = this._state.getColumns();

    return calculateGrandTotals(data, columns)
  }

  /**
   * Toggle group expansion
   * @param {string} groupId - Group identifier
   * @returns {boolean} New collapsed state
   */
  toggle(groupId) {
    this._state.toggleGroup(groupId);
    return this._state.isGroupCollapsed(groupId)
  }

  /**
   * Expand a specific group
   * @param {string} groupId - Group identifier
   */
  expand(groupId) {
    if (this._state.isGroupCollapsed(groupId)) {
      this._state.toggleGroup(groupId);
    }
  }

  /**
   * Collapse a specific group
   * @param {string} groupId - Group identifier
   */
  collapse(groupId) {
    if (!this._state.isGroupCollapsed(groupId)) {
      this._state.toggleGroup(groupId);
    }
  }

  /**
   * Expand all groups
   */
  expandAll() {
    this._state.expandAllGroups();
  }

  /**
   * Collapse all groups
   */
  collapseAll() {
    this._state.collapseAllGroups();
  }

  /**
   * Check if group is collapsed
   * @param {string} groupId - Group identifier
   * @returns {boolean}
   */
  isCollapsed(groupId) {
    return this._state.isGroupCollapsed(groupId)
  }

  /**
   * Get expansion state of all groups
   * @returns {Object<string, boolean>}
   */
  getExpansionState() {
    const groupIds = this.getGroupIds();
    const state = {};

    groupIds.forEach((id) => {
      state[id] = !this._state.isGroupCollapsed(id);
    });

    return state
  }

  /**
   * Set expansion state for all groups
   * @param {Object<string, boolean>} state - Expansion state map
   */
  setExpansionState(state) {
    Object.entries(state).forEach(([groupId, expanded]) => {
      if (expanded) {
        this.expand(groupId);
      } else {
        this.collapse(groupId);
      }
    });
  }

  /**
   * Move row to a different group
   * @param {string} rowId - Row ID to move
   * @param {string} targetGroupId - Target group ID
   */
  moveRowToGroup(rowId, targetGroupId) {
    const config = this._state.getConfig();
    const groupBy = config.groupBy;

    if (typeof groupBy !== "string") {
      console.warn("Cannot move row when groupBy is a function");
      return
    }

    this._state.updateCell(rowId, groupBy, targetGroupId);
    this.recalculateTotals();
  }

  /**
   * Get group statistics
   * @param {string} groupId - Group identifier
   * @returns {Object}
   */
  getGroupStats(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return null

    const columns = this._state.getColumns();
    const stats = {
      rowCount: group.rows.length,
      columns: {},
    };

    columns.forEach((column) => {
      if (column.type === "number") {
        const values = group.rows
          .map((row) => row[column.data])
          .filter((v) => v !== null && v !== undefined && !isNaN(v));

        stats.columns[column.data] = {
          sum: sum(values),
          average: average(values),
          min: min(values),
          max: max(values),
          count: values.length,
        };
      }
    });

    return stats
  }

  /**
   * Calculate aggregate value
   * @private
   */
  _calculateAggregate(aggregateType, values, rows) {
    if (typeof aggregateType === "function") {
      return aggregateType(values, rows)
    }

    switch (aggregateType) {
      case "sum":
        return sum(values)
      case "average":
      case "avg":
        return average(values)
      case "min":
        return min(values)
      case "max":
        return max(values)
      case "count":
        return values.length
      case "first":
        return values[0]
      case "last":
        return values[values.length - 1]
      default:
        return sum(values)
    }
  }

  /**
   * Setup internal event listeners
   * @private
   */
  _setupListeners() {
    // Recalculate totals when cells change
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.CELL_CHANGE, ({ rowId, columnName }) => {
        const column = this._state.getColumn(columnName);
        const config = this._state.getConfig();

        // Update row total for this row if enabled
        if (config.enableRowTotals && column && column.aggregate) {
          this.updateRowTotal(rowId);
        }

        // Update group totals if grouping is enabled
        if (column && column.aggregate && config.enableGrouping) {
          // Find which group this row belongs to
          const row = this._state.getRow(rowId);
          if (row) {
            const groupBy = config.groupBy;
            const groupId =
              typeof groupBy === "function" ? groupBy(row) : row[groupBy];
            this.recalculateTotals(groupId);
          }
        }
      })
    );

    // Recalculate all totals when data changes
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.DATA_CHANGE, () => {
        const config = this._state.getConfig();

        if (config.enableRowTotals) {
          this.recalculateRowTotals();
        }

        if (config.enableGrouping) {
          this.recalculateTotals();
        }
      })
    );
  }

  /**
   * Cleanup
   */
  destroy() {
    // Unsubscribe from all event listeners
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._unsubscribers = [];
  }
}

/**
 * EditManager - Handles edit mode operations
 *
 * Manages view/edit mode switching, keyboard navigation,
 * and cell editing behavior.
 */


class EditManager {
  /**
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   * @param {TableRenderer} renderer - Table renderer instance
   */
  constructor(state, eventBus, renderer) {
    this._state = state;
    this._eventBus = eventBus;
    this._renderer = renderer;

    /** @type {{rowId: string, columnName: string}|null} */
    this._focusedCell = null;

    /** @type {boolean} */
    this._isEditing = false;

    /** @type {Array<Function>} - Unsubscribe functions for cleanup */
    this._unsubscribers = [];

    // Setup event listeners
    this._setupListeners();
  }

  /**
   * Enter edit mode
   */
  enterEditMode() {
    this._state.setMode("edit");
  }

  /**
   * Enter view mode
   */
  enterViewMode() {
    this._state.setMode("view");
    this._focusedCell = null;
  }

  /**
   * Toggle between modes
   * @returns {'view'|'edit'} New mode
   */
  toggleMode() {
    const currentMode = this._state.getMode();
    const newMode = currentMode === "view" ? "edit" : "view";
    this._state.setMode(newMode);
    return newMode
  }

  /**
   * Check if currently in edit mode
   * @returns {boolean}
   */
  isEditMode() {
    return this._state.isEditMode()
  }

  /**
   * Focus a specific cell
   * @param {string} rowId - Row identifier
   * @param {string} columnName - Column name
   */
  focusCell(rowId, columnName) {
    this._focusedCell = { rowId, columnName };

    // If in edit mode, focus the input
    if (this._state.isEditMode()) {
      const cell = this._renderer.getCellElement(rowId, columnName);
      if (cell) {
        const input = cell.querySelector(".dg-cell-input");
        if (input) {
          input.focus();
          if (input.select) {
            input.select();
          }
        }
      }
    }

    this._eventBus.emit(TableEvents.CELL_FOCUS, {
      rowId,
      columnName,
    });
  }

  /**
   * Get currently focused cell
   * @returns {{rowId: string, columnName: string}|null}
   */
  getFocusedCell() {
    return this._focusedCell
  }

  /**
   * Move focus to adjacent cell
   * @param {'up'|'down'|'left'|'right'} direction - Direction to move
   */
  moveFocus(direction) {
    if (!this._focusedCell) return

    const { rowId, columnName } = this._focusedCell;
    const data = this._state.getData();
    const columns = this._state.getColumns().filter((c) => c.visible !== false);

    const rowIndex = data.findIndex((r) => r._id === rowId);
    const colIndex = columns.findIndex((c) => c.data === columnName);

    if (rowIndex === -1 || colIndex === -1) return

    let newRowIndex = rowIndex;
    let newColIndex = colIndex;

    switch (direction) {
      case "up":
        newRowIndex = Math.max(0, rowIndex - 1);
        break
      case "down":
        newRowIndex = Math.min(data.length - 1, rowIndex + 1);
        break
      case "left":
        newColIndex = Math.max(0, colIndex - 1);
        break
      case "right":
        newColIndex = Math.min(columns.length - 1, colIndex + 1);
        break
    }

    // Skip non-editable rows (like totals) when moving vertically
    if (direction === "up" || direction === "down") {
      const targetRow = data[newRowIndex];
      if (targetRow && targetRow._type !== "data") {
        // Try to skip to next valid row
        const step = direction === "up" ? -1 : 1;
        while (newRowIndex >= 0 && newRowIndex < data.length) {
          if (data[newRowIndex]._type === "data") break
          newRowIndex += step;
        }

        // Clamp to valid range
        newRowIndex = Math.max(0, Math.min(data.length - 1, newRowIndex));
      }
    }

    const newRow = data[newRowIndex];
    const newColumn = columns[newColIndex];

    if (newRow && newColumn) {
      this.focusCell(newRow._id, newColumn.data);
    }
  }

  /**
   * Start editing current cell (for inline edit on click)
   */
  startEditing() {
    if (!this._focusedCell || !this._state.isEditMode()) return

    this._isEditing = true;
    const { rowId, columnName } = this._focusedCell;

    const cell = this._renderer.getCellElement(rowId, columnName);
    if (cell) {
      addClass(cell, "dg-cell-editing");
    }
  }

  /**
   * Stop editing current cell
   */
  stopEditing() {
    if (!this._focusedCell) return

    this._isEditing = false;
    const { rowId, columnName } = this._focusedCell;

    const cell = this._renderer.getCellElement(rowId, columnName);
    if (cell) {
      removeClass(cell, "dg-cell-editing");
    }
  }

  /**
   * Check if currently editing a cell
   * @returns {boolean}
   */
  isEditing() {
    return this._isEditing
  }

  /**
   * Cancel current edit and revert value
   */
  cancelEdit() {
    if (!this._focusedCell || !this._isEditing) return

    const { rowId, columnName } = this._focusedCell;
    const originalData = this._state._state.originalData;
    const originalRow = originalData.find((r) => r._id === rowId);

    if (originalRow) {
      this._state.updateCell(rowId, columnName, originalRow[columnName]);
    }

    this.stopEditing();
  }

  /**
   * Commit current edit
   */
  commitEdit() {
    if (!this._focusedCell || !this._isEditing) return

    const { rowId, columnName } = this._focusedCell;
    const cell = this._renderer.getCellElement(rowId, columnName);

    if (cell) {
      const input = cell.querySelector(".dg-cell-input");
      if (input) {
        // Trigger change event
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    this.stopEditing();
  }

  /**
   * Setup keyboard navigation
   * @private
   */
  _setupListeners() {
    // Handle keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (!this._state.isEditMode()) return

      switch (e.key) {
        case "Tab":
          e.preventDefault();
          this.moveFocus(e.shiftKey ? "left" : "right");
          break

        case "Enter":
          if (this._isEditing) {
            e.preventDefault();
            this.commitEdit();
            this.moveFocus("down");
          }
          break

        case "Escape":
          if (this._isEditing) {
            e.preventDefault();
            this.cancelEdit();
          }
          break

        case "ArrowUp":
          if (!this._isEditing || e.ctrlKey) {
            e.preventDefault();
            this.moveFocus("up");
          }
          break

        case "ArrowDown":
          if (!this._isEditing || e.ctrlKey) {
            e.preventDefault();
            this.moveFocus("down");
          }
          break

        case "ArrowLeft":
          if (!this._isEditing || e.ctrlKey) {
            e.preventDefault();
            this.moveFocus("left");
          }
          break

        case "ArrowRight":
          if (!this._isEditing || e.ctrlKey) {
            e.preventDefault();
            this.moveFocus("right");
          }
          break
      }
    });

    // Track cell focus
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.CELL_FOCUS, ({ rowId, columnName }) => {
        this._focusedCell = { rowId, columnName };
      })
    );

    // Track cell blur
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.CELL_BLUR, () => {
        this._isEditing = false;
      })
    );

    // Clear focus when mode changes to view
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.MODE_CHANGE, ({ newMode }) => {
        if (newMode === "view") {
          this._focusedCell = null;
          this._isEditing = false;
        }
      })
    );
  }

  /**
   * Cleanup
   */
  destroy() {
    // Unsubscribe from all event listeners
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._unsubscribers = [];

    this._focusedCell = null;
    this._isEditing = false;
  }
}

/**
 * ExportManager - Handles data export operations
 *
 * Exports table data to CSV and Excel formats.
 */


class ExportManager {
  /**
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   */
  constructor(state, eventBus) {
    this._state = state;
    this._eventBus = eventBus;
  }

  /**
   * Export to CSV string
   * @param {Object} [options] - Export options
   * @param {string} [options.delimiter=','] - Field delimiter
   * @param {boolean} [options.includeHeaders=true] - Include header row
   * @param {boolean} [options.includeHidden=false] - Include hidden columns
   * @param {Array<string>} [options.columns] - Specific columns to export
   * @param {Function} [options.filter] - Row filter function
   * @returns {string} CSV string
   */
  toCSV(options = {}) {
    const {
      delimiter = ",",
      includeHeaders = true,
      includeHidden = false,
      columns: columnFilter = null,
      filter = null,
    } = options;

    this._eventBus.emit(TableEvents.EXPORT_START, { format: "csv" });

    let data = this._state.getData();
    let columns = this._state.getColumns();

    // Filter columns
    if (columnFilter) {
      columns = columns.filter((col) => columnFilter.includes(col.data));
    } else if (!includeHidden) {
      columns = columns.filter((col) => col.visible !== false);
    }

    // Filter rows
    if (filter) {
      data = data.filter(filter);
    }

    // Build CSV
    const rows = [];

    // Header row
    if (includeHeaders) {
      const headerRow = columns.map((col) =>
        this._escapeCSV(col.title || col.data, delimiter)
      );
      rows.push(headerRow.join(delimiter));
    }

    // Data rows
    data.forEach((row) => {
      if (row._type !== "data" && row._type !== "infoRow") return

      const csvRow = columns.map((col) => {
        let value = row[col.data];

        // Format value if formatter exists
        if (col.exportFormat) {
          value = col.exportFormat(value, row, col);
        } else if (col.format) {
          value = col.format(value, row, col);
        }

        return this._escapeCSV(value, delimiter)
      });

      rows.push(csvRow.join(delimiter));
    });

    const csvString = rows.join("\n");

    this._eventBus.emit(TableEvents.EXPORT_COMPLETE, {
      format: "csv",
      rowCount: rows.length - (includeHeaders ? 1 : 0),
    });

    return csvString
  }

  /**
   * Export to Excel-compatible format (simplified XLSX-like)
   * For full XLSX support, integrate with SheetJS
   * @param {Object} [options] - Export options
   * @returns {Object} Excel data structure
   */
  toExcel(options = {}) {
    const {
      sheetName = "Sheet1",
      includeHeaders = true,
      includeHidden = false,
      columns: columnFilter = null,
      filter = null,
    } = options;

    this._eventBus.emit(TableEvents.EXPORT_START, { format: "excel" });

    let data = this._state.getData();
    let columns = this._state.getColumns();

    // Filter columns
    if (columnFilter) {
      columns = columns.filter((col) => columnFilter.includes(col.data));
    } else if (!includeHidden) {
      columns = columns.filter((col) => col.visible !== false);
    }

    // Filter rows
    if (filter) {
      data = data.filter(filter);
    }

    // Build Excel data structure
    const worksheetData = [];

    // Header row
    if (includeHeaders) {
      worksheetData.push(columns.map((col) => col.title || col.data));
    }

    // Data rows
    data.forEach((row) => {
      if (row._type !== "data" && row._type !== "infoRow") return

      const excelRow = columns.map((col) => {
        let value = row[col.data];

        // Keep numbers as numbers for Excel
        if (col.type === "number" && typeof value === "number") {
          return value
        }

        // Format other values
        if (col.exportFormat) {
          value = col.exportFormat(value, row, col);
        }

        return value
      });

      worksheetData.push(excelRow);
    });

    const result = {
      sheets: [
        {
          name: sheetName,
          data: worksheetData,
          columns: columns.map((col) => ({
            width: col.width || 100,
            type: col.type || "string",
          })),
        },
      ],
    };

    this._eventBus.emit(TableEvents.EXPORT_COMPLETE, {
      format: "excel",
      rowCount: worksheetData.length - (includeHeaders ? 1 : 0),
    });

    return result
  }

  /**
   * Download export as file
   * @param {'csv'|'excel'} format - Export format
   * @param {string} [filename] - File name (without extension)
   * @param {Object} [options] - Export options
   */
  download(format, filename = "table-export", options = {}) {
    if (format === "csv") {
      this._downloadCSV(filename, options);
    } else if (format === "excel") {
      this._downloadExcel(filename, options);
    }
  }

  /**
   * Download as CSV file
   * @private
   */
  _downloadCSV(filename, options) {
    const csv = this.toCSV(options);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    this._downloadBlob(blob, `${filename}.csv`);
  }

  /**
   * Download as Excel file (using CSV with .xls extension for basic support)
   * For full XLSX support, integrate with SheetJS
   * @private
   */
  _downloadExcel(filename, options) {
    // Basic Excel export using tab-delimited format
    const csv = this.toCSV({ ...options, delimiter: "\t" });
    const blob = new Blob([csv], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    this._downloadBlob(blob, `${filename}.xls`);
  }

  /**
   * Download blob as file
   * @private
   */
  _downloadBlob(blob, filename) {
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Escape value for CSV
   * @private
   */
  _escapeCSV(value, delimiter = ",") {
    if (value === null || value === undefined) {
      return ""
    }

    const stringValue = String(value);

    // Check if escaping is needed
    if (
      stringValue.includes(delimiter) ||
      stringValue.includes('"') ||
      stringValue.includes("\n") ||
      stringValue.includes("\r")
    ) {
      // Escape double quotes and wrap in quotes
      return `"${stringValue.replace(/"/g, '""')}"`
    }

    return stringValue
  }

  /**
   * Get export preview (first N rows)
   * @param {number} [rowCount=5] - Number of rows to preview
   * @param {'csv'|'excel'} [format='csv'] - Format to preview
   * @returns {string|Object}
   */
  preview(rowCount = 5, format = "csv") {
    const data = this._state.getData().slice(0, rowCount);
    const columns = this._state.getColumns().filter((c) => c.visible !== false);

    if (format === "csv") {
      // Build preview CSV
      const headers = columns.map((c) => c.title || c.data).join(",");
      const rows = data.map((row) =>
        columns.map((col) => this._escapeCSV(row[col.data])).join(",")
      );
      return [headers, ...rows].join("\n")
    }

    return {
      headers: columns.map((c) => c.title || c.data),
      rows: data.map((row) => columns.map((col) => row[col.data])),
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    // Nothing specific to cleanup
  }
}

/**
 * ThemeManager - Handles theme customization
 *
 * Allows users to customize table colors through configuration.
 * Falls back to default CSS variables if not specified.
 */

class ThemeManager {
  /**
   * @param {HTMLElement} container - Table container element
   * @param {Object} [theme] - Theme configuration
   */
  constructor(container, theme = {}) {
    this._container = container;

    /** @type {Object} Default theme */
    this._defaultTheme = {
      // Row colors
      rowEven: null, // Falls back to --dg-color-bg-alt
      rowOdd: null, // Falls back to --dg-color-bg
      rowHover: null, // Falls back to --dg-color-bg-hover
      rowSelected: null, // Falls back to --dg-color-bg-selected

      // Border colors
      borderLight: null, // Falls back to --dg-color-border
      borderStrong: null, // Falls back to --dg-color-border-strong

      // Header colors
      headerBackground: null, // Falls back to --dg-color-bg-alt
      headerText: null, // Falls back to --dg-color-text

      // Cell colors
      cellBackground: null, // Falls back to --dg-color-bg
      cellText: null, // Falls back to --dg-color-text

      // Sticky/Fixed column colors
      fixedBackground: null, // Inherits from row
      fixedShadow: null, // Falls back to --dg-shadow-fixed
      fixedBorderColor: null, // Falls back to --dg-fixed-border-color
      fixedBorderWidth: null, // Falls back to --dg-fixed-border-width

      // Interactive colors
      primary: null, // Falls back to --dg-color-primary
      primaryHover: null, // Falls back to --dg-color-primary-hover

      // Status colors
      success: null, // Falls back to --dg-color-success
      warning: null, // Falls back to --dg-color-warning
      error: null, // Falls back to --dg-color-error

      // Row totals column colors
      rowTotalBackground: null, // Falls back to --dg-row-total-bg
      rowTotalBackgroundAlt: null, // Falls back to --dg-row-total-bg-alt
      rowTotalText: null, // Falls back to --dg-row-total-text
      rowTotalHeaderBackground: null, // Falls back to --dg-row-total-header-bg
      rowTotalBorderColor: null, // Falls back to --dg-row-total-border-color

      // Ungrouped rows colors
      ungroupedRowBackground: null, // Falls back to --dg-ungrouped-row-bg
      ungroupedRowBackgroundAlt: null, // Falls back to --dg-ungrouped-row-bg-alt
      ungroupedRowBackgroundHover: null, // Falls back to --dg-ungrouped-row-bg-hover
      ungroupedRowText: null, // Falls back to --dg-ungrouped-row-text
    };

    this._theme = { ...this._defaultTheme, ...theme };
    this._applyTheme();
  }

  /**
   * Resolve a theme value - if it starts with '--', wrap it in var()
   * This allows passing CSS variable names like '--bc-c-primary-500'
   * @private
   * @param {string} value - The theme value
   * @returns {string} - Resolved value (wrapped in var() if CSS variable)
   */
  _resolveValue(value) {
    if (!value) return value
    // If value starts with '--', it's a CSS variable reference
    if (typeof value === "string" && value.startsWith("--")) {
      return `var(${value})`
    }
    return value
  }

  /**
   * Apply theme to container
   * @private
   */
  _applyTheme() {
    const style = this._container.style;

    // Row colors
    if (this._theme.rowEven) {
      style.setProperty(
        "--dg-color-bg-alt",
        this._resolveValue(this._theme.rowEven)
      );
    }
    if (this._theme.rowOdd) {
      style.setProperty("--dg-color-bg", this._resolveValue(this._theme.rowOdd));
    }
    if (this._theme.rowHover) {
      style.setProperty(
        "--dg-color-bg-hover",
        this._resolveValue(this._theme.rowHover)
      );
    }
    if (this._theme.rowSelected) {
      style.setProperty(
        "--dg-color-bg-selected",
        this._resolveValue(this._theme.rowSelected)
      );
    }

    // Border colors
    if (this._theme.borderLight) {
      style.setProperty(
        "--dg-color-border",
        this._resolveValue(this._theme.borderLight)
      );
    }
    if (this._theme.borderStrong) {
      style.setProperty(
        "--dg-color-border-strong",
        this._resolveValue(this._theme.borderStrong)
      );
    }

    // Header colors
    if (this._theme.headerBackground) {
      style.setProperty(
        "--dg-color-header-bg",
        this._resolveValue(this._theme.headerBackground)
      );
    }
    if (this._theme.headerText) {
      style.setProperty(
        "--dg-color-header-text",
        this._resolveValue(this._theme.headerText)
      );
    }

    // Cell colors
    if (this._theme.cellBackground) {
      style.setProperty(
        "--dg-color-cell-bg",
        this._resolveValue(this._theme.cellBackground)
      );
    }
    if (this._theme.cellText) {
      style.setProperty(
        "--dg-color-text",
        this._resolveValue(this._theme.cellText)
      );
    }

    // Fixed column
    if (this._theme.fixedShadow) {
      style.setProperty(
        "--dg-shadow-fixed",
        this._resolveValue(this._theme.fixedShadow)
      );
    }
    if (this._theme.fixedBorderColor) {
      style.setProperty(
        "--dg-fixed-border-color",
        this._resolveValue(this._theme.fixedBorderColor)
      );
    }
    if (this._theme.fixedBorderWidth) {
      style.setProperty(
        "--dg-fixed-border-width",
        this._resolveValue(this._theme.fixedBorderWidth)
      );
    }

    // Interactive colors
    if (this._theme.primary) {
      style.setProperty(
        "--dg-color-primary",
        this._resolveValue(this._theme.primary)
      );
    }
    if (this._theme.primaryHover) {
      style.setProperty(
        "--dg-color-primary-hover",
        this._resolveValue(this._theme.primaryHover)
      );
    }

    // Status colors
    if (this._theme.success) {
      style.setProperty(
        "--dg-color-success",
        this._resolveValue(this._theme.success)
      );
    }
    if (this._theme.warning) {
      style.setProperty(
        "--dg-color-warning",
        this._resolveValue(this._theme.warning)
      );
    }
    if (this._theme.error) {
      style.setProperty(
        "--dg-color-error",
        this._resolveValue(this._theme.error)
      );
    }

    // Row totals column
    if (this._theme.rowTotalBackground) {
      style.setProperty(
        "--dg-row-total-bg",
        this._resolveValue(this._theme.rowTotalBackground)
      );
    }
    if (this._theme.rowTotalBackgroundAlt) {
      style.setProperty(
        "--dg-row-total-bg-alt",
        this._resolveValue(this._theme.rowTotalBackgroundAlt)
      );
    }
    if (this._theme.rowTotalText) {
      style.setProperty(
        "--dg-row-total-text",
        this._resolveValue(this._theme.rowTotalText)
      );
    }
    if (this._theme.rowTotalHeaderBackground) {
      style.setProperty(
        "--dg-row-total-header-bg",
        this._resolveValue(this._theme.rowTotalHeaderBackground)
      );
    }
    if (this._theme.rowTotalBorderColor) {
      style.setProperty(
        "--dg-row-total-border-color",
        this._resolveValue(this._theme.rowTotalBorderColor)
      );
    }

    // Ungrouped rows
    if (this._theme.ungroupedRowBackground) {
      style.setProperty(
        "--dg-ungrouped-row-bg",
        this._resolveValue(this._theme.ungroupedRowBackground)
      );
    }
    if (this._theme.ungroupedRowBackgroundAlt) {
      style.setProperty(
        "--dg-ungrouped-row-bg-alt",
        this._resolveValue(this._theme.ungroupedRowBackgroundAlt)
      );
    }
    if (this._theme.ungroupedRowBackgroundHover) {
      style.setProperty(
        "--dg-ungrouped-row-bg-hover",
        this._resolveValue(this._theme.ungroupedRowBackgroundHover)
      );
    }
    if (this._theme.ungroupedRowText) {
      style.setProperty(
        "--dg-ungrouped-row-text",
        this._resolveValue(this._theme.ungroupedRowText)
      );
    }
  }

  /**
   * Update theme at runtime
   * @param {Object} theme - Partial theme configuration to merge
   */
  updateTheme(theme) {
    this._theme = { ...this._theme, ...theme };
    this._applyTheme();
  }

  /**
   * Reset to default theme
   */
  resetTheme() {
    const style = this._container.style;

    // Remove all custom properties
    Object.keys(this._theme).forEach(() => {
      style.removeProperty("--dg-color-bg-alt");
      style.removeProperty("--dg-color-bg");
      style.removeProperty("--dg-color-bg-hover");
      style.removeProperty("--dg-color-bg-selected");
      style.removeProperty("--dg-color-border");
      style.removeProperty("--dg-color-border-strong");
      style.removeProperty("--dg-color-header-bg");
      style.removeProperty("--dg-color-header-text");
      style.removeProperty("--dg-color-cell-bg");
      style.removeProperty("--dg-color-text");
      style.removeProperty("--dg-shadow-fixed");
      style.removeProperty("--dg-fixed-border-color");
      style.removeProperty("--dg-fixed-border-width");
      style.removeProperty("--dg-color-primary");
      style.removeProperty("--dg-color-primary-hover");
      style.removeProperty("--dg-color-success");
      style.removeProperty("--dg-color-warning");
      style.removeProperty("--dg-color-error");
      style.removeProperty("--dg-row-total-bg");
      style.removeProperty("--dg-row-total-bg-alt");
      style.removeProperty("--dg-row-total-text");
      style.removeProperty("--dg-row-total-header-bg");
      style.removeProperty("--dg-row-total-border-color");
      style.removeProperty("--dg-ungrouped-row-bg");
      style.removeProperty("--dg-ungrouped-row-bg-alt");
      style.removeProperty("--dg-ungrouped-row-bg-hover");
      style.removeProperty("--dg-ungrouped-row-text");
    });

    this._theme = { ...this._defaultTheme };
  }

  /**
   * Get current theme
   * @returns {Object} Current theme configuration
   */
  getTheme() {
    return { ...this._theme }
  }
}

/**
 * Table - Main orchestrator class for the editable table
 *
 * This is the primary entry point that coordinates all modules,
 * manages the lifecycle, and exposes the public API.
 */


/**
 * @typedef {Object} TableConfig
 * @property {HTMLElement|string} container - Container element or selector
 * @property {Array<Object>} columns - Column definitions
 * @property {Array<Object>} data - Table data
 * @property {boolean} [fixedFirstColumn=false] - Enable fixed first column
 * @property {boolean} [enableGrouping=false] - Enable row grouping
 * @property {string|Function} [groupBy] - Group by column name or function
 * @property {boolean} [enableInfoRows=false] - Enable info rows
 * @property {boolean} [enableRowTotals=false] - Enable row totals column
 * @property {Function} [rowTotalsFormat] - Format function for row totals column
 * @property {Array<Object>} [actions] - Row actions configuration
 * @property {'view'|'edit'} [mode='view'] - Initial mode
 * @property {Function} [onRowClick] - Row click callback
 * @property {Function} [onRender] - Render complete callback
 * @property {Function} [onChange] - Table data change callback
 * @property {Function} [onRowChange] - Individual row change callback
 * @property {Object} [theme] - Theme customization
 */

class Table {
  /**
   * Create a new Table instance
   * @param {TableConfig} config - Table configuration
   */
  constructor(config) {
    this._validateConfig(config);

    // Store configuration
    this._config = {
      fixedFirstColumn: false,
      enableGrouping: false,
      enableInfoRows: false,
      enableRowTotals: false,
      mode: "view",
      ...config,
    };

    // Get container element
    this._container =
      typeof config.container === "string"
        ? document.querySelector(config.container)
        : config.container;

    if (!this._container) {
      throw new Error("Table: Container element not found")
    }

    // Initialize core systems
    this._eventBus = new EventBus();
    this._state = new TableState(this._eventBus, {
      data: config.data || [],
      columns: config.columns || [],
      config: {
        fixedFirstColumn: config.fixedFirstColumn,
        enableGrouping: config.enableGrouping,
        groupBy: config.groupBy,
        groups: config.groups || {},
        enableInfoRows: config.enableInfoRows,
        enableRowTotals: config.enableRowTotals,
        rowTotalsFormat: config.rowTotalsFormat,
        actions: config.actions || [],
        actionsShowIf: config.actionsShowIf,
      },
    });

    // Initialize modules
    this._initModules();

    // Set initial mode
    this._state.setMode(config.mode || "view");

    // Register callbacks
    this._registerCallbacks();

    // Initial render
    this._render();
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
    this._state.setData(data);
    this._render();
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
    this._state.updateCell(rowId, columnName, value);
  }

  /**
   * Update badge for a specific row
   * @param {string|number} rowId - Row identifier
   * @param {string|HTMLElement|null} badgeContent - Badge HTML content (null to remove)
   */
  updateRowBadge(rowId, badgeContent) {
    this._renderer.updateRowBadge(rowId, badgeContent);
  }

  /**
   * Batch update multiple cells
   * @param {Array<{rowId, columnName, value}>} updates - Updates array
   */
  batchUpdate(updates) {
    this._state.batchUpdate(updates);
  }

  /**
   * Add a new row
   * @param {Object} rowData - Row data
   * @param {Object} [options] - Options (position, groupId, etc.)
   */
  addRow(rowData, options = {}) {
    this._rowManager.addRow(rowData, options);
  }

  /**
   * Delete a row
   * @param {string|number} rowId - Row identifier
   */
  deleteRow(rowId) {
    this._rowManager.deleteRow(rowId);
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
    this._state.clearDirty();
  }

  /**
   * Revert all changes
   */
  revertChanges() {
    this._state.revertChanges();
    this._render();
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
    this._state.setColumns(columns);
    this._render();
  }

  /**
   * Show/hide a column
   * @param {string} columnId - Column identifier
   * @param {boolean} visible - Visibility state
   */
  setColumnVisibility(columnId, visible) {
    const columns = this._state.getColumns();
    const updatedColumns = columns.map((col) => {
      if (col._id === columnId || col.data === columnId) {
        return { ...col, visible }
      }
      return col
    });
    this._state.setColumns(updatedColumns);
    this._render();
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
    this._state.setMode(mode);
  }

  /**
   * Toggle between view and edit mode
   */
  toggleMode() {
    const currentMode = this._state.getMode();
    this._state.setMode(currentMode === "view" ? "edit" : "view");
  }

  // ============================================
  // Public API - Groups
  // ============================================

  /**
   * Toggle a group's visibility
   * @param {string} groupId - Group identifier
   */
  toggleGroup(groupId) {
    this._state.toggleGroup(groupId);
  }

  /**
   * Expand all groups
   */
  expandAllGroups() {
    this._state.expandAllGroups();
  }

  /**
   * Collapse all groups
   */
  collapseAllGroups() {
    this._state.collapseAllGroups();
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
    this._exportManager.download(format, filename);
  }

  // ============================================
  // Public API - Utilities
  // ============================================

  /**
   * Force re-render of the table
   */
  render() {
    this._render();
  }

  // ============================================
  // Public API - Theme
  // ============================================

  /**
   * Update theme at runtime
   * @param {Object} theme - Partial theme configuration
   */
  updateTheme(theme) {
    this._themeManager.updateTheme(theme);
  }

  /**
   * Reset to default theme
   */
  resetTheme() {
    this._themeManager.resetTheme();
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
    this._eventBus.off(event, callback);
  }

  /**
   * Destroy the table instance
   */
  destroy() {
    this._eventBus.emit(TableEvents.DESTROY, {});

    // Destroy modules
    this._renderer.destroy();
    this._themeManager.resetTheme();
    this._rowManager.destroy();
    this._groupManager.destroy();
    this._editManager.destroy();
    this._exportManager.destroy();

    // Destroy core
    this._state.destroy();
    this._eventBus.destroy();

    // Clear container
    this._container.innerHTML = "";
    removeClass(this._container, "dg-container");
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
    this._renderer = new TableRenderer(this._container, this._state);

    // Initialize theme manager
    this._themeManager = new ThemeManager(this._container, this._config.theme);

    // Initialize feature modules
    this._rowManager = new RowManager(this._state, this._eventBus);
    this._groupManager = new GroupManager(this._state, this._eventBus);
    this._editManager = new EditManager(
      this._state,
      this._eventBus,
      this._renderer
    );
    this._exportManager = new ExportManager(this._state, this._eventBus);
  }

  /**
   * Register user callbacks
   * @private
   */
  _registerCallbacks() {
    const { onRowClick, onRender, onChange, onRowChange } = this._config;

    if (onRowClick) {
      this._eventBus.on(TableEvents.ROW_CLICK, onRowClick);
    }

    if (onRender) {
      this._eventBus.on(TableEvents.AFTER_RENDER, onRender);
    }

    if (onChange) {
      this._eventBus.on(TableEvents.DATA_CHANGE, onChange);
    }

    if (onRowChange) {
      this._eventBus.on(TableEvents.ROW_CHANGE, onRowChange);
    }
  }

  /**
   * Render the table
   * @private
   */
  _render() {
    this._eventBus.emit(TableEvents.BEFORE_RENDER, {});
    this._renderer.render();
    this._eventBus.emit(TableEvents.RENDER, {});

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this._eventBus.emit(TableEvents.AFTER_RENDER, {
        rowCount: this._state.getData().length,
        columnCount: this._state.getColumns().length,
      });
    });
  }
}

// Expose event types for external use
Table.Events = TableEvents;

/**
 * DataGrid - A modular, high-performance inline editing table library
 * @version 1.0.0
 * @license MIT
 */

export { EventBus, Table, TableState, Table as default };
//# sourceMappingURL=datagrid.esm.js.map
