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
      rowEven: null, // Falls back to --et-color-bg-alt
      rowOdd: null, // Falls back to --et-color-bg
      rowHover: null, // Falls back to --et-color-bg-hover
      rowSelected: null, // Falls back to --et-color-bg-selected

      // Border colors
      borderLight: null, // Falls back to --et-color-border
      borderStrong: null, // Falls back to --et-color-border-strong

      // Header colors
      headerBackground: null, // Falls back to --et-color-bg-alt
      headerText: null, // Falls back to --et-color-text

      // Cell colors
      cellBackground: null, // Falls back to --et-color-bg
      cellText: null, // Falls back to --et-color-text

      // Sticky/Fixed column colors
      fixedBackground: null, // Inherits from row
      fixedShadow: null, // Falls back to --et-shadow-fixed
      fixedBorderColor: null, // Falls back to --et-fixed-border-color
      fixedBorderWidth: null, // Falls back to --et-fixed-border-width

      // Interactive colors
      primary: null, // Falls back to --et-color-primary
      primaryHover: null, // Falls back to --et-color-primary-hover

      // Status colors
      success: null, // Falls back to --et-color-success
      warning: null, // Falls back to --et-color-warning
      error: null, // Falls back to --et-color-error
    }

    this._theme = { ...this._defaultTheme, ...theme }
    this._applyTheme()
  }

  /**
   * Apply theme to container
   * @private
   */
  _applyTheme() {
    const style = this._container.style

    // Row colors
    if (this._theme.rowEven) {
      style.setProperty("--et-color-bg-alt", this._theme.rowEven)
    }
    if (this._theme.rowOdd) {
      style.setProperty("--et-color-bg", this._theme.rowOdd)
    }
    if (this._theme.rowHover) {
      style.setProperty("--et-color-bg-hover", this._theme.rowHover)
    }
    if (this._theme.rowSelected) {
      style.setProperty("--et-color-bg-selected", this._theme.rowSelected)
    }

    // Border colors
    if (this._theme.borderLight) {
      style.setProperty("--et-color-border", this._theme.borderLight)
    }
    if (this._theme.borderStrong) {
      style.setProperty("--et-color-border-strong", this._theme.borderStrong)
    }

    // Header colors
    if (this._theme.headerBackground) {
      style.setProperty("--et-color-header-bg", this._theme.headerBackground)
    }
    if (this._theme.headerText) {
      style.setProperty("--et-color-header-text", this._theme.headerText)
    }

    // Cell colors
    if (this._theme.cellBackground) {
      style.setProperty("--et-color-cell-bg", this._theme.cellBackground)
    }
    if (this._theme.cellText) {
      style.setProperty("--et-color-text", this._theme.cellText)
    }

    // Fixed column
    if (this._theme.fixedShadow) {
      style.setProperty("--et-shadow-fixed", this._theme.fixedShadow)
    }
    if (this._theme.fixedBorderColor) {
      style.setProperty("--et-fixed-border-color", this._theme.fixedBorderColor)
    }
    if (this._theme.fixedBorderWidth) {
      style.setProperty("--et-fixed-border-width", this._theme.fixedBorderWidth)
    }

    // Interactive colors
    if (this._theme.primary) {
      style.setProperty("--et-color-primary", this._theme.primary)
    }
    if (this._theme.primaryHover) {
      style.setProperty("--et-color-primary-hover", this._theme.primaryHover)
    }

    // Status colors
    if (this._theme.success) {
      style.setProperty("--et-color-success", this._theme.success)
    }
    if (this._theme.warning) {
      style.setProperty("--et-color-warning", this._theme.warning)
    }
    if (this._theme.error) {
      style.setProperty("--et-color-error", this._theme.error)
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
      style.removeProperty("--et-color-bg-alt")
      style.removeProperty("--et-color-bg")
      style.removeProperty("--et-color-bg-hover")
      style.removeProperty("--et-color-bg-selected")
      style.removeProperty("--et-color-border")
      style.removeProperty("--et-color-border-strong")
      style.removeProperty("--et-color-header-bg")
      style.removeProperty("--et-color-header-text")
      style.removeProperty("--et-color-cell-bg")
      style.removeProperty("--et-color-text")
      style.removeProperty("--et-shadow-fixed")
      style.removeProperty("--et-fixed-border-color")
      style.removeProperty("--et-fixed-border-width")
      style.removeProperty("--et-color-primary")
      style.removeProperty("--et-color-primary-hover")
      style.removeProperty("--et-color-success")
      style.removeProperty("--et-color-warning")
      style.removeProperty("--et-color-error")
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
