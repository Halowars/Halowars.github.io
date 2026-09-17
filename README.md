# Road DJ

Road DJ is a shared Spotify controller designed for a car, party, or room where guests should be able to search and queue music without ever receiving the Spotify owner's email, password, refresh token, or reusable access token.

## Architecture

- **Frontend:** GitHub Pages (`https://halowars.github.io/`)
- **Backend:** Cloudflare Worker (`backend-worker.js`)
- **Private auth storage:** Cloudflare Workers KV (`ROAD_DJ_AUTH`)
- **Spotify:** only the Worker talks directly to Spotify with the owner's authorization

Guests open the Road DJ site and use it immediately. The owner authorizes Spotify from the Worker's `/owner/login` page. The Worker stores the refresh token in KV and automatically refreshes Spotify access tokens. The browser only calls the limited Road DJ proxy endpoints.

## Changes in v2

- Removed the old offline "pending actions" system. If a request cannot be sent, Road DJ clearly says it was **not** queued for later.
- Added animated **Adding → Added ✓** feedback and a confirmation toast when a song is queued.
- Redesigned the site around a large now-playing view and faster mobile search.
- Profiles and saved songs still persist in the guest's browser and automatically reload on that device.
- Removed Spotify refresh tokens from frontend code.
- Added an allowlisted Spotify proxy so guests cannot use the Road DJ backend as an unrestricted Spotify API token.

## Cloudflare Worker setup (free tier)

1. Create a free Cloudflare account if needed and install Wrangler:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
2. Create the KV namespace:
   ```bash
   wrangler kv namespace create ROAD_DJ_AUTH
   ```
3. Put the returned namespace id into `wrangler.toml`.
4. The Spotify client ID is already configured in `wrangler.toml`. Add only the private values:
   ```bash
   wrangler secret put SPOTIFY_CLIENT_SECRET
   wrangler secret put ADMIN_KEY
   ```
   `ADMIN_KEY` is the private Road DJ owner password you choose. Guests do not need it.
5. Deploy:
   ```bash
   wrangler deploy
   ```
6. Wrangler prints a URL similar to:
   `https://road-dj-api.<your-workers-subdomain>.workers.dev`
7. In the Spotify Developer Dashboard, add this exact redirect URI:
   `https://road-dj-api.<your-workers-subdomain>.workers.dev/owner/callback`
8. Put the Worker base URL into the `road-dj-backend` meta tag in `index.html`.
9. Open the Road DJ site, tap **Owner setup**, enter your `ADMIN_KEY`, and approve Spotify once.

After that, guests do not log in to Spotify. The Worker refreshes access automatically until Spotify eventually requires owner re-authorization.

## Security note

An older revision of this repository contained a Spotify refresh token in public frontend source and tracked `tokens.local.json`. Those credentials should be considered exposed. Rotate/re-authorize the Spotify connection after deploying this version. Removing the file from the latest commit does not erase it from Git history.
