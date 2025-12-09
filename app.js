const CLIENT_ID = '00c2bd4d6a7e45efbc4a766bf80e54c7';
const PREFILLED_REFRESH_TOKEN = 'AQBc77K5SgFag0X24flTg0KeEJCUoTcQmnd6DmuorUQg-crDZhSc1ZnpAKC0RI0qmf9VM9s0yql5UZeWgxv_cZPh_e1Nbvi-MS1DlgEOr044jNbxbPuMUy8ibrow7II6QxM'; // pre-authorized refresh token to auto-connect
const BACKEND_TOKEN_URL = ''; // optional: backend endpoint that returns a fresh access token
const AUTO_AUTH = false; // keep guests from being redirected; owner can reconnect if needed
// Must exactly match a Redirect URI in your Spotify app settings.
const REDIRECT_URI = `https://halowars.github.io/`;
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'app-remote-control',
  'streaming'
];
const STORAGE_KEYS = {
  tokens: 'road_dj_tokens',
  verifier: 'road_dj_code_verifier',
  state: 'road_dj_auth_state',
  pending: 'road_dj_pending',
  profiles: 'road_dj_profiles',
  activeProfile: 'road_dj_active_profile'
};

const els = {
  authButton: document.getElementById('authButton'),
  authStatus: document.getElementById('authStatus'),
  networkStatus: document.getElementById('networkStatus'),
  pendingBadge: document.getElementById('pendingBadge'),
  searchStatus: document.getElementById('searchStatus'),
  searchInput: document.getElementById('searchInput'),
  searchResults: document.getElementById('searchResults'),
  resultCard: document.getElementById('resultCard'),
  trackTitle: document.getElementById('trackTitle'),
  trackMeta: document.getElementById('trackMeta'),
  progressFill: document.getElementById('progressFill'),
  progressStart: document.getElementById('progressStart'),
  progressEnd: document.getElementById('progressEnd'),
  albumArt: document.getElementById('albumArt'),
  btnPlayPause: document.getElementById('btnPlayPause'),
  btnSkip: document.getElementById('btnSkip'),
  btnBack: document.getElementById('btnBack'),
  btnRewind: document.getElementById('btnRewind'),
  deviceSelect: document.getElementById('deviceSelect'),
  refreshDevices: document.getElementById('refreshDevices'),
  pendingList: document.getElementById('pendingList'),
  flushPending: document.getElementById('flushPending'),
  profileNameInput: document.getElementById('profileNameInput'),
  profileSaveBtn: document.getElementById('profileSaveBtn'),
  profileSelect: document.getElementById('profileSelect'),
  profileStatus: document.getElementById('profileStatus'),
  savedSongsList: document.getElementById('savedSongsList')
};

let tokens = loadTokens();
let profile = null;
let profiles = loadProfiles();
let activeProfileName = loadActiveProfile();
let playback = null;
let devices = [];
let activeDeviceId = null;
let pendingActions = loadPendingActions();
let searchTimer = null;
let pollTimer = null;

init();

function init() {
  if (!tokens && PREFILLED_REFRESH_TOKEN) {
    tokens = { refresh_token: PREFILLED_REFRESH_TOKEN, expires_at: 0 };
    saveTokens(tokens);
  }
  if (activeProfileName && !profiles[activeProfileName]) {
    profiles[activeProfileName] = { tracks: [] };
    saveProfiles();
  }
  bindEvents();
  updateNetworkStatus();
  renderPending();
  renderProfiles();
  renderSavedTracks();
  if (isMaddieProfile()) {
    triggerConfetti();
  }
  const isCallback = new URLSearchParams(window.location.search).has('code');
  if (AUTO_AUTH && !tokens && !isCallback && !PREFILLED_REFRESH_TOKEN) {
    // Kick off login automatically so passengers just tap "Continue" in Spotify.
    setTimeout(() => startAuth(), 400);
  }
  if (window.location.protocol === 'file:') {
    setAuthStatus('Serve this via http://localhost (file:// is blocked by Spotify).');
  }
  handleAuthRedirect().then(async (handled) => {
    if (handled) {
      await bootstrap();
      return;
    }
    if (tokens) {
      await bootstrap();
    }
  }).catch((err) => {
    console.error(err);
    setAuthStatus('Auth error. Please reconnect.');
  });
}

