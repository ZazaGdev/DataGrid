# EditableTable - Quick Reference

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

| Method               | Description     |
| -------------------- | --------------- |
| `render()`           | Force re-render |
| `scrollToRow(rowId)` | Scroll to row   |
| `destroy()`          | Cleanup         |

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
  _type: "subrow"
} // Informational sub-row
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
  --et-color-primary: #3b82f6;
  --et-color-bg: #ffffff;
  --et-color-border: #e5e7eb;
  --et-color-text: #111827;
  --et-cell-padding-x: 0.75rem;
  --et-row-height: 2.5rem;
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
<div class="et-theme-dark"></div>
<!-- Dark theme -->
<div class="et-compact"></div>
<!-- Compact spacing -->
<div class="et-comfortable"></div>
<!-- Larger spacing -->
```

## Events List

| Event                   | Data                                      |
| ----------------------- | ----------------------------------------- |
| `state:change`          | `{property, value}`                       |
| `data:change`           | `{data, source}`                          |
| `row:click`             | `{rowId, row, event}`                     |
| `row:change`            | `{rowId, columnName, row}`                |
| `cell:change`           | `{rowId, columnName, oldValue, newValue}` |
| `group:toggle`          | `{groupId, collapsed}`                    |
| `mode:change`           | `{oldMode, newMode}`                      |
| `lifecycle:afterRender` | `{rowCount, columnCount}`                 |

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
│   ├── ColumnManager.js
│   ├── RowManager.js
│   ├── GroupManager.js
│   ├── EditManager.js
│   ├── ScrollManager.js
│   └── ExportManager.js
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
    └── _subrows.scss
```
