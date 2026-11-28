# Design direction

## The idea

A light, glassy technology brand. A pastel sky with clouds and hills sits behind the hero, frosted
glass surfaces float above it, and the indigo from the GK logo is the one accent. It should read as
premium, calm and confident, and it should serve a recruiter skimming for thirty seconds, a
prospective client judging depth, and a developer reading a post.

The approved reference is `ai-context/reference/hero-reference.png` (1672 x 941). The homepage hero
and the header were built to match it. `hero-render.png` in the same folder is the rendered sky
backdrop.

## Locked assets

These were generated and approved. Do not redraw, recolour, resize or recompress them.

| File | Role |
| --- | --- |
| `assets/css/hero-background.css` | Sky, haze, grid, hills and cloud layer, light theme only |
| `assets/images/backgrounds/hero-clouds.webp` | The drifting cloud layer |
| `ai-context/reference/hero-reference.png` | The approved design |

`assets/images/backgrounds/hero-render.webp` is the same sky as one small image (41KB), made from
the approved render. The hero uses it as its background, with the cloud layer drifting above.

The hero markup is exactly `<div class="hero-backdrop"><div class="hero-backdrop__clouds"></div></div>`
inside the positioned hero, with the content in a sibling above it at `z-index: 1`.

## Colour

Tokens live in `theme-light.css` and `theme-dark.css`. The hero and header have their own literal
values, measured from the reference by pixel sampling, in `assets/css/hero-glass.css`.

- **Accent** is the indigo violet from the logo: `#5B35E8` with a stronger `#4A27D4` in light, and a
  lighter `#A596FF` in dark. The primary button is a gradient from `#6523e2` through `#6258f5` to
  `#3644ec`.
- **Warm amber** is kept for two things only, the availability badge and the role line under the
  name.
- **Text** in the hero uses the measured values, for example `#000001` for the name, `#000025` for
  the headline, `#0f01f3` for the word "Scale." and `#a14800` for the role line.

### Contrast, measured against the theme base

| Token | Light (`#D6E2FC`) | Dark (`#0A0D26`) |
| --- | --- | --- |
| `--text-strong` | 15.1:1 | 17.3:1 |
| `--text` | 11.4:1 | 13.7:1 |
| `--text-secondary` | 8.0:1 | 9.6:1 |
| `--text-muted` | 5.8:1 | 6.4:1 |
| `--accent-strong` | 6.4:1 | 8.8:1 |

In light mode the sky is deeper blue toward the top right (about `#8BADF8`). There `--text-muted`
measures only 3.4:1, so small muted labels should stay out of that corner or sit on a glass surface.

All 23 text and glass pairings in the hero and header were also measured from rendered pixels and
pass WCAG at their size in both themes. Check any colour change in both themes.

### Dark mode is designed, not inverted

Dark is a deep indigo night with the same glass language. Surfaces are translucent white over the
ground, so depth comes from light rather than from shadow. The locked sky backdrop is not used in
dark mode.

## Glass

Every glass surface follows one recipe: a translucent white fill, `backdrop-filter: blur(16px)
saturate(150%)`, a 1px light border, a soft cool shadow, and an inner top highlight.

| Surface | Fill |
| --- | --- |
| Navigation pill | A gradient from 64% to 40% white, left to right |
| Resume button | 67% white |
| Theme toggle | 29% white |
| Chips | 80% white |
| Secondary button | 45% white |
| Location pill | 51% white |
| Floating technology cards | 58% white. The measured 28% reads grey over the dark photo |
| Portrait frame ring | 22% white, about 12px thick, with a soft outer glow |

Where `backdrop-filter` is not supported, the fills become more opaque so text stays readable.

## Typography

**Inter** for everything. Weights run 400 to 800. The name is 800, the headline 600, body 400.

Desktop sizes in the hero come from the reference and were tuned by measuring rendered text widths
against it, because Inter is wider than the font in the mockup. Name 90px, role line 27px, headline
64px, body 22px, at the 1672px design width. They scale with the viewport width down to 1024px.

## Hero geometry

Desktop layout is written in `--u`, one reference pixel, which is `100vw / 1672` capped at `1px`.
The hero is `941 * --u` tall, so it keeps the reference proportions at every width up to 1672px.
Positions of the navigation pill, badge, text, buttons, portrait frame, location pill and the seven
technology cards come straight from the reference coordinates.

Below 1024px the hero stacks to one column. The portrait goes under the text and the technology
cards become a tidy wrapped row.

The three hero statistics sit in a glass strip in their own section just below the hero.

## Motion

Purposeful only. Every effect draws attention, confirms an action or shows a relationship.

| Pattern | Detail |
| --- | --- |
| Backdrop drift | Clouds and hills move slowly sideways over 22 to 40 seconds |
| Floating cards | The technology cards drift up and down about 8px on staggered timings |
| Scroll reveal | Fade and rise 22px, staggered 70ms per sibling, capped at six steps |
| Hover lift | Cards rise 4 to 6px with a larger shadow over 240ms |
| Button press | Scales to 0.975 on active |
| Arrow nudge | Icons in links and CTAs move 4px on hover |
| Page transition | A 220ms fade veil before navigation |
| Theme switch | Background and colour transition over 240ms |

Easing is `ease-out` for entering, `ease-in` for leaving, `ease-in-out` for moving in place. No
bounce, no elastic, no spin.

Everything decorative is wrapped in `prefers-reduced-motion`. The backdrop drift and the floating
cards stop, the reveal system falls back to visible content, the page veil is removed, and hover
lifts are disabled.

## Layout

| Range | Behaviour |
| --- | --- |
| Up to 36rem | Single column. The hero portrait fills the width |
| 36 to 64rem | Cards begin pairing. The hero stays stacked |
| 64rem and up | Full navigation pill and the two-column hero from the reference |

Mobile is designed rather than collapsed. The navigation becomes a full-screen panel with numbered
items, and type sizes are tuned rather than merely scaled down.

### A layout trap worth knowing

Grid and flex children default to `min-width: auto`, which lets a wide piece of min-content push a
track past the viewport and create horizontal scroll. The layouts that hold prose, chips or form
controls carry an explicit `min-width: 0`. If you add a new grid layout, add it to that rule in
`styles.css` and check the page at 390px.

## Imagery

- **The portrait.** The real photo in a glass ring and a rounded frame with a thin decorative arc.
  Never replaced, distorted or retouched.
- **Technology cards.** Single-colour marks rendered through a CSS mask so they take their brand
  colour from data. Redis and Payments are drawn for the site and are not the official marks.
- **Generated artwork** for posts, courses, services and projects. Abstract technical visuals in an
  indigo ground with lavender highlights, seeded from the slug so each image is distinct.
- **Link previews.** Each post gets a 1200 x 630 JPEG made at build time from its cover.
