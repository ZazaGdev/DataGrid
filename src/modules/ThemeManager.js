/**
 * ThemeManager - Handles theme customization
 *
 * Allows users to customize table colors through configuration.
 * Falls back to default CSS variables if not specified.
 */

export class ThemeManager {
  /**
   * @param {HTMLElement} container - Table container element
   * @param {Object} [theme] - Theme configuration
   */
  constructor(container, theme = {}) {
    this._container = container

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

      // Cell color coding (for rows with _colorCoding: true)
      cellNegativeBackground: null, // Falls back to --dg-cell-negative-bg
      cellNegativeText: null, // Falls back to --dg-cell-negative-text
      cellPositiveBackground: null, // Falls back to --dg-cell-positive-bg
      cellPositiveText: null, // Falls back to --dg-cell-positive-text

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
    }

    this._theme = { ...this._defaultTheme, ...theme }
    this._applyTheme()
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
    const style = this._container.style

    // Row colors
    if (this._theme.rowEven) {
      style.setProperty(
        "--dg-color-bg-alt",
        this._resolveValue(this._theme.rowEven)
      )
    }
    if (this._theme.rowOdd) {
      style.setProperty("--dg-color-bg", this._resolveValue(this._theme.rowOdd))
    }
    if (this._theme.rowHover) {
      style.setProperty(
        "--dg-color-bg-hover",
        this._resolveValue(this._theme.rowHover)
      )
    }
    if (this._theme.rowSelected) {
      style.setProperty(
        "--dg-color-bg-selected",
        this._resolveValue(this._theme.rowSelected)
      )
    }

    // Border colors
    if (this._theme.borderLight) {
      style.setProperty(
        "--dg-color-border",
        this._resolveValue(this._theme.borderLight)
      )
    }
    if (this._theme.borderStrong) {
      style.setProperty(
        "--dg-color-border-strong",
        this._resolveValue(this._theme.borderStrong)
      )
    }

    // Header colors
    if (this._theme.headerBackground) {
      style.setProperty(
        "--dg-color-header-bg",
        this._resolveValue(this._theme.headerBackground)
      )
    }
    if (this._theme.headerText) {
      style.setProperty(
        "--dg-color-header-text",
        this._resolveValue(this._theme.headerText)
      )
    }

    // Cell colors
    if (this._theme.cellBackground) {
      style.setProperty(
        "--dg-color-cell-bg",
        this._resolveValue(this._theme.cellBackground)
      )
    }
    if (this._theme.cellText) {
      style.setProperty(
        "--dg-color-text",
        this._resolveValue(this._theme.cellText)
      )
    }

    // Cell color coding
    if (this._theme.cellNegativeBackground) {
      style.setProperty(
        "--dg-cell-negative-bg",
        this._resolveValue(this._theme.cellNegativeBackground)
      )
    }
    if (this._theme.cellNegativeText) {
      style.setProperty(
        "--dg-cell-negative-text",
        this._resolveValue(this._theme.cellNegativeText)
      )
    }
    if (this._theme.cellPositiveBackground) {
      style.setProperty(
        "--dg-cell-positive-bg",
        this._resolveValue(this._theme.cellPositiveBackground)
      )
    }
    if (this._theme.cellPositiveText) {
      style.setProperty(
        "--dg-cell-positive-text",
        this._resolveValue(this._theme.cellPositiveText)
      )
    }

    // Fixed column
    if (this._theme.fixedShadow) {
      style.setProperty(
        "--dg-shadow-fixed",
        this._resolveValue(this._theme.fixedShadow)
      )
    }
    if (this._theme.fixedBorderColor) {
      style.setProperty(
        "--dg-fixed-border-color",
        this._resolveValue(this._theme.fixedBorderColor)
      )
    }
    if (this._theme.fixedBorderWidth) {
      style.setProperty(
        "--dg-fixed-border-width",
        this._resolveValue(this._theme.fixedBorderWidth)
      )
    }

    // Interactive colors
    if (this._theme.primary) {
      style.setProperty(
        "--dg-color-primary",
        this._resolveValue(this._theme.primary)
      )
    }
    if (this._theme.primaryHover) {
      style.setProperty(
        "--dg-color-primary-hover",
        this._resolveValue(this._theme.primaryHover)
      )
    }

