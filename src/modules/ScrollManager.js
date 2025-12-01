/**
 * ScrollManager - Handles scroll-related operations
 *
 * Manages fixed columns, scroll synchronization, and scroll-to-row functionality.
 */

import { TableEvents } from "../core/EventBus.js"
import {
  addClass,
  removeClass,
  scrollIntoView,
  isInViewport,
  throttle,
} from "../utils/dom.js"

export class ScrollManager {
  /**
   * @param {HTMLElement} container - Table container element
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   */
  constructor(container, state, eventBus) {
    this._container = container
    this._state = state
    this._eventBus = eventBus

    /** @type {HTMLElement|null} */
    this._scrollContainer = null

    /** @type {number} */
    this._scrollLeft = 0

    /** @type {number} */
    this._scrollTop = 0

    // Throttled scroll handler for performance
    this._handleScroll = throttle(this._onScroll.bind(this), 16)

    // Setup after initial render
    this._eventBus.on(TableEvents.AFTER_RENDER, () => {
      this._setupScrollContainer()
    })
  }

  /**
   * Scroll to a specific row
   * @param {string} rowId - Row identifier
   * @param {Object} [options] - Scroll options
   */
  scrollToRow(rowId, options = {}) {
    const rowElement = this._container.querySelector(`[data-row-id="${rowId}"]`)

    if (rowElement) {
      scrollIntoView(rowElement, {
        behavior: options.smooth !== false ? "smooth" : "auto",
        block: options.block || "center",
        ...options,
      })
    }
  }

  /**
   * Scroll to a specific cell
   * @param {string} rowId - Row identifier
   * @param {string} columnName - Column name
   */
  scrollToCell(rowId, columnName) {
    const cell = this._container.querySelector(
      `[data-row-id="${rowId}"] [data-column="${columnName}"]`
    )

    if (cell) {
      scrollIntoView(cell, {
        behavior: "smooth",
        block: "center",
        inline: "center",
      })
    }
  }

  /**
   * Scroll to top
   */
  scrollToTop() {
    if (this._scrollContainer) {
      this._scrollContainer.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom() {
    if (this._scrollContainer) {
      this._scrollContainer.scrollTo({
        top: this._scrollContainer.scrollHeight,
        behavior: "smooth",
      })
    }
  }

  /**
   * Get current scroll position
   * @returns {{left: number, top: number}}
   */
  getScrollPosition() {
    return {
      left: this._scrollLeft,
      top: this._scrollTop,
    }
  }

  /**
   * Set scroll position
   * @param {{left?: number, top?: number}} position - Scroll position
   * @param {boolean} [smooth=false] - Use smooth scrolling
   */
  setScrollPosition(position, smooth = false) {
    if (this._scrollContainer) {
      this._scrollContainer.scrollTo({
        left: position.left ?? this._scrollLeft,
        top: position.top ?? this._scrollTop,
        behavior: smooth ? "smooth" : "auto",
      })
    }
  }

  /**
   * Check if row is visible in viewport
   * @param {string} rowId - Row identifier
   * @returns {boolean}
   */
  isRowVisible(rowId) {
    const rowElement = this._container.querySelector(`[data-row-id="${rowId}"]`)
    return rowElement ? isInViewport(rowElement) : false
  }

  /**
   * Get visible rows
   * @returns {Array<string>} Array of visible row IDs
   */
  getVisibleRows() {
    const rows = this._container.querySelectorAll(".et-row-data")
    const visibleRows = []

    rows.forEach((row) => {
      if (isInViewport(row)) {
        const rowId = row.getAttribute("data-row-id")
        if (rowId) {
          visibleRows.push(rowId)
        }
      }
    })

    return visibleRows
  }

  /**
   * Setup scroll container and listeners
   * @private
   */
  _setupScrollContainer() {
    this._scrollContainer = this._container.querySelector(".et-table-wrapper")

    if (this._scrollContainer) {
      this._scrollContainer.addEventListener("scroll", this._handleScroll)

      // Initialize fixed column position
      this._updateFixedColumnPosition()
    }
  }

  /**
   * Handle scroll event
   * @private
   */
  _onScroll(event) {
    const target = event?.target || this._scrollContainer

    this._scrollLeft = target.scrollLeft
    this._scrollTop = target.scrollTop

    // Update fixed column position
    this._updateFixedColumnPosition()

    // Emit scroll event
    this._eventBus.emit(TableEvents.SCROLL, {
      scrollLeft: this._scrollLeft,
      scrollTop: this._scrollTop,
    })
  }

  /**
   * Update fixed column position based on scroll
   * @private
   */
  _updateFixedColumnPosition() {
    const config = this._state.getConfig()

    if (!config.fixedFirstColumn) return

    const fixedCells = this._container.querySelectorAll(".et-cell-fixed")

    fixedCells.forEach((cell) => {
      cell.style.transform = `translateX(${this._scrollLeft}px)`
    })

    // Add shadow when scrolled
    if (this._scrollLeft > 0) {
      addClass(this._container, "et-scrolled")
    } else {
      removeClass(this._container, "et-scrolled")
    }
  }

  /**
   * Refresh scroll position (e.g., after resize)
   */
  refresh() {
    this._updateFixedColumnPosition()
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this._scrollContainer) {
      this._scrollContainer.removeEventListener("scroll", this._handleScroll)
    }
  }
}
