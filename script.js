/* ═══════════════════════════════════════════════
   LEXICON — Core Application Logic
   ═══════════════════════════════════════════════ */

/* ── STATE ── */
let words     = JSON.parse(localStorage.getItem('lexiconWords')) || [];
let deck      = [];
let cardIndex = 0;
let flipped   = false;
let audioCtx  = null;

const today = new Date().toDateString();

/* ── BOOT ── */
renderTable();
renderStats();

/* ════════════════════════════════════════════════
   SPLASH
════════════════════════════════════════════════ */
function enterApp() {
    const splash = document.getElementById('splash');
    const app    = document.getElementById('app');
    splash.classList.add('fade-out');
    setTimeout(() => {
        splash.style.display = 'none';
        app.classList.remove('hidden');
    }, 700);
}

/* ════════════════════════════════════════════════
   ADD WORD
════════════════════════════════════════════════ */
function addWord() {
    const wEl  = document.getElementById('wordInput');
    const mEl  = document.getElementById('meaningInput');
    const eEl  = document.getElementById('exampleInput');

    const word    = wEl.value.trim();
    const meaning = mEl.value.trim();
    const example = eEl.value.trim();

    if (!word || !meaning) {
        notify('⚠  Please provide both a word and its definition.');
        return;
    }

    if (words.some(w => w.word.toLowerCase() === word.toLowerCase())) {
        notify('⚠  This word already exists in your lexicon.');
        return;
    }

    words.push({
        id:       Date.now(),
        word,
        meaning,
        example,
        mastered: false,
        dateAdded: new Date().toDateString()
    });

    save();
    renderTable();
    renderStats();

    wEl.value = '';
    mEl.value = '';
    eEl.value = '';
    wEl.focus();

    notify(`✓  "${word}" has been added to your lexicon.`);
}

/* ════════════════════════════════════════════════
   DELETE WORD
════════════════════════════════════════════════ */
function deleteWord(id) {
    const word = words.find(w => w.id === id);
    words = words.filter(w => w.id !== id);
    save();
    renderTable();
    renderStats();
    if (word) notify(`"${word.word}" has been removed.`);
}

/* ════════════════════════════════════════════════
   TOGGLE MASTERED
════════════════════════════════════════════════ */
function toggleMastered(id) {
    const w = words.find(x => x.id === id);
    if (!w) return;
    w.mastered = !w.mastered;
    save();
    renderTable();
    renderStats();
    notify(w.mastered ? `✓  "${w.word}" marked as mastered.` : `"${w.word}" moved back to learning.`);
}

/* ════════════════════════════════════════════════
   RENDER TABLE
════════════════════════════════════════════════ */
function renderTable(list = words) {
    document.getElementById('wordCount').textContent = words.length;
    const body = document.getElementById('tableBody');

    if (list.length === 0) {
        body.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-icon">📖</div>
                        <p class="empty-title">Your lexicon is empty</p>
                        <p class="empty-sub">Begin by adding your first word above</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    body.innerHTML = list.map(w => `
        <tr>
            <td class="td-word">${esc(w.word)}</td>
            <td>${esc(w.meaning)}</td>
            <td class="td-example">${w.example ? esc(w.example) : '<span style="color:#ccc">—</span>'}</td>
            <td>
                <span class="status-badge ${w.mastered ? 'status-mastered' : 'status-learning'}"
                      style="cursor:pointer" onclick="toggleMastered(${w.id})">
                    ${w.mastered ? '✓ Mastered' : '◉ Learning'}
                </span>
            </td>
            <td>
                <button class="btn-delete" onclick="deleteWord(${w.id})">Remove</button>
            </td>
        </tr>
    `).join('');
}

/* ════════════════════════════════════════════════
   STATS
════════════════════════════════════════════════ */
function renderStats() {
    document.getElementById('totalWords').textContent =
        words.length;
    document.getElementById('todayWords').textContent =
        words.filter(w => w.dateAdded === today).length;
    document.getElementById('masteredWords').textContent =
        words.filter(w => w.mastered).length;
}

/* ════════════════════════════════════════════════
   SEARCH / FILTER
════════════════════════════════════════════════ */
function filterWords() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = words.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q)
    );
    renderTable(filtered);
}

