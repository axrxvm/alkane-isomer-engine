// lib/canonical.js
function getCenters(adj) {
  const n = adj.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const degree = new Array(n).fill(0);
  const leaves = [];
  for (let i = 0; i < n; i++) {
    degree[i] = adj[i].length;
    if (degree[i] <= 1) leaves.push(i);
  }

  let removed = leaves.length;
  let curLeaves = leaves;

  while (removed < n) {
    const nextLeaves = [];
    for (const leaf of curLeaves) {
      for (const nei of adj[leaf]) {
        degree[nei]--;
        if (degree[nei] === 1) nextLeaves.push(nei);
      }
    }
    removed += nextLeaves.length;
    if (removed >= n) return [...new Set(nextLeaves)];
    curLeaves = nextLeaves;
  }

  return curLeaves.length ? curLeaves : [0];
}

function rootedEncoding(adj, root, parent = -1) {
  const labels = [];
  for (const nei of adj[root]) {
    if (nei === parent) continue;
    labels.push(rootedEncoding(adj, nei, root));
  }
  labels.sort();
  return '(' + labels.join('') + ')';
}

function canonicalForm(adj) {
  const n = adj.length;
  if (n === 0) return '';
  if (n === 1) return '()';

  const centers = getCenters(adj);
  const encs = centers.map(c => rootedEncoding(adj, c, -1));
  encs.sort();
  return encs[0];
}

module.exports = { canonicalForm };
