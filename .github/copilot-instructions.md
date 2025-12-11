  # Alkane Isomer Engine – AI Coding Agent Instructions

## Project Overview

This project generates all structural isomers of alkanes (C_nH_{2n+2}) by enumerating unlabeled trees with degree ≤ 4 (carbon valence constraint). It uses canonical tree labeling (centers + AHU encoding) to deduplicate isomers efficiently. The system has two parts: a Node.js CLI generator and a static web viewer.

**Core insight**: Each alkane isomer maps to a unique tree structure. Generation expands trees size-by-size (k → k+1) by attaching new vertices, canonicalizes each candidate, and deduplicates via hash map keyed by canonical strings.

## Architecture

### Backend (Node.js, CommonJS)

- **`lib/canonical.js`**: Implements tree canonicalization
  - `getCenters(adj)`: Finds 1-2 tree center nodes via leaf-peeling algorithm
  - `rootedEncoding(adj, root, parent)`: Recursive AHU encoding returning nested parentheses string
  - `canonicalForm(adj)`: Returns lexicographically minimum encoding across all centers
  
- **`lib/generator.js`**: Core generation engine
  - `generateIsomerCount(n, options)`: Main API – generates all n-carbon isomers
  - Uses checkpoint files `data/size_*.json` for resumable generation
  - Expands trees by trying all attachment points with degree < 4
  - `options.resume` (default `true`): resumes from latest cached size found in `data/`
  
- **`index.js`**: Minimal CLI wrapper that calls `generateIsomerCount(n)` and prints count

- **`scripts/validate_data.js`**: Validator for data files
  - Checks each adjacency list is a valid tree (connected, acyclic, mutual edges)
  - Enforces degree ≤ 4 constraint
  - Used in CI workflow and `npm run validate:data`

### Frontend (Vanilla JS + HTML/CSS)

- **`index.html`**: Static viewer UI with controls for n, pagination, and download
- **`src/script.js`**: Client logic
  - Fetches `data/size_<n>.json` files dynamically
  - Renders isomer cards with canvas-based circular graph layout
  - Implements pagination for large datasets
  - Saves preferences to localStorage
  - `detectMaxN()`: auto-discovers available data files by checking `data/size_1.json` through `size_40.json`
  - `drawIsomer(canvas, adj)`: circular layout renderer with CSS custom properties for theming

- **`src/style.css`**: Responsive styles with light/dark mode support via CSS custom properties

## Data Format

Files in `data/size_<n>.json` are JSON arrays of adjacency lists:
```json
[
  [[1], [0,2], [1]],
  [[1,2], [0], [0]]
]
```
- Each entry is an adjacency list where `adj[i]` = array of neighbor indices
- Represents a connected, acyclic graph (tree) with n vertices
- All vertices have degree ≤ 4

## Key Workflows

### Running the generator
```powershell
node index.js <n>
```
- Generates all isomers for n carbons
- Writes `data/size_<n>.json`
- Resumes from largest existing `data/size_*.json` if available
- Example: `node index.js 15` resumes from `size_14.json` (if exists), expands to size 15

### Validating data files
```powershell
npm run validate:data                    # validates all data/*.json
node scripts/validate_data.js data/size_21.json  # validates specific file
```

### Running the web viewer
1. Serve with Live Server (right-click `index.html` → "Open with Live Server"), OR
2. Run `npx http-server -p 8080`
3. Visit `http://localhost:8080`

The viewer auto-detects available data files and loads them on demand.

## Development Conventions

### Code style
- CommonJS modules (`require`/`module.exports`) for Node
- No external dependencies; runs on plain Node.js 16+
- Minimal abstractions – prioritize readability over DRY
- Functions are pure where possible (generator mutates only local state)

### Data persistence strategy
- Generation writes intermediate results to `data/size_*.json` after each size
- This enables stop/resume for large n (memory/time intensive)
- Files are consumed by web viewer without backend server
- **Critical**: If you change generation logic, delete subsequent `data/size_*.json` files to avoid incompatible state

### Graph representation
- Adjacency lists are 0-indexed arrays: `adj[i]` = neighbors of vertex i
- Edges are bidirectional: if `j ∈ adj[i]` then `i ∈ adj[j]`
- No self-loops or multi-edges (simple graphs only)

### Canonical form uniqueness
- Two isomorphic trees MUST produce identical canonical strings
- The canonical form is the lexicographically smallest rooted encoding among all tree centers
- When adding new features that modify trees, always verify canonical forms remain consistent

## Common Tasks

**Add isomers for new n**: Run `node index.js <n>` – it resumes automatically from the highest cached size.

**Verify data integrity**: Use `npm run validate:data` before committing new `data/*.json` files.

**Extend viewer's max n**: Viewer auto-detects files up to n=40. To support higher, generate the data file; no code changes needed.

**Debug generation**: Add logging in `lib/generator.js` expansion loop. Check canonical forms match expected patterns from small examples (n=3,4).

**Optimize for larger n**: Generation uses O(trees × vertices × branches) space/time. For n > 20, expect exponential growth. Consider streaming to disk or pruning strategies.

## Testing & CI

- **Manual validation**: `npm run validate:data` (runs `scripts/validate_data.js`)
- **GitHub Actions**: `.github/workflows/validate-data.yml` validates `data/*.json` on push/PR
- No unit test framework currently – validation is integration-level

## Important Constraints

- Carbon valence: degree ≤ 4 enforced everywhere (generator, validator, assumptions)
- Trees only: all generated structures are connected and acyclic
- Unlabeled isomers: canonical form ensures vertex-labeled duplicates are eliminated
- Browser compatibility: viewer uses modern JS (ES6+) and Canvas API; no transpilation
