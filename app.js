// ── Password ───────────────────────────────────────────────────────────────
// SHA-256 hash of the password. To change the password:
//   1. Run: echo -n "yourpassword" | shasum -a 256
//   2. Paste the hash below.
const PASSWORD_HASH = 'aaa63342d35955679b70420a9d3793935b71c12143db4a83bc346aede450c28d';
const AUTH_KEY = 'jokebook_authed';

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

// ── Auth ───────────────────────────────────────────────────────────────────
function showApp() {
  passwordScreen.classList.add('hidden');
  app.classList.remove('hidden');
}

async function tryUnlock() {
  const val = passwordInput.value.trim();
  const hash = await sha256(val);

  if (hash === PASSWORD_HASH) {
    sessionStorage.setItem(AUTH_KEY, '1');
    showApp();
  } else {
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
    followupBlock.classList.remove('hidden');
    tapHint.textContent = 'Tap for the answer ✨';
  } else if (stage === 2) {
    answerBlock.classList.remove('hidden');
    tapHint.textContent = '';
  }
  // stage > 2 — do nothing, wait for Next
}

jokeCard.addEventListener('click', advanceStage);
jokeCard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') advanceStage(); });

nextBtn.addEventListener('click', () => {
  current = (current + 1) % jokes.length;
  // reshuffle when we wrap around so the order feels fresh
  if (current === 0) order = shuffle(order);
  loadJoke(current);
});

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
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
