/* =====================================================================
   Brushstroke — game implementation
   ===================================================================== */

/* ---- Tunables -------------------------------------------------------- */
const START_LEVEL = 3;          // 3 = 8 tiles (4×2). 1 = 2 tiles (max tension).
const MAX_LEVEL   = 9;          // 512 tiles — effectively resolved.
const COLOR_RES   = 512;        // off-screen canvas size for color sampling.
const FADE_MS     = 380;        // tile crossfade duration

/* ---- Artworks. Public-domain paintings hosted on Wikimedia Commons.
   All URLs use upload.wikimedia.org which serves CORS-permissive headers,
   so we can read pixels for color averaging. If one fails to load, the
   round goes to the error state and the player can move on. ----------- */
const ARTWORKS = [
  {
    title: 'The Starry Night',
    artist: 'Vincent van Gogh',
    year: 1889,
    clue: 'Post-Impressionism · oil on canvas · Saint-Rémy-de-Provence',
    aliases: ['starry night'],
    src: 'assets/paintings/starry-night.jpg'
  },
  {
    title: 'The Great Wave off Kanagawa',
    artist: 'Katsushika Hokusai',
    year: 'c. 1831',
    clue: 'Edo-period woodblock print · ukiyo-e · Japan',
    aliases: ['great wave', 'the great wave', 'great wave of kanagawa', 'kanagawa'],
    src: 'assets/paintings/great-wave.jpg'
  },
  {
    title: 'Girl with a Pearl Earring',
    artist: 'Johannes Vermeer',
    year: 'c. 1665',
    clue: 'Dutch Golden Age · oil on canvas · tronie portrait',
    aliases: ['girl with pearl earring', 'pearl earring', 'girl with a pearl earing'],
    src: 'assets/paintings/pearl-earring.jpg'
  },
  {
    title: 'The Scream',
    artist: 'Edvard Munch',
    year: 1893,
    clue: 'Expressionism · oil, tempera and pastel on cardboard · Norway',
    aliases: ['scream'],
    src: 'assets/paintings/scream.jpg'
  },
  {
    title: 'American Gothic',
    artist: 'Grant Wood',
    year: 1930,
    clue: 'Regionalism · oil on beaverboard · Iowa',
    aliases: ['american gothic'],
    src: 'assets/paintings/american-gothic.jpg'
  },
  {
    title: 'Mona Lisa',
    artist: 'Leonardo da Vinci',
    year: 'c. 1503',
    clue: 'Italian Renaissance · oil on poplar · half-length portrait',
    aliases: ['monalisa', 'la gioconda', 'gioconda', 'la joconde'],
    src: 'assets/paintings/mona-lisa.jpg'
  },
  {
    title: 'The Birth of Venus',
    artist: 'Sandro Botticelli',
    year: 'c. 1485',
    clue: 'Italian Renaissance · tempera on canvas · mythological',
    aliases: ['birth of venus', 'venus'],
    src: 'assets/paintings/birth-of-venus.jpg'
  },
  {
    title: 'The Kiss',
    artist: 'Gustav Klimt',
    year: '1907–1908',
    clue: 'Vienna Secession · oil and gold leaf on canvas',
    aliases: ['the kiss', 'kiss'],
    src: 'assets/paintings/the-kiss.jpg'
  },
  {
    title: 'A Sunday on La Grande Jatte',
    artist: 'Georges Seurat',
    year: '1884–1886',
    clue: 'Pointillism · oil on canvas · Île de la Jatte',
    aliases: ['sunday on la grande jatte', 'la grande jatte', 'grande jatte', 'sunday afternoon on the island of la grande jatte'],
    src: 'assets/paintings/la-grande-jatte.jpg'
  },
  {
    title: 'Café Terrace at Night',
    artist: 'Vincent van Gogh',
    year: 1888,
    clue: 'Post-Impressionism · oil on canvas · Arles',
    aliases: ['cafe terrace at night', 'café terrace at night', 'café terrace at night, arles', 'terrace at night'],
    src: 'assets/paintings/cafe-terrace.jpg'
  },
  {
    title: 'Wanderer above the Sea of Fog',
    artist: 'Caspar David Friedrich',
    year: 'c. 1818',
    clue: 'German Romanticism · oil on canvas · the sublime',
    aliases: ['wanderer above the sea of fog', 'wanderer above the mist', 'wanderer above the sea of mist'],
    src: 'assets/paintings/wanderer-sea-fog.jpg'
  },
  {
    title: 'Las Meninas',
    artist: 'Diego Velázquez',
    year: 1656,
    clue: 'Spanish Golden Age · oil on canvas · court portrait',
    aliases: ['las meninas', 'the maids of honour', 'meninas'],
    src: 'assets/paintings/las-meninas.jpg'
  }
];

