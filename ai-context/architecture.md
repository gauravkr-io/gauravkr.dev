# Architecture

## Stack and constraints

Plain HTML, CSS and vanilla JavaScript. The standing constraint for this phase is no backend, no
database, no framework and no build pipeline. Nothing here needs installing before it runs.

Two external dependencies load from a CDN:

- **Google Fonts** for Space Grotesk and Inter.
- **Bootstrap 5.3 grid build** (`bootstrap-grid.min.css`), which is the grid and layout utilities
  only, not the full framework.

The grid-only Bootstrap build is deliberate. The brief allowed Bootstrap, but pulling the whole
framework in would have added roughly 200KB of component CSS the site does not use, and its
component styles are exactly what makes a site look like a template. Layout comes from CSS grid
and flexbox, and every component is custom.

## Why ES modules

Modules keep each render concern in its own file and let `main.js` import page controllers
dynamically, so a visitor only downloads the code for the page they opened. The trade-off is that
the site must be served over HTTP. That was already true because content is fetched as JSON, so
modules cost nothing extra.

## Data flow

```
data/*.json
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
the `<body>` element, and dynamically imports the matching controller.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `utils.js` | The `html` template, escaping, DOM helpers, date formatting, slug validation, metadata |
| `icons.js` | Inline SVG for interface chrome, so icons inherit colour and follow the theme |
| `data-loader.js` | Every read of `data/`. Caches by path and dedupes in-flight requests |
| `components.js` | Shared presentational pieces: section headings, page headers, chips, CTA band |
| `render-navigation.js` | Header, mobile menu and footer, plus sticky and menu behaviour |
| `theme-toggle.js` | Theme switching and persistence after first paint |
| `scroll-animations.js` | Scroll reveal, page transitions, article scrollspy |
| `render-home.js` | Homepage composition |
| `render-about.js` | About page, including work history |
| `render-services.js` | Service cards, overview page, detail template |
| `render-projects.js` | Case study cards |
| `render-blogs.js` | Post cards, list filtering, post template and content blocks |
| `render-courses.js` | Course cards, list filtering, course template |
| `render-technologies.js` | Technology stack grid |
| `render-contact.js` | Contact page and form validation |
| `main.js` | Bootstrap and page dispatch |

Three modules go beyond the original file list (`components.js`, `render-home.js`,
`render-about.js`, `render-contact.js`). They exist because the homepage, About page and Contact
page each need composition logic, and putting it in `main.js` would have made that file the
dumping ground the rest of the structure is designed to avoid.

## Security in the render layer

The site takes a `slug` from the query string on three detail pages, which is the only untrusted
input in the system. Two defences apply:

1. `getSlugParam` in `utils.js` rejects anything that is not lower-case kebab case, so a crafted
   value cannot escape the data directory when it is used to build a fetch path.
2. The `html` tagged template escapes every interpolated value by default. Producing raw markup
   requires an explicit `raw()` call, which makes those sites easy to find and review.

Blog and course content is stored as typed blocks rather than HTML strings. The renderer decides
what markup each block becomes, so editing content cannot introduce markup by accident. Inside
prose, only `` `code` `` and `**bold**` are interpreted, and the text is escaped before those
patterns are applied.

## Theme handling

Both theme files load on every page. `theme-light.css` defines its palette on `:root` and
`[data-theme="light"]`, and `theme-dark.css` defines its own on `[data-theme="dark"]`.

A small inline script in each page head resolves the theme before first paint, reading
`localStorage` and falling back to the system preference. Because the attribute is always set
explicitly, the CSS needs no media query and there is no flash of the wrong palette.

`theme-toggle.js` takes over after load. It follows the system preference only while the visitor
has made no explicit choice.

## Moving to a backend

The JSON files are already shaped like API responses, for example `{ "services": [ ... ] }` rather
than a bare array. Migration should be contained to `data-loader.js`:

1. Change `resolveUrl` to point at the API base instead of the `data/` directory.
2. Adjust the accessor functions if the endpoints do not map one to one onto the current files.
3. Leave the render modules alone. They receive plain objects and do not know where they came
   from.

The contact form is the one piece that assumes no backend. It validates properly and then composes
a `mailto:` link rather than posting. Pointing it at an endpoint means replacing the submit branch
in `render-contact.js` and nothing else.

## Known trade-offs

- **Content needs JavaScript.** Search engines execute JavaScript, but a static pre-render would
  still index better. The JSON-LD block on the homepage and full metadata on every page mitigate
  this. A build step that pre-renders the JSON into HTML is the natural next step if SEO matters
  more later.
- **Query-string URLs.** `blog-post.html?slug=x` rather than `/blogs/x`, because without a build
  step there is no way to generate a file per post. This is a hosting-level rewrite at deploy time.
- **Two CDN dependencies.** Fonts and the Bootstrap grid. Both could be vendored locally if
  offline resilience matters more than cache sharing.
