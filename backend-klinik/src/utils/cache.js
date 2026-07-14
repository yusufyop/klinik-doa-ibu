// Simple in-memory cache implementation
const cache = new Map();

const setCache = (key, data, ttlSeconds = 60) => {
  cache.set(key, { data, expiry: Date.now() + (ttlSeconds * 1000) });
};

const getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const invalidateCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
};

const getCacheStats = () => ({
  cacheSize: cache.size,
  cacheKeys: Array.from(cache.keys())
});

module.exports = {
  setCache,
  getCache,
  invalidateCache,
  getCacheStats
};