/* Microcopy — spare, literate, faintly auction-catalogue. */
const COPY = {
  wrong: [
    'Not quite — the canvas divides further.',
    'A reasonable theory, but the picture insists otherwise.',
    'Look again; the surface yields more.',
    'Close in feeling, distant in fact. Resolution increases.',
    'Not this lot. Another seam parts.',
    'The brushwork suggests another hand.',
    'A respectable guess. The mosaic obliges.',
    'No — but the question sharpens.'
  ],
  right: [
    'A confident and correct attribution.',
    'Correctly attributed.',
    'The catalogue agrees.',
    'A clean appraisal.',
    'Precisely so.'
  ],
  emptyGuess: 'An attribution requires a title.',
  fullyResolved: 'The canvas is fully resolved — your final attempt.',
  concedeFirst: 'Concede this lot? Tap again to confirm.',
  fetchErr: 'This lot is currently between exhibitions.',
  awaiting: 'Awaiting attribution',
  opening: 'Eight rough fields. Make the call.'
};

const SHARE_COPY = {
  ready:   'Card composed.',
  copied:  'Copied to clipboard.',
  copyErr: 'Copy not supported here — try Save image.'
};

/* ---- DOM refs -------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const els = {
  mosaic:        $('mosaic'),
  paintingOv:    $('painting-overlay'),
  paintingImg:   $('painting-img'),
  loading:       $('frame-loading'),
  errorState:    $('frame-error'),
  errorNext:     $('error-next'),

  placardTitle:  $('placard-title'),
  placardMeta:   $('placard-meta'),

  guessForm:     $('guess-form'),
  guessInput:    $('guess-input'),
  guessSubmit:   $('guess-submit'),
  feedback:      $('feedback'),

  actionClue:    $('action-clue'),
  actionConcede: $('action-concede'),

  mGuesses:      $('m-guesses'),
  mGuessesWrap:  $('m-guesses-wrap'),
  mClarity:      $('m-clarity'),
  mClarityWrap:  $('m-clarity-wrap'),
  mScore:        $('m-score'),
  mScoreWrap:    $('m-score-wrap'),

  lotNo:         $('lot-no'),
  sessionSolved: $('session-solved'),

  resultOverlay: $('result-overlay'),
  resultVerdict: $('result-verdict'),
  resultTitle:   $('result-title'),
  resultArtist:  $('result-artist'),
  rGuesses:      $('r-guesses'),
  rClarity:      $('r-clarity'),
  rScore:        $('r-score'),
  rShare:        $('r-share'),
  rNext:         $('r-next'),

  shareModal:    $('share-modal'),
  shareCanvas:   $('share-canvas'),
  shareDownload: $('share-download'),
  shareCopy:     $('share-copy'),
  shareClose:    $('share-close'),
  shareStatus:   $('share-status')
};

/* ---- State ----------------------------------------------------------- */
const state = {
  rotation: shuffle([...Array(ARTWORKS.length).keys()]),
  rotIndex: 0,
  artwork: null,
  level: START_LEVEL,
  guesses: 0,
  hintUsed: false,
  concedeArmed: false,
  resolved: false,
  bestScore: 0,
  solvedCount: 0,
  solvedAtLevel: null,
  lastScore: 0,
  busy: false
};

