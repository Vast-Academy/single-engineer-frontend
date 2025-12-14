/**
 * Progressive Loading Utilities
 * Load data in batches with smooth animations for better UX
 */

/**
 * Load items in batches progressively
 * @param {Array} items - Array of items to load
 * @param {Function} setState - State setter function
 * @param {number} batchSize - Number of items per batch (default: 5)
 * @param {number} delay - Delay between batches in ms (default: 30)
 */
export const loadInBatches = (items, setState, batchSize = 5, delay = 30) => {
    if (!items || items.length === 0) {
        setState([]);
        return;
    }

    // Split items into batches
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }

    // Clear state first
    setState([]);

    // Load batches progressively
    batches.forEach((batch, index) => {
        setTimeout(() => {
            setState(prev => [...prev, ...batch]);
        }, index * delay);
    });
};

/**
 * Load items one by one
 * @param {Array} items - Array of items to load
 * @param {Function} setState - State setter function
 * @param {number} delay - Delay between items in ms (default: 50)
 */
export const loadProgressively = (items, setState, delay = 50) => {
    if (!items || items.length === 0) {
        setState([]);
        return;
    }

    // Clear state first
    setState([]);

    // Load items one by one
    items.forEach((item, index) => {
        setTimeout(() => {
            setState(prev => [...prev, item]);
        }, index * delay);
    });
};

/**
 * Load items instantly (for small lists)
 * @param {Array} items - Array of items to load
 * @param {Function} setState - State setter function
 */
export const loadInstantly = (items, setState) => {
    setState(items || []);
};

/**
 * Smart loader - chooses best loading strategy based on item count
 * @param {Array} items - Array of items to load
 * @param {Function} setState - State setter function
 */
export const smartLoad = (items, setState) => {
    if (!items) {
        setState([]);
        return;
    }

    const count = items.length;

    if (count <= 10) {
        // Few items: load instantly
        loadInstantly(items, setState);
    } else if (count <= 50) {
        // Medium list: batch loading (fast)
        loadInBatches(items, setState, 5, 30);
    } else {
        // Large list: batch loading (optimized)
        loadInBatches(items, setState, 10, 20);
    }
};

export default {
    loadInBatches,
    loadProgressively,
    loadInstantly,
    smartLoad
};
