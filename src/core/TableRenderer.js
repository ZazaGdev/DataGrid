/**
 * TableRenderer - Handles all DOM rendering operations
 *
 * Responsible for creating and updating the table DOM structure
 * with efficient differential updates for performance.
 */

import { TableEvents } from "./EventBus.js"
import {
  createElement,
  addClass,
  removeClass,
  setAttributes,
} from "../utils/dom.js"
import { escapeHtml } from "../utils/helpers.js"

export class TableRenderer {
  /**
   * @param {HTMLElement} container - Container element
   * @param {TableState} state - Table state instance
   */
  constructor(container, state) {
    this._container = container
    this._state = state
    this._eventBus = state._eventBus

    /** @type {HTMLElement} */
    this._tableWrapper = null

    /** @type {HTMLElement} */
    this._table = null

    /** @type {HTMLElement} */
    this._thead = null

    /** @type {HTMLElement} */
    this._tbody = null

    /** @type {Map<string, HTMLElement>} */
    this._rowElements = new Map()

    /** @type {Map<string, HTMLElement>} */
    this._cellElements = new Map()

    /** @type {Array<Function>} - Unsubscribe functions for cleanup */
    this._unsubscribers = []

    // Subscribe to state changes
    this._setupEventListeners()
  }

  /**
   * Main render method
   */
  render() {
    const config = this._state.getConfig()

    // Create structure if it doesn't exist
    if (!this._tableWrapper) {
      this._createStructure()
    }

    // Update container classes based on config
    this._updateContainerClasses(config)

    // Render header
    this._renderHeader()

    // Render body based on grouping config
    if (config.enableGrouping && this._state.getGroupedData()) {
      this._renderGroupedBody()
    } else {
      this._renderBody()
    }
  }

  /**
   * Update a single cell without full re-render
   * @param {string} rowId - Row identifier
   * @param {string} columnName - Column name
   * @param {any} value - New value
   */
  updateCell(rowId, columnName, value) {
    const cellKey = `${rowId}:${columnName}`
    const cell = this._cellElements.get(cellKey)

    if (cell && cell.isConnected) {
      const column = this._state.getColumn(columnName)
      const row = this._state.getRow(rowId)
      if (column && row) {
        this._renderCellContent(cell, value, column, row)
      }
    }
  }

  /**
   * Update a single row without full re-render
   * @param {string} rowId - Row identifier
   */
  updateRow(rowId) {
    const rowElement = this._rowElements.get(rowId)
    const rowData = this._state.getRow(rowId)

    if (rowElement && rowData) {
      const columns = this._state.getColumns()
      columns.forEach((column) => {
        const cellKey = `${rowId}:${column.data}`
        const cell = this._cellElements.get(cellKey)
        if (cell) {
          this._renderCellContent(cell, rowData[column.data], column, rowData)
        }
      })
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
    this._unsubscribers.forEach((unsubscribe) => unsubscribe())
    this._unsubscribers = []

    // Clear element caches
    this._rowElements.clear()
    this._cellElements.clear()

    // Remove DOM elements
    if (this._tableWrapper) {
      this._tableWrapper.remove()
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
          this.updateCell(rowId, columnName, newValue)
        }
      )
    )

