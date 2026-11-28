# Browser editor setup

The editor lives at `/admin` and is Sveltia CMS. It edits blog posts, videos, the links page and the
site settings. Every save becomes a commit in the GitHub repository, and Cloudflare rebuilds the site
from that commit. Nothing secret is stored in the repository.

These steps are manual. Nothing here has been done for you.

## Try it first, with no setup

1. Run `npm run dev` and open <http://localhost:8000/admin/> in Chrome, Edge or another Chromium
   browser.
2. Choose **Work with Local Repository** and select the project folder when the browser asks.
3. Edit a post or the links page. Saving writes the file straight to your disk and the dev server
   rebuilds. Nothing is committed until you commit it yourself.

This mode needs no Worker, no GitHub app and no internet beyond loading the editor script.

## Sign in from the live site

Signing in on the live site needs a small Cloudflare Worker that hands GitHub's login result back to
the editor. You deploy your own, because there is no hosted version.

The details below come from the README of `sveltia/sveltia-cms-auth` as read on 28 November 2026.
Read that README again before you start, because project steps change.

### 1. Deploy the Worker

Use the **Deploy to Cloudflare Workers** button in the README, or clone the project and run
`wrangler deploy` yourself. Note the Worker address. It looks like
`https://sveltia-cms-auth.<your-subdomain>.workers.dev`.

### 2. Register a GitHub App

The README now recommends a **GitHub App** rather than an older OAuth App. Register one at
<https://github.com/settings/apps/new> with these settings.

| Setting | Value |
| --- | --- |
| Callback URL | `<your Worker address>/callback` |
| Expire user authorization tokens | On |
| Request user authorization during installation | Off |
| Device flow | Off |
| Webhook | Off |
| Repository permissions | Contents: read and write. Metadata: read only. Pull requests: read and write |
| Where it can be installed | Only on your account |

Then install the app on the **`gauravkr-io/gauravkr.dev` repository only**. Generate a client secret
under the app's credentials and keep that page open for the next step.

### 3. Give the Worker its settings

In the Cloudflare dashboard, open the Worker, then Settings, then Runtime variables and secrets.

| Name | Value | Type |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | The app's client ID | Text |
| `GITHUB_CLIENT_SECRET` | The client secret you generated | **Secret** |
| `ALLOWED_DOMAINS` | `gauravkr.dev` | Text |

`ALLOWED_DOMAINS` is optional but strongly recommended. It stops other sites from using your Worker.
Use only the host name, with no port. Wildcards such as `*.example.com` match subdomains but not the
bare domain.

The secret goes only into the Cloudflare dashboard. Never paste it into a file in this repository.

### 4. Point the editor at the Worker

In `admin/config.yml`, replace the placeholder under `backend`:

```yaml
base_url: https://sveltia-cms-auth.<your-subdomain>.workers.dev
```

Run `npm run check:admin`. It warns while the placeholder is still there. Commit the change.

### 5. Sign in

Open `https://gauravkr.dev/admin/`, choose **Sign In with GitHub**, approve the app and edit.

## Security notes

- The editor script is pinned to one version with an integrity hash in `admin/index.html`, because it
  can write to the repository. To upgrade, change the version in the address, download that file,
  and replace the hash with the result of
  `openssl dgst -sha384 -binary sveltia-cms.js | openssl base64 -A`, prefixed with `sha384-`.
- Treat the app's refresh tokens as secrets. `ALLOWED_DOMAINS` only limits which pages receive a
  token. It does not stop someone who already holds a refresh token.
- With token expiry on, access tokens last 8 hours and refresh tokens last 6 months.
- Consider putting `/admin` behind Cloudflare Access as a second lock.
- `/admin` is marked noindex in the page, in the response headers and in `robots.txt`.

## What the editor can and cannot change

- Blog posts, videos, the links page, site details, the menu and the blog categories.
- It does not edit the home, about, services, courses or contact copy. Those stay in `data/` for now.
- New posts start as drafts. Turn **Draft** off to publish.

## Keeping the config honest

`npm run check:admin` compares `admin/config.yml` with the real files. It fails if a data file or a
post has a key the editor does not know, because saving in the editor could drop that key.
