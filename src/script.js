const loadBtn = document.getElementById('loadBtn');
const resetBtn = document.getElementById('resetBtn');
const carbonInput = document.getElementById('carbonCount');
const carbonRange = document.getElementById('carbonRange');
const pageSizeSelect = document.getElementById('pageSize');
const isomersContainer = document.getElementById('isomersContainer');
const progress = document.getElementById('progress');
const statusBar = document.getElementById('statusBar');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('pageInfo');
const firstPageBtn = document.getElementById('firstPage');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const lastPageBtn = document.getElementById('lastPage');
const autoLoad = document.getElementById('autoLoad');

let currentN = parseInt(localStorage.getItem('n') || '5', 10);
let treesCache = null;
let page = 1;
let maxAvailableN = 20; // fallback, will be detected

// Initialize controls
carbonInput.value = currentN;
carbonRange.value = currentN;
pageSizeSelect.value = localStorage.getItem('pageSize') || '24';
autoLoad.checked = localStorage.getItem('autoLoad') !== 'false';

function syncN(n) {
  currentN = n;
  carbonInput.value = String(n);
  carbonRange.value = String(n);
  localStorage.setItem('n', String(n));
}

function savePrefs() {
  localStorage.setItem('pageSize', pageSizeSelect.value);
  localStorage.setItem('autoLoad', String(autoLoad.checked));
}

function setStatus(text) { progress.textContent = text; }
function setLoading(isLoading) { statusBar.classList.toggle('loading', !!isLoading); }

// Check if a data file exists. Uses HEAD where possible; falls back to GET.
async function fileExists(path) {
  try {
    const res = await fetch(path, { method: 'HEAD' });
    if (res.ok) return true;
    // Some static hosts don't support HEAD; try GET but avoid downloading large JSON by reading only headers
    const res2 = await fetch(path, { method: 'GET' });
    return res2.ok;
  } catch (e) {
    return false;
  }
}

// Detect highest n available under data/ by checking files size_1..size_40 (safe upper bound)
async function detectMaxN(upper = 40) {
  // Check from upper down to 1 so we can stop early when found
  for (let n = Math.min(upper, 100); n >= 1; n--) {
    // Confirm pattern: data/size_n.json
    // We expect relatively small files, but use HEAD to minimize transfer
    // eslint-disable-next-line no-await-in-loop
    if (await fileExists(`data/size_${n}.json`)) {
      return n;
    }
  }
  return 0;
}

function updateDataInfo(maxN) {
  const el = document.getElementById('dataInfo');
  if (!el) return;
  if (maxN > 0) {
    el.textContent = `Data files up to n = ${maxN} available. Rendering large sets uses paging for performance.`;
  } else {
    el.textContent = `No data files found in /data.`;
  }
}

function clampControlsMax(maxN) {
  carbonInput.max = String(maxN);
  carbonRange.max = String(maxN);
  // Ensure current value is within bounds
  const cur = parseInt(carbonInput.value || '1', 10);
  if (cur > maxN) syncN(maxN);
}

async function loadIsomers(n) {
  isomersContainer.innerHTML = '';
  treesCache = null;
  page = 1;
  setStatus('Loading…');
  setLoading(true);
  pagination.hidden = true;

  try {
    const response = await fetch(`data/size_${n}.json`);
    if (!response.ok) throw new Error('File not found');
    const trees = await response.json();
    treesCache = trees;
    setStatus(`Found ${trees.length} isomers for C${n}H${2*n+2}`);
    renderPage();
  } catch (err) {
    setStatus('Error loading data: ' + err.message);
  }
  finally { setLoading(false); }
}

function getPagedTrees() {
  const pageSize = parseInt(pageSizeSelect.value, 10);
  const total = treesCache ? treesCache.length : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  page = Math.min(Math.max(1, page), totalPages);
  const start = (page - 1) * pageSize;
  const slice = treesCache ? treesCache.slice(start, start + pageSize) : [];
  return { slice, totalPages, total, pageSize };
}

