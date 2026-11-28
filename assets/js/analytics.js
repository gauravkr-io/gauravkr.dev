/**
 * Cloudflare Web Analytics.
 *
 * Configured from data/site.json under `analytics`. Nothing loads unless
 * `enabled` is true and a token is present, so the site makes no analytics
 * request until you switch it on. The token is a public site identifier from
 * the Cloudflare dashboard, not a secret. The beacon sets no cookies, and a
 * visitor who sends Do Not Track is left out.
 */

import { getSite } from './data-loader.js';

const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';
const TOKEN = /^[a-f0-9]{32}$/;

export async function initAnalytics() {
  const { analytics } = await getSite();
  if (!analytics?.enabled || !TOKEN.test(analytics.token ?? '')) return false;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  if (document.querySelector('script[data-cf-beacon]')) return true;

  const script = document.createElement('script');
  script.defer = true;
  script.src = BEACON;
  script.dataset.cfBeacon = JSON.stringify({ token: analytics.token });
  document.head.appendChild(script);
  return true;
}
