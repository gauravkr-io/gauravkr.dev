# Standing rules

Rules that apply to every change in this repository.

## Content

**Never hardcode user-facing text in HTML or JavaScript.** Everything a visitor reads comes from
`data/`. The HTML files hold landmarks and mount points, nothing else. If a new section needs copy,
add a field to the relevant JSON file first.

**Never invent professional history.** Employers, titles, dates, metrics, certifications and
technologies come from the résumé and nowhere else. Do not add a technology to the stack because
it would look good. If it is not in the résumé, it does not go on the site.

The three metrics that are real and may be used: 18% lower cart abandonment, 20% higher checkout
conversion, 28% better cart-to-checkout.

**Never name end clients.** Employer names are fine and expected: Litmus7, Valtech, Merkle
(Dentsu), Katsam Group. The companies those employers built for are confidential and are described
by sector instead, for example "a global luxury fashion house" or "a US specialty retailer". This
applies to every surface: case studies, work history, blog posts and metadata.

**Demo content must be honest.** The blog posts and courses shipped with the site are written as
real, useful material rather than filler, but nothing may claim a publication history it does not
have, and no course may imply it is live, enrolled or has students. Courses carry a `status` field
saying they are in development.

## Writing style

- No semicolons and no em dashes in prose. Use a period, a comma, or split the sentence. En
  dashes in ranges like 2020–2024 are fine.
- Confident and clear, the way a skilled engineer explains their own work to a peer. Not a
  brochure.
- No hype words: guru, ninja, rockstar, world class, cutting edge, revolutionary, 10x, best in
  class.
- Let numbers carry credibility rather than adjectives.
- Active voice. Headlines five to nine words. Paragraphs two to four sentences.

This applies to site copy, code comments, commit messages and these documents.

## Code

- **Build markup with the `html` template.** It escapes interpolated values by default. A helper
  that returns markup must return the result of `html` or `raw`, never a hand-assembled string,
  otherwise nesting it into another template will double-escape it.
- **Validate anything from the URL.** `getSlugParam` is the only sanctioned way to read a slug.
- **One render module per content type.** Cards are functions taking a data object and returning
  markup. Never duplicate markup per entry, and never write a loop that emits HTML inline in a
  page controller.
- **Respect the visibility contract.** New collections should support a `visible` flag and an
  `order` field, filtered through `visibleEntries` in `data-loader.js`.
- **No AI attribution anywhere.** No generated-by comments, banners, metadata or commit trailers.
- Comments explain why, not what, and only where a reader would otherwise be puzzled.

## Naming

- Files and slugs: lower-case kebab case (`cache-invalidation-correctness`).
- CSS: BEM-ish blocks (`work-card__title`, `entry-card--flip`). Tokens are semantic
  (`--text-secondary`), not literal (`--grey-6`).
- JavaScript: `renderX` builds markup, `initXPage` wires a page, `getX` reads data.

## Before calling a change done

- Check the page in both themes. Neither is an afterthought.
- Check it at 390px wide with no horizontal scroll.
- Check it with reduced motion enabled.
- Tab through anything interactive and confirm focus is visible.
- Confirm no copy contains a semicolon or an em dash.
- Confirm no end-client name appears anywhere.