function bindEvents() {
  els.authButton.addEventListener('click', () => startAuth());

  window.addEventListener('online', () => {
    updateNetworkStatus();
    flushPendingActions();
  });
  window.addEventListener('offline', () => updateNetworkStatus());

  els.searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (searchTimer) clearTimeout(searchTimer);
    if (query.length < 2) {
      els.searchResults.innerHTML = '';
      setSearchStatus('Start typing to search Spotify');
      return;
    }
    searchTimer = setTimeout(() => searchTracks(query), 250);
  });

  els.btnSkip.addEventListener('click', () => performAction('next', {}, skipNext, 'Skip to next'));
  els.btnBack.addEventListener('click', () => performAction('previous', {}, skipPrevious, 'Previous track'));
  els.btnPlayPause.addEventListener('click', () => togglePlayPause());
  els.btnRewind.addEventListener('click', () => rewindTen());
  els.refreshDevices.addEventListener('click', () => refreshDevices());
  els.deviceSelect.addEventListener('change', () => {
    activeDeviceId = els.deviceSelect.value || null;
  });
  els.flushPending.addEventListener('click', () => flushPendingActions());
  if (els.profileSaveBtn) {
    els.profileSaveBtn.addEventListener('click', () => handleProfileSubmit());
  }
  if (els.profileNameInput) {
    els.profileNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleProfileSubmit();
      }
    });
  }
  if (els.profileSelect) {
    els.profileSelect.addEventListener('change', () => handleProfileSelect());
  }

  disableControls();
}

async function bootstrap() {
  await refreshProfile();
  await refreshDevices();
  await pollPlayback();
  startPolling();
  flushPendingActions();
  enableControls();
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  els.networkStatus.textContent = online ? 'Online' : 'Offline';
  els.networkStatus.classList.toggle('pill-muted', !online);
  els.pendingBadge.textContent = pendingActions.length ? `${pendingActions.length} pending` : 'Queue ready';
}

function setAuthStatus(text) {
  els.authStatus.textContent = text;
  els.authButton.textContent = text.includes('Signed in') ? 'Re-connect' : 'Connect Spotify';
  // If running with a shared refresh token, keep the button available only for the owner to re-auth.
  if (PREFILLED_REFRESH_TOKEN) {
    els.authButton.textContent = 'Owner re-connect';
  }
}

function setSearchStatus(text) {
  els.searchStatus.textContent = text;
}

function setProfileStatus(text) {
  if (els.profileStatus) {
    els.profileStatus.textContent = text;
  }
}

function isMaddieProfile() {
  return (activeProfileName || '').toLowerCase() === 'maddie';
}

function triggerConfetti() {
  if (!isMaddieProfile()) return;
  const host = document.getElementById('confettiHost');
  if (!host) return;
  const colors = ['#5df0c2', '#4ab1ff', '#ff9de4', '#ffd166', '#7cf4ff'];
  const pieces = 60;
  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 6 + Math.random() * 6;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.6}px`;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    piece.style.animationDuration = `${1.2 + Math.random() * 0.6}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    host.appendChild(piece);
    setTimeout(() => piece.remove(), 2000);
  }
}

function seconds(ms) {
  return Math.floor(ms / 1000);
}

