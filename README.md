# Road DJ

Road DJ is a shared Spotify controller designed for a car, party, or room where guests should be able to search and queue music without ever receiving the Spotify owner's email, password, refresh token, reusable access token, or client secret.

## Live setup

- **Frontend:** `https://halowars.github.io/`
- **Backend:** `https://road-dj-api.workable-swamp.workers.dev`
- **Private auth storage:** Cloudflare Workers KV (`ROAD_DJ_AUTH`)
- **Spotify authorization:** OAuth Authorization Code with PKCE; no Spotify client secret is required
- **Spotify API:** only the Worker talks directly to Spotify with the owner's authorization

The backend and Spotify owner authorization are already connected. Guests can open the Road DJ site and use it without logging in to Spotify. The Worker stores the refresh token in KV and automatically refreshes short-lived Spotify access tokens.

## Changes in v2

- Removed the old offline "pending actions" system. If a request cannot be sent, Road DJ clearly says it was **not** queued for later.
- Added animated **Adding → Added ✓** feedback and a confirmation toast when a song is queued.
- Redesigned the site around a large now-playing view and faster mobile search.
- Profiles and saved songs still persist in the guest's browser and automatically reload on that device.
- Removed Spotify refresh tokens from frontend code.
- Added an allowlisted Spotify proxy so guests cannot use the Road DJ backend as an unrestricted Spotify API token.
- Added owner-only PKCE login, so the deployed server does not require a Spotify client secret.

## Cloudflare Worker maintenance

The repository is configured so Wrangler can deploy the Worker and preserve variables already configured in Cloudflare.

1. Install Wrangler and sign in to Cloudflare:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
2. For best security, store the Road DJ owner key as a Worker secret:
   ```bash
   wrangler secret put ADMIN_KEY
   ```
   Guests do not need this key.
3. Deploy future backend changes with:
   ```bash
   wrangler deploy
   ```

The Spotify Developer Dashboard redirect URI for the current deployment is:

```text
https://road-dj-api.workable-swamp.workers.dev/owner/callback
```

The frontend backend URL is configured in the `road-dj-backend` meta tag in `index.html`.

## Security note

An older revision of this repository contained a Spotify refresh token in public frontend source and tracked `tokens.local.json`. Those old credentials should be considered exposed. The current deployment uses a newly authorized server-side token instead, and removing the old token from the latest commit does not erase it from Git history.
