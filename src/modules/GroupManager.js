/**
 * GroupManager - Handles row grouping operations
 *
 * Manages group creation, expansion/collapse, and group totals.
 */

import { TableEvents } from "../core/EventBus.js"
import { calculateGroupTotals, calculateGrandTotals } from "../utils/data.js"
import { sum, average, min, max } from "../utils/helpers.js"

export class GroupManager {
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

    // Calculate initial totals if grouping is enabled
    if (this._state.getConfig().enableGrouping) {
      this.recalculateTotals()
    }
  }

  /**
   * Get group information by ID
   * @param {string} groupId - Group identifier
   * @returns {Object|null}
   */
  getGroup(groupId) {
    const groupedData = this._state.getGroupedData()
    return groupedData ? groupedData[groupId] : null
  }

  /**
   * Get all group IDs
   * @returns {Array<string>}
   */
  getGroupIds() {
    const groupedData = this._state.getGroupedData()
    return groupedData ? Object.keys(groupedData) : []
  }

  /**
   * Get rows in a specific group
   * @param {string} groupId - Group identifier
   * @returns {Array<Object>}
   */
  getGroupRows(groupId) {
    const group = this.getGroup(groupId)
    return group ? group.rows : []
  }

  /**
   * Get group totals
   * @param {string} groupId - Group identifier
   * @returns {Object}
   */
  getGroupTotals(groupId) {
    const group = this.getGroup(groupId)
    return group ? group.totals : {}
  }

  /**
   * Calculate and update group totals
   * @param {string} [groupId] - Specific group, or all if not provided
   */
  recalculateTotals(groupId = null) {
    const groupedData = this._state.getGroupedData()
    const columns = this._state.getColumns()

    if (!groupedData) return

    const groupsToUpdate = groupId
      ? [groupId].filter((id) => groupedData[id])
      : Object.keys(groupedData)

    groupsToUpdate.forEach((gId) => {
      const group = groupedData[gId]
      const totals = {}

      columns.forEach((column) => {
        if (column.aggregate) {
          const values = group.rows
            .map((row) => row[column.data])
            .filter((v) => v !== null && v !== undefined && !isNaN(v))

          totals[column.data] = this._calculateAggregate(
            column.aggregate,
            values,
            group.rows
          )
        }
      })

      group.totals = totals
    })

    this._eventBus.emit(TableEvents.STATE_CHANGE, {
      property: "groupTotals",
      groupId,
    })
  }

  /**
   * Get grand totals (across all groups)
   * @returns {Object}
   */
  getGrandTotals() {
    const data = this._state.getData().filter((r) => r._type === "data")
    const columns = this._state.getColumns()

    return calculateGrandTotals(data, columns)
  }

  /**
   * Toggle group expansion
   * @param {string} groupId - Group identifier
   * @returns {boolean} New collapsed state
   */
  toggle(groupId) {
    this._state.toggleGroup(groupId)
    return this._state.isGroupCollapsed(groupId)
  }

  /**
   * Expand a specific group
   * @param {string} groupId - Group identifier
   */
  expand(groupId) {
    if (this._state.isGroupCollapsed(groupId)) {
      this._state.toggleGroup(groupId)
    }
  }

  /**
   * Collapse a specific group
   * @param {string} groupId - Group identifier
   */
  collapse(groupId) {
    if (!this._state.isGroupCollapsed(groupId)) {
      this._state.toggleGroup(groupId)
    }
  }

  /**
   * Expand all groups
   */
  expandAll() {
    this._state.expandAllGroups()
  }

  /**
   * Collapse all groups
   */
  collapseAll() {
    this._state.collapseAllGroups()
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
    const groupIds = this.getGroupIds()
    const state = {}

    groupIds.forEach((id) => {
      state[id] = !this._state.isGroupCollapsed(id)
    })

    return state
  }

  /**
   * Set expansion state for all groups
   * @param {Object<string, boolean>} state - Expansion state map
   */
  setExpansionState(state) {
    Object.entries(state).forEach(([groupId, expanded]) => {
      if (expanded) {
        this.expand(groupId)
      } else {
        this.collapse(groupId)
      }
    })
  }

  /**
   * Move row to a different group
   * @param {string} rowId - Row ID to move
   * @param {string} targetGroupId - Target group ID
   */
  moveRowToGroup(rowId, targetGroupId) {
    const config = this._state.getConfig()
    const groupBy = config.groupBy

    if (typeof groupBy !== "string") {
      console.warn("Cannot move row when groupBy is a function")
      return
    }

    this._state.updateCell(rowId, groupBy, targetGroupId)
    this.recalculateTotals()
  }

  /**
   * Get group statistics
   * @param {string} groupId - Group identifier
   * @returns {Object}
   */
  getGroupStats(groupId) {
    const group = this.getGroup(groupId)
    if (!group) return null

    const columns = this._state.getColumns()
    const stats = {
      rowCount: group.rows.length,
      columns: {},
    }

    columns.forEach((column) => {
      if (column.type === "number") {
        const values = group.rows
          .map((row) => row[column.data])
          .filter((v) => v !== null && v !== undefined && !isNaN(v))

        stats.columns[column.data] = {
          sum: sum(values),
          average: average(values),
          min: min(values),
          max: max(values),
          count: values.length,
        }
      }
    })

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
        const column = this._state.getColumn(columnName)
        if (column && column.aggregate) {
          // Find which group this row belongs to
          const row = this._state.getRow(rowId)
          if (row) {
            const config = this._state.getConfig()
            const groupBy = config.groupBy
            const groupId =
              typeof groupBy === "function" ? groupBy(row) : row[groupBy]
            this.recalculateTotals(groupId)
          }
        }
      })
    )

    // Recalculate all totals when data changes
    this._unsubscribers.push(
      this._eventBus.on(TableEvents.DATA_CHANGE, () => {
        if (this._state.getConfig().enableGrouping) {
          this.recalculateTotals()
        }
      })
    )
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
