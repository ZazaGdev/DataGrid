# DataGrid - Developer Documentation

A modular, high-performance inline editing table library built with Vanilla JS and SCSS.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Configuration](#configuration)
4. [Column Configuration](#column-configuration)
5. [Data Structure](#data-structure)
6. [Features](#features)
7. [API Reference](#api-reference)
8. [Events](#events)
9. [Styling & Theming](#styling--theming)
10. [Performance Considerations](#performance-considerations)
11. [Examples](#examples)

---

## Quick Start

### Installation

```bash
# Clone or copy the library
cp -r datagrid /your-project/lib/

# Install SCSS compiler if needed
npm install sass --save-dev
```

### Basic Usage

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="path/to/datagrid.css" />
  </head>
  <body>
    <div id="my-table"></div>

    <script type="module">
      import Table from "./datagrid/src/index.js"

      const table = new Table({
        container: "#my-table",
        columns: [
          { data: "name", title: "Name" },
          { data: "amount", title: "Amount", type: "number" },
        ],
        data: [
          { name: "Item 1", amount: 100 },
          { name: "Item 2", amount: 200 },
        ],
      })
    </script>
  </body>
</html>
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Table                            │
│  (Main orchestrator - public API)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  EventBus   │  │ TableState  │  │  Renderer   │     │
│  │  (pub/sub)  │  │  (data)     │  │  (DOM)      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                      Modules                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Row     │ │  Group   │ │  Edit    │ │  Scroll  │  │
│  │ Manager  │ │ Manager  │ │ Manager  │ │ Manager  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐                             │
│  │ Export   │ │  Theme   │                             │
│  │ Manager  │ │ Manager  │                             │
│  └──────────┘ └──────────┘                             │
└─────────────────────────────────────────────────────────┘
```

### Core Components

| Component       | File                    | Purpose                       |
| --------------- | ----------------------- | ----------------------------- |
| `Table`         | `core/Table.js`         | Main entry point, public API  |
| `EventBus`      | `core/EventBus.js`      | Decoupled event communication |
| `TableState`    | `core/TableState.js`    | Centralized state management  |
| `TableRenderer` | `core/TableRenderer.js` | DOM rendering                 |

### Modules

| Module | File | Purpose |
|--------|------|---------||
| `RowManager` | `modules/RowManager.js` | Row CRUD operations |
| `GroupManager` | `modules/GroupManager.js` | Row grouping |
| `EditManager` | `modules/EditManager.js` | Edit mode & navigation |
| `ExportManager` | `modules/ExportManager.js` | CSV/Excel export |
| `ThemeManager` | `modules/ThemeManager.js` | Runtime theming |

---

## Configuration

### Full Configuration Object

```javascript
const table = new Table({
  // Required
  container: '#table-container',  // Element or selector
  columns: [...],                 // Column definitions

  // Optional - Data
  data: [],                       // Initial data

  // Optional - Features
  fixedFirstColumn: false,        // Sticky first column
  enableGrouping: false,          // Enable row grouping
  groupBy: 'category',            // Column name or function
  enableInfoRows: false,          // Enable info rows

  // Optional - Row Actions
  actions: [],                    // Row action buttons (see Row Actions section)

  // Optional - Mode
  mode: 'view',                   // 'view' | 'edit'

  // Optional - Callbacks
  onRowClick: (data) => {},       // Row click handler
  onRender: (info) => {},         // After render callback
  onChange: (data) => {},         // Table data change
  onRowChange: (data) => {}       // Individual row change
});
```

---

## Column Configuration

### Column Definition Object

```javascript
{
  // Identification
  data: 'fieldName',           // Data field name (required)
  title: 'Display Title',      // Header title
  id: 'unique_id',             // Optional unique ID

  // Display
  width: 150,                  // Width in px or string ('20%')
  visible: true,               // Column visibility
  align: 'left',               // 'left' | 'center' | 'right'

  // Data Type
  type: 'text',                // 'text'|'number'|'currency'|'date'|'select'

  // Number specific
  decimals: 2,                 // Decimal places
  min: 0,                      // Minimum value
  max: 100,                    // Maximum value
  step: 1,                     // Step increment
  currency: 'USD',             // Currency code

  // Editing
  editable: true,              // Allow editing
  inputType: 'text',           // Input type override
  options: [],                 // For select type

  // Formatting
  format: (value, row, col) => string,     // Display formatter
  exportFormat: (value, row, col) => any,  // Export formatter
  render: (value, row, col) => html|elem,  // Custom renderer
  defaultValue: '',            // Default for null/undefined

  // Aggregation
  aggregate: 'sum',            // 'sum'|'avg'|'min'|'max'|'count' or function
  affectsColumns: ['total'],   // Columns affected by changes

  // Cascade Updates
  cascade: ({ rowId, columnName, value, state, updateCell }) => {
    // Trigger updates to other cells
  },

  // Validation
  required: false,             // Required field
  validator: (value, row, col) => true|string, // Validation function

  // Events
  onChange: ({ value, rowId, row, column }) => {} // Cell change callback
}
```

### Column Examples

```javascript
const columns = [
  // Basic text column
  {
    data: "name",
    title: "Product Name",
    width: 200,
  },

  // Number with formatting
  {
    data: "price",
    title: "Price",
    type: "number",
    decimals: 2,
    align: "right",
    format: (val) => `$${val.toFixed(2)}`,
  },

  // Select dropdown
  {
    data: "status",
    title: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },

  // Computed column with cascade
  {
    data: "total",
    title: "Total",
    type: "number",
    editable: false,
    aggregate: "sum",
  },

  // Custom render
  {
    data: "progress",
    title: "Progress",
    render: (val) => `
      <div class="progress-bar">
        <div style="width: ${val}%"></div>
      </div>
    `,
  },

  // With validation
  {
    data: "email",
    title: "Email",
    required: true,
    validator: (val) => {
      if (!val.includes("@")) return "Invalid email"
      return true
    },
  },
]
```

---

## Data Structure

### Row Types

```javascript
// Standard data row
{
  _id: 'auto_generated',   // Internal ID (auto-generated if not provided)
  _type: 'data',           // Row type
  _index: 0,               // Row index
  name: 'Item 1',          // Your data fields
  amount: 100
}

// Info row (informational)
{
  _type: 'infoRow',
  _parentId: 'parent_row_id',
  label: 'Sep 2025',
  value: 50
}

// Group header (auto-generated)
{
  _type: 'group-header',
  _groupId: 'category_a'
}

// Totals row (auto-generated)
{
  _type: 'total',
  _groupId: 'category_a'
}
```

### Data with Info Rows Example

```javascript
const data = [
  { id: 1, name: "Annual Budget", amount: 12000 },
  { _type: "infoRow", label: "Q1 2025", amount: 3000 },
  { _type: "infoRow", label: "Q2 2025", amount: 3000 },
  { _type: "infoRow", label: "Q3 2025", amount: 3000 },
  { _type: "infoRow", label: "Q4 2025", amount: 3000 },
  { id: 2, name: "Marketing", amount: 5000 },
]
```

---

## Features

### 1. Fixed First Column

```javascript
const table = new Table({
  container: '#table',
  fixedFirstColumn: true,
  columns: [
    { data: 'name', title: 'Name', width: 200 }, // This will be fixed
    { data: 'jan', title: 'Jan' },
    { data: 'feb', title: 'Feb' },
    // ... more scrollable columns
  ],
  data: [...]
});
```

### 2. Row Grouping

```javascript
const table = new Table({
  container: "#table",
  enableGrouping: true,
  groupBy: "category", // Column name
  columns: [
    { data: "name", title: "Name" },
    { data: "category", title: "Category" },
    { data: "amount", title: "Amount", aggregate: "sum" },
  ],
  data: [
    { name: "Item 1", category: "Electronics", amount: 100 },
    { name: "Item 2", category: "Electronics", amount: 200 },
    { name: "Item 3", category: "Furniture", amount: 300 },
  ],
})

// Toggle group
table.toggleGroup("Electronics")

// Expand/collapse all
table.expandAllGroups()
table.collapseAllGroups()
```

### 3. View/Edit Mode

```javascript
// Switch modes
table.setMode("edit")
table.setMode("view")
table.toggleMode()

// Check mode
const isEdit = table.getMode() === "edit"
```

### 4. Callbacks

```javascript
const table = new Table({
  // ...
  onRowClick: ({ rowId, row, event }) => {
    console.log("Row clicked:", row)
  },

  onRender: ({ rowCount, columnCount }) => {
    console.log("Table rendered")
  },

  onChange: ({ data, source, updatedRows }) => {
    console.log("Table data changed")
  },

  onRowChange: ({ rowId, columnName, row, dirtyColumns }) => {
    console.log(`Row ${rowId} changed:`, row)
    console.log("Column:", columnName)
  },
})
```

### 5. Export

```javascript
// Export to CSV
const csvString = table.exportCSV()

// Export with options
const csvString = table.exportCSV({
  delimiter: ",",
  includeHeaders: true,
  includeHidden: false,
  filter: (row) => row.status === "active",
})

// Download files
table.download("csv", "my-table")
table.download("excel", "my-table")
```

### 6. Row Actions

Add interactive action buttons (icons) to each row. Actions appear in the first column and trigger callbacks when clicked.

```javascript
const table = new Table({
  container: "#table",
  columns: [...],
  data: [...],
  actions: [
    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
      </svg>`,
      tooltip: "View Details",
      onClick: (row) => {
        console.log("View row:", row)
      }
    },
    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      tooltip: "Delete Row",
      onClick: (row) => {
        if (confirm(`Delete "${row.name}"?`)) {
          table.deleteRow(row._id)
        }
      }
    }
  ]
})
```

#### Action Configuration

| Property  | Type       | Description                              |
| --------- | ---------- | ---------------------------------------- |
| `icon`    | `string`   | HTML string for the icon (SVG recommended) |
| `tooltip` | `string`   | Hover tooltip text                       |
| `onClick` | `function` | Callback function, receives row data     |

#### Action Events

```javascript
// Listen to action clicks via events
table.on(Table.Events.ACTION_CLICK, ({ actionIndex, action, rowId, row, event }) => {
  console.log(`Action ${actionIndex} clicked on row ${rowId}`)
})
```

#### Disable Actions for Specific Columns

You can disable actions for specific columns:

```javascript
const columns = [
  {
    data: "name",
    title: "Name",
    actions: false  // No action icons in this column
  }
]
```

#### Styling Actions

Actions are styled with CSS classes:

- `.dg-row-actions` - Container for all action icons
- `.dg-row-action` - Individual action icon
- `.dg-cell-has-actions` - Cell containing actions

```css
/* Custom action icon sizing */
.dg-row-action svg {
  width: 16px;
  height: 16px;
}

/* Custom action hover color */
.dg-row-action:hover {
  color: #2563eb;
  background-color: #eff6ff;
}
```

---

## API Reference

### Table Instance Methods

#### Data Methods

```javascript
// Get/Set data
table.getData() // Get all data
table.setData(newData) // Replace all data
table.getRow(rowId) // Get single row

// Update cells
table.updateCell(rowId, columnName, value)
table.batchUpdate([
  { rowId: "1", columnName: "amount", value: 100 },
  { rowId: "2", columnName: "amount", value: 200 },
])

// Row operations
table.addRow({ name: "New", amount: 0 })
table.addRow(data, { afterRowId: "row_1" })
table.deleteRow(rowId)

// Dirty state
table.getDirtyRows() // Get modified rows
table.clearDirty() // Mark as saved
table.revertChanges() // Undo all changes
```

#### Column Methods

```javascript
table.getColumns()
table.setColumns(newColumns)
table.setColumnVisibility("colId", false)
```

#### Mode Methods

```javascript
table.getMode()
table.setMode("edit")
table.toggleMode()
```

#### Group Methods

```javascript
table.toggleGroup(groupId)
table.expandAllGroups()
table.collapseAllGroups()
```

#### Export Methods

```javascript
table.exportCSV(options)
table.exportExcel(options)
table.download("csv", "filename")
```

#### Utility Methods

```javascript
table.render() // Force re-render
table.on(eventName, callback) // Subscribe to events
table.off(eventName, callback) // Unsubscribe
table.destroy() // Cleanup
```

---

## Events

### Available Events

```javascript
import { TableEvents } from "./datagrid/src/core/EventBus.js"

// Subscribe to events
table.on(
  TableEvents.CELL_CHANGE,
  ({ rowId, columnName, oldValue, newValue, row }) => {
    console.log("Cell changed")
  }
)

table.on(TableEvents.ROW_CHANGE, ({ rowId, columnName, row, dirtyColumns }) => {
  console.log("Row changed")
})

table.on(TableEvents.ROW_CLICK, ({ rowId, row, event }) => {
  console.log("Row clicked")
})

table.on(TableEvents.GROUP_TOGGLE, ({ groupId, collapsed }) => {
  console.log("Group toggled")
})

table.on(TableEvents.MODE_CHANGE, ({ oldMode, newMode }) => {
  console.log("Mode changed")
})

table.on(TableEvents.AFTER_RENDER, ({ rowCount, columnCount }) => {
  console.log("Render complete")
})
```

### Event Types

| Event           | Data                                        | Description            |
| --------------- | ------------------------------------------- | ---------------------- |
| `STATE_CHANGE`  | `{ property, value }`                       | State property changed |
| `DATA_CHANGE`   | `{ data, source }`                          | Data array changed     |
| `ROW_CLICK`     | `{ rowId, row, event }`                     | Row clicked            |
| `ROW_CHANGE`    | `{ rowId, columnName, row }`                | Row data changed       |
| `ROW_ADD`       | `{ row, index }`                            | Row added              |
| `ROW_DELETE`    | `{ rowId, row }`                            | Row deleted            |
| `CELL_CHANGE`   | `{ rowId, columnName, oldValue, newValue }` | Cell changed           |
| `CELL_FOCUS`    | `{ rowId, columnName }`                     | Cell focused           |
| `CELL_BLUR`     | `{ rowId, columnName }`                     | Cell blurred           |
| `GROUP_TOGGLE`  | `{ groupId, collapsed }`                    | Group toggled          |
| `MODE_CHANGE`   | `{ oldMode, newMode }`                      | Mode changed           |
| `ACTION_CLICK`  | `{ actionIndex, action, rowId, row, event }`| Row action clicked     |
| `BEFORE_RENDER` | `{}`                                        | Before render          |
| `RENDER`        | `{}`                                        | During render          |
| `AFTER_RENDER`  | `{ rowCount, columnCount }`                 | After render           |

---

## Styling & Theming

### Runtime Theme Configuration

You can customize the table appearance at initialization using the `theme` option:

```javascript
const table = new Table({
  container: '#table',
  columns: [...],
  data: [...],
  theme: {
    // Row colors
    rowEven: '#f9fafb',              // Even row background
    rowOdd: '#ffffff',               // Odd row background
    rowHover: '#f3f4f6',             // Row hover background
    rowSelected: '#eff6ff',          // Selected row background

    // Border colors
    borderLight: '#e5e7eb',          // Light borders
    borderStrong: '#d1d5db',         // Strong borders (headers, groups)

    // Header colors
    headerBackground: '#f9fafb',     // Header row background
    headerText: '#111827',           // Header text color

    // Cell colors
    cellBackground: '#ffffff',       // Cell background
    cellText: '#111827',             // Cell text color

    // Fixed/Sticky column
    fixedShadow: '4px 0 8px -2px rgb(0 0 0 / 0.1)',  // Fixed column shadow
    fixedBorderColor: '#d1d5db',     // Fixed column border color
    fixedBorderWidth: '2px',         // Fixed column border width

    // Interactive colors
    primary: '#3b82f6',              // Primary accent color
    primaryHover: '#2563eb',         // Primary hover state

    // Status colors
    success: '#10b981',              // Success/positive color
    warning: '#f59e0b',              // Warning color
    error: '#ef4444',                // Error/negative color

    // Row totals column
    rowTotalBackground: '#f8fafc',       // Row total background
    rowTotalBackgroundAlt: '#f1f5f9',    // Row total alt background
    rowTotalText: '#475569',             // Row total text color
    rowTotalHeaderBackground: '#e2e8f0', // Row total header background
    rowTotalBorderColor: '#cbd5e1',      // Row total border color

    // Ungrouped rows (rows without a group)
    ungroupedRowBackground: '#ffffff',       // Ungrouped even row background
    ungroupedRowBackgroundAlt: '#f9fafb',    // Ungrouped odd row background
    ungroupedRowBackgroundHover: '#f3f4f6',  // Ungrouped row hover
    ungroupedRowText: '#111827',             // Ungrouped row text color
  }
});
```

### CSS Custom Properties

All styling is controlled via CSS custom properties. Override these in your stylesheet:

```css
:root {
  /* Colors - Primary */
  --dg-color-primary: #3b82f6;
  --dg-color-primary-hover: #2563eb;
  --dg-color-primary-light: #eff6ff;

  /* Colors - Status */
  --dg-color-success: #10b981;
  --dg-color-warning: #f59e0b;
  --dg-color-error: #ef4444;

  /* Colors - Background */
  --dg-color-bg: #ffffff;
  --dg-color-bg-alt: #f9fafb;
  --dg-color-bg-hover: #f3f4f6;
  --dg-color-bg-selected: #eff6ff;

  /* Colors - Border */
  --dg-color-border: #e5e7eb;
  --dg-color-border-strong: #d1d5db;

  /* Colors - Text */
  --dg-color-text: #111827;
  --dg-color-text-muted: #6b7280;
  --dg-color-text-light: #9ca3af;

  /* Typography */
  --dg-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    sans-serif;
  --dg-font-size-sm: 0.75rem;
  --dg-font-size-base: 0.875rem;
  --dg-font-size-lg: 1rem;
  --dg-font-weight-normal: 400;
  --dg-font-weight-medium: 500;
  --dg-font-weight-bold: 600;

  /* Spacing */
  --dg-spacing-xs: 0.25rem;
  --dg-spacing-sm: 0.5rem;
  --dg-spacing-md: 0.75rem;
  --dg-spacing-lg: 1rem;
  --dg-spacing-xl: 1.5rem;

  /* Sizing */
  --dg-cell-padding-x: 0.75rem;
  --dg-cell-padding-y: 0.5rem;
  --dg-cell-min-height: 2.5rem;
  --dg-header-height: 2.75rem;
  --dg-row-height: 2.5rem;

  /* Borders */
  --dg-border-radius: 0.375rem;
  --dg-border-width: 1px;

  /* Shadows */
  --dg-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --dg-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 /
          0.1);
  --dg-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 /
          0.1);
  --dg-shadow-fixed: 4px 0 8px -2px rgb(0 0 0 / 0.1);

  /* Fixed Column */
  --dg-fixed-border-color: var(--dg-color-border-strong);
  --dg-fixed-border-width: 2px;

  /* Row Totals Column */
  --dg-row-total-bg: #f8fafc;
  --dg-row-total-bg-alt: #f1f5f9;
  --dg-row-total-text: #475569;
  --dg-row-total-header-bg: #e2e8f0;
  --dg-row-total-border-color: #cbd5e1;

  /* Ungrouped Rows */
  --dg-ungrouped-row-bg: var(--dg-color-bg);
  --dg-ungrouped-row-bg-alt: var(--dg-color-bg-alt);
  --dg-ungrouped-row-bg-hover: var(--dg-color-bg-hover);
  --dg-ungrouped-row-text: var(--dg-color-text);

  /* Transitions */
  --dg-transition-fast: 150ms ease;
  --dg-transition-base: 200ms ease;
  --dg-transition-slow: 300ms ease;

  /* Z-index Layers */
  --dg-z-base: 1;
  --dg-z-fixed: 10;
  --dg-z-header: 20;
  --dg-z-fixed-header: 30;
  --dg-z-dropdown: 100;
}
```

### Theme Classes

```html
<!-- Dark theme -->
<div id="table" class="dg-theme-dark"></div>

<!-- Compact mode -->
<div id="table" class="dg-compact"></div>

<!-- Comfortable mode -->
<div id="table" class="dg-comfortable"></div>
```

### Updating Theme at Runtime

```javascript
// Update specific theme properties
table.updateTheme({
  primary: "#8b5cf6",
  rowHover: "#f5f3ff",
})

// Reset to default theme
table.resetTheme()

// Get current theme
const currentTheme = table.getTheme()
```

### Custom Cell Styling

```javascript
{
  data: 'status',
  render: (value, row) => {
    const color = value === 'active' ? 'success' : 'error';
    return `<span class="dg-text-${color}">${value}</span>`;
  }
}
```

### Utility Classes

```css
/* Text alignment */
.dg-text-left {
  text-align: left;
}
.dg-text-center {
  text-align: center;
}
.dg-text-right {
  text-align: right;
}

/* Font weight */
.dg-font-normal {
  font-weight: 400;
}
.dg-font-medium {
  font-weight: 500;
}
.dg-font-bold {
  font-weight: 600;
}

/* Text colors */
.dg-text-muted {
  color: var(--dg-color-text-muted);
}
.dg-text-success {
  color: var(--dg-color-success);
}
.dg-text-warning {
  color: var(--dg-color-warning);
}
.dg-text-error {
  color: var(--dg-color-error);
}

/* Background colors */
.dg-bg-success {
  background-color: #d1fae5;
}
.dg-bg-warning {
  background-color: #fef3c7;
}
.dg-bg-error {
  background-color: #fee2e2;
}
```

---

## Performance Considerations

### Efficient Updates

```javascript
// ❌ Avoid: Multiple individual updates
data.forEach((item) => {
  table.updateCell(item.id, "amount", item.newAmount)
})

// ✅ Better: Batch updates
table.batchUpdate(
  data.map((item) => ({
    rowId: item.id,
    columnName: "amount",
    value: item.newAmount,
  }))
)
```

### Cascade Updates

For computed columns that depend on others, use the `cascade` function:

```javascript
{
  data: 'quantity',
  cascade: ({ rowId, value, state, updateCell }) => {
    const row = state.getRow(rowId);
    const price = row.price || 0;
    updateCell(rowId, 'total', value * price);
  }
}
```

### Event Batching

The EventBus automatically batches events during bulk operations:

```javascript
// Internal batching prevents excessive re-renders
eventBus.startBatch()
// ... many updates
eventBus.endBatch() // Single consolidated update
```

---

## Examples

### Budget Table with Grouping

```javascript
const budgetTable = new Table({
  container: "#budgdg-table",
  fixedFirstColumn: true,
  enableGrouping: true,
  groupBy: "department",
  mode: "view",
  columns: [
    { data: "item", title: "Budget Item", width: 250 },
    { data: "department", title: "Department", visible: false },
    { data: "jan", title: "Jan", type: "currency", aggregate: "sum" },
    { data: "feb", title: "Feb", type: "currency", aggregate: "sum" },
    { data: "mar", title: "Mar", type: "currency", aggregate: "sum" },
    {
      data: "q1Total",
      title: "Q1 Total",
      type: "currency",
      editable: false,
      aggregate: "sum",
    },
  ],
  data: budgetData,
  onRowChange: ({ row, columnName }) => {
    if (["jan", "feb", "mar"].includes(columnName)) {
      // Recalculate Q1 total
      const q1Total = (row.jan || 0) + (row.feb || 0) + (row.mar || 0)
      budgetTable.updateCell(row._id, "q1Total", q1Total)
    }
  },
})

// Add toolbar buttons
document.getElementById("edit-btn").onclick = () => budgetTable.toggleMode()
document.getElementById("export-btn").onclick = () =>
  budgetTable.download("excel", "budget")
```

### Data Entry Form Table

```javascript
const formTable = new Table({
  container: "#form-table",
  mode: "edit",
  columns: [
    { data: "field", title: "Field", editable: false },
    {
      data: "value",
      title: "Value",
      render: (val, row) => {
        // Custom rendering based on field type
        if (row.type === "date") {
          return `<input type="date" value="${val}">`
        }
        return val
      },
    },
    { data: "required", title: "Required", type: "checkbox" },
  ],
  onChange: (data) => {
    // Auto-save on change
    saveToServer(data)
  },
})
```

---

## File Structure

```
datagrid/
├── dist/
│   ├── datagrid.esm.js       # ES Module bundle
│   ├── datagrid.esm.min.js   # Minified ES Module
│   ├── datagrid.umd.js       # UMD bundle
│   ├── datagrid.umd.min.js   # Minified UMD
│   ├── datagrid.css          # Compiled CSS
│   └── datagrid.min.css      # Minified CSS
├── src/
│   ├── index.js              # Main entry
│   ├── core/
│   │   ├── Table.js          # Main orchestrator
│   │   ├── TableState.js     # State management
│   │   ├── TableRenderer.js  # DOM rendering
│   │   └── EventBus.js       # Event system
│   ├── modules/
│   │   ├── RowManager.js     # Row CRUD
│   │   ├── GroupManager.js   # Grouping
│   │   ├── EditManager.js    # Edit mode
│   │   ├── ExportManager.js  # Export
│   │   └── ThemeManager.js   # Runtime theming
│   ├── utils/
│   │   ├── dom.js            # DOM utilities
│   │   ├── helpers.js        # General helpers
│   │   └── data.js           # Data utilities
│   └── styles/
│       ├── main.scss         # Entry point
│       ├── _variables.scss   # CSS variables
│       ├── _table.scss       # Base styles
│       ├── _groups.scss      # Group styles
│       ├── _inputs.scss      # Edit mode styles
│       └── _inforows.scss    # Info row styles
├── docs/
│   └── README.md             # This file
└── examples/
    └── basic.html            # Example usage
```

---

## License

MIT License
