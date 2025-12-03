# DataGrid Examples

This directory contains comprehensive examples demonstrating all features and capabilities of the DataGrid library.

## 📋 Examples Overview

### [index.html](index.html)

**Main Examples Hub** - Start here! A beautiful landing page with links to all examples and quick start guide.

### [01-basic-usage.html](01-basic-usage.html)

**Basic Usage & Fundamentals**

- Creating a simple table
- View mode vs Edit mode
- Basic cell editing
- Data retrieval and state management
- Dirty state tracking
- Keyboard navigation (Tab, Shift+Tab)

**Features Demonstrated:**

- `new Table()` constructor
- `getMode()` / `setMode()` / `toggleMode()`
- `getData()` / `getDirtyRows()`
- `revertChanges()` / `clearDirty()`
- Event callbacks: `onRowClick`, `onChange`

---

### [02-grouping.html](02-grouping.html)

**Row Grouping & Aggregate Totals**

- Grouping rows by column values
- Automatic aggregate calculations (sum, average, count, min, max)
- Expand/collapse individual groups
- Expand/collapse all groups at once
- Grand totals across all groups

**Features Demonstrated:**

- `enableGrouping: true`
- `groupBy: 'columnName'`
- `expandAllGroups()` / `collapseAllGroups()`
- `toggleGroup(groupId)`
- Column aggregates: `aggregate: 'sum'`

---

### [03-crud-operations.html](03-crud-operations.html)

**Complete CRUD Operations**

- Adding new rows to the table
- Deleting single or multiple rows
- Updating individual cells
- Batch updates for performance
- Row selection and tracking
- Dirty state management

**Features Demonstrated:**

- `addRow(rowData, options)`
- `deleteRow(rowId)`
- `updateCell(rowId, columnName, value)`
- `batchUpdate(updates)`
- Row events: `ROW_ADD`, `ROW_DELETE`, `ROW_CHANGE`

---

### [04-advanced-features.html](04-advanced-features.html)

**Advanced Features**

- Fixed first column (stays visible during horizontal scroll)
- Info rows (expandable detail rows)
- Keyboard navigation (arrow keys)
  **Features Demonstrated:**

- `fixedFirstColumn: true`
- `enableInfoRows: true`
- `addRow(..., { type: 'infoRow' })`
- Arrow key navigation in edit mode

---

### [05-export.html](05-export.html)

**Data Export (CSV & Excel)**

- Export to CSV format
- Export to Excel format
- Column filtering (export specific columns only)
- Custom delimiters (comma, semicolon, etc.)
- Row filtering (export filtered data)
- File download functionality

**Features Demonstrated:**

- `exportCSV(options)`
- `exportExcel(options)`
- `download(format, filename)`
- Export options: `includeHeaders`, `columns`, `delimiter`, `filter`
- Events: `EXPORT_START`, `EXPORT_COMPLETE`

---

### [06-event-system.html](06-event-system.html)

**Comprehensive Event System**

- Real-time event logging
- All available event types
- Custom event handlers
- Event statistics tracking
- Subscribe and unsubscribe
- One-time event listeners

**Features Demonstrated:**

- `on(event, callback)` - Subscribe to events
- `off(event, callback)` - Unsubscribe
- `once(event, callback)` - One-time listener
- All event types: `CELL_CHANGE`, `ROW_CHANGE`, `DATA_CHANGE`, etc.
- Event data structures

**Available Events:**

- `STATE_CHANGE` - State property changed
- `DATA_CHANGE` - Table data modified
- `CELL_CHANGE` - Individual cell value changed
- `ROW_CLICK` - Row was clicked
- `ROW_CHANGE` - Row data changed
- `ROW_ADD` - New row added
- `ROW_DELETE` - Row deleted
- `MODE_CHANGE` - View/Edit mode switched
- `BEFORE_RENDER` - Before table renders
- `RENDER` - Table is rendering
- `AFTER_RENDER` - Table finished rendering
- `CELL_FOCUS` - Cell received focus
- `CELL_BLUR` - Cell lost focus
- `GROUP_TOGGLE` - Group expanded/collapsed
- `SCROLL` - Scroll position changed
- `EXPORT_START` - Export started
- `EXPORT_COMPLETE` - Export completed

---

### [07-column-management.html](07-column-management.html)

**Column Management & Formatting**

- Show/hide individual columns
- Show/hide all columns
- Get visible/hidden columns
- Custom number formatters (currency, percent)
- Date formatters
- Dynamic column configuration updates

**Features Demonstrated:**

- `setColumnVisibility(columnId, visible)`
- `getColumns()`
- `setColumns(columns)`
- Column formatters: `format: (value, row, col) => string`
- Export formatters: `exportFormat: (value, row, col) => any`
- Column types: `type: 'text' | 'number' | 'date'`

---

