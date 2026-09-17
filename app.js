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

let profile = null;
let playback = null;
let devices = [];
let activeDeviceId = null;
let profiles = loadProfiles();
let activeProfileName = loadActiveProfile();
let searchTimer = null;
let pollTimer = null;
let backendConnected = false;

init();

async function init() {
  bindEvents();
  updateNetworkStatus();
  renderProfiles();
  renderSavedTracks();
  disableSpotifyControls();

  if (!API_BASE) {
    setAuthStatus('Server not configured');
    els.authButton.textContent = 'Owner setup';
    setSearchStatus('Road DJ server needs to be deployed first.');
    return;
  }

  const connected = await checkBackendStatus();
  if (!connected) {
    setAuthStatus('Owner connection needed');
    els.authButton.textContent = 'Connect owner';
    return;
  }

  await bootstrap();
}

function bindEvents() {
  els.authButton.addEventListener('click', () => {
    if (!API_BASE) {
      showToast('Server not configured', 'Add the Cloudflare Worker URL to index.html.', true);
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
    if (query.length < 2) {
      els.searchResults.innerHTML = '';
      setSearchStatus('Start typing to search Spotify.');
      return;
    }
    searchTimer = setTimeout(() => searchTracks(query), 220);
  });

  els.btnSkip.addEventListener('click', () => runImmediateAction(() => apiFetch('/v1/me/player/next', { method: 'POST' }), 'Skipped'));
  els.btnBack.addEventListener('click', () => runImmediateAction(() => apiFetch('/v1/me/player/previous', { method: 'POST' }), 'Previous track'));
  els.btnPlayPause.addEventListener('click', togglePlayPause);
  els.btnRewind.addEventListener('click', rewindTen);
  els.refreshDevices.addEventListener('click', refreshDevices);
  els.deviceSelect.addEventListener('change', () => { activeDeviceId = els.deviceSelect.value || null; });

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
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const status = await response.json();
    backendConnected = Boolean(status.connected);
    setAuthStatus(backendConnected ? 'Ready' : 'Owner connection needed');
    els.authButton.textContent = backendConnected ? 'Owner' : 'Connect owner';
    return backendConnected;
  } catch (error) {
    console.error('Road DJ backend unavailable', error);
    setAuthStatus('Server unavailable');
    setSearchStatus('Road DJ server is not responding.');
    return false;
  }
}

async function bootstrap() {
  enableSpotifyControls();
  await Promise.allSettled([refreshProfile(), refreshDevices(), pollPlayback()]);
  startPolling();
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
    els.trackMeta.textContent = 'Start Spotify on the car or phone.';
    els.albumArt.src = '';
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
  const art = item.album.images?.[0]?.url || '';
  els.albumArt.src = art;
  els.albumArt.alt = `${item.name} artwork`;
  els.albumArt.classList.toggle('has-art', Boolean(art));
  els.progressFill.style.width = `${Math.min(100, (progress / item.duration_ms) * 100)}%`;
  els.progressStart.textContent = formatTime(progress);
  els.progressEnd.textContent = formatTime(item.duration_ms);
  els.btnPlayPause.textContent = isPlaying ? 'Pause' : 'Play';
}

function renderDevices() {
  els.deviceSelect.innerHTML = '';
  if (!devices.length) {
    const option = new Option('No active Spotify device', '');
    els.deviceSelect.appendChild(option);
    activeDeviceId = null;
    return;
  }

  const active = devices.find((device) => device.is_active);
  if (active) activeDeviceId = active.id;
  devices.forEach((device) => {
    const option = new Option(`${device.name}${device.is_active ? ' · active' : ''}`, device.id || '');
    option.selected = device.id === activeDeviceId;
    els.deviceSelect.appendChild(option);
  });
}

async function pollPlayback() {
  try {
    playback = await apiFetch('/v1/me/player');
    renderPlayback();
  } catch (error) {
    console.warn('Playback poll failed', error);
  }
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (navigator.onLine) pollPlayback();
  }, 8000);
}

