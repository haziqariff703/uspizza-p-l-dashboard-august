# Original dashboard baseline

`docs/original-capture.html` is a local capture of the public frontend at https://pl-dashboard-sand.vercel.app/. Its original compiled JavaScript, CSS, fonts, and favicon are stored in `public/`. It includes all seven sections and the original embedded May 2026 dataset. It is not an iframe and does not need the original site to render. It is kept as a visual and data reference only.

`index.html` now serves the exact captured dashboard as requested. All seven sections appear together with the original styles, embedded data, and interactive scripts. The alternate React version is preserved at `/proposal.html` during development; its source remains in `src/`. Editing those React components does not affect the original dashboard at `/`.

Preview: `npm run dev`, then open `http://127.0.0.1:3000/`. Strict port selection prevents silently starting a different preview on 3001. The scripts invoke Node directly to handle the ampersand in the Windows workspace path.

Build: `node ./node_modules/vite/bin/vite.js build`

Verified in the capture: all seven sections render; Sabah entity filtering updates all sections; Grab fees drill down to outlets; gross sales and platform stacking work; selecting Inanam updates its P&L.

The capture's labels, counts, rounding, and data inconsistencies are intentionally retained. This is the deployed compiled frontend, not recovered original React source. Substantial future refinements require recovering that source or reconstructing editable components against this baseline. The original site currently references the same asset filenames as this capture.
