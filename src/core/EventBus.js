/**
 * EventBus - Lightweight pub/sub event system for decoupled communication
 *
 * This enables modules to communicate without direct dependencies,
 * improving maintainability and allowing for efficient cascade updates.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map()

    /** @type {Map<string, Function>} */
    this._onceListeners = new Map() // TODO: Implement once listeners if needed

    /** @type {boolean} */
    this._isBatching = false

    /** @type {Array<{event: string, data: any}>} */
    this._batchQueue = []
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event).add(callback)

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
      this.off(event, wrapper)
      callback(data)
    }
    this.on(event, wrapper)
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   */
  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback)
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this._isBatching) {
      this._batchQueue.push({ event, data })
      return
    }

    if (this._listeners.has(event)) {
      this._listeners.get(event).forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  /**
   * Start batching events (for performance during bulk updates)
   */
  startBatch() {
    this._isBatching = true
    this._batchQueue = []
  }

  /**
   * End batching and emit all queued events
   * Deduplicates events of the same type, keeping latest data
   */
  endBatch() {
    this._isBatching = false

    // Deduplicate: keep only the latest event of each type
    const eventMap = new Map()
    this._batchQueue.forEach(({ event, data }) => {
      eventMap.set(event, data)
    })

    // Emit deduplicated events
    eventMap.forEach((data, event) => {
      this.emit(event, data)
    })

    this._batchQueue = []
  }

  /**
   * Remove all listeners
   */
  destroy() {
    this._listeners.clear()
    this._batchQueue = []
  }
}

// Predefined event types for consistency
export const TableEvents = {
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
}
