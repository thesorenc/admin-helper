# OMFS Note Builder

A deterministic, zero-PHI web app that turns OMFS markdown templates into fillable forms
and assembles paste-ready clinical text and patient handouts.

- No backend, no database, no LLM. Fully client-side and offline-capable.
- Handles only generic, non-identifying clinical values (procedure, side, tooth #,
  hardware, measurements). Patient identifiers stay as EHR placeholders for MHS GENESIS.
  Nothing typed in the app is transmitted; the working case lives in sessionStorage and
  clears when the tab closes.

## Tabs
- **Case builder** — add procedure atoms to a case, fill their fields once, and generate
  every document from the same case: Operative Note (with header checklist), Pre-op and
  per-procedure Post-op handouts (print / PDF), a consolidated interactive Rx (check the
  orders you're prescribing), and the OR team pull sheet (editable before printing).
- **Exam** — an Epic-NoteWriter-style physical exam + review of systems builder: mark
  findings ＋/− per system, add per-finding notes, and copy a paste-ready PE/ROS block.
  "All systems normal" fills everything you haven't touched as pertinent negatives.
- **Library** — search all components/templates; copy; export PowerChart Auto Text;
  download .md.

Ctrl/Cmd+Enter copies the active output panel on any tab.

## Develop
```bash
npm install
npm run build:content      # parse the vault -> src/content/*.generated.json (see VAULT_PATH)
npm run dev                # http://localhost:5173
npm test                   # tokenizer / assembler / exam / store / UI smoke tests
```

## How content flows
There are two content models:

1. **Vault markdown (Case builder + Library).** The single source of truth is a local
   Obsidian vault; `scripts/build-content.ts` parses every template with
   `src/lib/tokenizer.ts` into typed `ParsedComponent` JSON committed under
   `src/content/`. Production builds and the deploy host never need the vault.
   `build:content` reads the vault read-only; override the maintainer's default path with:
   ```bash
   VAULT_PATH="/path/to/OMFS" npm run build:content
   ```
   `prebuild` runs `build:content --check`: it fails on drift (or duplicate/dangling
   content ids) when the vault is present, and skips cleanly when it is not.
2. **Typed repo config (Exam builder).** The PE/ROS systems and findings are a typed
   config in `src/lib/exam/content.ts` — edit it directly; no vault, no build step.
   Button labels are deliberately decoupled from the emitted note text, so relabeling
   never touches the tested assembler.

## Build & deploy (static)
```bash
npm run build && npm run preview
```
Deploy `dist/` to any static host (Netlify / Vercel: base `/`). The app uses a hash
router, so deep links work with no server rewrites. For GitHub Pages set the base path:
```bash
DEPLOY_BASE=/admin-helper/ npm run build
```
Pushing to `main` auto-deploys to GitHub Pages after the same gates CI runs (lint, tests,
content check, typecheck + build). A weekly `security-audit` workflow watches the full
dependency tree; CI blocks only on advisories in shipped (production) dependencies.

## Architecture
- `src/lib/tokenizer.ts` — balanced-bracket placeholder parser (sides, tooth #s,
  measurements, hardware, enums, smartlinks left verbatim, flags surfaced as warnings).
- `src/lib/assembler.ts` + `normalize.ts` — fill + plain-text normalization (no
  em-dashes, no markdown emphasis) + missing/header blocks.
- `src/lib/caseAssembly.ts` — composes atoms into the per-case documents (op note,
  post-op, Rx, pull sheet).
- `src/lib/exam/` — exam content config, types, and the pure PE/ROS assembler.
- `scripts/build-content.ts` — vault → JSON pipeline with integrity lint.
- `src/state/` — Zustand stores (sessionStorage-persisted, content-signature guarded).
- `src/routes/` — the three tabs; `src/components/` — editors and output panels.
