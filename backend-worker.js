// Cloudflare Worker example to serve a fresh Spotify access token for guests.
// Set environment variables in your worker:
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
//   SPOTIFY_REFRESH_TOKEN   (your pre-authorized refresh token)
// Deployed endpoint should be set in BACKEND_TOKEN_URL in app.js.

export default {
  async fetch(request, env) {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }
    const token = await refresh(env);
    if (!token) {
      return new Response('Failed to refresh token', { status: 500 });
    }
    // Only return the short-lived access token to the browser.
    return new Response(JSON.stringify({
      access_token: token.access_token,
      expires_in: token.expires_in
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
};

async function refresh(env) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    client_id: env.SPOTIFY_CLIENT_ID,
    client_secret: env.SPOTIFY_CLIENT_SECRET
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!resp.ok) {
    console.error('Refresh failed', resp.status);
    return null;
  }
  return resp.json();
}
