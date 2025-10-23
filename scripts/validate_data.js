#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function isTree(adj) {
  const n = adj.length;
  // basic checks
  if (!Number.isInteger(n) || n <= 0) return false;
  if (!Array.isArray(adj)) return false;

  // mutual adjacency and degree <= 4
  for (let i = 0; i < n; i++) {
    const row = adj[i];
    if (!Array.isArray(row)) return false;
    if (row.length > 4) return false;
    for (const j of row) {
      if (!Number.isInteger(j) || j < 0 || j >= n) return false;
    }
  }
  for (let i = 0; i < n; i++) {
    for (const j of adj[i]) {
      if (!adj[j] || !Array.isArray(adj[j]) || !adj[j].includes(i)) return false;
    }
  }

  // check connectedness via BFS
  const seen = new Array(n).fill(false);
  const q = [0];
  seen[0] = true;
  while (q.length) {
    const v = q.shift();
    for (const u of adj[v]) if (!seen[u]) { seen[u] = true; q.push(u); }
  }
  if (seen.some(s => !s)) return false;

  // check acyclic: edges = sum(deg)/2 should equal n-1
  const edges = adj.reduce((s, row) => s + row.length, 0) / 2;
  if (edges !== n - 1) return false;

  return true;
}

function validateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${e.message}` };
  }
  if (!Array.isArray(arr)) return { ok: false, error: `expected top-level array` };
  for (let i = 0; i < arr.length; i++) {
    const adj = arr[i];
    if (!isTree(adj)) return { ok: false, error: `entry ${i} is not a valid tree` };
  }
  return { ok: true };
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const dataDir = path.join(repoRoot, 'data');
  let targets = process.argv.slice(2);
  if (targets.length === 0) {
    if (!fs.existsSync(dataDir)) {
      console.error('No data/ directory found');
      process.exit(1);
    }
    targets = fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).map(f => path.join(dataDir, f));
  }

  let failed = false;
  for (const p of targets) {
    if (!fs.existsSync(p)) {
      console.error(`Skipped (not found): ${p}`);
      failed = true;
      continue;
    }
    const res = validateFile(p);
    const name = path.relative(repoRoot, p);
    if (!res.ok) {
      console.error(`INVALID: ${name} -> ${res.error}`);
      failed = true;
    } else {
      console.log(`OK: ${name}`);
    }
  }
  if (failed) process.exit(2);
}

if (require.main === module) main();
