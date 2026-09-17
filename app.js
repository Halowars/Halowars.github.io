const API_BASE = (document.querySelector('meta[name="road-dj-backend"]')?.content || '').trim().replace(/\/$/, '');

const STORAGE_KEYS = {
  profiles: 'road_dj_profiles_v2',
  activeProfile: 'road_dj_active_profile_v2'
};

const els = {
  authButton: document.getElementById('authButton'),
  authStatus: document.getElementById('authStatus'),
  networkStatus: document.getElementById('networkStatus'),
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
  artPlaceholder: document.getElementById('artPlaceholder'),
  btnPlayPause: document.getElementById('btnPlayPause'),
  btnSkip: document.getElementById('btnSkip'),
  btnBack: document.getElementById('btnBack'),
  btnRewind: document.getElementById('btnRewind'),
  deviceSelect: document.getElementById('deviceSelect'),
  refreshDevices: document.getElementById('refreshDevices'),
  profileNameInput: document.getElementById('profileNameInput'),
  profileSaveBtn: document.getElementById('profileSaveBtn'),
  profileSelect: document.getElementById('profileSelect'),
  profileStatus: document.getElementById('profileStatus'),
  savedSongsList: document.getElementById('savedSongsList'),
  toastStack: document.getElementById('toastStack')
};

let playback = null;
let devices = [];
let activeDeviceId = null;
let profiles = loadProfiles();
let activeProfileName = loadActiveProfile();
let searchTimer = null;
let searchController = null;
let pollTimer = null;
let pollInFlight = false;
let backendConnected = false;
let devicesLoaded = false;
const searchCache = new Map();

init();

async function init() {
  bindEvents();
  updateNetworkStatus();
  renderProfiles();
  renderSavedTracks();
  renderDevices();
  disableSpotifyControls();

  if (!API_BASE) {
    setAuthStatus('Server not configured');
    setSearchStatus('Road DJ server is not configured.');
    return;
  }

  const connected = await checkBackendStatus();
  if (!connected) return;

  enableSpotifyControls();
  setSearchStatus('Search Spotify');

  await pollPlayback();
  startPolling();
}

function bindEvents() {
  els.authButton.addEventListener('click', () => {
    if (!API_BASE) {
      showToast('Server not configured', 'Road DJ has no backend URL.', 'error');
      return;
    }
    window.location.href = `${API_BASE}/owner/login`;
  });

  window.addEventListener('online', () => {
    updateNetworkStatus();
    if (backendConnected) pollPlayback();
  });
  window.addEventListener('offline', updateNetworkStatus);

  els.searchInput.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    clearTimeout(searchTimer);
    searchController?.abort();

    if (query.length < 2) {
      els.searchResults.innerHTML = '';
      setSearchStatus('Search Spotify');
      return;
    }

    searchTimer = setTimeout(() => searchTracks(query), 160);
  });

  els.btnSkip.addEventListener('click', () => runPlaybackAction(
    () => apiFetch('/v1/me/player/next', { method: 'POST' }),
    'Skipped'
  ));
  els.btnBack.addEventListener('click', () => runPlaybackAction(
    () => apiFetch('/v1/me/player/previous', { method: 'POST' }),
    'Previous track'
  ));
  els.btnPlayPause.addEventListener('click', togglePlayPause);
  els.btnRewind.addEventListener('click', rewindTen);
  els.refreshDevices.addEventListener('click', () => refreshDevices(true));
  els.deviceSelect.addEventListener('focus', () => {
    if (!devicesLoaded) refreshDevices(false);
  });
  els.deviceSelect.addEventListener('change', () => {
    activeDeviceId = els.deviceSelect.value || null;
  });

  els.profileSaveBtn.addEventListener('click', handleProfileSubmit);
  els.profileNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleProfileSubmit();
    }
  });
  els.profileSelect.addEventListener('change', handleProfileSelect);
}