async function refreshProfile() {
  try {
    profile = await apiFetch('/v1/me');
    setAuthStatus(`Ready · ${profile.display_name || profile.id}`);
  } catch (error) {
    console.error(error);
    setAuthStatus('Owner connection needed');
  }
}

async function refreshDevices() {
  try {
    const data = await apiFetch('/v1/me/player/devices');
    devices = data.devices || [];
    renderDevices();
  } catch (error) {
    console.error(error);
    showToast('Could not load devices', 'Open Spotify on the playback device and try again.', true);
  }
}

async function searchTracks(query) {
  if (!navigator.onLine) {
    setSearchStatus('No connection. Search was not sent.');
    return;
  }
  try {
    setSearchStatus('Searching…');
    const data = await apiFetch(`/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`);
    const items = data.tracks?.items || [];
    renderSearchResults(items);
    setSearchStatus(items.length ? `${items.length} results` : 'No matches. Try another search.');
  } catch (error) {
    console.error(error);
    setSearchStatus('Search failed. Try again.');
  }
}

function renderSearchResults(items) {
  els.searchResults.innerHTML = '';
  items.forEach((item) => {
    const card = els.resultCard.content.firstElementChild.cloneNode(true);
    const art = item.album.images?.[2]?.url || item.album.images?.[1]?.url || item.album.images?.[0]?.url || '';
    const artist = item.artists.map((entry) => entry.name).join(', ');
    card.querySelector('[data-art]').src = art;
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

    els.searchResults.appendChild(card);
  });
}

async function queueTrackWithFeedback(button, row, track) {
  if (button.disabled) return;
  if (!navigator.onLine) {
    animateQueueError(button, 'Offline');
    showToast('Not added', 'There is no connection, so Road DJ did not save it for later.', true);
    return;
  }

  const icon = button.querySelector('.queue-icon');
  const label = button.querySelector('.queue-label');
  button.disabled = true;
  button.classList.remove('is-success', 'is-error');
  button.classList.add('is-loading');
  icon.textContent = '◌';
  label.textContent = 'Adding';

  try {
    await addToQueue(track.uri);
    button.classList.remove('is-loading');
    button.classList.add('is-success');
    icon.textContent = '✓';
    label.textContent = 'Added';
    row?.classList.add('queued-flash');
    showToast('Added to queue', `${track.name} · ${track.artist}`);
    setTimeout(() => row?.classList.remove('queued-flash'), 800);
    setTimeout(() => resetQueueButton(button), 1350);
  } catch (error) {
    console.error(error);
    animateQueueError(button, 'Try again');
    showToast('Could not add song', friendlySpotifyError(error), true);
  }
}

function animateQueueError(button, text) {
  const icon = button.querySelector('.queue-icon');
  const label = button.querySelector('.queue-label');
  button.classList.remove('is-loading', 'is-success');
  button.classList.add('is-error');
  icon.textContent = '!';
  label.textContent = text;
  button.disabled = true;
  setTimeout(() => resetQueueButton(button), 1600);
}

function resetQueueButton(button) {
  button.disabled = false;
  button.classList.remove('is-loading', 'is-success', 'is-error');
  button.querySelector('.queue-icon').textContent = '＋';
  button.querySelector('.queue-label').textContent = 'Queue';
}

async function addToQueue(uri) {
  const params = new URLSearchParams({ uri });
  if (activeDeviceId) params.set('device_id', activeDeviceId);
  await apiFetch(`/v1/me/player/queue?${params}`, { method: 'POST' });
}

async function togglePlayPause() {
  const isPlaying = Boolean(playback?.is_playing);
  await runImmediateAction(async () => {
    await apiFetch(`/v1/me/player/${isPlaying ? 'pause' : 'play'}`, { method: 'PUT' });
    await pollPlayback();
  }, isPlaying ? 'Paused' : 'Playing');
}

async function rewindTen() {
  if (!playback?.item) return;
  const target = Math.max(0, (playback.progress_ms || 0) - 10000);
  await runImmediateAction(async () => {
    await apiFetch(`/v1/me/player/seek?position_ms=${target}`, { method: 'PUT' });
    playback.progress_ms = target;
    renderPlayback();
  }, 'Rewound 10 seconds');
}