/* ---- Utilities ------------------------------------------------------- */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function dimsForLevel(n) {
  // Vertical splits first: L1 = 2×1, L2 = 2×2, L3 = 4×2, L4 = 4×4 …
  return [2 ** Math.ceil(n / 2), 2 ** Math.floor(n / 2)];
}
function tilesAtLevel(n) {
  const [c, r] = dimsForLevel(n);
  return c * r;
}

function scoreFor(level, hintUsed) {
  const base = Math.round(1000 * (MAX_LEVEL - level + 1) / MAX_LEVEL);
  const s = hintUsed ? Math.round(base * 0.5) : base;
  return Math.max(50, s);
}

/* ---- Guess normalization + tolerant matching ------------------------- */
function normalize(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[''""`´]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\bthe\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

function matches(guess, art) {
  const g = normalize(guess);
  if (!g) return false;
  const candidates = [art.title, ...(art.aliases || [])];
  for (const c of candidates) {
    const n = normalize(c);
    if (!n) continue;
    if (g === n) return true;
    const tol = n.length <= 8 ? 1 : n.length <= 18 ? 2 : 3;
    if (Math.abs(g.length - n.length) <= tol + 2 && levenshtein(g, n) <= tol) return true;
    if (n.includes(g) && g.length >= 5 && g.length / n.length >= 0.5) return true;
  }
  return false;
}

/* ---- Image loading + color averaging --------------------------------- */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed: ' + src));
    img.src = src;
  });
}

// Resolve when the given <img> is fully loaded. Used in place of img.decode(),
// which can hang indefinitely on already-cached same-origin images in some
// Chromium builds — the load/error events are reliable in every case.
function imageReady(img) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => {
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
      resolve();
    };
    img.addEventListener('load', done);
    img.addEventListener('error', done);
  });
}

function buildLevels(img) {
  const cv = document.createElement('canvas');
  cv.width = COLOR_RES;
  cv.height = COLOR_RES;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const min = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - min) / 2;
  const sy = (img.naturalHeight - min) / 2;
  ctx.fillStyle = '#0a0805';
  ctx.fillRect(0, 0, COLOR_RES, COLOR_RES);
  ctx.drawImage(img, sx, sy, min, min, 0, 0, COLOR_RES, COLOR_RES);
  let data;
  try {
    data = ctx.getImageData(0, 0, COLOR_RES, COLOR_RES).data;
  } catch (e) {
    throw new Error('canvas read tainted — image CORS denied');
  }

  const levels = [];
  for (let n = 1; n <= MAX_LEVEL; n++) {
    const [cols, rows] = dimsForLevel(n);
    const tw = COLOR_RES / cols;
    const th = COLOR_RES / rows;
    const colors = new Array(cols * rows);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        colors[row * cols + col] = averageRect(
          data, COLOR_RES,
          Math.round(col * tw), Math.round(row * th),
          Math.round(tw), Math.round(th)
        );
      }
    }
    levels.push({ cols, rows, colors });
  }
  return levels;
}

function averageRect(data, imgW, x, y, w, h) {
  let r = 0, g = 0, b = 0, n = 0;
  const step = (w > 32 || h > 32) ? 2 : 1;
  for (let py = y; py < y + h; py += step) {
    const base = py * imgW * 4;
    for (let px = x; px < x + w; px += step) {
      const i = base + px * 4;
      r += data[i];
      g += data[i+1];
      b += data[i+2];
      n++;
    }
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

async function prepareArtwork(art) {
  if (art._levels) return art;
  const img = await loadImage(art.src);
  art._img = img;
  art._levels = buildLevels(img);
  return art;
}

/* ---- Rendering ------------------------------------------------------- */
function renderMosaicAt(level) {
  const { cols, rows, colors } = state.artwork._levels[level - 1];
  const m = document.createElement('div');
  m.className = 'mosaic';
  m.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  m.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < colors.length; i++) {
    const [r, g, b] = colors[i];
    const t = document.createElement('div');
    t.className = 'tile';
    t.style.backgroundColor = `rgb(${r},${g},${b})`;
    frag.appendChild(t);
  }
  m.appendChild(frag);
  return m;
}

function setMosaicLevel(level) {
  const m = renderMosaicAt(level);
  m.id = 'mosaic';
  els.mosaic.replaceWith(m);
  els.mosaic = m;
}

async function bisectTo(newLevel) {
  if (newLevel > MAX_LEVEL) return;
  if (newLevel <= state.level) return;
  state.busy = true;

  const oldDims = dimsForLevel(state.level);
  const newDims = dimsForLevel(newLevel);
  const splitsCols = newDims[0] > oldDims[0];
  const seamClass = splitsCols ? 'split-v' : 'split-h';

  const tiles = els.mosaic.querySelectorAll('.tile');
  tiles.forEach(t => t.classList.add(seamClass));

  await sleep(140);

  const next = renderMosaicAt(newLevel);
  next.classList.add('mosaic-overlay');
  const parent = els.mosaic.parentElement;
  parent.appendChild(next);
  void next.offsetWidth;
  next.classList.add('revealed');

  await sleep(FADE_MS);

  const old = els.mosaic;
  next.classList.remove('mosaic-overlay', 'revealed');
  next.id = 'mosaic';
  old.replaceWith(next);
  els.mosaic = next;

  state.level = newLevel;
  state.busy = false;
}

/* ---- Placard --------------------------------------------------------- */
function setPlacardUntitled() {
  els.placardTitle.textContent = 'Untitled';
  els.placardTitle.classList.add('untitled');
  els.placardMeta.textContent = COPY.awaiting;
}

function renderPlacardTitle(text, withCursor) {
  // Clear and rebuild safely with DOM nodes (no innerHTML)
  els.placardTitle.textContent = text;
  if (withCursor) {
    const cursor = document.createElement('span');
    cursor.className = 'placard-cursor';
    els.placardTitle.appendChild(cursor);
  }
}

async function engravePlacard(title, meta) {
  els.placardTitle.classList.remove('untitled');
  els.placardMeta.textContent = '';

  for (let i = 0; i <= title.length; i++) {
    renderPlacardTitle(title.slice(0, i), true);
    await sleep(40 + Math.random() * 22);
  }
  renderPlacardTitle(title, false);
  await sleep(200);
  for (let i = 0; i <= meta.length; i++) {
    els.placardMeta.textContent = meta.slice(0, i);
    await sleep(20);
  }
}

/* ---- Scoreboard ------------------------------------------------------ */
function setClarityValue(n) {
  // Build "<num> <unit>" safely with DOM
  els.mClarity.textContent = '';
  const num = document.createElement('span');
  num.className = 'v-num';
  num.textContent = String(n);
  const unit = document.createElement('span');
  unit.className = 'unit';
  unit.textContent = n === 1 ? 'tile' : 'tiles';
  els.mClarity.appendChild(num);
  els.mClarity.appendChild(unit);
}

function updateScoreboard(opts = {}) {
  els.mGuesses.textContent = pad2(state.guesses);
  setClarityValue(tilesAtLevel(state.level));
  const projected = scoreFor(state.level, state.hintUsed);
  els.mScore.textContent = String(projected);

  els.mScoreWrap.classList.toggle('metric-hinted', state.hintUsed);

  if (opts.flashClarity) flashMetric(els.mClarityWrap);
  if (opts.flashGuesses) flashMetric(els.mGuessesWrap);
  if (opts.flashScore)   flashMetric(els.mScoreWrap);

  els.sessionSolved.textContent = pad2(state.solvedCount);
  els.lotNo.textContent = pad2((state.rotIndex % state.rotation.length) + 1);
}

function flashMetric(el) {
  el.classList.add('metric-flash');
  setTimeout(() => el.classList.remove('metric-flash'), 500);
}

/* ---- Feedback line --------------------------------------------------- */
function setFeedback(text, cls = '') {
  els.feedback.classList.remove('feedback-warn', 'feedback-right', 'feedback-clue', 'flash');
  if (cls) els.feedback.classList.add(cls);
  els.feedback.textContent = text || ' ';
  void els.feedback.offsetWidth;
  els.feedback.classList.add('flash');
}

function clearFeedback() {
  els.feedback.textContent = ' ';
  els.feedback.classList.remove('feedback-warn', 'feedback-right', 'feedback-clue', 'flash');
}

/* ---- Frame state ----------------------------------------------------- */
function showLoading() {
  els.loading.hidden = false;
  els.errorState.hidden = true;
  els.paintingOv.classList.remove('revealed');
}
function showError() {
  els.errorState.hidden = false;
  els.loading.hidden = true;
}
function hideAllStates() {
  els.loading.hidden = true;
  els.errorState.hidden = true;
}

/* ---- Round lifecycle ------------------------------------------------- */
async function startRound() {
  const artIdx = state.rotation[state.rotIndex % state.rotation.length];
  const art = ARTWORKS[artIdx];

  state.artwork = null;
  state.level = START_LEVEL;
  state.guesses = 0;
  state.hintUsed = false;
  state.concedeArmed = false;
  state.resolved = false;
  state.solvedAtLevel = null;
  els.actionClue.disabled = false;
  els.actionConcede.disabled = false;
  els.actionConcede.classList.remove('confirming');
  els.actionConcede.textContent = 'Concede';

  setPlacardUntitled();
  clearFeedback();
  showLoading();
  setMosaicLevelEmpty();
  enableInput(false);
  updateScoreboard();

  try {
    await prepareArtwork(art);
    state.artwork = art;
    hideAllStates();
    setMosaicLevel(START_LEVEL);
    enableInput(true);
    els.guessInput.focus();
    updateScoreboard({ flashClarity: true });
    setFeedback(COPY.opening);
    preloadNext();
  } catch (e) {
    console.warn(e);
    showError();
    enableInput(false);
    setFeedback(COPY.fetchErr, 'feedback-warn');
  }
}

function preloadNext() {
  const nextIdx = state.rotation[(state.rotIndex + 1) % state.rotation.length];
  prepareArtwork(ARTWORKS[nextIdx]).catch(() => {});
}

function setMosaicLevelEmpty() {
  const m = document.createElement('div');
  m.className = 'mosaic';
  m.id = 'mosaic';
  m.style.gridTemplateColumns = '1fr';
  m.style.gridTemplateRows = '1fr';
  els.mosaic.replaceWith(m);
  els.mosaic = m;
}

function enableInput(on) {
  els.guessInput.disabled = !on;
  els.guessSubmit.disabled = !on;
}

/* ---- Guess submission ------------------------------------------------ */
async function submitGuess() {
  if (state.busy || state.resolved) return;
  if (!state.artwork) return;
  const raw = els.guessInput.value.trim();
  if (!raw) {
    setFeedback(COPY.emptyGuess, 'feedback-warn');
    return;
  }
  state.guesses++;
  state.concedeArmed = false;
  els.actionConcede.classList.remove('confirming');
  els.actionConcede.textContent = 'Concede';

  if (matches(raw, state.artwork)) {
    state.solvedAtLevel = state.level;
    state.lastScore = scoreFor(state.level, state.hintUsed);
    if (state.lastScore > state.bestScore) state.bestScore = state.lastScore;
    state.solvedCount++;
    enableInput(false);
    els.actionClue.disabled = true;
    els.actionConcede.disabled = true;
    setFeedback(pick(COPY.right), 'feedback-right');
    updateScoreboard({ flashScore: true, flashGuesses: true });
    await revealCorrect();
    return;
  }

  // wrong guess
  els.guessInput.value = '';
  if (state.level >= MAX_LEVEL) {
    setFeedback('The canvas has nothing further to reveal.', 'feedback-warn');
    updateScoreboard({ flashGuesses: true });
    await sleep(700);
    state.lastScore = 0;
    enableInput(false);
    els.actionClue.disabled = true;
    els.actionConcede.disabled = true;
    await revealConceded(true);
    return;
  }

  setFeedback(pick(COPY.wrong));
  enableInput(false);
  updateScoreboard({ flashGuesses: true });
  await bisectTo(state.level + 1);
  updateScoreboard({ flashClarity: true, flashScore: true });
  if (!state.resolved) {
    enableInput(true);
    els.guessInput.focus();
  }
}

/* ---- Win + concede reveal ------------------------------------------- */
async function revealCorrect() {
  state.resolved = true;
  els.paintingImg.src = state.artwork.src;
  await imageReady(els.paintingImg);
  els.paintingOv.classList.add('revealed');
  await engravePlacard(state.artwork.title, `${state.artwork.artist} · ${state.artwork.year}`);
  await sleep(450);
  showResult('correct');
}

async function revealConceded(forced = false) {
  state.resolved = true;
  state.solvedAtLevel = state.level;
  state.lastScore = 0;
  if (state.level < MAX_LEVEL) {
    await bisectTo(MAX_LEVEL);
  }
  els.paintingImg.src = state.artwork.src;
  await imageReady(els.paintingImg);
  els.paintingOv.classList.add('revealed');
  await engravePlacard(state.artwork.title, `${state.artwork.artist} · ${state.artwork.year}`);
  await sleep(450);
  showResult(forced ? 'exhausted' : 'conceded');
}

function showResult(kind) {
  const verdict = {
    correct:   'Correctly attributed',
    conceded:  'Conceded gracefully',
    exhausted: 'Attempts exhausted'
  }[kind];

  els.resultVerdict.textContent = verdict;
  els.resultVerdict.classList.toggle('conceded', kind !== 'correct');

  els.resultTitle.textContent = state.artwork.title;
  els.resultArtist.textContent = `${state.artwork.artist} · ${state.artwork.year}`;
  els.rGuesses.textContent = String(state.guesses);
  const tiles = tilesAtLevel(state.solvedAtLevel || state.level);
  els.rClarity.textContent = (kind === 'correct') ? `${tiles} tile${tiles === 1 ? '' : 's'}` : '—';
  els.rScore.textContent = state.hintUsed && kind === 'correct'
    ? `${state.lastScore} ·`
    : String(state.lastScore);

  els.resultOverlay.hidden = false;
  void els.resultOverlay.offsetWidth;
  els.resultOverlay.classList.add('shown');
}

function hideResult() {
  els.resultOverlay.classList.remove('shown');
  setTimeout(() => { els.resultOverlay.hidden = true; }, 500);
}

/* ---- Hints + concede ------------------------------------------------- */
function useClue() {
  if (state.resolved || !state.artwork) return;
  if (state.hintUsed) return;
  state.hintUsed = true;
  els.actionClue.disabled = true;
  setFeedback(state.artwork.clue, 'feedback-clue');
  updateScoreboard({ flashScore: true });
}

function concede() {
  if (state.resolved || !state.artwork || state.busy) return;
  if (!state.concedeArmed) {
    state.concedeArmed = true;
    els.actionConcede.classList.add('confirming');
    els.actionConcede.textContent = 'Tap again to confirm';
    setFeedback(COPY.concedeFirst, 'feedback-warn');
    return;
  }
  state.concedeArmed = false;
  els.actionConcede.classList.remove('confirming');
  els.actionConcede.disabled = true;
  els.actionClue.disabled = true;
  enableInput(false);
  setFeedback('Conceded. The catalogue obliges.', 'feedback-warn');
  revealConceded(false);
}

/* ---- Share card composition ----------------------------------------- */
function renderShareCard() {
  const W = 1200, H = 1500;
  const c = els.shareCanvas;
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,    '#2a1f17');
  bg.addColorStop(0.5,  '#1a1310');
  bg.addColorStop(1,    '#0c0807');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const vg = ctx.createRadialGradient(W/2, H*0.4, W*0.3, W/2, H*0.5, W*0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
    ctx.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1);
  }
  ctx.restore();

  const fSize = 940;
  const fx = (W - fSize) / 2;
  const fy = 130;
  const frameThick = 46;
  drawGiltFrame(ctx, fx, fy, fSize, fSize, frameThick);

  const inset = frameThick;
  const mx = fx + inset;
  const my = fy + inset;
  const mw = fSize - inset * 2;
  const mh = fSize - inset * 2;
  drawMosaicForCard(ctx, mx + 2, my + 2, mw - 4, mh - 4);
  // inner top shadow
  const innerShadow = ctx.createLinearGradient(mx, my, mx, my + 24);
  innerShadow.addColorStop(0, 'rgba(0,0,0,0.6)');
  innerShadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = innerShadow;
  ctx.fillRect(mx, my, mw, 24);

  const pw = 540, ph = 92;
  const px = (W - pw) / 2;
  const py = fy + fSize + 22;
  drawPlacard(ctx, px, py, pw, ph);

  const verdictText = state.lastScore > 0
    ? 'CORRECTLY ATTRIBUTED'
    : 'CONCEDED GRACEFULLY';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = state.lastScore > 0 ? '#d3b46e' : '#7a6d5b';
  ctx.font = '500 14px "JetBrains Mono", monospace';
  ctx.fillText(spaced(verdictText), W / 2, py + ph + 56);

  const tiles = tilesAtLevel(state.solvedAtLevel || state.level);
  const stat = state.lastScore > 0
    ? `${state.guesses} GUESS${state.guesses === 1 ? '' : 'ES'}   ·   CLARITY ${tiles}   ·   SCORE ${state.lastScore}`
    : `FINAL CLARITY ${tiles} TILES`;
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillStyle = '#c8b88f';
  ctx.fillText(spaced(stat), W / 2, py + ph + 92);

  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#9a8b73';
  ctx.fillText(spaced('BRUSHSTROKE'), W / 2, H - 110);

  ctx.strokeStyle = 'rgba(180, 150, 100, 0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W/2 - 140, H - 88);
  ctx.lineTo(W/2 + 140, H - 88);
  ctx.stroke();

  ctx.font = '400 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#665a48';
  ctx.fillText(spaced('SOURCE IMAGERY · PUBLIC DOMAIN · WIKIMEDIA COMMONS'), W / 2, H - 64);
}

function spaced(text) {
  // mimic letter-spacing in canvas by inserting spaces between chars
  return text.split('').join(' ');
}

function drawGiltFrame(ctx, x, y, w, h, thick) {
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0,    '#6b502a');
  g.addColorStop(0.18, '#c9a35a');
  g.addColorStop(0.34, '#efd49a');
  g.addColorStop(0.50, '#a87f3e');
  g.addColorStop(0.68, '#ddb46a');
  g.addColorStop(0.82, '#825f2d');
  g.addColorStop(1.0,  '#3c2a13');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  const ix = x + thick, iy = y + thick;
  const iw = w - thick * 2, ih = h - thick * 2;
  ctx.fillStyle = '#0a0805';
  ctx.fillRect(ix, iy, iw, ih);

  ctx.strokeStyle = 'rgba(255, 235, 180, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);

  ctx.strokeStyle = 'rgba(20, 12, 4, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);

  ctx.strokeStyle = 'rgba(255, 220, 160, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 12, y + 12, w - 24, h - 24);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(ix - 1, iy - 1, iw + 2, ih + 2);

  ctx.restore();
}

function drawMosaicForCard(ctx, x, y, w, h) {
  // Concede card → show the fully resolved painting. Win card → show the
  // mosaic at the clarity the player solved on (the brag).
  if (state.lastScore <= 0 && state.artwork._img) {
    const img = state.artwork._img;
    const min = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - min) / 2;
    const sy = (img.naturalHeight - min) / 2;
    try {
      ctx.drawImage(img, sx, sy, min, min, x, y, w, h);
      return;
    } catch (_) { /* fall through to mosaic */ }
  }
  const level = state.solvedAtLevel || state.level;
  const { cols, rows, colors } = state.artwork._levels[level - 1];
  const tw = w / cols, th = h / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const [r, g, b] = colors[row * cols + col];
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(
        Math.floor(x + col * tw),
        Math.floor(y + row * th),
        Math.ceil(tw) + 1,
        Math.ceil(th) + 1
      );
    }
  }
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i < cols; i++) {
    const xx = Math.round(x + i * tw) + 0.5;
    ctx.beginPath();
    ctx.moveTo(xx, y);
    ctx.lineTo(xx, y + h);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const yy = Math.round(y + j * th) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlacard(ctx, x, y, w, h) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#3a2d20');
  grad.addColorStop(1, '#16100a');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(200, 160, 95, 0.18)';
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.strokeStyle = 'rgba(110, 85, 50, 0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  drawScrew(ctx, x + 10, y + 10);
  drawScrew(ctx, x + w - 10, y + 10);
  drawScrew(ctx, x + 10, y + h - 10);
  drawScrew(ctx, x + w - 10, y + h - 10);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d6c08c';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 1;
  ctx.font = 'italic 500 32px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(state.artwork.title, x + w/2, y + h/2 - 10);

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#8e7c5f';
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillText(spaced(`${state.artwork.artist.toUpperCase()} · ${state.artwork.year}`), x + w/2, y + h/2 + 18);

  ctx.restore();
}

function drawScrew(ctx, x, y) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#1a130a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 160, 95, 0.5)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();
}

async function openShareModal() {
  els.shareModal.hidden = false;
  void els.shareModal.offsetWidth;
  els.shareModal.classList.add('shown');
  els.shareStatus.textContent = 'Composing…';

  // Wait for web fonts so the canvas renders with Cormorant + JetBrains Mono
  // rather than falling back to Georgia/Menlo mid-card.
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (_) {}
  }

  renderShareCard();
  els.shareStatus.textContent = SHARE_COPY.ready;
  try {
    const url = els.shareCanvas.toDataURL('image/png');
    els.shareDownload.href = url;
    const slug = state.artwork.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    els.shareDownload.download = `brushstroke_${slug}.png`;
  } catch (e) {
    els.shareDownload.removeAttribute('href');
  }
}

function closeShareModal() {
  els.shareModal.classList.remove('shown');
  setTimeout(() => { els.shareModal.hidden = true; }, 350);
}

async function copyShareCardToClipboard() {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      throw new Error('clipboard api unsupported');
    }
    const blob = await new Promise(resolve => els.shareCanvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('blob failed');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    els.shareStatus.textContent = SHARE_COPY.copied;
  } catch (e) {
    els.shareStatus.textContent = SHARE_COPY.copyErr;
  }
}

/* ---- Wire up --------------------------------------------------------- */
function nextRound() {
  state.rotIndex++;
  hideResult();
  els.paintingOv.classList.remove('revealed');
  setTimeout(() => { els.paintingImg.removeAttribute('src'); }, 600);
  startRound();
}

els.guessForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitGuess();
});

els.actionClue.addEventListener('click', useClue);
els.actionConcede.addEventListener('click', concede);

els.guessInput.addEventListener('input', () => {
  if (state.concedeArmed) {
    state.concedeArmed = false;
    els.actionConcede.classList.remove('confirming');
    els.actionConcede.textContent = 'Concede';
    clearFeedback();
  }
});

els.rNext.addEventListener('click', nextRound);
els.rShare.addEventListener('click', openShareModal);
els.errorNext.addEventListener('click', nextRound);

els.shareClose.addEventListener('click', closeShareModal);
els.shareCopy.addEventListener('click', copyShareCardToClipboard);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.shareModal.hidden) {
    closeShareModal();
  }
});

els.shareModal.addEventListener('click', (e) => {
  if (e.target === els.shareModal) closeShareModal();
});

/* ---- Go -------------------------------------------------------------- */
startRound();
