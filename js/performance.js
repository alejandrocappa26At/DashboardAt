/* =============================================
   MÓDULO: UTILIDADES DE RENDIMIENTO
   Memoización, Debounce, Throttle, Cache
   ============================================= */

const PerformanceUtils = {
    _memoCache: new Map(),
    _debounceTimers: new Map(),

    memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
        return (...args) => {
            const key = keyFn(...args);
            if (this._memoCache.has(key)) {
                return this._memoCache.get(key);
            }
            const result = fn(...args);
            this._memoCache.set(key, result);
            return result;
        };
    },

    memoizeAsync(fn, keyFn = (...args) => JSON.stringify(args)) {
        return async (...args) => {
            const key = keyFn(...args);
            if (this._memoCache.has(key)) {
                return this._memoCache.get(key);
            }
            const result = await fn(...args);
            this._memoCache.set(key, result);
            return result;
        };
    },

    clearMemo(key) {
        if (key) {
            this._memoCache.delete(key);
        } else {
            this._memoCache.clear();
        }
    },

    debounce(fn, delay, key) {
        return (...args) => {
            const timerKey = key || fn.name || 'default';
            if (this._debounceTimers.has(timerKey)) {
                clearTimeout(this._debounceTimers.get(timerKey));
            }
            const timer = setTimeout(() => {
                fn(...args);
                this._debounceTimers.delete(timerKey);
            }, delay);
            this._debounceTimers.set(timerKey, timer);
        };
    },

    throttle(fn, limit, key) {
        let inThrottle = false;
        return (...args) => {
            if (!inThrottle) {
                fn(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    createLRUCache(maxSize = 100) {
        const cache = new Map();
        return {
            get(key) {
                if (cache.has(key)) {
                    const value = cache.get(key);
                    cache.delete(key);
                    cache.set(key, value);
                    return value;
                }
                return undefined;
            },
            set(key, value) {
                if (cache.has(key)) {
                    cache.delete(key);
                } else if (cache.size >= maxSize) {
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                }
                cache.set(key, value);
            },
            has(key) { return cache.has(key); },
            delete(key) { return cache.delete(key); },
            clear() { cache.clear(); },
            size() { return cache.size; }
        };
    }
};

window.PerformanceUtils = PerformanceUtils;

// Helpers globales para compatibilidad
window.debounce = (fn, delay) => PerformanceUtils.debounce(fn, delay);
window.throttle = (fn, limit) => PerformanceUtils.throttle(fn, limit);