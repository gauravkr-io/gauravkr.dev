# Gaurav Kumar, personal website

Personal site for Gaurav Kumar, an E-Commerce Specialist and Software Engineer working on
Salesforce Commerce Cloud and backend systems. The site serves three audiences at once: hiring
teams at product companies, prospective consulting clients, and developers reading the technical
writing.

The browser runs plain HTML, CSS and vanilla JavaScript. A small Node build step turns the content
files into static pages, and it is a development tool only. No framework reaches the visitor.

## How it works

```
content/posts/*.md        blog posts, one Markdown file each
data/*.json               every other piece of content
        |
        v   npm run build
dist/                     the finished static site, ready to host
```

The build checks the content, copies the site, and writes one page per post with its own link
preview tags, the sitemap, the feed and the robots file. The shared header and footer are still
drawn by JavaScript when a page loads.

## Running it locally

You need Node 20 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:8000>. The dev server builds the site, serves it, and rebuilds whenever you
save a file under `content/`, `data/`, `assets/`, `pages/` and the other source folders. Refresh the
browser to see the change. If a rebuild fails validation, the problems are printed in the terminal
and the last good version keeps being served.

Opening files straight from disk does not work, because the pages fetch their content over HTTP.

| Command | What it does |
| --- | --- |
| `npm run dev` | Build, serve at port 8000, rebuild on every change |
| `npm run build` | Check the content and write the site to `dist/` |
| `npm run preview` | Build once and serve `dist/` |
| `npm run validate` | Check every data file and post, with a message for each problem |
| `npm run check:prose` | Look for em dashes, semicolons and blocked client names |
| `npm run check:admin` | Make sure the browser editor knows every field in the data files |
| `npm run parity` | Compare each post with how it rendered before the move to Markdown |
| `npm run check` | All four checks above |

## Editing content

Nothing a visitor reads is hardcoded in the HTML or the scripts. To change what the site says, edit
a content file, or use the browser editor at `/admin` (see [ai-context/editor-setup.md](ai-context/editor-setup.md)).

| What you want to change | File |
| --- | --- |
| Name, tagline, contact details, social links, resume path, analytics | `data/site.json` |
| Which pages appear in the navigation | `data/navigation.json` |
| Homepage copy, hero statistics and the floating technology cards | `data/home.json` |
| About page: intro, journey, philosophy, capabilities | `data/about.json` |
| Work history shown on the About page | `data/experience.json` |
| Technology stack groups and badges | `data/technologies.json` |
| Education, certifications, awards | `data/certifications.json` |
| Service offerings and their detail pages | `data/services.json` |
| Case studies on the homepage | `data/projects.json` |
| Contact page copy and form fields | `data/contact.json` |
| Blog posts | `content/posts/<slug>.md` |
| Blog page heading text and the list of categories | `data/blogs/blogs-meta.json` |
| Videos | `data/videos.json` |
| The links page for a social profile | `data/links.json` |
| Course list and single courses | `data/courses/` |

### Adding a blog post

Create a file in `content/posts/` named after the web address you want. A file called
`my-new-post.md` is published at `/blogs/my-new-post/`.

```markdown
---
title: "A clear title"
subtitle: "One line shown under the title."
summary: "One or two sentences for cards, link previews and the feed."
category: "Backend"
tags: ["Java", "Caching"]
date: "2026-12-01"
coverImage: "/assets/images/blogs/my-new-post.webp"
author: "Gaurav Kumar"
featured: false
visible: true
draft: true
relatedPosts: ["ocapi-vs-scapi"]
---

Opening paragraph.

## A section heading

More text, with `inline code` and **bold**.
```

- **Publishing.** New posts start as drafts. Set `draft: false` to publish. A post with `draft: true`,
  `visible: false` or a date in the future stays off the live site, and off the sitemap and the feed.
  A future date takes effect on the first build on or after that day.
- **Category** must be one of the names in `data/blogs/blogs-meta.json`.
- **Cover image** is any image inside the site. A link preview image of 1200 by 630 is made from it
  automatically, because LinkedIn, WhatsApp and Instagram do not draw SVG.
- **Optional fields.** `slug` (the file name is used when it is left out), `readingTime` (worked out
  from the word count when it is left out) and `toc: false` to hide the table of contents.