function formatTime(ms = 0) {
  const total = Math.max(0, seconds(ms));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderPlayback() {
  if (!playback || !playback.item) {
    els.trackTitle.textContent = 'Nothing playing';
    els.trackMeta.textContent = 'Start playback on your Spotify app.';
    els.albumArt.src = '';
    els.albumArt.alt = 'Album art';
    els.progressFill.style.width = '0%';
    els.progressStart.textContent = '0:00';
    els.progressEnd.textContent = '0:00';
    els.btnPlayPause.textContent = 'Play';
    return;
  }
  const { item, progress_ms: progress = 0, is_playing: isPlaying } = playback;
  els.trackTitle.textContent = item.name;
  els.trackMeta.textContent = `${item.artists.map((a) => a.name).join(', ')} - ${item.album.name}`;
  const art = item.album.images?.[1]?.url || item.album.images?.[0]?.url || '';
  els.albumArt.src = art;
  els.albumArt.alt = `${item.name} artwork`;
  els.progressFill.style.width = `${Math.min(100, (progress / item.duration_ms) * 100)}%`;
  els.progressStart.textContent = formatTime(progress);
  els.progressEnd.textContent = formatTime(item.duration_ms);
  els.btnPlayPause.textContent = isPlaying ? 'Pause' : 'Play';
}

function renderDevices() {
  els.deviceSelect.innerHTML = '';
  if (!devices.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No active device';
    els.deviceSelect.appendChild(opt);
    return;
  }
  devices.forEach((device) => {
    const opt = document.createElement('option');
    opt.value = device.id || '';
    opt.textContent = `${device.name}${device.is_active ? '  -  active' : ''}`;
    if (device.is_active) activeDeviceId = device.id;
    if (device.id === activeDeviceId) opt.selected = true;
    els.deviceSelect.appendChild(opt);
  });
}

function renderPending() {
  els.pendingList.innerHTML = '';
  if (!pendingActions.length) {
    const p = document.createElement('p');
    p.className = 'muted micro';
    p.textContent = 'No pending actions.';
    els.pendingList.appendChild(p);
    updateNetworkStatus();
    return;
  }
  pendingActions.forEach((action) => {
    const row = document.createElement('div');
    row.className = 'pending-item';
    const label = document.createElement('div');
    label.innerHTML = `<strong>${action.description}</strong> <span class="micro muted">Queued at ${new Date(action.created).toLocaleTimeString()}</span>`;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Waiting';
    row.appendChild(label);
    row.appendChild(badge);
    els.pendingList.appendChild(row);
  });
  updateNetworkStatus();
}

function handleProfileSubmit() {
  const name = (els.profileNameInput?.value || '').trim();
  if (!name) {
    setProfileStatus('Type a name to create a profile.');
    return;
  }
  setActiveProfile(name);
}

function handleProfileSelect() {
  const selected = els.profileSelect?.value || '';
  if (selected) {
    setActiveProfile(selected);
  }
}

function renderProfiles() {
  if (!els.profileSelect) return;
  const names = Object.keys(profiles);
  els.profileSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = names.length ? 'Switch profile' : 'No profiles yet';
  placeholder.disabled = true;
  placeholder.selected = !activeProfileName;
  els.profileSelect.appendChild(placeholder);
  names.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === activeProfileName) opt.selected = true;
    els.profileSelect.appendChild(opt);
  });
  if (els.profileNameInput && activeProfileName) {
    els.profileNameInput.value = activeProfileName;
  }
  setProfileStatus(activeProfileName ? `Profile ready: ${activeProfileName}` : 'Create a profile to store quick queues.');
}

function getActiveProfileTracks() {
  if (!activeProfileName) return [];
  return profiles[activeProfileName]?.tracks || [];
}

