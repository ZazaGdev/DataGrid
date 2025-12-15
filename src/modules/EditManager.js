/**
 * EditManager - Handles edit mode operations
 *
 * Manages view/edit mode switching, keyboard navigation,
 * and cell editing behavior.
 */

import { TableEvents } from "../core/EventBus.js"
import { addClass, removeClass, $ } from "../utils/dom.js"

export class EditManager {
  /**
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   * @param {TableRenderer} renderer - Table renderer instance
   */
  constructor(state, eventBus, renderer) {
    this._state = state
    this._eventBus = eventBus
    this._renderer = renderer

    /** @type {{rowId: string, columnName: string}|null} */
    this._focusedCell = null

    /** @type {boolean} */
    this._isEditing = false

    /** @type {Array<Function>} - Unsubscribe functions for cleanup */
    this._unsubscribers = []

    /** @type {HTMLElement|null} - Currently focused input element */
    this._currentlyFocusedInput = null

    // Setup event listeners
    this._setupListeners()
  }

  /**
   * Enter edit mode
   */
  enterEditMode() {
    this._state.setMode("edit")
  }

  /**
   * Enter view mode
   */
  enterViewMode() {
    this._state.setMode("view")
    this._focusedCell = null
  }

  /**
   * Toggle between modes
   * @returns {'view'|'edit'} New mode
   */
  toggleMode() {
    const currentMode = this._state.getMode()
    const newMode = currentMode === "view" ? "edit" : "view"
    this._state.setMode(newMode)
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
    this._focusedCell = { rowId, columnName }

    // If in edit mode, focus the input
    if (this._state.isEditMode()) {
      const cell = this._renderer.getCellElement(rowId, columnName)
      if (cell) {
        const input = cell.querySelector(".dg-cell-input")
        if (input) {
          input.focus()
          if (input.select) {
            input.select()
          }
        }
      }
    }

    this._eventBus.emit(TableEvents.CELL_FOCUS, {
      rowId,
      columnName,
    })
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

    const { rowId, columnName } = this._focusedCell
    const data = this._state.getData()
    const columns = this._state.getColumns().filter((c) => c.visible !== false)

    const rowIndex = data.findIndex((r) => r._id === rowId)
    const colIndex = columns.findIndex((c) => c.data === columnName)

    if (rowIndex === -1 || colIndex === -1) return

    let newRowIndex = rowIndex
    let newColIndex = colIndex

    switch (direction) {
      case "up":
        newRowIndex = Math.max(0, rowIndex - 1)
        break
      case "down":
        newRowIndex = Math.min(data.length - 1, rowIndex + 1)
        break
      case "left":
        newColIndex = Math.max(0, colIndex - 1)
        break
      case "right":
        newColIndex = Math.min(columns.length - 1, colIndex + 1)
        break
    }

    // Skip non-editable rows (like totals) when moving vertically
    if (direction === "up" || direction === "down") {
      const targetRow = data[newRowIndex]
      if (targetRow && targetRow._type !== "data") {
        // Try to skip to next valid row
        const step = direction === "up" ? -1 : 1
        while (newRowIndex >= 0 && newRowIndex < data.length) {
          if (data[newRowIndex]._type === "data") break
          newRowIndex += step
        }

        // Clamp to valid range
        newRowIndex = Math.max(0, Math.min(data.length - 1, newRowIndex))
      }
    }

    const newRow = data[newRowIndex]
    const newColumn = columns[newColIndex]

    if (newRow && newColumn) {
      this.focusCell(newRow._id, newColumn.data)
    }
  }

  /**
   * Start editing current cell (for inline edit on click)
   */
  startEditing() {
    if (!this._focusedCell || !this._state.isEditMode()) return

    this._isEditing = true
    const { rowId, columnName } = this._focusedCell

    const cell = this._renderer.getCellElement(rowId, columnName)
    if (cell) {
      addClass(cell, "dg-cell-editing")
    }
  }

