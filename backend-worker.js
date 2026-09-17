const TOKEN_KEY = 'spotify_refresh_token';
let cachedAccessToken = null;
let cachedAccessExpiresAt = 0;
const STATE_PREFIX = 'oauth_state:';

const DEFAULT_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
].join(' ');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      if (url.pathname === '/health') {
        return json({ ok: true, service: 'road-dj-api' }, 200, origin);
      }

      if (url.pathname === '/api/status' && request.method === 'GET') {
        const connected = Boolean(await env.ROAD_DJ_AUTH.get(TOKEN_KEY));
        return json({ connected }, 200, origin);
      }

      if (url.pathname === '/owner/login' && request.method === 'GET') {
        return ownerLoginPage();
      }

      if (url.pathname === '/owner/login' && request.method === 'POST') {
        return startOwnerLogin(request, env);
      }

      if (url.pathname === '/owner/callback' && request.method === 'GET') {
        return finishOwnerLogin(request, env);
      }

      if (url.pathname.startsWith('/api/spotify/')) {
        return proxySpotify(request, env, origin);
      }

      return json({ error: 'Not found' }, 404, origin);
    } catch (error) {
      console.error(error);
      return json({ error: 'Road DJ server error' }, 500, origin);
    }
  }
};

function allowedOrigin(request, env) {
  const configured = (env.FRONTEND_ORIGIN || 'https://halowars.github.io').replace(/\/$/, '');
  const incoming = request.headers.get('Origin');
  if (!incoming || incoming === configured) return configured;
  return configured;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status = 200, origin = 'https://halowars.github.io') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function ownerLoginPage(error = '') {
  const safeError = String(error).replace(/[<>&"']/g, '');
  return new Response(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Road DJ Owner</title>
<style>body{margin:0;background:#09090d;color:#f7f7fb;font:16px system-ui;display:grid;place-items:center;min-height:100vh}form{width:min(420px,calc(100% - 36px));background:#15151d;border:1px solid #2b2b36;border-radius:22px;padding:24px;box-sizing:border-box}h1{margin:0 0 8px}p{color:#9c9ca8;line-height:1.5}input,button{width:100%;box-sizing:border-box;border-radius:12px;padding:13px;font:inherit}input{background:#0e0e14;border:1px solid #343440;color:white;margin:8px 0 10px}button{border:0;background:#b7ff4a;color:#111;font-weight:800;cursor:pointer}.err{color:#ff7d8b}</style></head>
<body><form method="post"><h1>Road DJ owner</h1><p>This is only for the person who owns the Spotify account. Guests never need this screen.</p>${safeError ? `<p class="err">${safeError}</p>` : ''}<input type="password" name="admin_key" placeholder="Road DJ admin key" autocomplete="current-password" required><button>Connect Spotify</button></form></body></html>`, {
    status: safeError ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' }
  });
}

async function startOwnerLogin(request, env) {
  const form = await request.formData();
  const supplied = String(form.get('admin_key') || '');
  if (!env.ADMIN_KEY || supplied !== env.ADMIN_KEY) {
    return ownerLoginPage('That admin key is not correct.');
  }

  const state = crypto.randomUUID();
  await env.ROAD_DJ_AUTH.put(`${STATE_PREFIX}${state}`, '1', { expirationTtl: 600 });

  const redirectUri = new URL('/owner/callback', request.url).toString();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.SPOTIFY_CLIENT_ID,
    scope: env.SPOTIFY_SCOPES || DEFAULT_SCOPES,
    redirect_uri: redirectUri,
    state,
    show_dialog: 'true'
  });

  return Response.redirect(`https://accounts.spotify.com/authorize?${params}`, 302);
}

async function finishOwnerLogin(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const spotifyError = url.searchParams.get('error');

  if (spotifyError) return new Response(`Spotify authorization failed: ${spotifyError}`, { status: 400 });
  if (!code || !state) return new Response('Missing Spotify authorization data.', { status: 400 });

  const stateKey = `${STATE_PREFIX}${state}`;
  const validState = await env.ROAD_DJ_AUTH.get(stateKey);
  await env.ROAD_DJ_AUTH.delete(stateKey);
  if (!validState) return new Response('Expired or invalid login state. Start again.', { status: 400 });

  const redirectUri = new URL('/owner/callback', request.url).toString();
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
  });

  if (!tokenResponse.ok) {
    console.error('Spotify code exchange failed', tokenResponse.status, await tokenResponse.text());
    return new Response('Spotify rejected the connection. Check the app redirect URI and try again.', { status: 502 });
  }

  const tokens = await tokenResponse.json();
  if (!tokens.refresh_token) return new Response('Spotify did not return a refresh token.', { status: 502 });

  await storeSpotifyTokens(env, tokens);
  const frontend = (env.FRONTEND_ORIGIN || 'https://halowars.github.io').replace(/\/$/, '');
  return Response.redirect(`${frontend}/?connected=1`, 302);
}

async function proxySpotify(request, env, origin) {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== origin) {
    return json({ error: 'Origin not allowed' }, 403, origin);
  }

  const sourceUrl = new URL(request.url);
  const spotifyPath = sourceUrl.pathname.replace('/api/spotify', '');
  if (!isAllowedSpotifyRequest(request.method, spotifyPath, sourceUrl.searchParams)) {
    return json({ error: 'Spotify operation not allowed' }, 403, origin);
  }

  const accessToken = await getSpotifyAccessToken(env);
  if (!accessToken) return json({ error: 'Owner needs to reconnect Spotify' }, 401, origin);

  const spotifyUrl = new URL(`https://api.spotify.com${spotifyPath}`);
  sourceUrl.searchParams.forEach((value, key) => spotifyUrl.searchParams.append(key, value));

  const upstream = await fetch(spotifyUrl.toString(), {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (upstream.status === 401) {
    cachedAccessToken = null;
    cachedAccessExpiresAt = 0;
    const retryToken = await getSpotifyAccessToken(env, true);
    if (!retryToken) return json({ error: 'Owner needs to reconnect Spotify' }, 401, origin);
    const retry = await fetch(spotifyUrl.toString(), {
      method: request.method,
      headers: { 'Authorization': `Bearer ${retryToken}`, 'Content-Type': 'application/json' }
    });
    return relaySpotifyResponse(retry, origin);
  }

  return relaySpotifyResponse(upstream, origin);
}

function isAllowedSpotifyRequest(method, path, params) {
  const exact = new Set([
    'GET /v1/me',
    'GET /v1/me/player',
    'GET /v1/me/player/devices',
    'POST /v1/me/player/next',
    'POST /v1/me/player/previous',
    'PUT /v1/me/player/pause',
    'PUT /v1/me/player/play'
  ]);
  if (exact.has(`${method} ${path}`)) return true;

  if (method === 'GET' && path === '/v1/search') {
    return params.get('type') === 'track' && Boolean(params.get('q')) && Number(params.get('limit') || 10) <= 10;
  }
  if (method === 'POST' && path === '/v1/me/player/queue') {
    const uri = params.get('uri') || '';
    return /^spotify:track:[A-Za-z0-9]+$/.test(uri);
  }
  if (method === 'PUT' && path === '/v1/me/player/seek') {
    const position = Number(params.get('position_ms'));
    return Number.isFinite(position) && position >= 0;
  }
  return false;
}

async function relaySpotifyResponse(upstream, origin) {
  const headers = {
    ...corsHeaders(origin),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) headers['Content-Type'] = contentType;
  const body = upstream.status === 204 ? null : await upstream.text();
  return new Response(body, { status: upstream.status, headers });
}

async function getSpotifyAccessToken(env, forceRefresh = false) {
  if (!forceRefresh && cachedAccessToken && cachedAccessExpiresAt > Date.now() + 60000) {
    return cachedAccessToken;
  }

  const refreshToken = await env.ROAD_DJ_AUTH.get(TOKEN_KEY);
  if (!refreshToken) return null;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
  });

  if (!response.ok) {
    console.error('Spotify refresh failed', response.status, await response.text());
    if (response.status === 400 || response.status === 401) {
      await env.ROAD_DJ_AUTH.delete(TOKEN_KEY);
    }
    return null;
  }

  const tokens = await response.json();
  if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
  await storeSpotifyTokens(env, tokens);
  return tokens.access_token;
}

async function storeSpotifyTokens(env, tokens) {
  const expiresIn = Number(tokens.expires_in || 3600);
  cachedAccessToken = tokens.access_token;
  cachedAccessExpiresAt = Date.now() + expiresIn * 1000;
  if (tokens.refresh_token) {
    await env.ROAD_DJ_AUTH.put(TOKEN_KEY, tokens.refresh_token);
  }
}
