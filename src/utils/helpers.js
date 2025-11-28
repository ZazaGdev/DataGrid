/**
 * General Helpers - Utility functions for data manipulation
 */

/**
 * Generate a unique ID
 * @returns {string}
 */
export function generateId() {
  return `et_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object/array
 * @param {any} obj - Object to clone
 * @returns {any}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Set) {
    return new Set([...obj].map(item => deepClone(item)));
  }
  
  if (obj instanceof Map) {
    return new Map([...obj].map(([key, value]) => [deepClone(key), deepClone(value)]));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Deep equality check
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * Get nested property value using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Property path (e.g., 'a.b.c')
 * @param {any} [defaultValue] - Default value if not found
 * @returns {any}
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
}

/**
 * Set nested property value using dot notation
 * @param {Object} obj - Target object
 * @param {string} path - Property path
 * @param {any} value - Value to set
 */
export function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function}
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return String(str).replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @param {string} [separator=','] - Thousands separator
 * @returns {string}
 */
export function formatNumber(num, separator = ',') {
  if (num === null || num === undefined || isNaN(num)) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Parse a value to number safely
 * @param {any} value - Value to parse
 * @param {number} [defaultValue=0] - Default if parsing fails
 * @returns {number}
 */
export function toNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Group array of objects by a key
 * @param {Array<Object>} array - Array to group
 * @param {string|Function} key - Key to group by
 * @returns {Object}
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {});
}

/**
 * Sort array of objects by multiple keys
 * @param {Array<Object>} array - Array to sort
 * @param {Array<{key: string, order?: 'asc'|'desc'}>} sortBy - Sort configuration
 * @returns {Array<Object>}
 */
export function sortByMultiple(array, sortBy) {
  return [...array].sort((a, b) => {
    for (const { key, order = 'asc' } of sortBy) {
      const valueA = a[key];
      const valueB = b[key];
      
      let comparison = 0;
      
      if (valueA < valueB) comparison = -1;
      if (valueA > valueB) comparison = 1;
      
      if (comparison !== 0) {
        return order === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });
}

/**
 * Sum values in an array
 * @param {Array<number>} values - Array of numbers
 * @returns {number}
 */
export function sum(values) {
  return values.reduce((acc, val) => acc + (toNumber(val)), 0);
}

/**
 * Calculate average of values
 * @param {Array<number>} values - Array of numbers
 * @returns {number}
 */
export function average(values) {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Find minimum value
 * @param {Array<number>} values - Array of numbers
 * @returns {number}
 */
export function min(values) {
  const nums = values.filter(v => !isNaN(toNumber(v)));
  return nums.length ? Math.min(...nums.map(toNumber)) : 0;
}

/**
 * Find maximum value
 * @param {Array<number>} values - Array of numbers
 * @returns {number}
 */
export function max(values) {
  const nums = values.filter(v => !isNaN(toNumber(v)));
  return nums.length ? Math.max(...nums.map(toNumber)) : 0;
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array<Array>}
 */
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Create a range of numbers
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} [step=1] - Step value
 * @returns {Array<number>}
 */
export function range(start, end, step = 1) {
  const result = [];
  for (let i = start; i <= end; i += step) {
    result.push(i);
  }
  return result;
}
