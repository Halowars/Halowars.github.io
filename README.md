# Road DJ (Spotify Remote)

Single-page controller for your Spotify account that can be hosted on GitHub Pages. It uses Spotify's PKCE flow (no client secret on the front end) and lets anyone on the page search, queue, and control playback on your active device.

## What it does
- Connect with Spotify using your account (Premium required for playback control).
- Live now-playing view with artwork and progress.
- Playback controls: play/pause, next, previous, rewind 10s.
- Type-ahead search with forgiving queries; tap a result to queue it.
- Offline-friendly: if the car loses signal, actions are stored locally and replayed when you reconnect.
- Device picker to send commands to a specific active device.

## Quick setup
1) **Add the redirect URI in Spotify Dashboard**  
   - Local dev: `http://127.0.0.1:3000/` (main app).  
   - GitHub Pages: `https://<your-gh-username>.github.io/<repo-name>/`.  
   - Keep your client secret private; the browser only needs client ID + refresh token.

2) **Update the client ID (optional)**  
   - The current client ID in `app.js` is `00c2bd4d6a7e45efbc4a766bf80e54c7`. Replace `CLIENT_ID` at the top if you want to use a different one.

3) **Publish on GitHub Pages**  
   - Create a repo with these files, commit, and push to GitHub.  
   - In Repo Settings → Pages, set Source to the `main` branch root.  
   - Visit `https://<your-gh-username>.github.io/<repo-name>/` and click **Connect Spotify**.

## Usage tips
- Open Spotify on your phone or car screen so there's an active device; select it in the dropdown if needed.
- If the page goes offline, queued actions will show in "Pending actions" and send automatically when back online (or tap "Send now").
- To change styling, edit `style.css`; HTML lives in `index.html`, logic in `app.js`.
- For local testing, serve the folder over HTTP (e.g., `python -m http.server 3000`) and add `http://127.0.0.1:3000/` as a Redirect URI in Spotify while testing. The app auto-uses the current page URL for `REDIRECT_URI`; make sure that exact URL is in Spotify.
- If you want to pre-authorize and skip login prompts for guests, run `node fetch_refresh_token.js` (with `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` set) to obtain a refresh token, then paste it into `PREFILLED_REFRESH_TOKEN` in `app.js`. Do **not** commit secrets or refresh tokens to a public repo.

### Quick: generate a refresh token
1) In Spotify Dashboard, add `http://127.0.0.1:8888/callback` as a redirect.  
2) Run (Windows):  
   `set SPOTIFY_CLIENT_ID=<id> && set SPOTIFY_CLIENT_SECRET=<secret> && set SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback && node fetch_refresh_token.js`  
   Or Mac/Linux:  
   `SPOTIFY_CLIENT_ID=<id> SPOTIFY_CLIENT_SECRET=<secret> SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback node fetch_refresh_token.js`  
3) Approve in the browser; copy the printed refresh token into `PREFILLED_REFRESH_TOKEN` at the top of `app.js`.  
4) Redeploy (or reload locally). Guests won’t be prompted as long as that token stays valid.

## Optional: backend token endpoint (no guest logins)
- GitHub Pages is static, so you need a tiny backend/worker to keep your client secret and refresh token safe while handing out short-lived access tokens to guests.
- Example: deploy `backend-worker.js` to Cloudflare Workers (or similar) with env vars `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
- Set `BACKEND_TOKEN_URL` in `app.js` to the worker URL. The frontend will fetch fresh access tokens from it and never redirect guests to Spotify.
- Keep the worker URL private if you add rate limiting/auth; otherwise guests can still call it (but it only returns short-lived access tokens).

## Notes
- Never commit your client secret to GitHub or expose it on the front end. PKCE avoids needing the secret here; secrets in browser code can be stolen by anyone who opens the page.
- Spotify playback control requires a Premium account and an active device.
- If Spotify Dashboard rejects `http://localhost:8888/callback` as insecure when using `fetch_refresh_token.js`, try `http://127.0.0.1:8888/callback` instead and set `SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback` when running the script. Make sure that exact URI is added in the dashboard.

## Notes
- Never commit your client secret to GitHub or expose it on the front end. PKCE avoids needing the secret here; secrets in browser code can be stolen by anyone who opens the page.
- Spotify playback control requires a Premium account and an active device.
