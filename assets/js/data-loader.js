/**
 * Data access layer.
 *
 * Every payload under data/ is shaped like an API response, and every read goes
 * through `fetchJson`. When a real backend arrives, only `resolveUrl` and the
 * accessor paths need to change. Nothing in the render modules touches fetch
 * directly.
 */

const DATA_BASE = '/data';

/** In-flight and settled requests, keyed by path, so each file loads once. */
const cache = new Map();

function resolveUrl(path) {
  return `${DATA_BASE}/${path}`;
}

export async function fetchJson(path) {
  if (cache.has(path)) return cache.get(path);

  const request = fetch(resolveUrl(path), {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load ${path} (HTTP ${response.status})`);
      }
      return response.json();
    })
    .catch((error) => {
      // Drop the rejected promise so a later attempt can retry rather than
      // replaying the same failure forever.
      cache.delete(path);
      throw error;
    });

  cache.set(path, request);
  return request;
}

/** Keeps only entries flagged visible, then applies an explicit order field. */
export function visibleEntries(items = []) {
  return items
    .filter((item) => item.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/* -------------------------------------------------------------------------
   Site chrome
   ------------------------------------------------------------------------- */

export async function getSite() {
  const { site } = await fetchJson('site.json');
  return site;
}

export async function getNavigation() {
  const { navigation } = await fetchJson('navigation.json');
  return navigation.filter((item) => item.visible !== false);
}

/* -------------------------------------------------------------------------
   Pages
   ------------------------------------------------------------------------- */

export async function getHome() {
  const { home } = await fetchJson('home.json');
  return home;
}

export async function getAbout() {
  const { about } = await fetchJson('about.json');
  return about;
}

export async function getExperience() {
  const { experience } = await fetchJson('experience.json');
  return experience;
}

export async function getTechnologies() {
  const { technologies } = await fetchJson('technologies.json');
  return technologies;
}

export async function getCredentials() {
  return fetchJson('certifications.json');
}

export async function getContact() {
  const { contact } = await fetchJson('contact.json');
  return contact;
}

/* -------------------------------------------------------------------------
   Services
   ------------------------------------------------------------------------- */

export async function getServices() {
  const payload = await fetchJson('services.json');
  return {
    meta: payload.servicesMeta,
    services: visibleEntries(payload.services)
  };
}

export async function getService(slug) {
  const { services } = await getServices();
  return services.find((service) => service.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------
   Projects
   ------------------------------------------------------------------------- */

export async function getProjects() {
  const payload = await fetchJson('projects.json');
  return {
    meta: payload.projectsMeta,
    projects: visibleEntries(payload.projects)
  };
}

/* -------------------------------------------------------------------------
   Blogs
   ------------------------------------------------------------------------- */

export async function getPostsIndex() {
  const payload = await fetchJson('blogs/posts-index.json');
  const posts = payload.posts
    .filter((post) => post.visible !== false)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { meta: payload.blogsMeta, categories: payload.categories ?? [], posts };
}

export async function getPost(slug) {
  const { post } = await fetchJson(`blogs/posts/${slug}.json`);
  return post;
}

/* -------------------------------------------------------------------------
   Courses
   ------------------------------------------------------------------------- */

export async function getCoursesIndex() {
  const payload = await fetchJson('courses/courses-index.json');
  return {
    meta: payload.coursesMeta,
    topics: payload.topics ?? [],
    courses: visibleEntries(payload.courses)
  };
}

export async function getCourse(slug) {
  const { course } = await fetchJson(`courses/courses/${slug}.json`);
  return course;
}
