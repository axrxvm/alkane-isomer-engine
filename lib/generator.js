const fs = require('fs');
const path = require('path');
const { canonicalForm } = require('./canonical');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Deep copy adjacency list
function cloneAdj(adj) {
  return adj.map(neis => neis.slice());
}

// Save adjacency lists per size
function saveSize(size, trees) {
  const file = path.join(DATA_DIR, `size_${size}.json`);
  fs.writeFileSync(file, JSON.stringify(trees));
}

// Load adjacency lists per size
function loadSize(size) {
  const file = path.join(DATA_DIR, `size_${size}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
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

    // Expand each tree of current size
    for (const tree of currentTrees) {
      const adj = tree.adj;
      const nodeCount = adj.length;

      for (let v = 0; v < nodeCount; v++) {
        if (adj[v].length >= 4) continue; // degree ≤ 4

        const newAdj = cloneAdj(adj);
        newAdj.push([v]);
        newAdj[v].push(nodeCount);

        const can = canonicalForm(newAdj);
        if (!nextMap.has(can)) nextMap.set(can, newAdj);
      }
    }

    // Prepare next size trees
    currentTrees = Array.from(nextMap.values()).map(adj => ({ adj }));

    // Save current size to disk (stop/resume)
    saveSize(size + 1, currentTrees.map(t => t.adj));

    // In-place single-line progress logging
    process.stdout.write(`Generating size ${size + 1}: ${currentTrees.length} unique trees\r`);
  }

  // Print newline after final size
  console.log();

  return { count: currentTrees.length, canonicalSet: currentTrees };
}

module.exports = { generateIsomerCount };
