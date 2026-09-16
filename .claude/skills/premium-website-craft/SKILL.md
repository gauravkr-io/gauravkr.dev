---
name: premium-website-craft
description: "Use this skill whenever building, redesigning, or writing content for a website, portfolio, personal site, or landing page that needs to feel premium, polished, and professional. Covers three things together: a professional writing style guide for all website copy (never use semicolons or em dashes, confident and clean tone, no marketing cliches), a reusable animation and interaction pattern library (scroll reveals, hover states, page transitions, easing, reduced motion), and color palette plus responsive design guidance that works in both light and dark mode. Trigger this any time the user asks to build or improve a website, add animations, pick colors, write website copy, or make a site look more professional or premium, even if this skill isn't named directly."
---

# Premium Website Craft

Use this skill any time you build, style, or write copy for a website, portfolio, personal site, or landing page that needs to feel premium and production ready, especially when animation, color choices, or writing quality matter. It covers three things together because a good website has to look right, move right, and read right at the same time.

Jump to the part you need:
- Writing hero text, taglines, service descriptions, blog posts, or any user facing copy: Section 1
- Adding scroll effects, hover states, transitions, or any motion: Section 2
- Picking a color palette or making light and dark mode both look intentional: Section 3
- Making layouts work across phone, tablet, and desktop: Section 4
- Final check before calling a page done: Section 5

---

## 1. Professional Writing Style

### Hard punctuation rules
- Never use a semicolon. Split into two sentences, or join with "and" or "but" instead.
- Never use an em dash (—) inside a sentence. Use a period, a comma, a colon, or parentheses instead, whichever reads most naturally.
- An en dash for a number range (like "2020–2024") is fine. The rule is only about em dashes used as sentence punctuation.

Examples:
- Wrong: "He led the migration; it improved conversion by 20%."
- Right: "He led the migration. It improved conversion by 20%."
- Wrong: "The redesign — which touched every page — cut load time in half."
- Right: "The redesign touched every page and cut load time in half."

### Tone
- Confident, clear, and human. Write like a skilled engineer explaining their own work to a smart peer, not like a marketing brochure.
- Avoid hype words: guru, ninja, rockstar, world class, cutting edge, revolutionary, 10x, best in class.
- Avoid filler openers like "In today's fast paced digital world" or "In the ever evolving landscape of."
- Prefer short, direct sentences over long compound ones. If a sentence seems to need a semicolon or an em dash to hold together, that's usually a sign it should be two sentences.
- Let concrete facts and numbers carry the credibility instead of adjectives. "Cut checkout time by 20%" beats "blazing fast checkout."
- Use active voice. "Gaurav built the API" beats "The API was built by Gaurav."

### Structure
- Headlines: five to nine words, no ending punctuation unless it's a question.
- Body paragraphs: two to four sentences. Break up anything longer.
- Bullet points: start with a strong verb, keep each one to one line where possible.
- Read every piece of copy out loud once before finalizing it. If you stumble over a sentence, rewrite it.

---

## 2. Animation and Interaction Patterns

### Principles
- Every animation needs a purpose: draw attention, confirm an action, or show a relationship between elements. Animation for its own sake gets cut.
- Keep most transitions between 150ms and 400ms. Full page transitions can go up to 600ms. Slower than that starts to feel sluggish.
- Use an easing curve, not linear motion, for anything that isn't a progress bar. Use ease-out for things entering, ease-in for things leaving, and ease-in-out for things moving in place.
- Always respect `prefers-reduced-motion`. Wrap decorative animation in that media query and fall back to a simple fade or no animation at all.

### A reusable pattern set
1. **Scroll reveal**: elements fade in and rise 20 to 30px as they enter the viewport, staggered by 60 to 100ms per sibling. Use an IntersectionObserver, not a scroll event listener.
2. **Hover lift**: cards lift 4 to 8px and gain a slightly larger shadow on hover, with a 200ms ease-out transition. Never pair a lift with a color change that hurts contrast.
3. **Button press**: buttons scale down slightly (about 0.97) on the active state and back up on release, for tactile feedback.
4. **Text reveal**: split a headline into words or lines and fade or rise them in on entry, for hero sections only. Use once per page at most so it stays special.
5. **Page transition**: a brief fade or slide (200 to 300ms) between page loads, so navigation doesn't feel like a hard reload. Keep the header fixed and unaffected if possible.
6. **Arrow or icon nudge**: on hover, an arrow icon in a CTA or card moves 4 to 6px in its direction of travel. This alone often makes a card feel clickable.
7. **Theme toggle transition**: color and background properties transition over 200 to 300ms when switching light and dark mode, so the switch feels deliberate rather than jarring.
8. **Parallax**: use at most once per page, at a subtle rate (background moving at 50 to 70% of scroll speed), and never on text that needs to stay readable.

### What to avoid
- Bouncing, spinning, or elastic easing on professional content. Save that for playful brands, not engineering portfolios.
- Animating more than a handful of elements on screen at once.
- Blocking user interaction while an animation plays.
- Auto playing carousels without a visible pause control.

---

## 3. Color and Visual Design

### Building a palette that works in both themes
- Start from one or two brand colors and build a full scale (roughly 50 to 900 shades) for each, so light mode uses the light end and dark mode uses the dark end of the same hue family. This keeps the brand identity consistent instead of looking like two unrelated sites.
- Background and surface colors should differ by theme on purpose, not just invert. Dark mode should use a dark neutral, like a deep charcoal or navy rather than pure black, with slightly lighter "elevated" surfaces for cards, so there's a real sense of depth.
- Keep body text contrast above 4.5:1 against its background in both themes, and headline text above 3:1 at large sizes. Check both themes separately.
- Pick one accent color for calls to action and interactive states, and use it sparingly. A palette with too many competing accent colors reads as chaotic rather than premium.
- Gradients, when used, should stay within one or two related hues rather than spanning the whole color wheel, and should stay subtle rather than dominate the design, unless a bold hero gradient is a deliberate choice.

### Typography pairing
- One display or heading typeface and one body typeface is normally enough. Headline weight should be bold to semibold, body weight should be regular, with medium used sparingly for emphasis.
- Keep a consistent type scale, for example a 1.25x or 1.333x ratio between sizes, so headings and body text feel intentionally related rather than randomly sized.

---

## 4. Responsive Design

### Breakpoints (a solid default set)
- Mobile: up to 575px
- Large mobile or small tablet: 576 to 767px
- Tablet: 768 to 991px
- Desktop: 992 to 1279px
- Large desktop: 1280px and up

### Rules
- Design mobile layouts on purpose. Don't just let a desktop grid collapse into a single column with nothing else changed. Hero text size, spacing, and image treatment all deserve a second look on small screens.
- Use fluid typography (CSS `clamp()`) for headlines so they scale smoothly between breakpoints instead of jumping in fixed steps.
- Touch targets (buttons, links, nav items) should be at least 44px by 44px on mobile.
- Navigation collapses into a clean mobile menu below 768px. Don't just shrink a horizontal nav bar until it wraps awkwardly.
- Test every interactive component (cards, forms, toggles) at the smallest supported width before calling a page done.
- Images and video should never overflow their container. Use `max-width: 100%` and an appropriate `object-fit` value.

---

## 5. Quick self-check before calling any page done
- Scan the copy for semicolons and em dashes and remove every one.
- Confirm every animation serves a purpose, and that the page still works cleanly with `prefers-reduced-motion` turned on.
- Confirm the color palette passes contrast checks in both light and dark mode, not just one.
- Confirm the layout looks intentionally designed at mobile width, not just shrunk from desktop.