async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/status`, { cache: 'no-store' });
    if (!response.ok) throw httpError(response.status, await response.text());
    const status = await response.json();
    backendConnected = Boolean(status.connected);
    setAuthStatus(backendConnected ? 'Connected' : 'Owner connection needed');
    els.authButton.textContent = backendConnected ? 'Owner' : 'Connect owner';
    return backendConnected;
  } catch (error) {
    console.error('Road DJ backend unavailable', error);
    setAuthStatus('Server unavailable');
    setSearchStatus('Server unavailable');
    return false;
  }
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  els.networkStatus.classList.toggle('offline', !online);
  els.networkStatus.innerHTML = `<span class="status-dot"></span>${online ? 'Online' : 'Offline'}`;
}

function setAuthStatus(text) { els.authStatus.textContent = text; }
function setSearchStatus(text) { els.searchStatus.textContent = text; }
function setProfileStatus(text) { els.profileStatus.textContent = text; }

function formatTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function renderPlayback() {
  if (!playback?.item) {
    els.trackTitle.textContent = 'Nothing playing';
    els.trackMeta.textContent = 'Open Spotify on the phone or car to start a session.';
    els.albumArt.removeAttribute('src');
    els.albumArt.classList.remove('has-art');
    els.progressFill.style.width = '0%';
    els.progressStart.textContent = '0:00';
    els.progressEnd.textContent = '0:00';
    els.btnPlayPause.textContent = 'Play';
    return;
  }

  const { item, progress_ms: progress = 0, is_playing: isPlaying } = playback;
  els.trackTitle.textContent = item.name;
  els.trackMeta.textContent = `${item.artists.map((artist) => artist.name).join(', ')} · ${item.album.name}`;
  const art = item.album.images?.[1]?.url || item.album.images?.[0]?.url || '';
  if (art) els.albumArt.src = art;
  else els.albumArt.removeAttribute('src');
  els.albumArt.alt = `${item.name} artwork`;
  els.albumArt.classList.toggle('has-art', Boolean(art));
  els.progressFill.style.width = `${Math.min(100, (progress / item.duration_ms) * 100)}%`;
  els.progressStart.textContent = formatTime(progress);
  els.progressEnd.textContent = formatTime(item.duration_ms);
  els.btnPlayPause.textContent = isPlaying ? 'Pause' : 'Play';
}

function renderDevices() {
  els.deviceSelect.innerHTML = '';

  if (!devicesLoaded) {
    els.deviceSelect.appendChild(new Option('Auto (active Spotify device)', ''));
    activeDeviceId = null;
    return;
  }

  if (!devices.length) {
    els.deviceSelect.appendChild(new Option('No active Spotify device', ''));
    activeDeviceId = null;
    return;
  }

  els.deviceSelect.appendChild(new Option('Auto (active device)', ''));
  const active = devices.find((device) => device.is_active);
  if (active && !activeDeviceId) activeDeviceId = active.id;

  devices.forEach((device) => {
    const option = new Option(`${device.name}${device.is_active ? ' · active' : ''}`, device.id || '');
    option.selected = device.id === activeDeviceId;
    els.deviceSelect.appendChild(option);
  });
}

async function pollPlayback() {
  if (pollInFlight || !navigator.onLine || !backendConnected) return;
  pollInFlight = true;
  try {
    playback = await apiFetch('/v1/me/player');
    renderPlayback();
  } catch (error) {
    if (error.name !== 'AbortError') console.warn('Playback poll failed', error);
  } finally {
    pollInFlight = false;
  }
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(pollPlayback, 8000);
}

async function refreshDevices(showFeedback = false) {
  if (!navigator.onLine) return;
  try {
    const data = await apiFetch('/v1/me/player/devices');
    devices = data.devices || [];
    devicesLoaded = true;
    renderDevices();
    if (showFeedback) {
      showToast(
        devices.length ? 'Devices refreshed' : 'No active device',
        devices.length ? `${devices.length} Spotify device${devices.length === 1 ? '' : 's'} found.` : 'Open Spotify on the phone or car first.',
        devices.length ? 'success' : 'info'
      );
    }
  } catch (error) {
    console.error(error);
    if (showFeedback) showToast('Could not refresh devices', friendlySpotifyError(error), 'error');
  }
}

async function searchTracks(query) {
  if (!navigator.onLine) {
    setSearchStatus('Offline');
    return;
  }

  const key = query.toLowerCase();
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
    renderSearchResults(cached.items);
    setSearchStatus(`${cached.items.length} results`);
    return;
  }

  searchController?.abort();
  searchController = new AbortController();

  try {
    setSearchStatus('Searching…');
    const data = await apiFetch(`/v1/search?type=track&limit=8&q=${encodeURIComponent(query)}`, {
      signal: searchController.signal
    });
    const items = data.tracks?.items || [];
    searchCache.set(key, { items, time: Date.now() });
    if (searchCache.size > 30) searchCache.delete(searchCache.keys().next().value);
    renderSearchResults(items);
    setSearchStatus(items.length ? `${items.length} results` : 'No matches');
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error(error);
    setSearchStatus(friendlySpotifyError(error));
  }
}

function renderSearchResults(items) {
  const fragment = document.createDocumentFragment();
  els.searchResults.innerHTML = '';

  items.forEach((item) => {
    const card = els.resultCard.content.firstElementChild.cloneNode(true);
    const art = item.album.images?.[2]?.url || item.album.images?.[1]?.url || item.album.images?.[0]?.url || '';
    const artist = item.artists.map((entry) => entry.name).join(', ');
    const img = card.querySelector('[data-art]');
    img.src = art;
    img.loading = 'lazy';
    img.decoding = 'async';
    card.querySelector('[data-title]').textContent = item.name;
    card.querySelector('[data-artist]').textContent = artist;

    const queueButton = card.querySelector('[data-queue]');
    queueButton.addEventListener('click', () => queueTrackWithFeedback(queueButton, card, {
      uri: item.uri,
      name: item.name,
      artist
    }));

    card.querySelector('[data-save]').addEventListener('click', () => {
      addTrackToProfile({ uri: item.uri, name: item.name, artist, art });
    });

    fragment.appendChild(card);
  });

  els.searchResults.appendChild(fragment);
}

async function queueTrackWithFeedback(button, row, track) {
  if (button.disabled) return;
  if (!navigator.onLine) {
    animateQueueError(button, 'Offline');
    showToast('Not added', 'You are offline.', 'error');
    return;
  }

  const icon = button.querySelector('.queue-icon');
  const label = button.querySelector('.queue-label');
  button.disabled = true;
  button.classList.remove('is-success', 'is-error');
  button.classList.add('is-loading');
  icon.textContent = '•';
  label.textContent = 'Adding';

  try {
    await addToQueue(track.uri);
    button.classList.remove('is-loading');
    button.classList.add('is-success');
    icon.textContent = '✓';
    label.textContent = 'Added';
    row?.classList.add('queued-flash');
    showToast('Added to queue', `${track.name} · ${track.artist}`, 'success');
    setTimeout(() => row?.classList.remove('queued-flash'), 650);
    setTimeout(() => resetQueueButton(button), 1100);
  } catch (error) {
    console.error(error);
    animateQueueError(button, error.status === 404 ? 'No device' : 'Try again');
    showToast(
      error.status === 404 ? 'Open Spotify first' : 'Could not add song',
      friendlySpotifyError(error),
      error.status === 404 ? 'info' : 'error'
    );
  }
}

function animateQueueError(button, text) {
  const icon = button.querySelector('.queue-icon');
  const label = button.querySelector('.queue-label');
  button.classList.remove('is-loading', 'is-success');
  button.classList.add('is-error');
  icon.textContent = '!';
  label.textContent = text;
  setTimeout(() => resetQueueButton(button), 1400);
}

function resetQueueButton(button) {
  button.disabled = false;
  button.classList.remove('is-loading', 'is-success', 'is-error');
  button.querySelector('.queue-icon').textContent = '+';
  button.querySelector('.queue-label').textContent = 'Queue';
}

async function addToQueue(uri) {
  const firstParams = new URLSearchParams({ uri });
  if (activeDeviceId) firstParams.set('device_id', activeDeviceId);

  try {
    await apiFetch(`/v1/me/player/queue?${firstParams}`, { method: 'POST' });
  } catch (error) {
    if (error.status === 404 && activeDeviceId) {
      activeDeviceId = null;
      await apiFetch(`/v1/me/player/queue?${new URLSearchParams({ uri })}`, { method: 'POST' });
      return;
    }
    throw error;
  }
}

async function togglePlayPause() {
  const isPlaying = Boolean(playback?.is_playing);
  await runPlaybackAction(async () => {
    await apiFetch(`/v1/me/player/${isPlaying ? 'pause' : 'play'}`, { method: 'PUT' });
    if (playback) playback.is_playing = !isPlaying;
    renderPlayback();
    setTimeout(pollPlayback, 250);
  }, isPlaying ? 'Paused' : 'Playing');
}

async function rewindTen() {
  if (!playback?.item) {
    showToast('Nothing playing', 'Open Spotify and start a track first.', 'info');
    return;
  }
  const target = Math.max(0, (playback.progress_ms || 0) - 10000);
  await runPlaybackAction(async () => {
    await apiFetch(`/v1/me/player/seek?position_ms=${target}`, { method: 'PUT' });
    playback.progress_ms = target;
    renderPlayback();
  }, 'Rewound 10 seconds');
}

async function runPlaybackAction(executor, successText) {
  if (!navigator.onLine) {
    showToast('Offline', 'The action was not sent.', 'error');
    return;
  }
  try {
    await executor();
    if (successText) showToast(successText, 'Sent to Spotify.', 'success');
  } catch (error) {
    console.error(error);
    if (error.status === 404) {
      showToast('No active Spotify device', 'Open Spotify on the phone or car, then try again.', 'info');
      return;
    }
    showToast('Action failed', friendlySpotifyError(error), 'error');
  }
}

function friendlySpotifyError(error) {
  if (error?.status === 404) return 'Spotify does not see an active playback device.';
  if (error?.status === 401) return 'The owner needs to reconnect Spotify.';
  if (error?.status === 403) return 'Spotify did not allow that action.';
  if (error?.status === 429) return 'Spotify is rate limiting Road DJ. Try again in a moment.';
  if (error?.status >= 500) return 'Spotify or the Road DJ server had a temporary problem.';
  if (error?.name === 'TypeError') return 'The network connection dropped.';
  return 'Try again. If it keeps happening, open Spotify on the playback device.';
}

function handleProfileSubmit() {
  const name = els.profileNameInput.value.trim();
  if (!name) {
    setProfileStatus('Type a name first.');
    return;
  }
  setActiveProfile(name);
}

function handleProfileSelect() {
  const selected = els.profileSelect.value;
  if (selected) setActiveProfile(selected);
}

function renderProfiles() {
  const names = Object.keys(profiles);
  els.profileSelect.innerHTML = '';
  const placeholder = new Option(names.length ? 'Switch profile' : 'No profiles yet', '');
  placeholder.disabled = true;
  placeholder.selected = !activeProfileName;
  els.profileSelect.appendChild(placeholder);

  names.forEach((name) => {
    const option = new Option(name, name);
    option.selected = name === activeProfileName;
    els.profileSelect.appendChild(option);
  });

  if (activeProfileName) els.profileNameInput.value = activeProfileName;
  setProfileStatus(activeProfileName ? `${activeProfileName}'s quick picks` : 'Profiles stay on this device.');
}

