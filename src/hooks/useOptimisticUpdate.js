import { useState, useCallback } from 'react';

/**
 * Hook for optimistic UI updates
 * Updates UI immediately, then calls API
 * Rolls back on failure
 */
export const useOptimisticUpdate = () => {
    const [isOptimistic, setIsOptimistic] = useState(false);

    /**
     * Optimistic delete
     * @param {Array} items - Current items array
     * @param {Function} setItems - State setter
     * @param {string} itemId - ID to delete
     * @param {Function} apiCall - Async function to call API
     * @param {Function} onSuccess - Optional success callback
     * @param {Function} onError - Optional error callback
     */
    const optimisticDelete = useCallback(async (
        items,
        setItems,
        itemId,
        apiCall,
        onSuccess,
        onError
    ) => {
        // Save original state for rollback
        const originalItems = [...items];

        // Optimistically remove from UI
        setIsOptimistic(true);
        setItems(items.filter(item => item._id !== itemId));

        try {
            // Call API
            const result = await apiCall(itemId);

            if (result.success) {
                setIsOptimistic(false);
                if (onSuccess) onSuccess(result);
            } else {
                // Rollback on API failure
                setItems(originalItems);
                setIsOptimistic(false);
                if (onError) onError(result.message || 'Delete failed');
            }
        } catch (error) {
            // Rollback on error
            setItems(originalItems);
            setIsOptimistic(false);
            console.error('Optimistic delete error:', error);
            if (onError) onError(error.message || 'Network error');
        }
    }, []);

    /**
     * Optimistic create/add
     * @param {Array} items - Current items array
     * @param {Function} setItems - State setter
     * @param {Object} newItem - New item to add (with temporary ID)
     * @param {Function} apiCall - Async function to call API
     * @param {Function} onSuccess - Optional success callback
     * @param {Function} onError - Optional error callback
     */
    const optimisticCreate = useCallback(async (
        items,
        setItems,
        newItem,
        apiCall,
        onSuccess,
        onError
    ) => {
        // Add temporary ID for optimistic update
        const tempItem = { ...newItem, _id: `temp_${Date.now()}`, isOptimistic: true };

        // Optimistically add to UI
        setIsOptimistic(true);
        setItems([tempItem, ...items]);

        try {
            // Call API
            const result = await apiCall(newItem);

            if (result.success) {
                // Replace temp item with real one from server
                setItems(prevItems =>
                    prevItems.map(item =>
                        item._id === tempItem._id ? result.data : item
                    )
                );
                setIsOptimistic(false);
                if (onSuccess) onSuccess(result);
            } else {
                // Remove temp item on failure
                setItems(items);
                setIsOptimistic(false);
                if (onError) onError(result.message || 'Create failed');
            }
        } catch (error) {
            // Remove temp item on error
            setItems(items);
            setIsOptimistic(false);
            console.error('Optimistic create error:', error);
            if (onError) onError(error.message || 'Network error');
        }
    }, []);

    /**
     * Optimistic update/edit
     * @param {Array} items - Current items array
     * @param {Function} setItems - State setter
     * @param {string} itemId - ID to update
     * @param {Object} updates - Updated fields
     * @param {Function} apiCall - Async function to call API
     * @param {Function} onSuccess - Optional success callback
     * @param {Function} onError - Optional error callback
     */
    const optimisticUpdate = useCallback(async (
        items,
        setItems,
        itemId,
        updates,
        apiCall,
        onSuccess,
        onError
    ) => {
        // Save original state for rollback
        const originalItems = [...items];

        // Optimistically update in UI
        setIsOptimistic(true);
        setItems(items.map(item =>
            item._id === itemId ? { ...item, ...updates, isOptimistic: true } : item
        ));

        try {
            // Call API
            const result = await apiCall(itemId, updates);

            if (result.success) {
                // Replace with server response
                setItems(prevItems =>
                    prevItems.map(item =>
                        item._id === itemId ? result.data : item
                    )
                );
                setIsOptimistic(false);
                if (onSuccess) onSuccess(result);
            } else {
                // Rollback on API failure
                setItems(originalItems);
                setIsOptimistic(false);
                if (onError) onError(result.message || 'Update failed');
            }
        } catch (error) {
            // Rollback on error
            setItems(originalItems);
            setIsOptimistic(false);
            console.error('Optimistic update error:', error);
            if (onError) onError(error.message || 'Network error');
        }
    }, []);

    return {
        isOptimistic,
        optimisticDelete,
        optimisticCreate,
        optimisticUpdate
    };
};

export default useOptimisticUpdate;