  /**
   * Stop editing current cell
   */
  stopEditing() {
    if (!this._focusedCell) return

    this._isEditing = false
    const { rowId, columnName } = this._focusedCell

    const cell = this._renderer.getCellElement(rowId, columnName)
    if (cell) {
      removeClass(cell, "dg-cell-editing")
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

    const { rowId, columnName } = this._focusedCell
    const originalData = this._state._state.originalData
    const originalRow = originalData.find((r) => r._id === rowId)

    if (originalRow) {
      this._state.updateCell(rowId, columnName, originalRow[columnName])
    }

    this.stopEditing()
  }

  /**
   * Commit current edit
   */
  commitEdit() {
    if (!this._focusedCell || !this._isEditing) return

    const { rowId, columnName } = this._focusedCell
    const cell = this._renderer.getCellElement(rowId, columnName)

    if (cell) {
      const input = cell.querySelector(".dg-cell-input")
      if (input) {
        // Trigger change event
        input.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }

    this.stopEditing()
  }

  /**
   * Setup keyboard navigation
   * @private
   */
  _setupListeners() {
    // Handle input focus - move cursor to end on initial focus only
    this._handleInputFocus = (e) => {
      const input = e.target
      if (!input.classList.contains("dg-cell-input")) return

      // Check if this is a fresh focus (input wasn't focused before)
      if (this._currentlyFocusedInput !== input) {
        this._currentlyFocusedInput = input

        // Use setTimeout to allow the click to complete, then move cursor to end
        setTimeout(() => {
          if (input.setSelectionRange && typeof input.value === "string") {
            const length = input.value.length
            input.setSelectionRange(length, length)
          }
        }, 0)
      }
    }

    // Handle input blur - clear the currently focused input reference
    this._handleInputBlur = (e) => {
      const input = e.target
      if (!input.classList.contains("dg-cell-input")) return

      if (this._currentlyFocusedInput === input) {
        this._currentlyFocusedInput = null
      }
    }

    // Add focus/blur listeners with capture to catch events early
    document.addEventListener("focus", this._handleInputFocus, true)
    document.addEventListener("blur", this._handleInputBlur, true)

    // Handle keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (!this._state.isEditMode()) return

      switch (e.key) {
        case "Tab":
          e.preventDefault()
          this.moveFocus(e.shiftKey ? "left" : "right")
          break

        case "Enter":
          if (this._isEditing) {
            e.preventDefault()
            this.commitEdit()
            this.moveFocus("down")
          }
          break

        case "Escape":
          if (this._isEditing) {
            e.preventDefault()
            this.cancelEdit()
          }
          break

        case "ArrowUp":
          if (!this._isEditing || e.ctrlKey) {
            e.preventDefault()
            this.moveFocus("up")
          }
          break

        case "ArrowDown":
          if (!this._isEditing || e.ctrlKey) {
            e.preventDefault()
            this.moveFocus("down")
          }
          break

        case "ArrowLeft":
          if (!this._isEditing || e.ctrlKey) {
            e.preventDefault()
            this.moveFocus("left")
          }
          break

        case "ArrowRight":
          if (!this._isEditing || e.ctrlKey) {
            e.preventDefault()
            this.moveFocus("right")
          }
          break
      }
    })

    // Track cell focus
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.CELL_FOCUS, ({ rowId, columnName }) => {
        this._focusedCell = { rowId, columnName }
      })
    )

    // Track cell blur
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.CELL_BLUR, () => {
        this._isEditing = false
      })
    )

    // Clear focus when mode changes to view
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.MODE_CHANGE, ({ newMode }) => {
        if (newMode === "view") {
          this._focusedCell = null
          this._isEditing = false
        }
      })
    )
  }

  /**
   * Cleanup
   */
  destroy() {
    // Remove focus/blur listeners
    document.removeEventListener("focus", this._handleInputFocus, true)
    document.removeEventListener("blur", this._handleInputBlur, true)

    // Unsubscribe from all event listeners
    this._unsubscribers.forEach((unsubscribe) => unsubscribe())
    this._unsubscribers = []

    this._focusedCell = null
    this._isEditing = false
    this._currentlyFocusedInput = null
  }
}
