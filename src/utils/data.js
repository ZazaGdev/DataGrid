/**
 * Data Utilities - Functions for data transformation and manipulation
 */

import { sum, average, min, max, toNumber, groupBy } from './helpers.js';

/**
 * Aggregate functions registry
 */
export const AggregateTypes = {
  SUM: 'sum',
  AVG: 'average',
  MIN: 'min',
  MAX: 'max',
  COUNT: 'count',
  FIRST: 'first',
  LAST: 'last'
};

/**
 * Built-in aggregate functions
 */
export const aggregates = {
  [AggregateTypes.SUM]: (values) => sum(values),
  [AggregateTypes.AVG]: (values) => average(values),
  [AggregateTypes.MIN]: (values) => min(values),
  [AggregateTypes.MAX]: (values) => max(values),
  [AggregateTypes.COUNT]: (values) => values.length,
  [AggregateTypes.FIRST]: (values) => values[0],
  [AggregateTypes.LAST]: (values) => values[values.length - 1]
};

/**
 * Get aggregate function by type
 * @param {string|Function} type - Aggregate type or custom function
 * @returns {Function}
 */
export function getAggregateFunction(type) {
  if (typeof type === 'function') {
    return type;
  }
  return aggregates[type] || aggregates[AggregateTypes.SUM];
}

/**
 * Calculate group totals for all groups
 * @param {Object} groupedData - Grouped data object
 * @param {Array<Object>} columns - Column definitions
 * @returns {Object} - Groups with totals
 */
export function calculateGroupTotals(groupedData, columns) {
  const result = {};
  
  Object.entries(groupedData).forEach(([groupKey, rows]) => {
    const totals = {};
    
    columns.forEach(column => {
      if (column.aggregate) {
        const values = rows.map(row => row[column.data]).filter(v => v !== null && v !== undefined);
        const aggregateFn = getAggregateFunction(column.aggregate);
        totals[column.data] = aggregateFn(values, rows);
      }
    });
    
    result[groupKey] = {
      rows,
      totals,
      count: rows.length
    };
  });
  
  return result;
}

/**
 * Calculate grand totals for all data
 * @param {Array<Object>} data - All data rows
 * @param {Array<Object>} columns - Column definitions
 * @returns {Object} - Grand totals object
 */
export function calculateGrandTotals(data, columns) {
  const totals = {};
  
  columns.forEach(column => {
    if (column.aggregate) {
      const values = data
        .filter(row => row._type === 'data')
        .map(row => row[column.data])
        .filter(v => v !== null && v !== undefined);
      
      const aggregateFn = getAggregateFunction(column.aggregate);
      totals[column.data] = aggregateFn(values, data);
    }
  });
  
  return totals;
}

/**
 * Calculate cumulative values for a column
 * @param {Array<Object>} data - Data rows
 * @param {string} columnName - Column to calculate cumulative for
 * @param {string} [targetColumn] - Column to store result (defaults to columnName_cumulative)
 * @returns {Array<Object>} - Data with cumulative values
 */
export function calculateCumulative(data, columnName, targetColumn = null) {
  const target = targetColumn || `${columnName}_cumulative`;
  let cumulative = 0;
  
  return data.map(row => {
    if (row._type !== 'data') {
      return { ...row, [target]: null };
    }
    
    cumulative += toNumber(row[columnName]);
    return { ...row, [target]: cumulative };
  });
}

/**
 * Calculate percentage of total for each row
 * @param {Array<Object>} data - Data rows
 * @param {string} columnName - Column to calculate percentage for
 * @param {string} [targetColumn] - Column to store result
 * @returns {Array<Object>} - Data with percentage values
 */
export function calculatePercentage(data, columnName, targetColumn = null) {
  const target = targetColumn || `${columnName}_percentage`;
  const total = sum(data.filter(r => r._type === 'data').map(r => toNumber(r[columnName])));
  
  return data.map(row => {
    if (row._type !== 'data' || total === 0) {
      return { ...row, [target]: null };
    }
    
    const value = toNumber(row[columnName]);
    return { ...row, [target]: (value / total) * 100 };
  });
}

/**
 * Filter data by criteria
 * @param {Array<Object>} data - Data to filter
 * @param {Object|Function} criteria - Filter criteria or function
 * @returns {Array<Object>}
 */
