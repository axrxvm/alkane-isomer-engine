const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { canonicalForm } = require('./canonical');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Object pool for adjacency lists to reduce GC pressure
const adjPool = [];

function getPooledArray(size) {
  if (adjPool.length > 0) {
    const arr = adjPool.pop();
    arr.length = size;
    return arr;
  }
  return new Array(size);
}

function releaseToPool(arr) {
  if (adjPool.length < 500) adjPool.push(arr);
}

// Deep copy adjacency list (optimized)
function cloneAdj(adj) {
  const n = adj.length;
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = adj[i].slice();
  }
  return result;
}

// Save adjacency lists per size with gzip compression
function saveSize(size, trees) {
  const jsonData = JSON.stringify(trees);
  const compressed = zlib.gzipSync(jsonData, { level: 9 });
  
  // Save compressed version
  const gzFile = path.join(DATA_DIR, `size_${size}.json.gz`);
  fs.writeFileSync(gzFile, compressed);
  
  // Also save uncompressed for sizes <= 15 (small files, better for quick access)
  if (size <= 15) {
    const jsonFile = path.join(DATA_DIR, `size_${size}.json`);
    fs.writeFileSync(jsonFile, jsonData);
  }
}

// Load adjacency lists per size (supports both .json and .json.gz)
function loadSize(size) {
  // Try compressed file first
  const gzFile = path.join(DATA_DIR, `size_${size}.json.gz`);
  if (fs.existsSync(gzFile)) {
    const compressed = fs.readFileSync(gzFile);
    const decompressed = zlib.gunzipSync(compressed);
    return JSON.parse(decompressed.toString('utf-8'));
  }
  
  // Fall back to uncompressed
  const jsonFile = path.join(DATA_DIR, `size_${size}.json`);
  if (fs.existsSync(jsonFile)) {
    return JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  }
  
  return null;
}

/**
 * generateIsomerCount
 * n: number of carbons
 * options.resume: boolean -> resume from last saved size
 */
function generateIsomerCount(n, options = { resume: true }) {
  if (!Number.isInteger(n) || n < 1) throw new Error('n must be >= 1');

  let currentTrees = null;
  let startSize = 1;

  // Resume from last saved size if available
  if (options.resume) {
    for (let sz = n - 1; sz >= 1; sz--) {
      const loaded = loadSize(sz);
      if (loaded) {
        currentTrees = loaded.map(adj => ({ adj }));
        startSize = sz;
        process.stdout.write(`Resuming from size ${sz} with ${loaded.length} trees\n`);
        break;
      }
    }
  }

  // Start from size 1 if nothing to resume
  if (!currentTrees) {
    const adj1 = [[]];
    currentTrees = [{ adj: adj1 }];
    saveSize(1, currentTrees.map(t => t.adj));
    process.stdout.write('Starting from size 1\n');
  }

  for (let size = startSize; size < n; size++) {
    const nextMap = new Map();
    const treeCount = currentTrees.length;

    // Expand each tree of current size
    for (let i = 0; i < treeCount; i++) {
      const adj = currentTrees[i].adj;
      const nodeCount = adj.length;

      // Pre-compute degrees and find expandable vertices
      const expandable = [];
      for (let v = 0; v < nodeCount; v++) {
        const degree = adj[v].length;
        if (degree < 4) expandable.push(v);
      }

      // Expand only at valid attachment points
      for (let j = 0; j < expandable.length; j++) {
        const v = expandable[j];
        
        // Inline expansion with minimal allocation
        const newAdj = new Array(nodeCount + 1);
        
        // Copy existing neighbors, adding new edge to vertex v
        for (let k = 0; k < nodeCount; k++) {
          if (k === v) {
            const oldNeighbors = adj[k];
            const newNeighbors = new Array(oldNeighbors.length + 1);
            for (let m = 0; m < oldNeighbors.length; m++) {
              newNeighbors[m] = oldNeighbors[m];
            }
            newNeighbors[oldNeighbors.length] = nodeCount;
            newAdj[k] = newNeighbors;
          } else {
            newAdj[k] = adj[k].slice();
          }
        }
        newAdj[nodeCount] = [v];

        const can = canonicalForm(newAdj);
        if (!nextMap.has(can)) {
          nextMap.set(can, newAdj);
        }
      }
    }

    // Prepare next size trees more efficiently
    const nextTrees = Array.from(nextMap.values());
    const nextCount = nextTrees.length;
    currentTrees = new Array(nextCount);
    for (let i = 0; i < nextCount; i++) {
      currentTrees[i] = { adj: nextTrees[i] };
    }

    // Save current size to disk (stop/resume)
    saveSize(size + 1, nextTrees);

    // In-place single-line progress logging
    process.stdout.write(`Generating size ${size + 1}: ${nextCount} unique trees\r`);
  }

  // Print newline after final size
  console.log();

  return { count: currentTrees.length, canonicalSet: currentTrees };
}

module.exports = { generateIsomerCount };