function renderPage() {
  isomersContainer.innerHTML = '';
  if (!treesCache) return;
  const { slice, totalPages, total } = getPagedTrees();
  slice.forEach((adj, idx) => {
    const div = document.createElement('div');
    div.className = 'isomer';

    const badge = document.createElement('div');
    badge.className = 'isomer-header';
    badge.textContent = `#${(idx + 1) + (page-1)*parseInt(pageSizeSelect.value,10)}`;
    div.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'isomer-actions';
    const dlBtn = document.createElement('button');
    dlBtn.className = 'icon-btn';
    dlBtn.title = 'Download PNG';
    dlBtn.innerHTML = '⤓';
    actions.appendChild(dlBtn);
    div.appendChild(actions);

  const canvas = document.createElement('canvas');
  canvas._adj = adj;
    div.appendChild(canvas);
    isomersContainer.appendChild(div);
    drawIsomer(canvas, adj);

    dlBtn.addEventListener('click', () => downloadCanvas(canvas, `C${currentN}_isomer_${(idx + 1) + (page-1)*parseInt(pageSizeSelect.value,10)}.png`));
  });

  if (total > slice.length) {
    pagination.hidden = false;
    const totalPagesCalc = Math.ceil(total / parseInt(pageSizeSelect.value,10));
    pageInfo.textContent = `Page ${page} of ${totalPagesCalc}`;
    firstPageBtn.disabled = page <= 1;
    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= totalPagesCalc;
    lastPageBtn.disabled = page >= totalPagesCalc;
  } else {
    pagination.hidden = true;
  }
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const debouncedLoad = debounce(() => loadIsomers(currentN), 250);

loadBtn.addEventListener('click', () => { savePrefs(); loadIsomers(currentN); });
resetBtn.addEventListener('click', () => {
  syncN(5); pageSizeSelect.value = '24'; autoLoad.checked = true; savePrefs();
  setStatus('Choose n and load isomers.');
  isomersContainer.innerHTML = '';
  pagination.hidden = true;
});

carbonInput.addEventListener('input', () => { syncN(parseInt(carbonInput.value || '1', 10)); if (autoLoad.checked) debouncedLoad(); });
carbonRange.addEventListener('input', () => { syncN(parseInt(carbonRange.value || '1', 10)); if (autoLoad.checked) debouncedLoad(); });
pageSizeSelect.addEventListener('change', () => { savePrefs(); renderPage(); });

firstPageBtn.addEventListener('click', () => { page = 1; renderPage(); });
prevPageBtn.addEventListener('click', () => { page = Math.max(1, page - 1); renderPage(); });
nextPageBtn.addEventListener('click', () => { page = page + 1; renderPage(); });
lastPageBtn.addEventListener('click', () => { const { totalPages } = getPagedTrees(); page = totalPages; renderPage(); });

// Initial autoload
// Detect available data files and then optionally autoload
(async () => {
  try {
    const detected = await detectMaxN(40);
    if (detected > 0) maxAvailableN = detected;
    updateDataInfo(maxAvailableN);
    clampControlsMax(maxAvailableN);
  } catch (err) {
    // ignore detection errors and keep defaults
    console.warn('Error detecting data files', err);
  }

  if (autoLoad.checked) {
    // ensure requested n doesn't exceed available
    if (currentN > maxAvailableN) syncN(maxAvailableN);
    loadIsomers(currentN);
  }
})();

// Redraw canvases on resize (debounced)
const debouncedResize = debounce(() => {
  document.querySelectorAll('#isomersContainer canvas').forEach(cv => {
    if (cv._adj) drawIsomer(cv, cv._adj);
  });
}, 150);
window.addEventListener('resize', debouncedResize);

function drawIsomer(canvas, adj) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;
  ctx.clearRect(0,0,width,height);

  const n = adj.length;
  const radius = Math.min(width, height)/2 - 20;
  const centerX = width/2;
  const centerY = height/2;

  // Arrange carbons in circle
  const positions = [];
  for (let i=0; i<n; i++) {
    const angle = (i/n) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    positions.push({x,y});
  }

  // Draw bonds
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--fg') || '#333';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  const drawn = new Set();
  for (let i=0;i<n;i++) {
    for (const j of adj[i]) {
      const key = [i,j].sort().join('-');
      if (drawn.has(key)) continue;
      ctx.beginPath();
      ctx.moveTo(positions[i].x, positions[i].y);
      ctx.lineTo(positions[j].x, positions[j].y);
      ctx.stroke();
      drawn.add(key);
    }
  }

  // Draw carbons
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#ff6f61';
  ctx.fillStyle = primary.trim();
  for (let i=0;i<n;i++){
    ctx.beginPath();
    ctx.arc(positions[i].x, positions[i].y, 10,0,2*Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', positions[i].x, positions[i].y);
    ctx.fillStyle = primary.trim();
  }
}
