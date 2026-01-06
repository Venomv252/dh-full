import { useState, useEffect, useCallback, useRef } from 'react';
import { API_STATUS } from '../services/apiConfig';

/**
 * Custom hook for API calls with loading states and error handling
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} - API state and control functions
 */
export const useApi = (apiFunction, options = {}) => {
  const {
    immediate = false,
    onSuccess = null,
    onError = null,
    dependencies = [],
  } = options;

  const [state, setState] = useState({
    data: null,
    status: API_STATUS.IDLE,
    error: null,
  });

  const abortControllerRef = useRef(null);

  const execute = useCallback(async (...args) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      status: API_STATUS.LOADING,
      error: null,
    }));

    try {
      const result = await apiFunction(...args);

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      if (result.success) {
        setState({
          data: result.data,
          status: API_STATUS.SUCCESS,
          error: null,
        });

        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        setState({
          data: null,
          status: API_STATUS.ERROR,
          error: result.error,
        });

        if (onError) {
          onError(result.error);
        }
      }

      return result;
    } catch (error) {
      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setState({
        data: null,
        status: API_STATUS.ERROR,
        error: error.message,
      });

      if (onError) {
        onError(error.message);
      }

      throw error;
    }
  }, [apiFunction, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: null,
      status: API_STATUS.IDLE,
      error: null,
    });
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.status === API_STATUS.LOADING,
    isSuccess: state.status === API_STATUS.SUCCESS,
    isError: state.status === API_STATUS.ERROR,
    isIdle: state.status === API_STATUS.IDLE,
  };
};

/**
 * Hook for paginated API calls
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} - Pagination state and control functions
 */
export const usePaginatedApi = (apiFunction, options = {}) => {
  const {
    pageSize = 20,
    immediate = false,
    onSuccess = null,
    onError = null,
  } = options;

  const [state, setState] = useState({
    data: [],
    pagination: {
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    status: API_STATUS.IDLE,
    error: null,
  });

  const execute = useCallback(async (page = 1, filters = {}) => {
    setState(prev => ({
      ...prev,
      status: API_STATUS.LOADING,
      error: null,
    }));

    try {
      const result = await apiFunction({
        page,
        pageSize,
        ...filters,
      });

      if (result.success) {
        const { data, pagination } = result.data;

        setState({
          data,
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            totalPages: pagination.totalPages,
            hasNext: pagination.hasNext,
            hasPrev: pagination.hasPrev,
          },
          status: API_STATUS.SUCCESS,
          error: null,
        });

        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        setState(prev => ({
          ...prev,
          status: API_STATUS.ERROR,
          error: result.error,
        }));

        if (onError) {
          onError(result.error);
        }
      }

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: API_STATUS.ERROR,
        error: error.message,
      }));

      if (onError) {
        onError(error.message);
      }

      throw error;
    }
  }, [apiFunction, pageSize, onSuccess, onError]);

  const nextPage = useCallback(() => {
    if (state.pagination.hasNext) {
      execute(state.pagination.page + 1);
    }
  }, [execute, state.pagination]);

  const prevPage = useCallback(() => {
    if (state.pagination.hasPrev) {
      execute(state.pagination.page - 1);
    }
  }, [execute, state.pagination]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= state.pagination.totalPages) {
      execute(page);
    }
  }, [execute, state.pagination.totalPages]);

  const reset = useCallback(() => {
    setState({
      data: [],
      pagination: {
        page: 1,
        pageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
      status: API_STATUS.IDLE,
      error: null,
    });
  }, [pageSize]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    nextPage,
    prevPage,
    goToPage,
    reset,
    isLoading: state.status === API_STATUS.LOADING,
    isSuccess: state.status === API_STATUS.SUCCESS,
    isError: state.status === API_STATUS.ERROR,
    isIdle: state.status === API_STATUS.IDLE,
  };
};

/**
 * Hook for optimistic updates
 * @param {Function} apiFunction - The API function to call
 * @param {Function} optimisticUpdate - Function to apply optimistic update
 * @param {Function} rollback - Function to rollback on error
 * @returns {Object} - API state and control functions
 */
export const useOptimisticApi = (apiFunction, optimisticUpdate, rollback) => {
  const [state, setState] = useState({
    data: null,
    status: API_STATUS.IDLE,
    error: null,
  });

  const execute = useCallback(async (...args) => {
    // Apply optimistic update
    const previousData = state.data;
    const optimisticData = optimisticUpdate(previousData, ...args);
    
    setState(prev => ({
      ...prev,
      data: optimisticData,
      status: API_STATUS.LOADING,
      error: null,
    }));

    try {
      const result = await apiFunction(...args);

      if (result.success) {
        setState({
          data: result.data,
          status: API_STATUS.SUCCESS,
          error: null,
        });
      } else {
        // Rollback on error
        const rolledBackData = rollback(previousData, result.error);
        setState({
          data: rolledBackData,
          status: API_STATUS.ERROR,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      // Rollback on error
      const rolledBackData = rollback(previousData, error.message);
      setState({
        data: rolledBackData,
        status: API_STATUS.ERROR,
        error: error.message,
      });

      throw error;
    }
  }, [apiFunction, optimisticUpdate, rollback, state.data]);

  return {
    ...state,
    execute,
    isLoading: state.status === API_STATUS.LOADING,
    isSuccess: state.status === API_STATUS.SUCCESS,
    isError: state.status === API_STATUS.ERROR,
    isIdle: state.status === API_STATUS.IDLE,
  };
};

export default useApi;