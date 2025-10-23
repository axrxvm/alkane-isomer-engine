# Alkane Isomers Calculator

Enumerate structural (unlabeled) isomers of alkanes (C\_nH\_{2n+2}) by generating all unlabeled trees with maximum degree ≤ 4. Includes a CLI to compute counts and cache results, plus a lightweight web viewer to browse and visualize the isomers.

## Features

- Fast enumeration of unlabeled trees with degree ≤ 4 (alkane carbon skeletons)
- Canonical labeling via tree centers + AHU encoding to avoid duplicates
- Checkpointing to `data/size_*.json` so runs can resume and the web viewer can load data
- Zero external dependencies; works with plain Node.js and a static file server
- Simple, responsive UI to page through and download isomer images

## Quick start

Requirements: Node.js 16+ (CommonJS). No dependencies to install.

### CLI (counts and generation)

- Usage:

```powershell
node index.js <n>
```

- Example (n = 10):

```text
Structural isomers of C10H22: 75
```

- Behavior:
  - Generates all unique trees of size `n` with degree ≤ 4 using canonical forms.
  - Saves the full set of adjacency lists to `data/size_<n>.json`.
  - If previous sizes exist (e.g., up to `size_20.json`), the run resumes from the latest size and expands to `n`.

> Tip: Data files for n = 1…20 are included. Computing larger n can take increasingly long and use more memory.

### Web viewer (browse and visualize)

Open the interactive viewer in a browser and explore the cached isomers.

1) Serve this folder over HTTP (browsers block `file://` fetches):

- With VS Code Live Server (recommended): Right‑click `index.html` → "Open with Live Server"
- Or with a quick static server:

```powershell
npx http-server -p 8080
```

2) Visit http://localhost:8080 (or your Live Server URL), then:

- Use the Carbons (n) input or slider (1–20) to choose a size
- Adjust cards per page; pagination appears automatically for large sets
- Click any card’s download icon to save a PNG snapshot of that isomer

## Data format

Files are written to `data/size_<n>.json` as a JSON array of adjacency lists:

```jsonc
[
  // One isomer (tree) per entry
  [[1], [0,2], [1]]
]
```

- `adj[i]` is an array of 0‑based indices of neighbors of vertex i
- Each adjacency list represents a connected, acyclic graph (tree)

## Programmatic use (library API)

You can call the generator from Node to get counts and the canonical set in memory:

```js
const { generateIsomerCount } = require('./lib/generator');

const { count, canonicalSet } = generateIsomerCount(10, { resume: true });
console.log(count); // 75
// canonicalSet is an array of objects: [{ adj: number[][] }, ...]
```

Options:
- `resume` (default true): resume from the latest cached size found in `data/`.

## How it works (briefly)

- Generation expands trees of size `k` to `k+1` by attaching a new vertex to any vertex with degree < 4.
- Each candidate is reduced to a canonical form using:
  - tree centers (1–2 nodes) and
  - AHU rooted-tree encoding; the lexicographically minimum encoding across centers is used.
- A hash map keyed by canonical strings deduplicates isomers efficiently.

Core files:
- `lib/canonical.js` — centers + AHU encoding and canonical form
- `lib/generator.js` — expand, deduplicate, and persist adjacency lists
- `index.js` — tiny CLI wrapper printing the C\_nH\_{2n+2} count
- `index.html`, `src/` — static viewer that fetches `data/size_<n>.json` and draws isomers on canvas

## Repository structure

```text
.
├─ index.js              # CLI entrypoint
├─ index.html            # Web viewer
├─ data/                 # Cached isomer sets: size_1.json … size_20.json
├─ lib/
│  ├─ canonical.js       # Canonical tree encoding
│  └─ generator.js       # Generator + persistence
├─ src/
│  ├─ script.js          # Viewer logic (fetch, paginate, render, download)
│  └─ style.css          # UI styles
└─ package.json          # Metadata (CommonJS)
```

## Development notes

- No build step; everything runs directly in Node/the browser.
- Extending beyond n = 20: run `node index.js <n>`; the generator resumes from the latest available size and writes `data/size_<n>.json`. Expect runtime and memory to grow quickly.
- If you change the generation logic, consider deleting later `data/size_*.json` files to avoid mixing incompatible states.

## Contributing

Contributions are welcome — especially more `data/size_<n>.json` files for larger n so the web viewer and cached counts can include more isomers.

What to add
- Add a file at `data/size_<n>.json` where `<n>` is the integer number of carbon atoms (e.g., `size_21.json`).

File format
- Each file must be a JSON array of adjacency lists (same format the generator writes). Example for n = 3:

```json
[
  [[1], [0,2], [1]]
]
```

- Requirements:
  - Each entry is an adjacency list `adj` where `adj[i]` is an array of 0-based neighbor indices.
  - Each `adj` must represent a tree with n vertices (connected and acyclic).
  - No vertex should have degree > 4 (carbon valence constraint).
  - Neighbor lists must be mutual (if j in adj[i] then i in adj[j]) and length of `adj` must equal `n`.

How to generate and validate locally
- Recommended: use the provided generator so files are canonical and deduplicated. From the project root:

```powershell
node index.js <n>
```

This writes `data/size_<n>.json` for you. Alternatively, programmatic generation example:

```js
const fs = require('fs');
const { generateIsomerCount } = require('./lib/generator');
const { canonicalSet } = generateIsomerCount(21, { resume: false });
fs.writeFileSync('data/size_21.json', JSON.stringify(canonicalSet.map(o => o.adj), null, 2));
```

If you produce a file by hand, please run the generator or a simple validator to ensure trees are valid and degrees ≤ 4 before opening a PR.

Pull request checklist
- Fork the repo and create a branch named like `add-data-size-<n>`.
- Add the `data/size_<n>.json` file to the `data/` directory.
- Include a short note in the PR description: how the data was generated and the exact n.
- If you used the generator, mention the Node.js version you used and whether you ran with `resume: true` or `false`.

Previewing the viewer
- You can preview your added data by serving this folder and opening `index.html`:

```powershell
npx http-server -p 8080
# then visit http://localhost:8080
```

Questions or issues
- If you're unsure about the format or you encounter large memory/runtime issues for big n, open an issue first and provide the `n` you want to add.

Thanks for helping expand the dataset!

## CI: data validation workflow

There is a GitHub Actions workflow (`.github/workflows/validate-data.yml`) that runs whenever files under `data/` change in a push or pull request. The job computes which `data/*.json` files were modified and runs the repository's validator against only those files (falling back to validating all files if none are detected).

Run the validator locally with:

```powershell
npm run validate:data
```

Or validate specific files:

```powershell
node ./scripts/validate_data.js data/size_21.json
```

This helps keep contributed `data/` files well-formed and safe for the viewer.

## License

MIT © Aarav Mehta
