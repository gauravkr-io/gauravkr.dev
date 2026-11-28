# Context index

Notes for anyone picking this codebase up, human or otherwise. Read in this order.

| File | What it covers |
| --- | --- |
| [architecture.md](architecture.md) | Stack, the build pipeline, how content reaches the page, post pages, module responsibilities, security |
| [design.md](design.md) | The glass design, locked assets, colour and contrast, typography, hero geometry, motion, layout |
| [instructions.md](instructions.md) | Standing rules to follow when changing anything here |
| [editor-setup.md](editor-setup.md) | Setting up the browser editor at `/admin`, including the manual Cloudflare and GitHub steps |

## The short version

A static personal site. The browser runs plain HTML, CSS and vanilla JavaScript with ES modules, with
no framework and no runtime backend. A Node build step validates the content and writes the finished
site to `dist/`, including one static page per blog post.

Posts are Markdown files in `content/posts/`. Everything else a visitor reads lives in JSON under
`data/`. The HTML files are empty shells containing only landmarks and mount points, and JavaScript
fetches the JSON and renders into them. If you find yourself typing a sentence of copy into an HTML
file, stop and put it in JSON instead.

Run `npm run dev` to work on it and `npm run check` before you finish.

## Things that are easy to get wrong

- **Template escaping.** The `html` tagged template in `assets/js/utils.js` escapes every
  interpolated value. Helper functions that build markup must return the result of `html` or
  `raw`, never a bare string that was assembled by hand.
- **Serving.** The site needs HTTP, and posts need a build. Use `npm run dev`. Opening files from
  disk fails because `fetch` is blocked on `file://`.
- **Caching.** The build adds `?v=<hash>` to every CSS and JS address, so `_headers` can cache them
  for a year. Reference assets with a plain `/assets/css/...` or `/assets/js/...` path in HTML and a
  relative path in script imports, and never use `@import` in CSS. The build fails on any reference
  it cannot version.
- **Locked assets.** The hero backdrop files are approved and must not be redrawn or recompressed.
- **Client confidentiality.** End-client and project names must never appear on the site. See
  [instructions.md](instructions.md).
- **Both themes.** Any colour change has to be checked in light and dark. Neither is an
  afterthought.
