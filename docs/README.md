# EditableTable - Developer Documentation

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
cp -r editable-table /your-project/lib/

# Install SCSS compiler if needed
npm install sass --save-dev
```

### Basic Usage

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="path/to/editable-table.css" />
  </head>
  <body>
    <div id="my-table"></div>

    <script type="module">
      import Table from "./editable-table/src/index.js"

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
| `ScrollManager` | `modules/ScrollManager.js` | Scroll & fixed columns |
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
table.scrollToRow(rowId) // Scroll to row
table.on(eventName, callback) // Subscribe to events
table.off(eventName, callback) // Unsubscribe
table.destroy() // Cleanup
```

---

## Events

### Available Events

```javascript
import { TableEvents } from "./editable-table/src/core/EventBus.js"

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
| `BEFORE_RENDER` | `{}`                                        | Before render          |
| `RENDER`        | `{}`                                        | During render          |
| `AFTER_RENDER`  | `{ rowCount, columnCount }`                 | After render           |

---

## Styling & Theming

### CSS Custom Properties

Override these variables to customize the theme:

```css
:root {
  /* Colors */
  --et-color-primary: #3b82f6;
  --et-color-bg: #ffffff;
  --et-color-bg-alt: #f9fafb;
  --et-color-border: #e5e7eb;
  --et-color-text: #111827;

  /* Spacing */
  --et-cell-padding-x: 0.75rem;
  --et-cell-padding-y: 0.5rem;
  --et-row-height: 2.5rem;

  /* Typography */
  --et-font-family: -apple-system, sans-serif;
  --et-font-size-base: 0.875rem;
}
```

### Theme Classes

```html
<!-- Dark theme -->
<div id="table" class="et-theme-dark"></div>

<!-- Compact mode -->
<div id="table" class="et-compact"></div>

<!-- Comfortable mode -->
<div id="table" class="et-comfortable"></div>
```

### Custom Cell Styling

```javascript
{
  data: 'status',
  render: (value, row) => {
    const color = value === 'active' ? 'success' : 'error';
    return `<span class="et-text-${color}">${value}</span>`;
  }
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
  container: "#budget-table",
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
editable-table/
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
│   │   ├── ScrollManager.js  # Scroll handling
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
