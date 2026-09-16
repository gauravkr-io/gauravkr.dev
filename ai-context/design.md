# Design direction

## The idea

Engineer, architect, builder, problem solver. The visual language borrows from technical drawing:
a faint measured grid, corner brackets on featured surfaces, monospaced-feeling uppercase labels,
and abstract system diagrams instead of stock photography.

The result should read as premium, technical, human and confident. Never flashy. A recruiter
skimming for thirty seconds, a prospective client assessing depth, and a developer reading a post
all need to be served by the same page.

## Colour

One brand family and one accent, each built as a full 50 to 950 scale so both themes draw from the
same hues rather than looking like two unrelated sites.

- **Ink** is a cool blue-leaning neutral. It carries type in light mode and becomes the ground in
  dark mode.
- **Amber** is the single accent, chosen to sit with the warm interior light in the portrait. It
  is reserved for interactive state, eyebrow labels, metrics and emphasis.

Primary buttons use maximum contrast against the background rather than the accent: near-black in
light mode, near-white in dark mode. That keeps amber meaningful instead of decorative.

### Contrast, measured against each theme background

| Token | Light | Dark |
| --- | --- | --- |
| `--text-strong` | 17.1:1 | 16.4:1 |
| `--text` | 12.2:1 | 11.9:1 |
| `--text-secondary` | 7.6:1 | 8.1:1 |
| `--text-muted` | 4.9:1 | 4.8:1 |
| `--accent-strong` | 6.1:1 | 9.3:1 |

Body text stays above 4.5:1 in both themes. Check any colour change in both, not just the one you
are looking at.

### Dark mode is designed, not inverted

The dark ground is a deep blue-charcoal rather than black, and surfaces step up in lightness as
elements sit higher (`--bg` → `--surface` → `--surface-raised`). That gives real depth. Shadows
alone do not read on a dark ground, so elevation comes from the surface steps plus a border.

## Typography

- **Space Grotesk** for display, headings, buttons, labels and anything with a technical tone.
- **Inter** for body copy and long-form reading.

No third typeface. Small uppercase labels use Space Grotesk with wide letter-spacing rather than a
monospace face, which keeps the payload down and the voice consistent.

The scale uses a 1.25 ratio for body steps. Display sizes are fluid via `clamp()` so headlines
scale smoothly between breakpoints instead of jumping.

Measure is capped deliberately: 44rem for article prose, 62 to 68 characters for body paragraphs,
and around 20 characters for large headlines so they break into strong lines.

## Motion

Purposeful only. Every effect draws attention, confirms an action or shows a relationship.

| Pattern | Detail |
| --- | --- |
| Scroll reveal | Fade and rise 22px, staggered 70ms per sibling, capped at six steps. Uses `IntersectionObserver` |
| Hover lift | Cards rise 4 to 6px with a larger shadow over 240ms |
| Button press | Scales to 0.975 on active |
| Arrow nudge | Icons in links and CTAs move 4px on hover |
| Page transition | A 220ms fade veil before navigation |
| Theme switch | Background and colour transition over 240ms |

Easing is `ease-out` for entering, `ease-in` for leaving, `ease-in-out` for moving in place. No
bounce, no elastic, no spin. Durations sit between 150ms and 400ms, and page transitions go no
higher than 480ms.

Everything decorative is wrapped in `prefers-reduced-motion`. The reveal system falls back to
visible content, the page veil is removed entirely, and hover lifts are disabled.

## Layout

Breakpoints in rem, matching the token file:

| Range | Behaviour |
| --- | --- |
| Up to 36rem | Single column. Hero portrait shrinks, padding tightens |
| 36 to 52rem | Cards begin pairing |
| 52 to 62rem | Two-column split headings, work cards go side by side |
| 62rem and up | Full navigation, sticky detail sidebars, two-column hero |

Mobile is designed rather than collapsed. The hero reorders, the navigation becomes a full-screen
panel with numbered items, and type sizes are tuned rather than merely scaled down.

### A layout trap worth knowing

Grid and flex children default to `min-width: auto`, which lets a wide piece of min-content push a
track past the viewport and create horizontal scroll. The layouts that hold prose, chips or form
controls carry an explicit `min-width: 0`. If you add a new grid layout, add it to that rule in
`styles.css` and check the page at 390px.

## Imagery

No stock photography. Two sources only:

1. **The portrait.** Presented in an arch frame with a fine rule, a dashed outer ring and a
   location tag. Never distorted or retouched.
2. **Generated artwork.** Abstract technical visuals built from one vocabulary: ink gradient
   ground, faint grid, connecting nodes, layer planes, flow stages, a settling latency curve, and
   amber highlights. Geometry is seeded from the slug so each image is distinct but the family
   holds together.

Technology marks come from simple-icons, which is CC0 licensed, stored locally and rendered
through a CSS mask so they inherit the current text colour. Entries with no official mark fall
back to a monogram, which keeps the grid even.
