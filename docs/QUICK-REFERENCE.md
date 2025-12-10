# DataGrid - Quick Reference

## Installation

```javascript
import Table from "./editable-table/src/index.js"
```

## Basic Usage

```javascript
const table = new Table({
  container: "#my-table",
  columns: [
    { data: "name", title: "Name" },
    { data: "amount", title: "Amount", type: "number", aggregate: "sum" },
  ],
  data: [{ name: "Item 1", amount: 100 }],

  // Options
  fixedFirstColumn: true,
  enableGrouping: true,
  groupBy: "category",
  mode: "view",

  // Callbacks
  onRowClick: ({ rowId, row }) => {},
  onRowChange: ({ rowId, columnName, row }) => {},
  onChange: ({ data }) => {},
  onRender: ({ rowCount }) => {},
})
```

## API Methods

### Data

| Method                                      | Description        |
| ------------------------------------------- | ------------------ |
| `getData()`                                 | Get all data       |
| `setData(data)`                             | Replace all data   |
| `getRow(rowId)`                             | Get single row     |
| `updateCell(rowId, col, val)`               | Update cell        |
| `batchUpdate([{rowId, columnName, value}])` | Batch update       |
| `addRow(data, options?)`                    | Add row            |
| `deleteRow(rowId)`                          | Delete row         |
| `getDirtyRows()`                            | Get modified rows  |
| `clearDirty()`                              | Clear dirty state  |
| `revertChanges()`                           | Revert to original |

### Theme

| Method               | Description            |
| -------------------- | ---------------------- |
| `updateTheme(theme)` | Update theme colors    |
| `resetTheme()`       | Reset to default theme |
| `getTheme()`         | Get current theme      |

### Mode

| Method          | Description      |
| --------------- | ---------------- | -------- |
| `getMode()`     | Get current mode |
| `setMode('view' | 'edit')`         | Set mode |
| `toggleMode()`  | Toggle mode      |

### Groups

| Method                 | Description  |
| ---------------------- | ------------ |
| `toggleGroup(groupId)` | Toggle group |
| `expandAllGroups()`    | Expand all   |
| `collapseAllGroups()`  | Collapse all |

### Export

| Method                  | Description         |
| ----------------------- | ------------------- | ------------- |
| `exportCSV(options?)`   | Get CSV string      |
| `exportExcel(options?)` | Get Excel data      |
| `download('csv'         | 'excel', filename)` | Download file |

### Events

| Method                 | Description |
| ---------------------- | ----------- |
| `on(event, callback)`  | Subscribe   |
| `off(event, callback)` | Unsubscribe |

### Utilities

| Method      | Description     |
| ----------- | --------------- |
| `render()`  | Force re-render |
| `destroy()` | Cleanup         |

## Column Config

```javascript
{
  data: 'fieldName',        // Required: data key
  title: 'Header',          // Header text
  type: 'number',           // text|number|currency|date|select
  width: 150,               // Width (px or %)
  editable: true,           // Allow editing
  visible: true,            // Show/hide
  align: 'right',           // left|center|right

  // Number options
  decimals: 2,
  min: 0,
  max: 100,

  // Select options
  options: [{value, label}],

  // Formatting
  format: (val, row) => string,
  render: (val, row) => html,

  // Aggregation
  aggregate: 'sum',         // sum|avg|min|max|count

  // Cascade updates
  cascade: ({rowId, value, state, updateCell}) => {},

  // Validation
  required: false,
  validator: (val) => true|'error msg',

  // Events
  onChange: ({value, rowId, row, column}) => {}
}
```

## Row Types

```javascript
{
  _type: "data"
} // Normal data row
{
  _type: "infoRow"
} // Informational info row
{
  _type: "group-header"
} // Auto-generated group header
{
  _type: "total"
} // Auto-generated totals
```

## CSS Theming

### Using CSS Variables (Global)

```css
:root {
  --dg-color-primary: #3b82f6;
  --dg-color-bg: #ffffff;
  --dg-color-border: #e5e7eb;
  --dg-color-text: #111827;
  --dg-cell-padding-x: 0.75rem;
  --dg-row-height: 2.5rem;
}
```

### Using JavaScript API (Per-Table)

```javascript
const table = new Table({
  container: '#my-table',
  columns: [...],
  data: [...],
  theme: {
    // Row colors
    rowEven: '#f9fafb',
    rowOdd: '#ffffff',
    rowHover: '#f3f4f6',
    rowSelected: '#eff6ff',

    // Border colors
    borderLight: '#e5e7eb',
    borderStrong: '#d1d5db',

    // Header colors
    headerBackground: '#f9fafb',
    headerText: '#111827',

    // Cell colors
    cellBackground: '#ffffff',
    cellText: '#111827',

    // Interactive colors
    primary: '#3b82f6',
    primaryHover: '#2563eb',

    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
});

// Update theme at runtime
table.updateTheme({
  rowEven: '#1f2937',
  rowOdd: '#111827',
  primary: '#60a5fa'
});

// Reset to defaults
table.resetTheme();
```

## Theme Classes

```html
<div class="dg-theme-dark"></div>
<!-- Dark theme -->
<div class="dg-compact"></div>
<!-- Compact spacing -->
<div class="dg-comfortable"></div>
<!-- Larger spacing -->
```

## Events List

| Event                   | Data                                       |
| ----------------------- | ------------------------------------------ |
| `state:change`          | `{property, value}`                        |
| `data:change`           | `{data, source}`                           |
| `row:click`             | `{rowId, row, event}`                      |
| `row:change`            | `{rowId, columnName, row}`                 |
| `cell:change`           | `{rowId, columnName, oldValue, newValue}`  |
| `group:toggle`          | `{groupId, collapsed}`                     |
| `mode:change`           | `{oldMode, newMode}`                       |
| `action:click`          | `{actionIndex, action, rowId, row, event}` |
| `lifecycle:afterRender` | `{rowCount, columnCount}`                  |

## Row Actions

Add action buttons to each row:

```javascript
const table = new Table({
  container: "#my-table",
  columns: [...],
  data: [...],
  actions: [
    {
      icon: `<svg>...</svg>`,  // HTML/SVG icon
      tooltip: "View",         // Hover text
      onClick: (row) => {      // Click handler
        console.log(row)
      }
    },
    {
      icon: `<svg>...</svg>`,
      tooltip: "Delete",
      onClick: (row) => {
        table.deleteRow(row._id)
      }
    }
  ]
})

// Listen via events
table.on(Table.Events.ACTION_CLICK, ({ rowId, row, actionIndex }) => {
  console.log("Action clicked:", actionIndex)
})
```

### Action CSS Classes

| Class                  | Description                |
| ---------------------- | -------------------------- |
| `.dg-row-actions`      | Container for action icons |
| `.dg-row-action`       | Individual action icon     |
| `.dg-cell-has-actions` | Cell containing actions    |

## File Structure

```
src/
├── index.js              # Entry point
├── core/
│   ├── Table.js          # Main class
│   ├── TableState.js     # State management
│   ├── TableRenderer.js  # DOM rendering
│   └── EventBus.js       # Events
├── modules/
│   ├── RowManager.js
│   ├── GroupManager.js
│   ├── EditManager.js
│   ├── ExportManager.js
│   └── ThemeManager.js
├── utils/
│   ├── dom.js
│   ├── helpers.js
│   └── data.js
└── styles/
    ├── main.scss
    ├── _variables.scss
    ├── _table.scss
    ├── _groups.scss
    ├── _inputs.scss
    └── _inforows.scss
```