function renderSavedTracks() {
  els.savedSongsList.innerHTML = '';
  if (!activeProfileName) {
    els.savedSongsList.innerHTML = '<p class="empty-state">Create a profile to keep quick picks on this device.</p>';
    return;
  }

  const tracks = profiles[activeProfileName]?.tracks || [];
  if (!tracks.length) {
    els.savedSongsList.innerHTML = '<p class="empty-state">No saved songs yet.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  tracks.forEach((track) => {
    const row = document.createElement('article');
    row.className = 'song-row';
    row.innerHTML = `
      <div class="song-art"><img src="${escapeHtmlAttribute(track.art || '')}" alt="" loading="lazy" decoding="async"></div>
      <div class="song-info"><strong></strong><span></span></div>
      <div class="song-actions">
        <button class="queue-button"><span class="queue-icon">+</span><span class="queue-label">Queue</span></button>
        <button class="save-button">Remove</button>
      </div>`;
    row.querySelector('.song-info strong').textContent = track.name;
    row.querySelector('.song-info span').textContent = track.artist;
    const queueButton = row.querySelector('.queue-button');
    queueButton.addEventListener('click', () => queueTrackWithFeedback(queueButton, row, track));
    row.querySelector('.save-button').addEventListener('click', () => removeTrackFromProfile(track.uri));
    fragment.appendChild(row);
  });
  els.savedSongsList.appendChild(fragment);
}

