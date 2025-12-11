// lib/canonical.js
// Cache for rooted encodings to avoid recomputation
let encodingCache = new Map();

// Pre-allocated buffers to reduce GC pressure
const stringPool = [];
const arrayPool = [];

function getArray() {
  return arrayPool.length > 0 ? arrayPool.pop() : [];
}

function releaseArray(arr) {
  arr.length = 0;
  if (arrayPool.length < 1000) arrayPool.push(arr);
}

function getCenters(adj) {
  const n = adj.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const degree = new Array(n);
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const deg = adj[i].length;
    degree[i] = deg;
    if (deg <= 1) leaves.push(i);
  }

  let removed = leaves.length;
  let curLeaves = leaves;

  while (removed < n) {
    const nextLeaves = [];
    for (let j = 0; j < curLeaves.length; j++) {
      const leaf = curLeaves[j];
      const neighbors = adj[leaf];
      for (let k = 0; k < neighbors.length; k++) {
        const nei = neighbors[k];
        if (--degree[nei] === 1) nextLeaves.push(nei);
      }
    }
    removed += nextLeaves.length;
    if (removed >= n) {
      // Remove duplicates efficiently
      if (nextLeaves.length <= 2) return nextLeaves.length === 2 && nextLeaves[0] === nextLeaves[1] ? [nextLeaves[0]] : nextLeaves;
      return [...new Set(nextLeaves)];
    }
    curLeaves = nextLeaves;
  }

  return curLeaves.length ? curLeaves : [0];
}

function rootedEncoding(adj, root, parent = -1) {
  // Create cache key using bit packing for small trees (faster than string concat)
  const cacheKey = (root << 16) | (parent + 1);
  const cached = encodingCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const neighbors = adj[root];
  const nlen = neighbors.length;
  
  // Fast path for leaves
  if (nlen === 0 || (nlen === 1 && neighbors[0] === parent)) {
    encodingCache.set(cacheKey, '()');
    return '()';
  }
  
  const labels = getArray();
  
  for (let i = 0; i < nlen; i++) {
    const nei = neighbors[i];
    if (nei !== parent) {
      labels.push(rootedEncoding(adj, nei, root));
    }
  }
  
  // Optimize for common cases
  let result;
  if (labels.length === 0) {
    result = '()';
  } else if (labels.length === 1) {
    result = '(' + labels[0] + ')';
  } else {
    // Only sort when needed
    if (labels.length === 2) {
      // Inline comparison for 2 elements (common case)
      result = labels[0] < labels[1] ? '(' + labels[0] + labels[1] + ')' : '(' + labels[1] + labels[0] + ')';
    } else {
      labels.sort();
      result = '(' + labels.join('') + ')';
    }
  }
  
  releaseArray(labels);
  encodingCache.set(cacheKey, result);
  return result;
}

function canonicalForm(adj) {
  const n = adj.length;
  if (n === 0) return '';
  if (n === 1) return '()';

  // Clear cache more efficiently - recreate if too large
  if (encodingCache.size > 5000) {
    encodingCache = new Map();
  } else {
    encodingCache.clear();
  }
  
  const centers = getCenters(adj);
  
  // Most trees have 1 center, avoid array operations when possible
  if (centers.length === 1) {
    return rootedEncoding(adj, centers[0], -1);
  }
  
  // Two centers case
  const enc1 = rootedEncoding(adj, centers[0], -1);
  const enc2 = rootedEncoding(adj, centers[1], -1);
  return enc1 < enc2 ? enc1 : enc2;
}

module.exports = { canonicalForm };