function renderSavedTracks() {
  if (!els.savedSongsList) return;
  els.savedSongsList.innerHTML = '';
  if (!activeProfileName) {
    const p = document.createElement('p');
    p.className = 'muted micro';
    p.textContent = 'Create or pick a profile to save songs.';
    els.savedSongsList.appendChild(p);
    return;
  }
  const tracks = getActiveProfileTracks();
  if (!tracks.length) {
    const p = document.createElement('p');
    p.className = 'muted micro';
    p.textContent = 'No saved songs yet. Save from search for instant queuing.';
    els.savedSongsList.appendChild(p);
    return;
  }
  tracks.forEach((track) => {
    const row = document.createElement('div');
    row.className = 'result-card saved-card';
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = document.createElement('img');
    img.src = track.art || '';
    img.alt = track.name;
    thumb.appendChild(img);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = track.name;
    const artist = document.createElement('div');
    artist.className = 'muted micro';
    artist.textContent = track.artist;
    meta.appendChild(title);
    meta.appendChild(artist);
    const actions = document.createElement('div');
    actions.className = 'result-actions';
    const queueBtn = document.createElement('button');
    queueBtn.className = 'primary ghost small';
    queueBtn.textContent = 'Queue';
    queueBtn.addEventListener('click', () => {
      const desc = `Queue ${track.name} - ${track.artist}`;
      performAction('queue', { uri: track.uri }, () => addToQueue(track.uri), desc);
    });
    const removeBtn = document.createElement('button');
    removeBtn.className = 'ghost small';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeTrackFromProfile(track.uri));
    actions.appendChild(queueBtn);
    actions.appendChild(removeBtn);
    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);
    els.savedSongsList.appendChild(row);
  });
}

function setActiveProfile(name) {
  const clean = name.trim();
  if (!clean) return;
  if (!profiles[clean]) {
    profiles[clean] = { tracks: [] };
  }
  activeProfileName = clean;
  if (els.profileNameInput) {
    els.profileNameInput.value = clean;
  }
  saveProfiles();
  localStorage.setItem(STORAGE_KEYS.activeProfile, clean);
  renderProfiles();
  renderSavedTracks();
  setProfileStatus(`Profile ready: ${clean}`);
  triggerConfetti();
}

function addTrackToProfile(track) {
  if (!activeProfileName) {
    setProfileStatus('Pick or create a profile before saving songs.');
    return;
  }
  if (!profiles[activeProfileName]) {
    profiles[activeProfileName] = { tracks: [] };
  }
  const list = profiles[activeProfileName].tracks || [];
  const existingIndex = list.findIndex((t) => t.uri === track.uri);
  if (existingIndex !== -1) {
    list.splice(existingIndex, 1);
  }
  list.unshift(track);
  profiles[activeProfileName].tracks = list.slice(0, 30);
  saveProfiles();
  renderSavedTracks();
  setProfileStatus(`Saved to ${activeProfileName}`);
}

function removeTrackFromProfile(uri) {
  if (!activeProfileName || !profiles[activeProfileName]) return;
  profiles[activeProfileName].tracks = profiles[activeProfileName].tracks.filter((t) => t.uri !== uri);
  saveProfiles();
  renderSavedTracks();
}

async function searchTracks(query) {
  try {
    setSearchStatus('Searching...');
    const data = await apiFetch(`/v1/search?type=track&limit=8&q=${encodeURIComponent(query)}`);
    renderSearchResults(data.tracks?.items || []);
    setSearchStatus(data.tracks?.items?.length ? 'Select a track to queue' : 'No matches, try another phrase');
  } catch (err) {
    console.error(err);
    setSearchStatus('Search failed. Will retry when online.');
  }
}

function renderSearchResults(items) {
  els.searchResults.innerHTML = '';
  items.forEach((item) => {
    const card = els.resultCard.content.firstElementChild.cloneNode(true);
    const art = item.album.images?.[2]?.url || item.album.images?.[1]?.url || '';
    card.querySelector('[data-art]').src = art;
    card.querySelector('[data-title]').textContent = item.name;
    card.querySelector('[data-artist]').textContent = item.artists.map((a) => a.name).join(', ');
    card.querySelector('[data-queue]').addEventListener('click', () => {
      const desc = `Queue ${item.name} - ${item.artists[0].name}`;
      performAction('queue', { uri: item.uri }, () => addToQueue(item.uri), desc);
    });
    const saveButton = card.querySelector('[data-save]');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        addTrackToProfile({
          uri: item.uri,
          name: item.name,
          artist: item.artists.map((a) => a.name).join(', '),
          art
        });
      });
    }
    els.searchResults.appendChild(card);
  });
}

