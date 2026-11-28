# Architecture

## Stack and constraints

The browser runs plain HTML, CSS and vanilla JavaScript with ES modules. There is no framework in
the browser and no runtime backend.

A Node build step exists as a development tool. It validates the content, copies the site into
`dist/`, and generates the files a crawler or a link preview needs without running any script. The
output is ordinary static files, so any static host serves it.

Build tools (all dev dependencies, none reach the visitor): `markdown-it` and its container plugin
for post bodies, `gray-matter` for front matter, `sharp` for link preview images, `cheerio` for the
parity check and `js-yaml` for the editor config check.

External resources the pages load:

- **Google Fonts** for Inter.
- **Bootstrap 5.3 grid build** (`bootstrap-grid.min.css`), the grid and layout utilities only. The
  grid-only build is deliberate. The full framework would add roughly 200KB of component CSS the
  site does not use, and its component styles are what makes a site look like a template.
- **mermaid** from a CDN, loaded only on a post that contains a diagram.
- **Sveltia CMS** from a CDN, only on `/admin`, pinned with an integrity hash.
- **YouTube** thumbnails on the Videos page, and the player only after a click.
- **Cloudflare Web Analytics**, only when switched on in `data/site.json`.

## Build pipeline

```
content/posts/*.md ──┐
data/**/*.json ──────┤  scripts/validate.mjs   every problem reported with its file
admin/config.yml ────┘          |
                                v
                      scripts/build.mjs
   copy index.html, pages, links, admin, assets, data, resume, _headers, _redirects
   write dist/data/blogs/posts-index.json            (the blog list reads this)
   write dist/blogs/<slug>/index.html                (one static page per post)
   write dist/assets/images/og/<slug>.jpg            (1200 x 630 link preview)
   write dist/sitemap.xml, rss.xml, robots.txt
   add ?v=<hash of the CSS and JS> to every stylesheet and script address, and fail on any left out
```

`validate` runs first and the build stops if it finds anything. A failed rebuild in the dev server
leaves the last good `dist/` in place.

A post is published when it is visible, is not a draft, and its date is today or earlier (UTC). Held
posts are left out of the index, the pages, the sitemap and the feed.

| Script | Responsibility |
| --- | --- |
| `scripts/build.mjs` | Orchestrates validation, copying and generation |
| `scripts/validate.mjs` | Schema and link checks for the data files, site settings, navigation and posts |
| `scripts/lib/markdown.mjs` | Markdown to HTML with the site's classes, callouts, figures, diagrams |
| `scripts/lib/posts.mjs` | Reads posts, applies the publish rules, validates each one |
| `scripts/lib/post-page.mjs` | Builds a post page with its meta tags and Article JSON-LD |
| `scripts/lib/og.mjs` | Makes the 1200 x 630 JPEG preview image from a cover |
| `scripts/lib/discovery.mjs` | Sitemap, feed and robots file |
| `scripts/dev.mjs`, `preview.mjs` | Dev server that rebuilds on change, and the static server |
| `scripts/check-prose.mjs` | Writing rules and the blocked client name list |
| `scripts/check-admin.mjs` | Keeps the editor config in step with the data files |
| `scripts/parity.mjs` | Compares each post with its pre-Markdown baseline in `tests/parity/` |

## Runtime data flow

```
dist/data/*.json
    ↓  fetch, cached per path
assets/js/data-loader.js
    ↓  plain objects
assets/js/render-*.js        build markup with the html`` template
    ↓  markup strings
mount() → innerHTML into a #mount-point in the page shell
    ↓
refreshScrollReveal()        observes the newly inserted elements
```

`main.js` is the entry point for every page. It renders the shared chrome, reads `data-page` from
the `<body>` element, and dynamically imports the matching controller. Pages with
`data-chrome="none"` (the links page) skip the header and footer.

## Post pages

Each post page is written at build time. The heading block, the article and every social tag are in
the HTML itself, so a crawler or a link preview sees them without JavaScript. The page uses the same
markup and classes the old browser renderer produced.

On load, `initBlogPostPage` finds `data-prerendered` on the post body and does not render the
article again. It only wires up the parts that need a browser: the table of contents scroll tracking,
copy link and mermaid diagrams. The header and footer are drawn by the shared script as on any page.

