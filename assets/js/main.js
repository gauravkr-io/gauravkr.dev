/**
 * Application entry point.
 *
 * Renders the shared chrome, then hands off to the controller named by
 * `data-page` on the body element. Page modules are imported dynamically so a
 * visitor only downloads the code for the page they opened.
 */

import { onReady, $ } from './utils.js';
import { initThemeToggle } from './theme-toggle.js';
import { renderChrome } from './render-navigation.js';
import { initScrollReveal, initPageTransitions, refreshScrollReveal } from './scroll-animations.js';

const PAGE_CONTROLLERS = {
  home: () => import('./render-home.js').then((module) => module.initHomePage()),
  about: () => import('./render-about.js').then((module) => module.initAboutPage()),
  services: () => import('./render-services.js').then((module) => module.initServicesPage()),
  'service-detail': () => import('./render-services.js').then((module) => module.initServiceDetailPage()),
  blogs: () => import('./render-blogs.js').then((module) => module.initBlogsPage()),
  'blog-post': () => import('./render-blogs.js').then((module) => module.initBlogPostPage()),
  courses: () => import('./render-courses.js').then((module) => module.initCoursesPage()),
  'course-detail': () => import('./render-courses.js').then((module) => module.initCourseDetailPage()),
  contact: () => import('./render-contact.js').then((module) => module.initContactPage())
};

/**
 * Content is fetched at runtime, which means opening the files directly from
 * disk will fail on the browser's origin rules. Saying so plainly beats
 * leaving a blank page behind.
 */
function reportLoadFailure(error) {
  console.error('[site] failed to render page', error);

  const isFileProtocol = window.location.protocol === 'file:';
  const target = $('#page-error');
  if (!target) return;

  target.hidden = false;
  target.innerHTML = isFileProtocol
    ? '<div class="shell"><div class="empty-state"><p><strong>This site needs to be served over HTTP.</strong></p>' +
      '<p style="margin-top:0.75rem">Content is loaded from JSON at runtime, which a browser blocks on the ' +
      '<code>file://</code> protocol. Run <code>python3 -m http.server 8000</code> in the project folder and ' +
      'open <code>http://localhost:8000</code>.</p></div></div>'
    : '<div class="shell"><div class="empty-state"><p>Something went wrong loading this page. ' +
      'Please refresh, and if it keeps happening let me know.</p></div></div>';
}

async function start() {
  document.documentElement.classList.remove('no-js');

  initThemeToggle();
  initPageTransitions();

  try {
    await renderChrome();

    const page = document.body.dataset.page;
    const controller = PAGE_CONTROLLERS[page];
    if (controller) await controller();
  } catch (error) {
    reportLoadFailure(error);
  }

  initScrollReveal();
  refreshScrollReveal();
}

onReady(start);