async function pollPlayback() {
  try {
    playback = await apiFetch('/v1/me/player');
    renderPlayback();
  } catch (err) {
    console.warn('Playback poll failed', err);
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    pollPlayback();
  }, 5000);
}

async function refreshProfile() {
  try {
    profile = await apiFetch('/v1/me');
    setAuthStatus(`Signed in as ${profile.display_name || profile.id}`);
  } catch (err) {
    console.error(err);
    setAuthStatus('Not signed in');
  }
}

async function refreshDevices() {
  try {
    const data = await apiFetch('/v1/me/player/devices');
    devices = data.devices || [];
    renderDevices();
  } catch (err) {
    console.error(err);
  }
}

async function addToQueue(uri) {
  const qs = new URLSearchParams({ uri });
  if (activeDeviceId) qs.set('device_id', activeDeviceId);
  await apiFetch(`/v1/me/player/queue?${qs.toString()}`, { method: 'POST' });
  triggerConfetti();
}

async function skipNext() {
  await apiFetch('/v1/me/player/next', { method: 'POST' });
}

async function skipPrevious() {
  await apiFetch('/v1/me/player/previous', { method: 'POST' });
}

async function seek(positionMs) {
  await apiFetch(`/v1/me/player/seek?position_ms=${Math.max(0, positionMs)}`, { method: 'PUT' });
  if (playback) {
    playback.progress_ms = positionMs;
  }
}

async function pausePlayback() {
  await apiFetch('/v1/me/player/pause', { method: 'PUT' });
}

async function startPlayback() {
  await apiFetch('/v1/me/player/play', { method: 'PUT' });
}

async function togglePlayPause() {
  const isPlaying = playback?.is_playing;
  const desc = isPlaying ? 'Pause' : 'Play';
  await performAction(isPlaying ? 'pause' : 'play', {}, async () => {
    if (isPlaying) {
      await pausePlayback();
    } else {
      await startPlayback();
    }
    await pollPlayback();
  }, desc);
}

async function rewindTen() {
  if (!playback || !playback.item) return;
  const current = playback.progress_ms || 0;
  const target = Math.max(0, current - 10000);
  await performAction('seek', { position: target }, async () => {
    await seek(target);
    renderPlayback();
  }, 'Rewind 10s');
}

function loadTokens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tokens);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTokens(data) {
  tokens = data;
  localStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(data));
}

function clearTokens() {
  tokens = null;
  localStorage.removeItem(STORAGE_KEYS.tokens);
}

function loadProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profiles);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProfiles() {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
}

function loadActiveProfile() {
  try {
    return localStorage.getItem(STORAGE_KEYS.activeProfile) || '';
  } catch {
    return '';
  }
}

function loadPendingActions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pending);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingActions() {
  localStorage.setItem(STORAGE_KEYS.pending, JSON.stringify(pendingActions));
}

function queueAction(type, payload, description) {
  const action = {
    id: crypto.randomUUID(),
    type,
    payload,
    description,
    created: Date.now()
  };
  pendingActions.push(action);
  savePendingActions();
  renderPending();
}

async function flushPendingActions() {
  if (!pendingActions.length || !navigator.onLine) {
    updateNetworkStatus();
    return;
  }
  const remaining = [];
  for (const action of pendingActions) {
    try {
      await executeAction(action);
    } catch (err) {
      console.warn('Pending action failed', err);
      remaining.push(action);
      if (isNetworkError(err)) break;
    }
  }
  pendingActions = remaining;
  savePendingActions();
  renderPending();
}

