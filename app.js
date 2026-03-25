// ── Password ───────────────────────────────────────────────────────────────
// SHA-256 hash of the password. To change the password:
//   1. Run: echo -n "yourpassword" | shasum -a 256
//   2. Paste the hash below.
const PASSWORD_HASH = 'aaa63342d35955679b70420a9d3793935b71c12143db4a83bc346aede450c28d';
const AUTH_KEY = 'jokebook_authed';
const ERROR_MESSAGES = [
  'Wrong password, try again!',
  'Nope! Try again.',
  'Hint, it\'s our special day! 🎉',
];
const IS_MOBILE_SAFARI =
  /Safari/i.test(navigator.userAgent) &&
  !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent) &&
  ((/iP(ad|hone|od)/i.test(navigator.userAgent)) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

// ── Sounds ─────────────────────────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  const ctx = audioCtx;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  if (type === 'unlock') {
    // Happy ascending chime
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.1 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);
      osc.connect(g).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.35);
    });
  } else if (type === 'error') {
    // Low buzz
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } else if (type === 'reveal') {
    // Soft pop
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } else if (type === 'answer') {
    // Two-note tada
    [440, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.13);
      g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + i * 0.13 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.13 + 0.28);
      osc.connect(g).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.13);
      osc.stop(ctx.currentTime + i * 0.13 + 0.28);
    });
  } else if (type === 'next') {
    // Quick whoosh
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── DOM refs ───────────────────────────────────────────────────────────────
const passwordScreen = document.getElementById('password-screen');
const app = document.getElementById('app');
const passwordInput = document.getElementById('password-input');
const unlockBtn = document.getElementById('unlock-btn');
const errorMsg = document.getElementById('error-msg');

const jokeCard = document.getElementById('joke-card');
const questionText = document.getElementById('question-text');
const followupBlock = document.getElementById('followup-block');
const followupText = document.getElementById('followup-text');
const answerBlock = document.getElementById('answer-block');
const answerText = document.getElementById('answer-text');
const tapHint = document.getElementById('tap-hint');
const nextBtn = document.getElementById('next-btn');
const jokeCounter = document.getElementById('joke-counter');

// ── State ──────────────────────────────────────────────────────────────────
let jokes = [];
let order = [];   // shuffled indices
let current = 0;    // index into `order`
let stage = 0;    // 0 = question, 1 = followup, 2 = answer
let failCount = 0; // tracks sequential error messages
let lastNextTouchAt = 0;
let lastTouchEndAt = 0;

// ── Auth ───────────────────────────────────────────────────────────────────
function showApp() {
  passwordScreen.classList.add('hidden');
  app.classList.remove('hidden');
}

function setupSafariZoomGuards() {
  if (!IS_MOBILE_SAFARI) return;

  document.addEventListener('gesturestart', event => {
    event.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', event => {
    const now = Date.now();

    if (now - lastTouchEndAt < 300) {
      event.preventDefault();
    }

    lastTouchEndAt = now;
  }, { passive: false });
}

async function tryUnlock() {
  const val = passwordInput.value.trim();
  const hash = await sha256(val);

  if (hash === PASSWORD_HASH) {
    playSound('unlock');
    sessionStorage.setItem(AUTH_KEY, '1');
    showApp();
  } else {
    playSound('error');
    errorMsg.textContent = ERROR_MESSAGES[Math.min(failCount, ERROR_MESSAGES.length - 1)];
    failCount++;
    errorMsg.classList.remove('hidden');
    const lockCard = document.querySelector('.lock-card');
    lockCard.classList.remove('shake');
    void lockCard.offsetWidth; // reflow to restart animation
    lockCard.classList.add('shake');
    passwordInput.value = '';
    passwordInput.focus();
  }
}

unlockBtn.addEventListener('click', tryUnlock);
passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

// ── Jokes ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadJoke(idx) {
  const joke = jokes[order[idx]];

  // Flash animation
  jokeCard.classList.remove('card-flash');
  void jokeCard.offsetWidth;
  jokeCard.classList.add('card-flash');

  // Reset state
  stage = 0;
  questionText.textContent = joke.question;
  followupText.textContent = joke.followUp;
  followupBlock.classList.add('hidden');
  answerBlock.classList.add('hidden');
  answerText.textContent = joke.answer;
  tapHint.textContent = 'Tap to reveal ✨';

  jokeCounter.textContent = `${idx + 1} / ${jokes.length}`;
}

function advanceStage() {
  stage++;

  if (stage === 1) {
    playSound('reveal');
    followupBlock.classList.remove('hidden');
    tapHint.textContent = 'Tap for the answer ✨';
  } else if (stage === 2) {
    playSound('answer');
    answerBlock.classList.remove('hidden');
    tapHint.textContent = '';
  }
  // stage > 2 — do nothing, wait for Next
}

jokeCard.addEventListener('click', advanceStage);
jokeCard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') advanceStage(); });

function showNextJoke() {
  playSound('next');
  current = (current + 1) % jokes.length;
  // reshuffle when we wrap around so the order feels fresh
  if (current === 0) order = shuffle(order);
  loadJoke(current);
}

nextBtn.addEventListener('touchend', event => {
  lastNextTouchAt = Date.now();
  event.preventDefault();
  showNextJoke();
}, { passive: false });

nextBtn.addEventListener('click', event => {
  if (Date.now() - lastNextTouchAt < 500) {
    event.preventDefault();
    return;
  }

  showNextJoke();
});

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  setupSafariZoomGuards();

  // Skip password screen if already authed this session
  if (sessionStorage.getItem(AUTH_KEY) === '1') {
    showApp();
  }

  const res = await fetch('jokes.json');
  jokes = await res.json();
  order = shuffle(jokes.map((_, i) => i));
  current = 0;
  loadJoke(current);
}

init();