## 🚀 Quick Start

1. **Open the main hub:**

   ```
   Open examples/index.html in your browser
   ```

2. **Or open any example directly:**

   ```
   Open examples/01-basic-usage.html
   ```

3. **Or start a local server:**

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx http-server

   # Then visit http://localhost:8000/examples/
   ```

## 📖 Usage Patterns

### Creating a Basic Table

```javascript
import { Table } from "../src/index.js"

const table = new Table({
  container: "#tableContainer",
  columns: [
    { title: "Name", data: "name", width: "200px" },
    { title: "Email", data: "email", width: "250px" },
  ],
  data: [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
  ],
  mode: "view", // or 'edit'
})
```

### With Grouping and Aggregates

```javascript
const table = new Table({
  container: '#tableContainer',
  columns: [
    { title: 'Department', data: 'department' },
    {
      title: 'Sales',
      data: 'sales',
      type: 'number',
      aggregate: 'sum' // Also: 'average', 'min', 'max', 'count'
    }
  ],
  data: [...],
  enableGrouping: true,
  groupBy: 'department'
});
```

### With Custom Formatters

```javascript
const columns = [
  {
    title: "Price",
    data: "price",
    type: "number",
    format: (value) => `$${value.toFixed(2)}`,
    exportFormat: (value) => value, // Keep raw number for export
  },
  {
    title: "Date",
    data: "date",
    format: (value) => new Date(value).toLocaleDateString(),
  },
]
```

### Event Handling

```javascript
// Subscribe to events
const unsubscribe = table.on(Table.Events.CELL_CHANGE, (data) => {
  console.log("Cell changed:", data)
})

// One-time listener
table.once(Table.Events.DATA_CHANGE, (data) => {
  console.log("Data changed once:", data)
})

// Unsubscribe
unsubscribe()
```

## 🎯 Common Use Cases

### Real-time Data Dashboard

See: `01-basic-usage.html`, `06-event-system.html`

- Display live data
- Track changes in real-time
- Respond to user interactions

### Financial Reports with Grouping

See: `02-grouping.html`

- Group by department, category, etc.
- Show totals and subtotals
- Calculate aggregate metrics

### Data Entry Forms

See: `03-crud-operations.html`

- Add/edit/delete records
- Batch updates
- Track unsaved changes

### Product Catalogs

See: `04-advanced-features.html`, `07-column-management.html`

- Show/hide details
- Fixed product name column
- Custom price formatting

### Export Reports

See: `05-export.html`

- Export to CSV for spreadsheets
- Export to Excel
- Filter data before export

## 🔧 Configuration Options

### Table Configuration

```javascript
{
  container: string | HTMLElement,     // Required
  columns: Array<ColumnConfig>,        // Required
  data: Array<Object>,                 // Required
  mode: 'view' | 'edit',              // Default: 'view'
  fixedFirstColumn: boolean,           // Default: false
  enableGrouping: boolean,             // Default: false
  groupBy: string | Function,          // Required if enableGrouping
  enableInfoRows: boolean,             // Default: false
  onRowClick: Function,                // Optional callback
  onRender: Function,                  // Optional callback
  onChange: Function,                  // Optional callback
  onRowChange: Function                // Optional callback
}
```

### Column Configuration

```javascript
{
  title: string,                       // Column header text
  data: string,                        // Property name in data
  width: string,                       // CSS width (e.g., '150px')
  type: 'text' | 'number' | 'date',   // Data type
  editable: boolean,                   // Default: true
  visible: boolean,                    // Default: true
  format: Function,                    // Display formatter
  exportFormat: Function,              // Export formatter
  aggregate: 'sum' | 'average' | 'min' | 'max' | 'count', // For grouping
  compute: Function                    // Computed column
}
```

## 💡 Tips & Best Practices

1. **Performance**: Use batch updates for multiple cell changes
2. **Memory**: Call `destroy()` when removing a table
3. **Exports**: Use `exportFormat` to keep numbers as numbers in Excel
4. **Events**: Use `once()` for one-time setup operations
5. **Validation**: Validate data before calling `updateCell()` or `batchUpdate()`
6. **Formatters**: Keep formatters pure (no side effects)
7. **Aggregates**: Works best with numeric columns

## 🐛 Debugging

All examples expose the table instance globally:

```javascript
// In browser console
window.table.getData()
window.table.getMode()
window.table.getColumns()
```

Enable console logging to see events:

```javascript
table.on(Table.Events.CELL_CHANGE, console.log)
```

## 📚 Additional Resources

- **Documentation**: See `../docs/README.md`
- **Quick Reference**: See `../docs/QUICK-REFERENCE.md`
- **Source Code**: Browse `../src/` directory

## 🤝 Contributing

Found an issue or want to add an example? Contributions are welcome!

---

**Made with ❤️ for developers who need powerful data grids**