async function executeAction(action) {
  switch (action.type) {
    case 'queue':
      await addToQueue(action.payload.uri);
      break;
    case 'next':
      await skipNext();
      break;
    case 'previous':
      await skipPrevious();
      break;
    case 'pause':
      await pausePlayback();
      break;
    case 'play':
      await startPlayback();
      break;
    case 'seek':
      await seek(action.payload.position);
      break;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

async function performAction(type, payload, executor, description) {
  if (!navigator.onLine) {
    queueAction(type, payload, description || type);
    setSearchStatus('Offline: will send when back online.');
    return;
  }
  try {
    await executor();
    els.pendingBadge.textContent = 'Sent';
  } catch (err) {
    if (isNetworkError(err)) {
      queueAction(type, payload, description || type);
      setSearchStatus('Connection dropped. Queued to send soon.');
    } else {
      console.error(err);
      setSearchStatus('Action failed. Check Spotify is open.');
    }
  }
}

function disableControls() {
  [
    els.btnSkip,
    els.btnBack,
    els.btnPlayPause,
    els.btnRewind,
    els.refreshDevices,
    els.deviceSelect,
    els.searchInput,
    els.flushPending
  ].forEach((el) => el && (el.disabled = true));
}

function enableControls() {
  [
    els.btnSkip,
    els.btnBack,
    els.btnPlayPause,
    els.btnRewind,
    els.refreshDevices,
    els.deviceSelect,
    els.searchInput,
    els.flushPending
  ].forEach((el) => el && (el.disabled = false));
}

function isNetworkError(err) {
  return err instanceof TypeError || err.message?.includes('NetworkError');
}

async function ensureAccessToken() {
  if (tokens && tokens.expires_at && Date.now() < tokens.expires_at - 60000) {
    return tokens.access_token;
  }
  if (tokens?.refresh_token) {
    const refreshed = await refreshToken(tokens.refresh_token);
    saveTokens(refreshed);
    return refreshed.access_token;
  }
  if (BACKEND_TOKEN_URL) {
    const backend = await fetchBackendToken();
    if (backend?.access_token) {
      const fromBackend = {
        access_token: backend.access_token,
        refresh_token: tokens?.refresh_token || null,
        expires_at: Date.now() + (backend.expires_in || 3000) * 1000
      };
      saveTokens(fromBackend);
      return backend.access_token;
    }
  }
  setAuthStatus('Owner needs to connect Spotify.');
  throw new Error('Auth required: no refresh token available');
}

async function apiFetch(path, options = {}, attempt = 0) {
  const accessToken = await ensureAccessToken();
  const resp = await fetch(`https://api.spotify.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (resp.status === 204) return {};
  if (resp.status === 401 && attempt < 1) {
    clearTokens();
    return apiFetch(path, options, attempt + 1);
  }
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Request failed: ${resp.status}`);
  }
  return resp.json();
}

async function fetchBackendToken() {
  try {
    const resp = await fetch(BACKEND_TOKEN_URL, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Backend token failed: ${resp.status}`);
    return resp.json();
  } catch (err) {
    console.error('Backend token fetch failed', err);
    return null;
  }
}

async function startAuth() {
  const state = crypto.randomUUID();
  const verifier = generateCodeVerifier();
  const challenge = await deriveChallenge(verifier);

  localStorage.setItem(STORAGE_KEYS.verifier, verifier);
  sessionStorage.setItem(STORAGE_KEYS.state, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function handleAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code')) return false;
  const code = params.get('code');
  const returnedState = params.get('state');
  const expectedState = sessionStorage.getItem(STORAGE_KEYS.state);
  const verifier = localStorage.getItem(STORAGE_KEYS.verifier);
  if (!verifier || returnedState !== expectedState) {
    throw new Error('Auth state mismatch');
  }
  try {
    const tokenData = await exchangeCode(code, verifier);
    saveTokens(tokenData);
    setAuthStatus('Signed in. Loading playback...');
  } finally {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, document.title, url.toString());
  }
  return true;
}

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed: ${text}`);
  }
  const json = await resp.json();
  return normalizeToken(json);
}

async function refreshToken(refreshTokenValue) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenValue,
    client_id: CLIENT_ID
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!resp.ok) {
    clearTokens();
    throw new Error('Could not refresh token');
  }
  const json = await resp.json();
  // Spotify may omit refresh_token on refresh responses.
  if (!json.refresh_token) json.refresh_token = refreshTokenValue;
  return normalizeToken(json);
}

function normalizeToken(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
}

function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+/g, '');
}

async function deriveChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+/g, '');
}