/* ════════════════════════════════════════════════
   FLASHCARD ENGINE
════════════════════════════════════════════════ */
function startFlashcards() {
    if (words.length === 0) {
        notify('⚠  Please add words before starting a study session.');
        return;
    }
    deck      = [...words];
    cardIndex = 0;
    document.getElementById('modal').classList.add('active');
    showCard();
}

function showCard() {
    const c = deck[cardIndex];

    document.getElementById('frontText').textContent  = c.word;
    document.getElementById('backText').textContent   = c.meaning;
    document.getElementById('backExample').textContent =
        c.example ? `"${c.example}"` : '';

    document.getElementById('counter').textContent =
        `${cardIndex + 1} / ${deck.length}`;

    document.getElementById('deckInfo').textContent =
        `${deck.length} card${deck.length > 1 ? 's' : ''} in session`;

    const pct = ((cardIndex + 1) / deck.length) * 100;
    document.getElementById('progressFill').style.width = pct + '%';

    flipped = false;
    document.getElementById('flashcard').classList.remove('flipped');

    document.getElementById('prevBtn').disabled = cardIndex === 0;
    document.getElementById('nextBtn').disabled = cardIndex === deck.length - 1;
}

function flipCard() {
    flipped = !flipped;
    document.getElementById('flashcard').classList.toggle('flipped');
    playFlipSound();
}

function prevCard() {
    if (cardIndex > 0) { cardIndex--; showCard(); }
}

function nextCard() {
    if (cardIndex < deck.length - 1) { cardIndex++; showCard(); }
}

function shuffleCards() {
    deck = deck.sort(() => Math.random() - 0.5);
    cardIndex = 0;
    showCard();
    notify('🔀  Cards have been shuffled.');
}

function resetDeck() {
    deck      = [...words];
    cardIndex = 0;
    showCard();
    notify('↺  Deck restarted from the beginning.');
}

function markMastered() {
    const current = deck[cardIndex];
    const w = words.find(x => x.id === current.id);
    if (w) {
        w.mastered = true;
        save();
        renderTable();
        renderStats();
        notify(`✓  "${w.word}" has been marked as mastered.`);
    }
}

function closeFlashcards() {
    document.getElementById('modal').classList.remove('active');
}

/* ════════════════════════════════════════════════
   KEYBOARD NAVIGATION
════════════════════════════════════════════════ */
document.getElementById('wordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('meaningInput').focus();
});
document.getElementById('meaningInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('exampleInput').focus();
});
document.getElementById('exampleInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addWord();
});

document.addEventListener('keydown', e => {
    if (!document.getElementById('modal').classList.contains('active')) return;
    if      (e.key === 'ArrowLeft')                   prevCard();
    else if (e.key === 'ArrowRight')                  nextCard();
    else if (e.key === ' ' || e.key === 'Enter')    { e.preventDefault(); flipCard(); }
    else if (e.key === 'm' || e.key === 'M')          markMastered();
    else if (e.key === 'Escape')                      closeFlashcards();
});

/* ════════════════════════════════════════════════
   FLIP SOUND (Web Audio API)
════════════════════════════════════════════════ */
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playFlipSound() {
    try {
        const ctx  = getAudioCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
    } catch (_) { /* silent fail */ }
}

/* ════════════════════════════════════════════════
   NOTIFICATION
════════════════════════════════════════════════ */
let notifTimer;
function notify(msg) {
    const el = document.getElementById('notif');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════ */
function save() {
    localStorage.setItem('lexiconWords', JSON.stringify(words));
}

function esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}

function showSection(name) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}