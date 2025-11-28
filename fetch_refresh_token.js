// Helper script to get a long-lived refresh token for your account.
// Usage:
//   SPOTIFY_CLIENT_ID=your_id SPOTIFY_CLIENT_SECRET=your_secret node fetch_refresh_token.js
// This starts a local server, opens Spotify login, and prints the refresh token.

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '00c2bd4d6a7e45efbc4a766bf80e54c7';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '94cfb265d02344578af77a5016477a68';
// Use exactly this in Spotify dashboard. If localhost warns as insecure, try 127.0.0.1.
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8888/callback';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'app-remote-control',
  'streaming'
].join(' ');

if (!CLIENT_SECRET) {
  console.error('Set SPOTIFY_CLIENT_SECRET env var before running.');
  process.exit(1);
}

const authorizeUrl = new URL('https://accounts.spotify.com/authorize');
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('client_id', CLIENT_ID);
authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authorizeUrl.searchParams.set('scope', SCOPES);
authorizeUrl.searchParams.set('show_dialog', 'true');

console.log('Opening browser for Spotify login...');
openBrowser(authorizeUrl.toString());

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== '/callback') {
    res.writeHead(404);
    return res.end('Not found');
  }
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error || !code) {
    res.writeHead(400);
    res.end('Auth failed. Check console.');
    console.error('Auth error:', error);
    server.close();
    return;
  }
  res.writeHead(200);
  res.end('Auth received. You can close this tab.');
  try {
    const tokens = await exchangeCode(code);
    console.log('\nAccess token:', tokens.access_token);
    console.log('Expires in (s):', tokens.expires_in);
    console.log('Refresh token (save this in app.js -> PREFILLED_REFRESH_TOKEN):\n', tokens.refresh_token);
    fs.writeFileSync('tokens.local.json', JSON.stringify(tokens, null, 2));
    console.log('\nSaved raw tokens to tokens.local.json (do not commit this file).');
  } catch (err) {
    console.error('Token exchange failed:', err);
  } finally {
    server.close();
  }
});

server.listen(8888, () => {
  console.log(`Listening on ${REDIRECT_URI} for Spotify redirect...`);
});

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text);
  }
  return resp.json();
}

function openBrowser(url) {
  const command = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(command);
}
