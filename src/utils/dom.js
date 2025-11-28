/**
 * DOM Utilities - Helper functions for DOM manipulation
 */

/**
 * Create an element with attributes
 * @param {string} tag - HTML tag name
 * @param {Object} [attributes] - Attributes to set
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}) {
  const element = document.createElement(tag)
  setAttributes(element, attributes)
  return element
}

/**
 * Set multiple attributes on an element
 * @param {HTMLElement} element - Target element
 * @param {Object} attributes - Attributes object
 */
export function setAttributes(element, attributes) {
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "class") {
      element.className = value
    } else if (key === "style" && typeof value === "object") {
      Object.assign(element.style, value)
    } else if (key.startsWith("data-")) {
      element.setAttribute(key, value)
    } else if (key in element) {
      element[key] = value
    } else {
      element.setAttribute(key, value)
    }
  })
}

/**
 * Add one or more classes to an element
 * @param {HTMLElement} element - Target element
 * @param {...string} classNames - Class names to add
 */
export function addClass(element, ...classNames) {
  classNames.forEach((className) => {
    if (className) {
      element.classList.add(className)
    }
  })
}

/**
 * Remove one or more classes from an element
 * @param {HTMLElement} element - Target element
 * @param {...string} classNames - Class names to remove
 */
export function removeClass(element, ...classNames) {
  classNames.forEach((className) => {
    if (className) {
      element.classList.remove(className)
    }
  })
}

/**
 * Toggle a class on an element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean} [force] - Force add or remove
 * @returns {boolean} - Whether class is now present
 */
export function toggleClass(element, className, force) {
  return element.classList.toggle(className, force)
}

/**
 * Check if element has a class
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to check
 * @returns {boolean}
 */
export function hasClass(element, className) {
  return element.classList.contains(className)
}

/**
 * Find closest ancestor matching selector
 * @param {HTMLElement} element - Starting element
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null}
 */
export function closest(element, selector) {
  return element.closest(selector)
}

/**
 * Query selector wrapper
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [context=document] - Context element
 * @returns {HTMLElement|null}
 */
export function $(selector, context = document) {
  return context.querySelector(selector)
}

/**
 * Query selector all wrapper
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [context=document] - Context element
 * @returns {NodeListOf<HTMLElement>}
 */
export function $$(selector, context = document) {
  return context.querySelectorAll(selector)
}

/**
 * Get element's offset relative to document
 * @param {HTMLElement} element - Target element
 * @returns {{top: number, left: number}}
 */
export function getOffset(element) {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
  }
}

/**
 * Get element dimensions including padding and border
 * @param {HTMLElement} element - Target element
 * @returns {{width: number, height: number}}
 */
export function getOuterDimensions(element) {
  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
  }
}

/**
 * Get element dimensions excluding padding and border
 * @param {HTMLElement} element - Target element
 * @returns {{width: number, height: number}}
 */
export function getInnerDimensions(element) {
  const style = getComputedStyle(element)
  return {
    width:
      element.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    height:
      element.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom),
  }
}

/**
 * Scroll element into view with options
 * @param {HTMLElement} element - Target element
 * @param {Object} [options] - ScrollIntoView options
 */
export function scrollIntoView(element, options = {}) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
    ...options,
  })
}

/**
 * Delegate event handling
 * @param {HTMLElement} parent - Parent element
 * @param {string} eventType - Event type
 * @param {string} selector - Child selector
 * @param {Function} handler - Event handler
 * @returns {Function} - Cleanup function
 */
export function delegate(parent, eventType, selector, handler) {
  const listener = (event) => {
    const target = event.target.closest(selector)
    if (target && parent.contains(target)) {
      handler.call(target, event, target)
    }
  }

  parent.addEventListener(eventType, listener)

  return () => parent.removeEventListener(eventType, listener)
}

/**
 * Create document fragment from HTML string
 * @param {string} html - HTML string
 * @returns {DocumentFragment}
 */
export function createFragment(html) {
  const template = document.createElement("template")
  template.innerHTML = html.trim()
  return template.content
}

/**
 * Empty an element's contents
 * @param {HTMLElement} element - Target element
 */
export function empty(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }
}

/**
 * Check if element is visible in viewport
 * @param {HTMLElement} element - Target element
 * @returns {boolean}
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, wait) {
  let timeout = null
  let lastRan = null

  return function (...args) {
    if (!lastRan) {
      func.apply(this, args)
      lastRan = Date.now()
    } else {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (Date.now() - lastRan >= wait) {
          func.apply(this, args)
          lastRan = Date.now()
        }
      }, wait - (Date.now() - lastRan))
    }
  }
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}
