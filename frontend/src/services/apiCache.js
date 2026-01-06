// Simple in-memory cache for API responses
import { CACHE_CONFIG } from './apiConfig.js';

class ApiCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  // Generate cache key from URL and params
  generateKey(url, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${url}${paramString ? `?${paramString}` : ''}`;
  }

  // Set cache entry with TTL
  set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store data with timestamp
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  // Get cache entry
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  // Delete cache entry
  delete(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  // Clear all cache
  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        age: Date.now() - entry.timestamp,
      })),
    };
  }

  // Check if key exists and is valid
  has(key) {
    return this.get(key) !== null;
  }

  // Invalidate cache entries by pattern
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  // Preload cache with data
  preload(entries) {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }
}

// Create singleton instance
const apiCache = new ApiCache();

// Cache wrapper for API calls
export const withCache = (cacheKey, apiCall, ttl = CACHE_CONFIG.DEFAULT_TTL) => {
  return async (...args) => {
    // Check cache first
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cachedData;
    }

    // Make API call
    console.log(`[Cache] Miss: ${cacheKey}`);
    const result = await apiCall(...args);

    // Cache successful results
    if (result.success) {
      apiCache.set(cacheKey, result, ttl);
    }

    return result;
  };
};

// Cache invalidation helpers
export const invalidateCache = {
  // Invalidate user-related cache
  user: () => {
    apiCache.invalidatePattern('/users/');
    apiCache.delete('/users/profile');
  },

  // Invalidate incident-related cache
  incidents: () => {
    apiCache.invalidatePattern('/incidents');
  },

  // Invalidate dashboard cache
  dashboard: (role) => {
    apiCache.delete(`/${role}/dashboard`);
  },

  // Invalidate all cache
  all: () => {
    apiCache.clear();
  },

  // Invalidate by pattern
  pattern: (pattern) => {
    return apiCache.invalidatePattern(pattern);
  },
};

// Export cache instance and utilities
export { apiCache };
export default apiCache;