function setActiveProfile(name) {
  const clean = name.trim().slice(0, 50);
  if (!clean) return;
  if (!profiles[clean]) profiles[clean] = { tracks: [] };
  activeProfileName = clean;
  saveProfiles();
  localStorage.setItem(STORAGE_KEYS.activeProfile, clean);
  renderProfiles();
  renderSavedTracks();
}

function addTrackToProfile(track) {
  if (!activeProfileName) {
    setProfileStatus('Choose a profile before saving songs.');
    showToast('Choose a profile', 'Quick picks are stored per profile on this device.', 'info');
    return;
  }
  const list = profiles[activeProfileName]?.tracks || [];
  const withoutDuplicate = list.filter((item) => item.uri !== track.uri);
  profiles[activeProfileName] = { tracks: [track, ...withoutDuplicate].slice(0, 30) };
  saveProfiles();
  renderSavedTracks();
  showToast('Saved', `${track.name} added to ${activeProfileName}.`, 'success');
}

function removeTrackFromProfile(uri) {
  if (!activeProfileName || !profiles[activeProfileName]) return;
  profiles[activeProfileName].tracks = profiles[activeProfileName].tracks.filter((track) => track.uri !== uri);
  saveProfiles();
  renderSavedTracks();
}

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) || '{}'); }
  catch { return {}; }
}
function loadActiveProfile() {
  try { return localStorage.getItem(STORAGE_KEYS.activeProfile) || ''; }
  catch { return ''; }
}
function saveProfiles() { localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles)); }
function escapeHtmlAttribute(value) { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function showToast(title, detail, tone = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  icon.textContent = tone === 'error' ? '!' : tone === 'info' ? 'i' : '✓';
  const copy = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = detail;
  copy.append(strong, span);
  toast.append(icon, copy);
  els.toastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 180);
  }, 2100);
}

function disableSpotifyControls() {
  [els.searchInput, els.btnPlayPause, els.btnSkip, els.btnBack, els.btnRewind, els.deviceSelect, els.refreshDevices]
    .forEach((element) => { element.disabled = true; });
}
function enableSpotifyControls() {
  [els.searchInput, els.btnPlayPause, els.btnSkip, els.btnBack, els.btnRewind, els.deviceSelect, els.refreshDevices]
    .forEach((element) => { element.disabled = false; });
}

function httpError(status, message = '') {
  const error = new Error(message || `Request failed: ${status}`);
  error.status = status;
  return error;
}

async function apiFetch(path, options = {}) {
  if (!API_BASE) throw new Error('Road DJ backend is not configured');

  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}/api/spotify${path}`, {
    ...options,
    cache: 'no-store',
    headers
  });

  if (response.status === 204) return {};
  if (!response.ok) {
    const text = await response.text();
    const error = httpError(response.status, text);
    if (response.status === 401) {
      setAuthStatus('Owner connection needed');
      els.authButton.textContent = 'Reconnect owner';
    }
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : {};
}
