# Gaurav Kumar, personal website

Personal site for Gaurav Kumar, an E-Commerce Specialist and Software Engineer working on
Salesforce Commerce Cloud and backend systems. The site serves three audiences at once: hiring
teams at product companies, prospective consulting clients, and developers reading the technical
writing.

Built with plain HTML, CSS and vanilla JavaScript. There is no framework, no build step and no
backend. All content lives in JSON under `data/` and is rendered at runtime.

## Running it locally

Content is fetched over HTTP, so opening the files directly from disk will not work. Browsers
block `fetch` on the `file://` protocol, and the site will show a message telling you the same
thing if you try.

Start any static server from the project root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any equivalent works, for example `npx serve` or the Live
Server extension in VS Code.

## Editing content

Nothing user-facing is hardcoded in the HTML. To change what the site says, edit the JSON.

| What you want to change | File |
| --- | --- |
| Name, tagline, contact details, social links, résumé path | `data/site.json` |
| Which pages appear in the navigation | `data/navigation.json` |
| Homepage section copy and hero statistics | `data/home.json` |
| About page: intro, journey, philosophy, capabilities | `data/about.json` |
| Work history shown on the About page | `data/experience.json` |
| Technology stack groups and badges | `data/technologies.json` |
| Education, certifications, awards | `data/certifications.json` |
| Service offerings and their detail pages | `data/services.json` |
| Case studies on the homepage | `data/projects.json` |
| Contact page copy and form fields | `data/contact.json` |
| Blog post list | `data/blogs/posts-index.json` |
| A single blog post body | `data/blogs/posts/<slug>.json` |
| Course list | `data/courses/courses-index.json` |
| A single course | `data/courses/courses/<slug>.json` |

### Hiding a section

Every navigation item has a `visible` flag. Setting it to `false` removes the link from the
header, the mobile menu and the footer without touching any markup. Services, projects, posts and
courses each support the same flag on individual entries.

For example, to hide Courses until the first course is ready:

```json
{ "label": "Courses", "path": "courses.html", "visible": false }
```

### Adding a blog post

1. Add an entry to `data/blogs/posts-index.json` with a unique `slug`.
2. Create `data/blogs/posts/<slug>.json` using an existing post as a template.
3. Add a cover image at the path named in the index entry.

The post body is an array of typed blocks (`paragraph`, `heading`, `list`, `code`, `callout`,
`quote`) rather than raw HTML. The renderer decides the markup, which keeps the JSON safe to edit
and the styling consistent. Inside paragraph and list text you can use `` `code` `` and
`**bold**`, and nothing else.

Courses work the same way through `data/courses/`.

## Replacing the résumé

Drop a new PDF at `resume/Gaurav_Kumar_Resume.pdf`, keeping the filename. Every download link on
the site reads the path from `data/site.json`, so nothing else needs to change. To use a different
filename, update `resumeUrl` in that file.

## Project layout

```
index.html      homepage shell, no content — stays at the root so hosts serve it with no config
pages/          every other page shell: about, services, blogs, courses, contact, and the
                three detail templates
assets/css/     design tokens, light theme, dark theme, components
assets/js/      data loading, render modules, one controller per page
assets/images/  profile, technology marks, generated artwork, icons
data/           all site content as JSON
resume/         the downloadable PDF
ai-context/     notes for anyone (or anything) picking up the codebase
```

Because there is no build step, the file layout is the URL structure: `pages/about.html` is
served at `/pages/about.html`. Every internal link, asset path and data fetch in the codebase is
root-relative (starting with `/`) for exactly this reason — it works the same regardless of which
directory a page lives in.

## Deploying

The site is static, so any host works. Netlify, Vercel, GitHub Pages and Cloudflare Pages all
serve it without configuration. Point the host at the repository root and set no build command.

Two things worth doing at deploy time:

- **Clean URLs.** The pages use `?slug=` query parameters because there is no build step
  generating a file per post. A host-level rewrite can turn `/blogs/my-post` into
  `/blog-post.html?slug=my-post` if you want tidier links.
- **Cache headers.** The JSON under `data/` changes more often than the CSS and JS, so give it a
  shorter cache lifetime.

## Browser support

Modern evergreen browsers. The site uses ES modules, `IntersectionObserver`, CSS custom properties
and CSS grid. There is no transpilation and no polyfill layer.

## Accessibility and motion

Every page has a skip link, semantic landmarks, visible focus states and labelled form controls.
All decorative motion is wrapped in `prefers-reduced-motion`, and the scroll reveals fall back to
plain visible content when motion is reduced or JavaScript fails.