    // Listen for data changes (row add/delete) to re-render
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.DATA_CHANGE, () => {
        this.render()
      })
    )

    // Listen for row total changes (emitted by GroupManager after calculation)
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.ROW_TOTAL_CHANGE, ({ rowId, newValue }) => {
        this.updateCell(rowId, "_rowTotal", newValue)
      })
    )

    // Listen for group totals updates to re-render group headers
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.STATE_CHANGE, ({ property, groupId }) => {
        if (property === "groupTotals") {
          // Re-render group headers to show updated aggregates
          this._updateGroupHeaders(groupId)
        }
      })
    )

    this._unsubscribers.push(
      this._eventBus.on(TableEvents.MODE_CHANGE, () => {
        this.render()
      })
    )

    this._unsubscribers.push(
      this._eventBus.on(TableEvents.GROUP_TOGGLE, ({ groupId, collapsed }) => {
        this._toggleGroupVisibility(groupId, collapsed)
      })
    )

    this._unsubscribers.push(
      this._eventBus.on(TableEvents.GROUP_EXPAND_ALL, () => {
        this._setAllGroupsVisibility(false)
      })
    )

    this._unsubscribers.push(
      this._eventBus.on(TableEvents.GROUP_COLLAPSE_ALL, () => {
        this._setAllGroupsVisibility(true)
      })
    )
  }

  /**
   * Create the base DOM structure
   * @private
   */
  _createStructure() {
    addClass(this._container, "dg-container")

    // Create wrapper for scroll handling
    this._tableWrapper = createElement("div", { class: "dg-table-wrapper" })

    // Create table
    this._table = createElement("table", { class: "dg-table" })

    // Create header
    this._thead = createElement("thead", { class: "dg-thead" })

    // Create body
    this._tbody = createElement("tbody", { class: "dg-tbody" })

    // Assemble
    this._table.appendChild(this._thead)
    this._table.appendChild(this._tbody)
    this._tableWrapper.appendChild(this._table)
    this._container.appendChild(this._tableWrapper)
  }

  /**
   * Update container classes based on config
   * @private
   */
  _updateContainerClasses(config) {
    const mode = this._state.getMode()

    // Mode classes
    removeClass(this._container, "dg-mode-view", "dg-mode-edit")
    addClass(this._container, `dg-mode-${mode}`)

    // Feature classes
    if (config.fixedFirstColumn) {
      addClass(this._container, "dg-fixed-first-column")
    } else {
      removeClass(this._container, "dg-fixed-first-column")
    }

    if (config.enableGrouping) {
      addClass(this._container, "dg-grouped")
    } else {
      removeClass(this._container, "dg-grouped")
    }
  }

  /**
   * Render table header
   * @private
   */
  _renderHeader() {
    const columns = this._state.getColumns()
    const config = this._state.getConfig()

    this._thead.innerHTML = ""

    const headerRow = createElement("tr", { class: "dg-header-row" })

    let visibleIndex = 0
    columns.forEach((column) => {
      if (column.visible === false) return

      const th = createElement("th", {
        class: "dg-header-cell",
        "data-column": column.data,
        "data-column-index": visibleIndex,
      })

      // Fixed first column
      if (visibleIndex === 0 && config.fixedFirstColumn) {
        addClass(th, "dg-cell-fixed")
      }

      // Row total column header
      if (column._isRowTotal) {
        addClass(th, "dg-header-row-total")
      }

      // Header content
      const headerContent = createElement("div", { class: "dg-header-content" })
      headerContent.textContent = column.title || column.data
      th.appendChild(headerContent)

      // Column width
      if (column.width) {
        th.style.width =
          typeof column.width === "number" ? `${column.width}px` : column.width
      }

      headerRow.appendChild(th)
      visibleIndex++
    })

    this._thead.appendChild(headerRow)
  }

  /**
   * Render table body (ungrouped)
   * @private
   */
  _renderBody() {
    const data = this._state.getData()
    const columns = this._state.getColumns()

    this._tbody.innerHTML = ""
    this._rowElements.clear()
    this._cellElements.clear()

    data.forEach((row) => {
      const rowElement = this._createRowElement(row, columns)
      this._tbody.appendChild(rowElement)
    })
  }

  /**
   * Render table body (grouped)
   * @private
   */
  _renderGroupedBody() {
    const groupedData = this._state.getGroupedData()
    const ungroupedRows = this._state.getUngroupedRows()
    const infoRows = this._state.getInfoRows()
    const columns = this._state.getColumns()

    this._tbody.innerHTML = ""
    this._rowElements.clear()
    this._cellElements.clear()

    // Render info rows first (at the top, not part of any group)
    if (infoRows && infoRows.length > 0) {
      infoRows.forEach((row) => {
        const rowElement = this._createRowElement(row, columns, null)
        addClass(rowElement, "dg-row-info")
        this._tbody.appendChild(rowElement)
      })
    }

    // Render grouped rows
    Object.entries(groupedData).forEach(([groupId, group]) => {
      // Group header row (includes aggregate values)
      const groupHeader = this._createGroupHeaderRow(groupId, group, columns)
      this._tbody.appendChild(groupHeader)

      // Group rows
      const isCollapsed = this._state.isGroupCollapsed(groupId)
      group.rows.forEach((row) => {
        const rowElement = this._createRowElement(row, columns, groupId)
        if (isCollapsed) {
          addClass(rowElement, "dg-row-hidden")
        }
        this._tbody.appendChild(rowElement)
      })
    })

    // Render ungrouped rows at the end (rows without a group value)
    if (ungroupedRows.length > 0) {
      ungroupedRows.forEach((row) => {
        const rowElement = this._createRowElement(row, columns, null)
        addClass(rowElement, "dg-row-ungrouped")
        this._tbody.appendChild(rowElement)
      })
    }
  }

  /**
   * Create a data row element
   * @private
   */
  _createRowElement(row, columns, groupId = null) {
    const config = this._state.getConfig()
    const isInfoRow = row._type === "infoRow"

    const tr = createElement("tr", {
      class: `dg-row ${isInfoRow ? "dg-row-info-row" : "dg-row-data"}`,
      "data-row-id": row._id,
      "data-row-index": row._index,
    })

    if (groupId) {
      tr.setAttribute("data-group", groupId)
    }

    // Mark dirty rows
    if (this._state.isRowDirty(row._id)) {
      addClass(tr, "dg-row-dirty")
    }

    // Row click handler
    tr.addEventListener("click", (e) => {
      if (!e.target.closest(".dg-cell-input")) {
        this._eventBus.emit(TableEvents.ROW_CLICK, {
          rowId: row._id,
          rowIndex: row._index,
          row: this._state.getRow(row._id),
          event: e,
        })
      }
    })

    // Create cells
    let visibleIndex = 0
    columns.forEach((column) => {
      if (column.visible === false) return

      const td = this._createCellElement(row, column, visibleIndex, config)
      tr.appendChild(td)

      // Store reference
      this._cellElements.set(`${row._id}:${column.data}`, td)
      visibleIndex++
    })

    // Store reference
    this._rowElements.set(row._id, tr)

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
    })

    // Fixed first column
    if (index === 0 && config.fixedFirstColumn) {
      addClass(td, "dg-cell-fixed")
    }

    // Row total column
    if (column._isRowTotal) {
      addClass(td, "dg-cell-row-total")
    }

    // Cell type classes
    if (column.type) {
      addClass(td, `dg-cell-${column.type}`)
    }

    // Alignment
    if (column.align) {
      td.style.textAlign = column.align
    }

    // Render actions for first column FIRST (before content)
    // This ensures actions are at the beginning of the cell
    const actions = config.actions || []
    const columnHasActions = column.actions !== false // Default true, can be disabled per column
    // Check if row should have actions (skip infoRows and check showIf callback if provided)
    const rowHasActions =
      row._type !== "infoRow" &&
      (!config.actionsShowIf || config.actionsShowIf(row))
    if (
      index === 0 &&
      actions.length > 0 &&
      columnHasActions &&
      rowHasActions
    ) {
      const actionsWrapper = this._createRowActions(actions, row)
      td.appendChild(actionsWrapper)
      addClass(td, "dg-cell-has-actions")
    }

    // Render content (pass flag to skip action handling since we did it above)
    this._renderCellContent(td, row[column.data], column, row, true)

    // Render badge for first column if row has _badge property
    if (index === 0 && row._badge && row._type !== "infoRow") {
      const badge = this._createBadgeElement(row._badge)
      td.appendChild(badge)
      addClass(td, "dg-cell-has-badge")
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
    let content = badgeConfig
    let position = null

    if (
      badgeConfig &&
      typeof badgeConfig === "object" &&
      !(badgeConfig instanceof HTMLElement) &&
      "content" in badgeConfig
    ) {
      content = badgeConfig.content
      position = badgeConfig.position || null
    }

    // Check if content contains HTML tags (custom styled element)
    const containsHtml = typeof content === "string" && /<[^>]+>/.test(content)

    let badge
    if (containsHtml) {
      // Custom HTML provided - create wrapper without default badge styling
      badge = createElement("span", { class: "dg-cell-badge-wrapper" })
      badge.innerHTML = content
    } else if (content instanceof HTMLElement) {
      // HTMLElement provided - wrap without default styling
      badge = createElement("span", { class: "dg-cell-badge-wrapper" })
      badge.appendChild(content.cloneNode(true))
    } else {
      // Plain text - apply default badge styling
      badge = createElement("span", { class: "dg-cell-badge" })
      badge.textContent = content
    }

    // Apply position class if specified
    if (position) {
      const positionClass = `dg-badge-${position}`
      addClass(badge, positionClass)
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
    const data = this._state._state.data
    const row = data.find((r) => r._id === rowId)
    if (!row) return

    // Update the data
    row._badge = badgeContent

    // Find the first cell of the row
    const columns = this._state.getColumns()
    const firstVisibleColumn = columns.find((col) => col.visible !== false)
    if (!firstVisibleColumn) return

    const cellKey = `${rowId}:${firstVisibleColumn.data}`
    const td = this._cellElements.get(cellKey)
    if (!td) return

    // Remove existing badge (could be either class)
    const existingBadge = td.querySelector(
      ".dg-cell-badge, .dg-cell-badge-wrapper"
    )
    if (existingBadge) {
      existingBadge.remove()
      removeClass(td, "dg-cell-has-badge")
    }

    // Add new badge if content provided
    if (badgeContent) {
      const badge = this._createBadgeElement(badgeContent)
      td.appendChild(badge)
      addClass(td, "dg-cell-has-badge")
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
    const wrapper = createElement("span", { class: "dg-row-actions" })

    actions.forEach((action, index) => {
      const actionBtn = createElement("span", {
        class: "dg-row-action",
        title: action.tooltip || "",
        "data-action-index": index,
      })

      // Set the icon HTML
      if (action.icon) {
        if (typeof action.icon === "string") {
          actionBtn.innerHTML = action.icon
        } else if (action.icon instanceof HTMLElement) {
          actionBtn.appendChild(action.icon.cloneNode(true))
        }
      }

      // Click handler
      actionBtn.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent row click

        // Get fresh row data
        const rowData = this._state.getRow(row._id)

        // Call the onClick handler if provided
        if (typeof action.onClick === "function") {
          action.onClick(rowData, e)
        }

        // Emit event for external listeners
        this._eventBus.emit(TableEvents.ACTION_CLICK, {
          actionIndex: index,
          action,
          rowId: row._id,
          row: rowData,
          event: e,
        })
      })

      wrapper.appendChild(actionBtn)
    })

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
    const isEditMode = this._state.isEditMode()
    // Check column, row type, and row-level editable override
    const isEditable =
      column.editable !== false &&
      row._type !== "infoRow" &&
      row._editable !== false

    if (skipSpecialElements) {
      // During initial creation, just render the content
      // Actions and badges are handled by _createCellElement
      if (isEditMode && isEditable) {
        // Edit mode - render input
        const input = this._createInputElement(value, column, row)
        cell.appendChild(input)
      } else {
        // View mode - render display value
        const displayValue = this._formatDisplayValue(value, column, row)

        if (column.render) {
          // Custom render function
          const rendered = column.render(value, row, column)
          if (typeof rendered === "string") {
            // Create a text node or span for the content
            const content = document.createElement("span")
            content.innerHTML = rendered
            cell.appendChild(content)
          } else if (rendered instanceof HTMLElement) {
            cell.appendChild(rendered)
          }
        } else {
          // Create text content
          const textNode = document.createTextNode(displayValue)
          cell.appendChild(textNode)
        }
      }
    } else {
      // During updates, we need to preserve actions and badges
      // Find and temporarily remove special elements
      const existingBadge = cell.querySelector(
        ".dg-cell-badge, .dg-cell-badge-wrapper"
      )
      const existingActions = cell.querySelector(".dg-row-actions")

      // Remove special elements temporarily (they keep their references and event listeners)
      if (existingBadge) existingBadge.remove()
      if (existingActions) existingActions.remove()

      // Clear remaining content (text nodes, inputs, spans)
      cell.innerHTML = ""

      // Re-add actions at the beginning (with their original event listeners intact)
      if (existingActions) {
        cell.appendChild(existingActions)
      }

      // Render content
      if (isEditMode && isEditable) {
        // Edit mode - render input
        const input = this._createInputElement(value, column, row)
        cell.appendChild(input)
      } else {
        // View mode - render display value
        const displayValue = this._formatDisplayValue(value, column, row)

        if (column.render) {
          // Custom render function
          const rendered = column.render(value, row, column)
          if (typeof rendered === "string") {
            // Create a text node or span for the content
            const content = document.createElement("span")
            content.innerHTML = rendered
            cell.appendChild(content)
          } else if (rendered instanceof HTMLElement) {
            cell.appendChild(rendered)
          }
        } else {
          // Create text content
          const textNode = document.createTextNode(displayValue)
          cell.appendChild(textNode)
        }
      }

      // Re-add badge at the end (with its original structure intact)
      if (existingBadge) {
        cell.appendChild(existingBadge)
      }
    }
  }

  /**
   * Create input element for edit mode
   * @private
   */
  _createInputElement(value, column, row) {
    const type = column.inputType || column.type || "text"

    let input

    if (type === "select" && column.options) {
      input = createElement("select", { class: "dg-cell-input dg-cell-select" })
      column.options.forEach((opt) => {
        const option = createElement("option", { value: opt.value || opt })
        option.textContent = opt.label || opt
        if ((opt.value || opt) === value) {
          option.selected = true
        }
        input.appendChild(option)
      })
    } else if (type === "textarea") {
      input = createElement("textarea", {
        class: "dg-cell-input dg-cell-textarea",
        value: value || "",
      })
      input.textContent = value || ""
    } else {
      input = createElement("input", {
        class: "dg-cell-input",
        type: type === "number" ? "number" : "text",
        value: value ?? "",
      })

      if (type === "number") {
        if (column.min !== undefined) input.min = column.min
        if (column.max !== undefined) input.max = column.max
        if (column.step !== undefined) input.step = column.step
      }
    }

    // Input event handlers
    input.addEventListener("focus", () => {
      this._eventBus.emit(TableEvents.CELL_FOCUS, {
        rowId: row._id,
        columnName: column.data,
        value,
      })
    })

    input.addEventListener("blur", () => {
      this._eventBus.emit(TableEvents.CELL_BLUR, {
        rowId: row._id,
        columnName: column.data,
        value: input.value,
      })
    })

    input.addEventListener("change", (e) => {
      let newValue = e.target.value

      // Type coercion
      if (type === "number") {
        newValue = newValue === "" ? null : parseFloat(newValue)
      }

      this._state.updateCell(row._id, column.data, newValue)

      // Column-specific onChange
      if (column.onChange) {
        column.onChange({
          value: newValue,
          rowId: row._id,
          row: this._state.getRow(row._id),
          column,
        })
      }
    })

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
      }).format(value)
      return formatted
    }

    if (column.type === "date" && value) {
      const date = new Date(value)
      return date.toLocaleDateString()
    }

    return String(value)
  }

  /**
   * Create group header row
   * @private
   */
  _createGroupHeaderRow(groupId, group, columns) {
    const config = this._state.getConfig()
    const isCollapsed = this._state.isGroupCollapsed(groupId)
    const visibleColumns = columns.filter((c) => c.visible !== false)

    const tr = createElement("tr", {
      class: "dg-row dg-row-group-header",
      "data-group": groupId,
    })

    // Use pre-calculated totals from GroupManager
    const aggregates = group.totals || {}

    visibleColumns.forEach((column, index) => {
      const td = createElement("td", {
        class: "dg-cell dg-cell-group-header",
        "data-column": column.data,
      })

      // Fixed first column
      if (index === 0 && config.fixedFirstColumn) {
        addClass(td, "dg-cell-fixed")
      }

      // Row total column
      if (column._isRowTotal) {
        addClass(td, "dg-cell-row-total")
      }

      // First column: show toggle + group label
      if (index === 0) {
        const toggleContent = createElement("div", {
          class: "dg-group-header-content",
        })

        const toggleIcon = createElement("span", {
          class: `dg-group-toggle-icon ${
            isCollapsed ? "dg-collapsed" : "dg-expanded"
          }`,
        })
        toggleIcon.innerHTML = isCollapsed ? "▶" : "▼"

        const groupLabel = createElement("span", { class: "dg-group-label" })
        const labelContent = group.label || groupId
        // Check if label contains HTML (starts with < or contains < followed by a letter)
        if (typeof labelContent === "string" && labelContent.includes("<")) {
          groupLabel.innerHTML = labelContent
        } else {
          groupLabel.textContent = labelContent
        }

        const groupCount = createElement("span", { class: "dg-group-count" })
        groupCount.textContent = `(${group.rows.length})`

        toggleContent.appendChild(toggleIcon)
        toggleContent.appendChild(groupLabel)
        toggleContent.appendChild(groupCount)
        td.appendChild(toggleContent)
      } else if (column.aggregate && aggregates[column.data] !== undefined) {
        // Show aggregate value from GroupManager
        td.textContent = this._formatDisplayValue(
          aggregates[column.data],
          column,
          {}
        )
        addClass(td, "dg-cell-aggregate")
      }

      // Alignment
      if (column.align) {
        td.style.textAlign = column.align
      }

      tr.appendChild(td)
    })

    // Click handler for toggle
    tr.addEventListener("click", () => {
      this._state.toggleGroup(groupId)
    })

    return tr
  }

  /**
   * Create totals row for a group
   * @private
   */
  _createTotalsRow(totals, columns, groupId) {
    const config = this._state.getConfig()

    const tr = createElement("tr", {
      class: "dg-row dg-row-totals",
      "data-group": groupId,
    })

    columns.forEach((column, index) => {
      if (column.visible === false) return

      const td = createElement("td", {
        class: "dg-cell dg-cell-total",
        "data-column": column.data,
      })

      if (index === 0 && config.fixedFirstColumn) {
        addClass(td, "dg-cell-fixed")
      }

      if (totals[column.data] !== undefined) {
        td.textContent = this._formatDisplayValue(
          totals[column.data],
          column,
          {}
        )
      }

      tr.appendChild(td)
    })

    return tr
  }

  /**
   * Toggle group visibility
   * @private
   */
  _toggleGroupVisibility(groupId, collapsed) {
    const rows = this._tbody.querySelectorAll(
      `[data-group="${groupId}"]:not(.dg-row-group-header)`
    )
    const header = this._tbody.querySelector(
      `.dg-row-group-header[data-group="${groupId}"]`
    )

    rows.forEach((row) => {
      if (collapsed) {
        addClass(row, "dg-row-hidden")
      } else {
        removeClass(row, "dg-row-hidden")
      }
    })

    // Update toggle icon
    if (header) {
      const icon = header.querySelector(".dg-group-toggle-icon")
      if (icon) {
        icon.innerHTML = collapsed ? "▶" : "▼"
        if (collapsed) {
          removeClass(icon, "dg-expanded")
          addClass(icon, "dg-collapsed")
        } else {
          removeClass(icon, "dg-collapsed")
          addClass(icon, "dg-expanded")
        }
      }
    }
  }

  /**
   * Set visibility for all groups
   * @private
   */
  _setAllGroupsVisibility(collapsed) {
    const groupedData = this._state.getGroupedData()
    if (groupedData) {
      Object.keys(groupedData).forEach((groupId) => {
        this._toggleGroupVisibility(groupId, collapsed)
      })
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

    const groupedData = this._state.getGroupedData()
    if (!groupedData) return

    const columns = this._state.getColumns()
    const groupsToUpdate = groupId ? [groupId] : Object.keys(groupedData)

    groupsToUpdate.forEach((gId) => {
      const group = groupedData[gId]
      if (!group) return

      const headerRow = this._tbody.querySelector(
        `.dg-row-group-header[data-group="${gId}"]`
      )
      if (!headerRow) return

      // Update each aggregate cell in the header
      columns.forEach((column) => {
        if (column.aggregate && group.totals[column.data] !== undefined) {
          const cell = headerRow.querySelector(`[data-column="${column.data}"]`)
          if (cell && !cell.querySelector(".dg-group-header-content")) {
            cell.textContent = this._formatDisplayValue(
              group.totals[column.data],
              column,
              {}
            )
          }
        }
      })
    })
  }
}