    // Status colors
    if (this._theme.success) {
      style.setProperty(
        "--dg-color-success",
        this._resolveValue(this._theme.success)
      )
    }
    if (this._theme.warning) {
      style.setProperty(
        "--dg-color-warning",
        this._resolveValue(this._theme.warning)
      )
    }
    if (this._theme.error) {
      style.setProperty(
        "--dg-color-error",
        this._resolveValue(this._theme.error)
      )
    }

    // Row totals column
    if (this._theme.rowTotalBackground) {
      style.setProperty(
        "--dg-row-total-bg",
        this._resolveValue(this._theme.rowTotalBackground)
      )
    }
    if (this._theme.rowTotalBackgroundAlt) {
      style.setProperty(
        "--dg-row-total-bg-alt",
        this._resolveValue(this._theme.rowTotalBackgroundAlt)
      )
    }
    if (this._theme.rowTotalText) {
      style.setProperty(
        "--dg-row-total-text",
        this._resolveValue(this._theme.rowTotalText)
      )
    }
    if (this._theme.rowTotalHeaderBackground) {
      style.setProperty(
        "--dg-row-total-header-bg",
        this._resolveValue(this._theme.rowTotalHeaderBackground)
      )
    }
    if (this._theme.rowTotalBorderColor) {
      style.setProperty(
        "--dg-row-total-border-color",
        this._resolveValue(this._theme.rowTotalBorderColor)
      )
    }

    // Ungrouped rows
    if (this._theme.ungroupedRowBackground) {
      style.setProperty(
        "--dg-ungrouped-row-bg",
        this._resolveValue(this._theme.ungroupedRowBackground)
      )
    }
    if (this._theme.ungroupedRowBackgroundAlt) {
      style.setProperty(
        "--dg-ungrouped-row-bg-alt",
        this._resolveValue(this._theme.ungroupedRowBackgroundAlt)
      )
    }
    if (this._theme.ungroupedRowBackgroundHover) {
      style.setProperty(
        "--dg-ungrouped-row-bg-hover",
        this._resolveValue(this._theme.ungroupedRowBackgroundHover)
      )
    }
    if (this._theme.ungroupedRowText) {
      style.setProperty(
        "--dg-ungrouped-row-text",
        this._resolveValue(this._theme.ungroupedRowText)
      )
    }
  }

  /**
   * Update theme at runtime
   * @param {Object} theme - Partial theme configuration to merge
   */
  updateTheme(theme) {
    this._theme = { ...this._theme, ...theme }
    this._applyTheme()
  }

  /**
   * Reset to default theme
   */
  resetTheme() {
    const style = this._container.style

    // Remove all custom properties
    Object.keys(this._theme).forEach(() => {
      style.removeProperty("--dg-color-bg-alt")
      style.removeProperty("--dg-color-bg")
      style.removeProperty("--dg-color-bg-hover")
      style.removeProperty("--dg-color-bg-selected")
      style.removeProperty("--dg-color-border")
      style.removeProperty("--dg-color-border-strong")
      style.removeProperty("--dg-color-header-bg")
      style.removeProperty("--dg-color-header-text")
      style.removeProperty("--dg-color-cell-bg")
      style.removeProperty("--dg-color-text")
      style.removeProperty("--dg-cell-negative-bg")
      style.removeProperty("--dg-cell-negative-text")
      style.removeProperty("--dg-cell-positive-bg")
      style.removeProperty("--dg-cell-positive-text")
      style.removeProperty("--dg-shadow-fixed")
      style.removeProperty("--dg-fixed-border-color")
      style.removeProperty("--dg-fixed-border-width")
      style.removeProperty("--dg-color-primary")
      style.removeProperty("--dg-color-primary-hover")
      style.removeProperty("--dg-color-success")
      style.removeProperty("--dg-color-warning")
      style.removeProperty("--dg-color-error")
      style.removeProperty("--dg-row-total-bg")
      style.removeProperty("--dg-row-total-bg-alt")
      style.removeProperty("--dg-row-total-text")
      style.removeProperty("--dg-row-total-header-bg")
      style.removeProperty("--dg-row-total-border-color")
      style.removeProperty("--dg-ungrouped-row-bg")
      style.removeProperty("--dg-ungrouped-row-bg-alt")
      style.removeProperty("--dg-ungrouped-row-bg-hover")
      style.removeProperty("--dg-ungrouped-row-text")
    })

    this._theme = { ...this._defaultTheme }
  }

  /**
   * Get current theme
   * @returns {Object} Current theme configuration
   */
  getTheme() {
    return { ...this._theme }
  }
}
