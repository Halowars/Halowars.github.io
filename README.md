# Road DJ

Road DJ is a shared Spotify controller designed for a car, party, or room where guests should be able to search and queue music without ever receiving the Spotify owner's email, password, refresh token, reusable access token, or client secret.

## Live setup

- **Frontend:** `https://halowars.github.io/`
- **Backend:** `https://road-dj-api.workable-swamp.workers.dev`
- **Private auth storage:** Cloudflare Workers KV (`ROAD_DJ_AUTH`)
- **Live coordinator:** Cloudflare Durable Object (`ROAD_DJ_LIVE`)
- **Spotify authorization:** OAuth Authorization Code with PKCE; no Spotify client secret is required
- **Spotify API:** only the Worker talks directly to Spotify with the owner's authorization

The backend stores the owner's refresh token server-side and automatically refreshes short-lived Spotify access tokens. Guests can open Road DJ without logging into Spotify.

## Live behavior

Road DJ now uses a shared WebSocket connection model instead of making every phone independently poll Spotify.

- Each browser connects to `/api/live` over WebSocket.
- All connected browsers share one Durable Object instance.
- Browsers send a lightweight sync message about every 3 seconds.
- The Durable Object refreshes Spotify playback at most once per sync window, then broadcasts the same state to every connected phone.
- The playback progress bar advances locally between server updates, so it looks smooth without extra Spotify calls.
- Queue changes trigger an immediate queue refresh and are pushed to every connected Road DJ screen.
- The shared **Up next** section shows the current Spotify queue.
- When a guest adds a song, other connected users can see who added it when that guest has a Road DJ profile selected.
- If WebSockets are unavailable, the frontend automatically falls back to slower HTTP polling instead of breaking.
- When nobody has Road DJ open, the live sync loop stops, so Road DJ is not constantly polling Spotify for no reason.

## Changes in v2

- Removed the old offline "pending actions" system. If a request cannot be sent, Road DJ clearly says it was **not** queued for later.
- Added animated **Adding → Added ✓** feedback and a confirmation toast when a song is queued.
- Redesigned the site around a large now-playing view and faster mobile search.
- Added a live connection indicator and shared **Up next** queue.
- Profiles and saved songs still persist in the guest's browser and automatically reload on that device.
- Removed Spotify refresh tokens from frontend code.
- Added an allowlisted Spotify proxy so guests cannot use the Road DJ backend as an unrestricted Spotify API token.
- Added owner-only PKCE login, so the deployed server does not require a Spotify client secret.

## Cloudflare Worker maintenance

The repository contains a Wrangler configuration for the Worker, KV binding, and Durable Object migration.

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
3. Deploy the live backend changes:
   ```bash
   wrangler deploy
   ```

The first deployment with the live system creates the `RoadDJLive` Durable Object class through the `v1` migration in `wrangler.toml`.

The Spotify Developer Dashboard redirect URI for the current deployment is:

```text
https://road-dj-api.workable-swamp.workers.dev/owner/callback
```

The frontend backend URL is configured in the `road-dj-backend` meta tag in `index.html`.

## Security note

An older revision of this repository contained a Spotify refresh token in public frontend source and tracked `tokens.local.json`. Those old credentials should be considered exposed. The current v2 code uses a newly authorized server-side token instead, and removing the old token from the latest commit does not erase it from Git history.
