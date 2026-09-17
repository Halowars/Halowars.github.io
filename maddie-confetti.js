const ACTIVE_PROFILE_KEY = 'road_dj_active_profile_v2';
const CONFETTI_NAMES = new Set(['maddie', 'madison']);
const CONFETTI_COLORS = ['#3ddc84', '#69e7a2', '#a7f3c7', '#d7ff6f', '#ffffff'];

function confettiProfileActive() {
  try {
    const name = (localStorage.getItem(ACTIVE_PROFILE_KEY) || '').trim().toLowerCase();
    return CONFETTI_NAMES.has(name);
  } catch {
    return false;
  }
}

function getConfettiHost() {
  let host = document.getElementById('confettiHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'confettiHost';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
  }
  return host;
}

function shootConfetti() {
  const host = getConfettiHost();
  const pieces = 64;

  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.width = `${5 + Math.random() * 6}px`;
    piece.style.height = `${8 + Math.random() * 9}px`;
    piece.style.setProperty('--drift', `${-120 + Math.random() * 240}px`);
    piece.style.setProperty('--spin', `${360 + Math.random() * 900}deg`);
    piece.style.setProperty('--duration', `${1.15 + Math.random() * .75}s`);
    piece.style.animationDelay = `${Math.random() * .08}s`;
    host.appendChild(piece);

    setTimeout(() => piece.remove(), 2200);
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('button');
  if (!button || button.disabled || !confettiProfileActive()) return;
  shootConfetti();
});
