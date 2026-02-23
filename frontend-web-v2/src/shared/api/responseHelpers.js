/**
 * API Response Helpers
 * Utilities for handling different API response formats
 */

/**
 * Extract array data from API response
 * Handles both paginated (Page<T>) and direct array responses
 * @param {any} response - Raw API response data
 * @returns {Array} - The array of items
 */
export function extractArray(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.content && Array.isArray(response.content)) return response.content;
    return [];
}

/**
 * Extract paginated data with metadata
 * @param {any} response - Raw API response data
 * @returns {{ content: Array, totalElements: number, totalPages: number, page: number, size: number }}
 */
export function extractPage(response) {
    if (!response) {
        return { content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 };
    }

    // Already a page response
    if (response.content !== undefined) {
        return {
            content: response.content || [],
            totalElements: response.totalElements || 0,
            totalPages: response.totalPages || 0,
            page: response.number || response.page || 0,
            size: response.size || 10,
        };
    }

    // Plain array - wrap it as a page
    if (Array.isArray(response)) {
        return {
            content: response,
            totalElements: response.length,
            totalPages: 1,
            page: 0,
            size: response.length,
        };
    }

    return { content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 };
}

/**
 * Safe fetch wrapper that returns empty array on error
 * @param {Promise} apiCall - The API call promise
 * @returns {Promise<Array>}
 */
export async function safeFetchArray(apiCall) {
    try {
        const response = await apiCall;
        return extractArray(response.data);
    } catch (error) {
        console.warn('API fetch failed:', error?.message || error);
        return [];
    }
}

/**
 * Safe fetch wrapper for paginated data
 * @param {Promise} apiCall - The API call promise
 * @returns {Promise<{ content: Array, totalElements: number, totalPages: number, page: number, size: number }>}
 */
export async function safeFetchPage(apiCall) {
    try {
        const response = await apiCall;
        return extractPage(response.data);
    } catch (error) {
        console.warn('API fetch failed:', error?.message || error);
        return { content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 };
    }
}