- **Start body headings at `##`.** The title comes from the front matter.

Beyond ordinary Markdown, a post can use these:

| You want | Write |
| --- | --- |
| A callout | A line `:::note Title` (or `:::warning Title`), your text, then a line `:::` |
| A diagram | A code block whose language is `mermaid` |
| A figure with a caption | `![Alt text](/assets/images/blogs/photo.webp "Caption")` on a line of its own |
| A pull quote | `> Quote text`, then a last line `> -- Name` |
| A table | A standard pipe table |

Raw HTML in a post is switched off on purpose. Write Markdown only.

### Adding a video

Add an entry to the `videos` list in `data/videos.json`.

```json
{
  "title": "Walkthrough title",
  "youtubeId": "ABC123def45",
  "description": "What the video covers.",
  "tags": ["SFCC"],
  "date": "2026-12-01",
  "visible": true,
  "order": 1
}
```

The ID is the 11 characters after `v=` in the YouTube address. The build rejects anything else. The
video loads from `youtube-nocookie.com` only when a visitor presses play.

The Videos page is hidden from the menu until you have a video. Set `"visible": true` on the
`Videos` entry in `data/navigation.json`, and on the Videos link in `data/links.json`, when you are
ready.

### Adding a link

Open `data/links.json` and add an entry to a group's `links` list. Each link has a `label`, an
optional `description`, a `url`, an optional `icon`, and the usual `visible` and `order`. A page on
this site starts with `/`. The build checks that it exists.

The page is at `/links/` and is meant for a social profile. It is not in the main menu.

### Hiding a section

Every collection supports `visible` and `order`. Setting `visible` to `false` removes an entry from
the page without deleting it. On a navigation item it removes the link from the header, the mobile
menu and the footer.

## Visitor analytics

Cloudflare Web Analytics is built in and switched off. To turn it on:

1. In the Cloudflare dashboard open Web Analytics, add the site, and copy the token.
2. In `data/site.json`, set `analytics.token` to that code and `analytics.enabled` to `true`.

The token is a public site code, not a secret. The build refuses to run if analytics is on with no
token. The beacon sets no cookies, loads last, and is skipped for visitors who send Do Not Track.

## Replacing the resume

Drop a new PDF at `resume/Gaurav_Kumar_Resume.pdf`, keeping the filename. Every download link reads
the path from `data/site.json`. To use a different filename, update `resumeUrl` in that file.

## Project layout

```
index.html        homepage shell, no content
pages/            every other page shell, plus the old post address that forwards to the new one
links/            the links page
admin/            the browser editor
content/posts/    blog posts in Markdown
data/             all other content as JSON
templates/        the page template used for each post
scripts/          the build, the dev server and the checks
tests/parity/     how each post rendered before the move to Markdown
assets/css/       tokens, themes, components and the glass layer
assets/js/        data loading, render modules, one controller per page
assets/images/    profile, logos, backgrounds, technology marks, artwork
resume/           the downloadable PDF
ai-context/       notes for anyone picking up the codebase
dist/             build output, ignored by git
```

## Deploying to Cloudflare Pages

Connect the repository and use these settings.

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 22, set by the `.node-version` file |

No environment variables or secrets are needed for the site. `_headers` sets caching and keeps
`/admin` out of search. `_redirects` forwards `/blogs` to the blog page.

After the first deploy, paste a post address into LinkedIn's Post Inspector to check the preview
card, and submit `https://gauravkr.dev/sitemap.xml` in Google Search Console.

### Old post links

Posts used to live at `/pages/blog-post.html?slug=...`. Cloudflare redirect rules cannot match a
query string, so that page forwards visitors to `/blogs/<slug>/` with a small script. Old links keep
working. The old page is marked noindex.

## Browser support

Modern evergreen browsers. The site uses ES modules, `IntersectionObserver`, CSS custom properties,
CSS grid and `backdrop-filter`. Where `backdrop-filter` is missing, glass surfaces become more
opaque instead. There is no transpilation and no polyfill layer.

## Accessibility and motion

Every page has a skip link, semantic landmarks, visible focus states and labelled form controls. All
decorative motion is wrapped in `prefers-reduced-motion`, and the scroll reveals fall back to plain
visible content when motion is reduced or JavaScript fails.
