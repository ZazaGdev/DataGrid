/**
 * ExportManager - Handles data export operations
 *
 * Exports table data to CSV and Excel formats.
 */

import { TableEvents } from "../core/EventBus.js"
import { transformForExport } from "../utils/data.js"

export class ExportManager {
  /**
   * @param {TableState} state - Table state instance
   * @param {EventBus} eventBus - Event bus instance
   */
  constructor(state, eventBus) {
    this._state = state
    this._eventBus = eventBus
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
    } = options

    this._eventBus.emit(TableEvents.EXPORT_START, { format: "csv" })

    let data = this._state.getData()
    let columns = this._state.getColumns()

    // Filter columns
    if (columnFilter) {
      columns = columns.filter((col) => columnFilter.includes(col.data))
    } else if (!includeHidden) {
      columns = columns.filter((col) => col.visible !== false)
    }

    // Filter rows
    if (filter) {
      data = data.filter(filter)
    }

    // Build CSV
    const rows = []

    // Header row
    if (includeHeaders) {
      const headerRow = columns.map((col) =>
        this._escapeCSV(col.title || col.data, delimiter)
      )
      rows.push(headerRow.join(delimiter))
    }

    // Data rows
    data.forEach((row) => {
      if (row._type !== "data" && row._type !== "subrow") return

      const csvRow = columns.map((col) => {
        let value = row[col.data]

        // Format value if formatter exists
        if (col.exportFormat) {
          value = col.exportFormat(value, row, col)
        } else if (col.format) {
          value = col.format(value, row, col)
        }

        return this._escapeCSV(value, delimiter)
      })

      rows.push(csvRow.join(delimiter))
    })

    const csvString = rows.join("\n")

    this._eventBus.emit(TableEvents.EXPORT_COMPLETE, {
      format: "csv",
      rowCount: rows.length - (includeHeaders ? 1 : 0),
    })

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
    } = options

    this._eventBus.emit(TableEvents.EXPORT_START, { format: "excel" })

    let data = this._state.getData()
    let columns = this._state.getColumns()

    // Filter columns
    if (columnFilter) {
      columns = columns.filter((col) => columnFilter.includes(col.data))
    } else if (!includeHidden) {
      columns = columns.filter((col) => col.visible !== false)
    }

    // Filter rows
    if (filter) {
      data = data.filter(filter)
    }

    // Build Excel data structure
    const worksheetData = []

    // Header row
    if (includeHeaders) {
      worksheetData.push(columns.map((col) => col.title || col.data))
    }

    // Data rows
    data.forEach((row) => {
      if (row._type !== "data" && row._type !== "subrow") return

      const excelRow = columns.map((col) => {
        let value = row[col.data]

        // Keep numbers as numbers for Excel
        if (col.type === "number" && typeof value === "number") {
          return value
        }

        // Format other values
        if (col.exportFormat) {
          value = col.exportFormat(value, row, col)
        }

        return value
      })

      worksheetData.push(excelRow)
    })

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
    }

    this._eventBus.emit(TableEvents.EXPORT_COMPLETE, {
      format: "excel",
      rowCount: worksheetData.length - (includeHeaders ? 1 : 0),
    })

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
      this._downloadCSV(filename, options)
    } else if (format === "excel") {
      this._downloadExcel(filename, options)
    }
  }

  /**
   * Download as CSV file
   * @private
   */
  _downloadCSV(filename, options) {
    const csv = this.toCSV(options)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    this._downloadBlob(blob, `${filename}.csv`)
  }

  /**
   * Download as Excel file (using CSV with .xls extension for basic support)
   * For full XLSX support, integrate with SheetJS
   * @private
   */
  _downloadExcel(filename, options) {
    // Basic Excel export using tab-delimited format
    const csv = this.toCSV({ ...options, delimiter: "\t" })
    const blob = new Blob([csv], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    })
    this._downloadBlob(blob, `${filename}.xls`)
  }

  /**
   * Download blob as file
   * @private
   */
  _downloadBlob(blob, filename) {
    const link = document.createElement("a")

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
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

    const stringValue = String(value)

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
    const data = this._state.getData().slice(0, rowCount)
    const columns = this._state.getColumns().filter((c) => c.visible !== false)

    if (format === "csv") {
      // Build preview CSV
      const headers = columns.map((c) => c.title || c.data).join(",")
      const rows = data.map((row) =>
        columns.map((col) => this._escapeCSV(row[col.data])).join(",")
      )
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