async function runImmediateAction(executor, successText) {
  if (!navigator.onLine) {
    showToast('No connection', 'Road DJ did not save the action for later.', true);
    return;
  }
  try {
    await executor();
    if (successText) showToast(successText, 'Sent to Spotify.');
  } catch (error) {
    console.error(error);
    showToast('Action failed', friendlySpotifyError(error), true);
  }
}

function friendlySpotifyError(error) {
  if (error?.status === 404) return 'Spotify does not see an active playback device.';
  if (error?.status === 401) return 'The owner needs to reconnect Spotify.';
  if (error?.status === 429) return 'Spotify is rate limiting requests. Try again shortly.';
  return 'Check that Spotify is open and the Road DJ server is online.';
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
  setProfileStatus(activeProfileName ? `Using ${activeProfileName} on this device.` : 'Profiles stay on this device.');
}

function renderSavedTracks() {
  els.savedSongsList.innerHTML = '';
  if (!activeProfileName) {
    els.savedSongsList.innerHTML = '<p class="empty-state">Create a profile to save quick picks.</p>';
    return;
  }

  const tracks = profiles[activeProfileName]?.tracks || [];
  if (!tracks.length) {
    els.savedSongsList.innerHTML = '<p class="empty-state">No saved songs yet. Save one from search.</p>';
    return;
  }

  tracks.forEach((track) => {
    const row = document.createElement('article');
    row.className = 'song-row';
    row.innerHTML = `
      <div class="song-art"><img src="${escapeHtmlAttribute(track.art || '')}" alt=""></div>
      <div class="song-info"><strong></strong><span></span></div>
      <div class="song-actions">
        <button class="queue-button"><span class="queue-icon">＋</span><span class="queue-label">Queue</span></button>
        <button class="save-button">Remove</button>
      </div>`;
    row.querySelector('.song-info strong').textContent = track.name;
    row.querySelector('.song-info span').textContent = track.artist;
    const queueButton = row.querySelector('.queue-button');
    queueButton.addEventListener('click', () => queueTrackWithFeedback(queueButton, row, track));
    row.querySelector('.save-button').addEventListener('click', () => removeTrackFromProfile(track.uri));
    els.savedSongsList.appendChild(row);
  });
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
  showToast(`Hi ${clean}`, 'Your Road DJ shortcuts are ready.');
}

function addTrackToProfile(track) {
  if (!activeProfileName) {
    setProfileStatus('Pick or create a profile before saving songs.');
    showToast('Choose a profile first', 'Profiles keep saved songs on this device.', true);
    return;
  }
  const list = profiles[activeProfileName]?.tracks || [];
  const withoutDuplicate = list.filter((item) => item.uri !== track.uri);
  profiles[activeProfileName] = { tracks: [track, ...withoutDuplicate].slice(0, 30) };
  saveProfiles();
  renderSavedTracks();
  showToast('Saved', `${track.name} is in ${activeProfileName}'s quick picks.`);
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

function showToast(title, detail, error = false) {
  const toast = document.createElement('div');
  toast.className = `toast${error ? ' error' : ''}`;
  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  icon.textContent = error ? '!' : '✓';
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
    setTimeout(() => toast.remove(), 260);
  }, 2300);
}

function disableSpotifyControls() {
  [els.searchInput, els.btnPlayPause, els.btnSkip, els.btnBack, els.btnRewind, els.deviceSelect, els.refreshDevices]
    .forEach((element) => { element.disabled = true; });
}
function enableSpotifyControls() {
  [els.searchInput, els.btnPlayPause, els.btnSkip, els.btnBack, els.btnRewind, els.deviceSelect, els.refreshDevices]
    .forEach((element) => { element.disabled = false; });
}

async function apiFetch(path, options = {}) {
  if (!API_BASE) throw new Error('Road DJ backend is not configured');
  const response = await fetch(`${API_BASE}/api/spotify${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (response.status === 204) return {};
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || `Request failed: ${response.status}`);
    error.status = response.status;
    if (response.status === 401) {
      setAuthStatus('Owner connection needed');
      els.authButton.textContent = 'Reconnect owner';
    }
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : {};
}
