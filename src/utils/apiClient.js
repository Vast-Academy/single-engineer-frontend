import authTokenManager from './authTokenManager';


let firstApiCallLogged = false;

/**
 * Enhanced fetch that handles authentication for both web and native platforms
 *
 * Features:
 * - Waits for Firebase auth initialization before making requests
 * - Automatically attaches Authorization Bearer token for all platforms
 * - Auto-retries on 401 with token refresh
 * - Forces reauthentication if token refresh fails
 *
 * All platforms: Authorization Bearer token (from Firebase)
 *
 * Usage: await apiClient(url, options)
 */
export const apiClient = async (url, options = {}, retryCount = 0) => {
    const maxRetries = 1;

    // CRITICAL: Wait for Firebase auth to initialize before proceeding
    const isAuthenticated = await authTokenManager.waitForAuthInit();

    if (!isAuthenticated) {
        throw new Error('Authentication required. Please login to continue.');
    }

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // ALWAYS add Authorization header with fresh Firebase token
    try {
        const idToken = await authTokenManager.getToken();
        headers['Authorization'] = `Bearer ${idToken}`;
        console.log("WORKOPS DEBUG | api | bearer attached |", new Date().toISOString(), url);

    } catch (error) {
        console.error('Failed to get Firebase token:', error);
        throw new Error('Authentication token unavailable. Please login again.');
    }

    const fetchOptions = {
        ...options,
        headers,
        credentials: 'omit'
    };

    try {
        if (!firstApiCallLogged) {
    firstApiCallLogged = true;
    console.log("WORKOPS DEBUG | api | first request |", new Date().toISOString(), url);
}

        const response = await fetch(url, fetchOptions);

        // Handle 401 Unauthorized - Token might be expired
        if (response.status === 401 && retryCount < maxRetries) {
            console.warn("WORKOPS DEBUG | api | 401 |", new Date().toISOString(), url, "retryCount:", retryCount);

            // Force token refresh and retry
            await authTokenManager.forceRefresh();

            console.log('Token refreshed. Retrying request...');
            return apiClient(url, options, retryCount + 1);
        }

        return response;

    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

/**
 * Helper to make authenticated GET requests
 */
export const apiGet = async (url) => {
    return apiClient(url, { method: 'GET' });
};

/**
 * Helper to make authenticated POST requests
 */
export const apiPost = async (url, body) => {
    return apiClient(url, {
        method: 'POST',
        body: JSON.stringify(body)
    });
};

/**
 * Helper to make authenticated PUT requests
 */
export const apiPut = async (url, body) => {
    return apiClient(url, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
};

/**
 * Helper to make authenticated DELETE requests
 */
export const apiDelete = async (url) => {
    return apiClient(url, { method: 'DELETE' });
};

export default apiClient;
