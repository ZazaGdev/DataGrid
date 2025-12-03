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

    // Calculate initial row totals if enabled
    if (this._state.getConfig().enableRowTotals) {
      this.recalculateRowTotals()
    }
  }

  /**
   * Calculate row total (sum of all numeric columns with aggregate) for a single row
   * @param {Object} row - Row data
   * @returns {number} Row total
   */
  calculateRowTotal(row) {
    const columns = this._state.getColumns()
    let total = 0

    columns.forEach((column) => {
      // Only sum columns that have aggregate defined (indicating they're numeric summable columns)
      if (column.aggregate && column.data !== "_rowTotal") {
        const value = row[column.data]
        if (value !== null && value !== undefined && !isNaN(value)) {
          total += Number(value)
        }
      }
    })

    return total
  }

  /**
   * Recalculate row totals for all data rows
   */
  recalculateRowTotals() {
    const config = this._state.getConfig()
    if (!config.enableRowTotals) return

    const data = this._state._state.data

    data.forEach((row) => {
      if (row._type === "data") {
        row._rowTotal = this.calculateRowTotal(row)
      }
    })
  }

  /**
   * Update row total for a specific row
   * @param {string} rowId - Row identifier
   */
  updateRowTotal(rowId) {
    const config = this._state.getConfig()
    if (!config.enableRowTotals) return

    const data = this._state._state.data
    const row = data.find((r) => r._id === rowId)

    if (row && row._type === "data") {
      const oldTotal = row._rowTotal
      row._rowTotal = this.calculateRowTotal(row)

      // Emit event so TableRenderer can update the cell
      if (oldTotal !== row._rowTotal) {
        this._eventBus.emit(TableEvents.ROW_TOTAL_CHANGE, {
          rowId,
          oldValue: oldTotal,
          newValue: row._rowTotal,
        })
      }
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
    const config = this._state.getConfig()

    if (!groupedData) return

    const groupsToUpdate = groupId
      ? [groupId].filter((id) => groupedData[id])
      : Object.keys(groupedData)

    groupsToUpdate.forEach((gId) => {
      const group = groupedData[gId]
      const totals = {}

      // Filter to only data rows (exclude infoRows and other special types)
      const dataRows = group.rows.filter((row) => row._type === "data")

      columns.forEach((column) => {
        if (column.aggregate && column.data !== "_rowTotal") {
          const values = dataRows
            .map((row) => row[column.data])
            .filter((v) => v !== null && v !== undefined && !isNaN(v))

          totals[column.data] = this._calculateAggregate(
            column.aggregate,
            values,
            dataRows
          )
        }
      })

      // Calculate row total for the group header (sum of all aggregated column totals)
      if (config.enableRowTotals) {
        let groupRowTotal = 0
        columns.forEach((column) => {
          if (
            column.aggregate &&
            column.data !== "_rowTotal" &&
            totals[column.data] !== undefined
          ) {
            groupRowTotal += totals[column.data]
          }
        })
        totals._rowTotal = groupRowTotal
      }

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
        const config = this._state.getConfig()

        // Update row total for this row if enabled
        if (config.enableRowTotals && column && column.aggregate) {
          this.updateRowTotal(rowId)
        }

        // Update group totals if grouping is enabled
        if (column && column.aggregate && config.enableGrouping) {
          // Find which group this row belongs to
          const row = this._state.getRow(rowId)
          if (row) {
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
        const config = this._state.getConfig()

        if (config.enableRowTotals) {
          this.recalculateRowTotals()
        }

        if (config.enableGrouping) {
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