The old address `/pages/blog-post.html?slug=...` forwards to `/blogs/<slug>/`. Cloudflare redirect
rules cannot match a query string, so the forward is a script on that page. An unknown or malformed
slug shows a "Post not found" state and never redirects.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `utils.js` | The `html` template, escaping, DOM helpers, date formatting, slug validation, metadata |
| `icons.js` | Inline SVG for interface chrome, so icons inherit colour and follow the theme |
| `data-loader.js` | Every read of `data/`. Caches by path, dedupes in-flight requests, applies `visible` and `order` |
| `components.js` | Shared pieces: section headings, page headers, chips, CTA band |
| `render-navigation.js` | Header, mobile menu and footer, the brand lockup, sticky and menu behaviour |
| `theme-toggle.js` | Theme switching and persistence after first paint |
| `scroll-animations.js` | Scroll reveal, page transitions, article scrollspy |
| `render-home.js` | Homepage composition, the hero and the floating technology cards |
| `render-about.js` | About page, including work history |
| `render-services.js` | Service cards, overview page, detail template |
| `render-projects.js` | Case study cards |
| `render-blogs.js` | Post cards, list filtering, post page behaviour and the old address forward |
| `render-videos.js` | Video cards and the click to load player |
| `render-links.js` | The links page |
| `render-courses.js` | Course cards, list filtering, course template |
| `render-technologies.js` | Technology stack grid |
| `render-contact.js` | Contact page and form validation |
| `analytics.js` | Loads the Cloudflare beacon when enabled |
| `render-clear-cache.js` | The `/clear-cache/` page |
| `main.js` | Bootstrap and page dispatch |

## Security in the render layer

Untrusted input reaches the site in three places, and each has a defence.

1. **Slugs in the query string.** `getSlugParam` rejects anything that is not lower-case kebab case,
   so a crafted value cannot escape the data directory or trigger a redirect to somewhere else.
2. **Template escaping.** The `html` tagged template escapes every interpolated value by default.
   Producing raw markup requires an explicit `raw()` call, which makes those sites easy to review.
   The build uses the same escaping rule for everything it writes.
3. **Post bodies.** Raw HTML is switched off in the Markdown renderer, so authors write Markdown
   and cannot introduce markup. Headings carry an anchor id made from their text, and JSON-LD escapes
   `<` so a title can never close the script tag.

Data files and links are also validated at build time. Link addresses must start with `https://`,
`http://`, `mailto:` or `/`, which rules out `javascript:` addresses.

## Theme handling

Both theme files load on every page. `theme-light.css` defines its palette on `:root` and
`[data-theme="light"]`, and `theme-dark.css` defines its own on `[data-theme="dark"]`.

A small inline script in each page head resolves the theme before first paint, reading
`localStorage` and falling back to the system preference. Because the attribute is always set
explicitly, the CSS needs no media query and there is no flash of the wrong palette.

`theme-toggle.js` takes over after load. It follows the system preference only while the visitor
has made no explicit choice.

The locked sky and cloud backdrop on the hero belongs to the light theme only. Dark mode keeps its
own deep indigo atmosphere.

## The editor

`/admin` is Sveltia CMS. It reads `admin/config.yml` and commits changes to the GitHub repository
through a sign-in Worker you deploy yourself. See [editor-setup.md](editor-setup.md). The config
lists every field of the files it edits, and `check:admin` fails if a file gains a key the config
does not know, because saving in the editor could drop it.

## Known trade-offs

- **Shared chrome needs JavaScript.** Post pages carry their full content in the HTML, but the
  header and footer, and the other pages, are drawn by script. Pre-rendering the remaining pages
  would be the next step if search visibility for them matters.
- **Posts need a build.** Adding a post means running the build, which Cloudflare does on every
  commit. The dev server rebuilds on save.
- **Versioned, not renamed, assets.** CSS and JS keep their file names. The build adds `?v=<hash>` to
  every reference, in the pages and in the scripts' imports, and fails if one is missed. That is what
  makes the year-long cache in `_headers` safe. A reference built by hand at runtime would escape the
  versioning, so do not write one.
- **Clearing the cache by address.** `/clear-cache/` sends `Clear-Site-Data: "cache"`. Chrome and
  Edge honour it. Safari and Firefox do not.
- **Scheduled posts need a rebuild.** A future date takes effect on the first build on or after it.
- **Detail pages for services and courses** still use `?slug=` and are not in the sitemap.
- **Three CDN dependencies at runtime**, fonts, the Bootstrap grid and mermaid. All could be vendored
  if offline resilience matters more than cache sharing.