export function filterData(data, criteria) {
  if (typeof criteria === 'function') {
    return data.filter(criteria);
  }
  
  return data.filter(row => {
    return Object.entries(criteria).every(([key, value]) => {
      if (value === null || value === undefined) return true;
      
      if (typeof value === 'object' && value !== null) {
        // Handle comparison operators
        if ('$gt' in value) return row[key] > value.$gt;
        if ('$gte' in value) return row[key] >= value.$gte;
        if ('$lt' in value) return row[key] < value.$lt;
        if ('$lte' in value) return row[key] <= value.$lte;
        if ('$ne' in value) return row[key] !== value.$ne;
        if ('$in' in value) return value.$in.includes(row[key]);
        if ('$nin' in value) return !value.$nin.includes(row[key]);
        if ('$contains' in value) return String(row[key]).toLowerCase().includes(value.$contains.toLowerCase());
      }
      
      return row[key] === value;
    });
  });
}

/**
 * Flatten nested data structure
 * @param {Array<Object>} data - Data with potential children
 * @param {string} [childrenKey='children'] - Key containing child rows
 * @returns {Array<Object>} - Flat array
 */
export function flattenData(data, childrenKey = 'children') {
  const result = [];
  
  const flatten = (rows, level = 0, parentId = null) => {
    rows.forEach(row => {
      const { [childrenKey]: children, ...rowData } = row;
      
      result.push({
        ...rowData,
        _level: level,
        _parentId: parentId,
        _hasChildren: children && children.length > 0
      });
      
      if (children && children.length > 0) {
        flatten(children, level + 1, row._id || row.id);
      }
    });
  };
  
  flatten(data);
  return result;
}

/**
 * Build tree structure from flat data
 * @param {Array<Object>} data - Flat data array
 * @param {string} [parentKey='parentId'] - Parent ID key
 * @returns {Array<Object>} - Tree structure
 */
export function buildTree(data, parentKey = 'parentId') {
  const map = new Map();
  const roots = [];
  
  // Create map of all items
  data.forEach(item => {
    map.set(item._id || item.id, { ...item, children: [] });
  });
  
  // Build tree
  data.forEach(item => {
    const node = map.get(item._id || item.id);
    const parentId = item[parentKey];
    
    if (parentId && map.has(parentId)) {
      map.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
}

/**
 * Transform data for export
 * @param {Array<Object>} data - Data to transform
 * @param {Array<Object>} columns - Column definitions
 * @param {Object} [options] - Transform options
 * @returns {Array<Object>} - Transformed data
 */
export function transformForExport(data, columns, options = {}) {
  const {
    includeHidden = false,
    formatValues = true,
    excludeTypes = ['subrow']
  } = options;
  
  const visibleColumns = columns.filter(col => includeHidden || col.visible !== false);
  
  return data
    .filter(row => !excludeTypes.includes(row._type))
    .map(row => {
      const transformed = {};
      
      visibleColumns.forEach(column => {
        let value = row[column.data];
        
        if (formatValues && column.format) {
          value = column.format(value, row, column);
        } else if (formatValues && column.type === 'number' && column.decimals !== undefined) {
          value = toNumber(value).toFixed(column.decimals);
        }
        
        transformed[column.title || column.data] = value;
      });
      
      return transformed;
    });
}

/**
 * Validate data against column definitions
 * @param {Array<Object>} data - Data to validate
 * @param {Array<Object>} columns - Column definitions
 * @returns {{valid: boolean, errors: Array<Object>}}
 */
export function validateData(data, columns) {
  const errors = [];
  
  data.forEach((row, rowIndex) => {
    columns.forEach(column => {
      if (column.required && (row[column.data] === null || row[column.data] === undefined || row[column.data] === '')) {
        errors.push({
          rowIndex,
          rowId: row._id,
          column: column.data,
          type: 'required',
          message: `${column.title || column.data} is required`
        });
      }
      
      if (column.validator && row[column.data] !== null && row[column.data] !== undefined) {
        const validationResult = column.validator(row[column.data], row, column);
        if (validationResult !== true) {
          errors.push({
            rowIndex,
            rowId: row._id,
            column: column.data,
            type: 'validation',
            message: validationResult || `Invalid value for ${column.title || column.data}`
          });
        }
      }
      
      if (column.type === 'number' && row[column.data] !== null && row[column.data] !== undefined) {
        const numValue = toNumber(row[column.data], NaN);
        if (isNaN(numValue)) {
          errors.push({
            rowIndex,
            rowId: row._id,
            column: column.data,
            type: 'type',
            message: `${column.title || column.data} must be a number`
          });
        } else {
          if (column.min !== undefined && numValue < column.min) {
            errors.push({
              rowIndex,
              rowId: row._id,
              column: column.data,
              type: 'range',
              message: `${column.title || column.data} must be at least ${column.min}`
            });
          }
          if (column.max !== undefined && numValue > column.max) {
            errors.push({
              rowIndex,
              rowId: row._id,
              column: column.data,
              type: 'range',
              message: `${column.title || column.data} must be at most ${column.max}`
            });
          }
        }
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
