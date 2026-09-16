# Context index

Notes for anyone picking this codebase up, human or otherwise. Read in this order.

| File | What it covers |
| --- | --- |
| [architecture.md](architecture.md) | Stack, constraints, how data flows from JSON to the page, module responsibilities, and the path to a real backend |
| [design.md](design.md) | Palette, typography, spacing, motion language, and the rules both themes have to satisfy |
| [instructions.md](instructions.md) | Standing rules to follow when changing anything here |

## The short version

A static, frontend-only personal site. Plain HTML, CSS and vanilla JavaScript with ES modules. No
framework, no build step, no backend, no package manager.

All user-facing content lives in JSON under `data/`. The HTML files are empty shells containing
only landmarks and mount points. JavaScript fetches the JSON and renders into those mount points.
If you find yourself typing a sentence of copy into an HTML file, stop and put it in JSON instead.

## Things that are easy to get wrong

- **Template escaping.** The `html` tagged template in `assets/js/utils.js` escapes every
  interpolated value. Helper functions that build markup must return the result of `html` or
  `raw`, never a bare string that was assembled by hand.
- **Serving.** The site needs HTTP. Opening `index.html` from disk fails because `fetch` is
  blocked on `file://`.
- **Client confidentiality.** End-client names must never appear on the site. See
  [instructions.md](instructions.md).
- **Both themes.** Any colour change has to be checked in light and dark. Neither is an
  afterthought.
