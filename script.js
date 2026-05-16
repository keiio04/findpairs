/* ════════════════════════════════════════════
   MODULE: AUDIO
════════════════════════════════════════════ */
const AC = window.AudioContext || window.webkitAudioContext;
let actx = null, musicPlaying = false, musicNodes = [];

const bgMusic = document.createElement('audio');
bgMusic.src = 'audio/horror.mp3';
bgMusic.loop = true;
bgMusic.volume = 0.5;
bgMusic.preload = 'auto';
document.body.appendChild(bgMusic);

function getAC() { if (!actx) actx = new AC(); if (actx.state === 'suspended') actx.resume(); return actx; }

function tone(freq, type, dur, gain = 0.28, delay = 0) {
  try {
    const c = getAC(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + delay);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, c.currentTime + delay + dur);
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur + 0.05);
  } catch (e) { }
}
function noise(dur, bpFreq = 1200, gain = 0.3) {
  try {
    const c = getAC(), buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * gain;
    const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = bpFreq;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(c.destination);
    g.gain.value = 1; src.start();
  } catch (e) { }
}

const SFX = {
  flip: () => noise(0.11, 1400, 0.28),
  match: () => { tone(220, 'sine', 0.8, 0.18, 0); tone(277, 'sine', 0.8, 0.13, 0.05); tone(440, 'triangle', 1.2, 0.17, 0.3); },
  wrong: () => { tone(180, 'sawtooth', 0.28, 0.14, 0); tone(130, 'sawtooth', 0.4, 0.14, 0.1); },
  win: () => { [220, 262, 330, 392, 523, 659].forEach((f, i) => tone(f, 'sine', 0.7, 0.17, i * 0.11)); },
  lose: () => { [300, 250, 200, 150, 100, 80].forEach((f, i) => tone(f, 'sawtooth', 0.55, 0.19, i * 0.17)); },
  hitAI: (c) => { if (c) { tone(440, 'square', 0.1, 0.22, 0); tone(880, 'sine', 0.5, 0.27, 0.12); } else { tone(120, 'sawtooth', 0.18, 0.25, 0); tone(85, 'sawtooth', 0.28, 0.16, 0.07); } },
  hitPl: () => { tone(200, 'square', 0.13, 0.2, 0); tone(150, 'sawtooth', 0.23, 0.2, 0.07); },
  heal: () => { tone(523, 'sine', 0.28, 0.16, 0); tone(659, 'sine', 0.38, 0.13, 0.1); tone(784, 'sine', 0.25, 0.1, 0.22); },
  power: () => { tone(880, 'square', 0.08, 0.15, 0); tone(1046, 'sine', 0.35, 0.18, 0.1); },
  shuffle: () => { [0, 0.07, 0.14, 0.21].forEach((d, i) => { tone(300 + i * 70, 'sawtooth', 0.15, 0.15, d); }); },
  levelUp: () => { [330, 392, 494, 659, 784, 1046].forEach((f, i) => tone(f, 'sine', 0.6, 0.2, i * 0.09)); },
  scare: () => { noise(0.5, 500, 0.7); tone(80, 'sawtooth', 0.5, 0.45, 0); },
  item: () => { tone(740, 'sine', 0.2, 0.18, 0); tone(988, 'sine', 0.3, 0.15, 0.08); },
};

function startMusic() {
  try {
    const c = getAC(); musicNodes = [];
    const notes = [55, 73.4, 82.5, 110];
    notes.forEach(freq => {
      const o = c.createOscillator(), g = c.createGain();
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 0.04 + Math.random() * 0.07; lg.gain.value = freq * 0.012;
      lfo.connect(lg); lg.connect(o.frequency);
      o.type = 'sine'; o.frequency.value = freq;
      o.connect(g); g.connect(c.destination); g.gain.value = 0.035;
      lfo.start(); o.start(); musicNodes.push(o, g, lfo, lg);
    });
    musicPlaying = true;
    bgMusic.play().catch(() => { });
    document.getElementById('musicBtnGame').textContent = '🔊';
    document.getElementById('titleMusicBtn').textContent = '🔊 Music';
  } catch (e) { }
}

function stopMusic() {
  musicNodes.forEach(n => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (e) { } });
  musicNodes = [];
  musicPlaying = false;
  bgMusic.pause();
  bgMusic.currentTime = 0;
  document.getElementById('musicBtnGame').textContent = '🔇';
  document.getElementById('titleMusicBtn').textContent = '🔇 Music';
}

function toggleMusic() {
  if (musicPlaying) { stopMusic(); } else { startMusic(); }
}

/* ════════════════════════════════════════════
   MODULE: STAGE DATA
════════════════════════════════════════════ */
const STAGES = [
  {
    id: 1, name: 'The Dark Night', color: 'var(--stage-1)', emoji: '🌑',
    pairs: 6, gridCols: 4, maxHP: 100, aiMaxHP: 100,
    aiAccuracy: 0.25, aiMemory: 4, timeLimit: 0,
    comboBase: 10, missDmg: 10, aiMissDmg: 10,
    healAmt: 10, aiHealAmt: 10,
    boss: false, aiAvatar: '', aiTitle: 'Devil',
    openingLore: [],
    characters: [
      { name: 'White Lady', emoji: '👻', tagline: 'Ghost in White Dress', reward: 'heal' },
      { name: 'Aswang', emoji: '🦇', tagline: 'Flesh Eater', reward: 'none' },
      { name: 'Manananggal', emoji: '🩸', tagline: 'Flies in the Dark', reward: 'power' },
      { name: 'Kapre', emoji: '🌳', tagline: 'Balete Tree Giant', reward: 'none' },
      { name: 'Tikbalang', emoji: '🐴', tagline: 'Horse-Man', reward: 'none' },
      { name: 'Duwende', emoji: '🍄', tagline: 'Mound Dwarf', reward: 'heal' },
      { name: 'Multo', emoji: '💀', tagline: 'Restless Soul', reward: 'none' },
      { name: 'Sirena', emoji: '🧜', tagline: 'Siren', reward: 'heal' },
    ]
  },
  {
    id: 2, name: 'The Dark Night', color: 'var(--stage-2)', emoji: '🦇',
    pairs: 6, gridCols: 4, maxHP: 100, aiMaxHP: 100,
    aiAccuracy: 0.45, aiMemory: 6, timeLimit: 50,
    comboBase: 12, missDmg: 10, aiMissDmg: 10,
    healAmt: 12, aiHealAmt: 10,
    boss: false, aiAvatar: '🧛', aiTitle: 'Aswang Leader',
    openingLore: [],
    characters: [
      { name: 'White Lady', emoji: '👻', tagline: 'Ghost', reward: 'heal' },
      { name: 'Aswang', emoji: '🦇', tagline: 'Flesh Eater', reward: 'none' },
      { name: 'Manananggal', emoji: '🩸', tagline: 'Flies in the Dark', reward: 'power' },
      { name: 'Kapre', emoji: '🌳', tagline: 'Balete Tree Giant', reward: 'none' },
      { name: 'Tikbalang', emoji: '🐴', tagline: 'Horse-Man', reward: 'none' },
      { name: 'Duwende', emoji: '🍄', tagline: 'Mound Dwarf', reward: 'heal' },
      { name: 'Sigbin', emoji: '🦘', tagline: 'Creature of Darkness', reward: 'none' },
      { name: 'Tiyanak', emoji: '👶', tagline: 'Demon Baby', reward: 'power' },
      { name: 'Multo', emoji: '💀', tagline: 'Restless Soul', reward: 'none' },
    ]
  },
  {
    id: 3, name: 'The Dark Night', color: 'var(--stage-3)', emoji: '🌊',
    pairs: 6, gridCols: 4, maxHP: 100, aiMaxHP: 100,
    aiAccuracy: 0.65, aiMemory: 10, timeLimit: 90,
    comboBase: 14, missDmg: 10, aiMissDmg: 10,
    healAmt: 14, aiHealAmt: 12,
    boss: false, aiAvatar: '🧜', aiTitle: 'Siren of the Deep',
    openingLore: [],
    characters: [
      { name: 'White Lady', emoji: '👻', tagline: 'Ghost', reward: 'heal' },
      { name: 'Aswang', emoji: '🦇', tagline: 'Aswang', reward: 'none' },
      { name: 'Manananggal', emoji: '🩸', tagline: 'Manananggal', reward: 'power' },
      { name: 'Kapre', emoji: '🌳', tagline: 'Kapre', reward: 'none' },
      { name: 'Sirena', emoji: '🧜', tagline: 'Sea Siren', reward: 'heal' },
      { name: 'Krakken', emoji: '🐙', tagline: 'Sea Monster', reward: 'none' },
      { name: 'Multo', emoji: '💀', tagline: 'Soul of the Dead', reward: 'none' },
      { name: 'Pugot', emoji: '🗡️', tagline: 'Headless One', reward: 'power' },
      { name: 'Santelmo', emoji: '🔥', tagline: 'Fireball Soul', reward: 'power' },
      { name: 'Berberoka', emoji: '🌊', tagline: 'Water Sprite', reward: 'heal' },
    ]
  },
  {
    id: 4, name: 'The Dark Night', color: 'var(--stage-4)', emoji: '🌲',
    pairs: 12, gridCols: 4, maxHP: 100, aiMaxHP: 100,
    aiAccuracy: 0.82, aiMemory: 18, timeLimit: 120,
    comboBase: 18, missDmg: 10, aiMissDmg: 10,
    healAmt: 16, aiHealAmt: 14,
    boss: false, aiAvatar: '🧌', aiTitle: 'Forest Beast',
    openingLore: [],
    characters: [
      { name: 'White Lady', emoji: '👻', tagline: 'Ghost', reward: 'heal' },
      { name: 'Aswang', emoji: '🦇', tagline: 'Aswang', reward: 'none' },
      { name: 'Manananggal', emoji: '🩸', tagline: 'Manananggal', reward: 'power' },
      { name: 'Kapre', emoji: '🌳', tagline: 'Kapre', reward: 'none' },
      { name: 'Tikbalang', emoji: '🐴', tagline: 'Tikbalang', reward: 'none' },
      { name: 'Duwende', emoji: '🍄', tagline: 'Duwende', reward: 'heal' },
      { name: 'Sigbin', emoji: '🦘', tagline: 'Sigbin', reward: 'none' },
      { name: 'Tiyanak', emoji: '👶', tagline: 'Tiyanak', reward: 'power' },
      { name: 'Mambabarang', emoji: '🪲', tagline: 'Beetle Sorcerer', reward: 'power' },
      { name: 'Nuno', emoji: '🧓', tagline: 'Mound Dweller', reward: 'heal' },
      { name: 'Bungisngis', emoji: '👁️', tagline: 'One-Eyed Giant', reward: 'none' },
      { name: 'Bakunawa', emoji: '🐉', tagline: 'Moon Eater', reward: 'power' },
    ]
  },
  {
    id: 5, name: "The Dark Night", color: 'var(--stage-5)', emoji: '👁️',
    pairs: 16, gridCols: 4, maxHP: 100, aiMaxHP: 100,
    aiAccuracy: 0.95, aiMemory: 28, timeLimit: 150,
    comboBase: 24, missDmg: 10, aiMissDmg: 10,
    healAmt: 20, aiHealAmt: 18,
    boss: true, aiAvatar: '😈', aiTitle: "Evil's King",
    openingLore: ['👁️ BOSS BATTLE 👁️'],
    characters: [
      { name: 'White Lady', emoji: '👻', tagline: 'Ghost', reward: 'heal' },
      { name: 'Aswang', emoji: '🦇', tagline: 'Aswang', reward: 'none' },
      { name: 'Manananggal', emoji: '🩸', tagline: 'Manananggal', reward: 'power' },
      { name: 'Kapre', emoji: '🌳', tagline: 'Kapre', reward: 'none' },
      { name: 'Tikbalang', emoji: '🐴', tagline: 'Tikbalang', reward: 'none' },
      { name: 'Duwende', emoji: '🍄', tagline: 'Duwende', reward: 'heal' },
      { name: 'Sigbin', emoji: '🦘', tagline: 'Sigbin', reward: 'none' },
      { name: 'Tiyanak', emoji: '👶', tagline: 'Tiyanak', reward: 'power' },
      { name: 'Mambabarang', emoji: '🪲', tagline: 'Beetle Sorcerer', reward: 'power' },
      { name: 'Nuno', emoji: '🧓', tagline: 'Mound Dweller', reward: 'heal' },
      { name: 'Bungisngis', emoji: '👁️', tagline: 'One-Eyed Giant', reward: 'none' },
      { name: 'Bakunawa', emoji: '🐉', tagline: 'Moon Eater', reward: 'power' },
      { name: 'Santelmo', emoji: '🔥', tagline: 'Fireball Soul', reward: 'power' },
      { name: 'Berberoka', emoji: '🌊', tagline: 'Water Sprite', reward: 'heal' },
      { name: 'Multo', emoji: '💀', tagline: 'Restless Spirit', reward: 'none' },
      { name: 'Batibat', emoji: '👺', tagline: 'Nightmare Spirit', reward: 'power' },
    ]
  },
];

/* ════════════════════════════════════════════
   MODULE: ITEMS / INVENTORY
════════════════════════════════════════════ */
const ITEM_DEFS = {
  potion: { name: 'Heal Potion', emoji: '🧪', desc: 'Restores 30 HP', effect: () => applyItem('potion') },
  shield: { name: 'Spirit Shield', emoji: '🛡️', desc: 'Briefly blocks all damage', effect: () => applyItem('shield') },
  double: { name: 'Double Damage', emoji: '⚔️', desc: '2× damage on next hit', effect: () => applyItem('double') },
  reveal: { name: 'Ghost Eye', emoji: '👁️', desc: 'Reveals the board for 2 seconds', effect: () => applyItem('reveal') },
};

function applyItem(type) {
  if (!inventory[type] || inventory[type] <= 0) { setLore('No more ' + ITEM_DEFS[type].name + '!'); return; }
  inventory[type]--;
  saveProgress();
  renderInventory();
  SFX.item();
  if (type === 'potion') {
    playerHP = clamp(playerHP + 30, 0, curStage.maxHP);
    updateHP('player', 'heal'); spawnFloat('+30 HP 🧪', 'heal', 'left');
    setLore('🧪 Heal Potion! +30 HP!');
  } else if (type === 'shield') {
    playerBuffs.shield = 3;
    renderBuffs(); setLore('🛡️ Spirit Shield! You are protected for the next 3 hits!');
  } else if (type === 'double') {
    playerBuffs.doubleDmg = true;
    renderBuffs(); setLore('⚔️ Double Damage on next match!');
  } else if (type === 'reveal') {
    doRevealAll();
  }
  checkAchievements();
}

/* ════════════════════════════════════════════
   ITEM DROP SYSTEM
════════════════════════════════════════════ */
const ITEM_DROPS = {
  'White Lady': { item: 'potion', chance: 0.4, emoji: '🧪' },
  'Duwende': { item: 'potion', chance: 0.3, emoji: '🧪' },
  'Nuno': { item: 'potion', chance: 0.35, emoji: '🧪' },
  'Manananggal': { item: 'double', chance: 0.3, emoji: '⚔️' },
  'Bangungot': { item: 'double', chance: 0.25, emoji: '⚔️' },
  'Tikbalang': { item: 'reveal', chance: 0.25, emoji: '👁️' },
  'Batibat': { item: 'reveal', chance: 0.2, emoji: '👁️' },
  'Sigbin': { item: 'shield', chance: 0.25, emoji: '🛡️' },
  'Tiyanak': { item: 'shield', chance: 0.2, emoji: '🛡️' },
};

function tryDropItem(charName) {
  const drop = ITEM_DROPS[charName];
  if (!drop) return;
  if (Math.random() >= drop.chance) return;

  inventory[drop.item] = (inventory[drop.item] || 0) + 1;
  saveProgress();
  renderInventory();
  SFX.item();

  const def = ITEM_DEFS[drop.item];
  spawnFloat(drop.emoji + ' DROP!', 'power', 'left');
  setTimeout(() => showRewardPopup(def.emoji, 'Item Drop!', `${def.name} from ${charName}! (x${inventory[drop.item]})`), 600);
}

/* ════════════════════════════════════════════
   MODULE: ACHIEVEMENTS
════════════════════════════════════════════ */
const ACH_DEFS = [
  { id: 'first_win', icon: '🏆', name: 'First Victory', desc: 'Win a single game.', check: () => stats.wins >= 1 },
  { id: 'combo5', icon: '🔥', name: 'Five in a Row', desc: 'Achieve a 5× combo.', check: () => stats.bestCombo >= 5 },
  { id: 'no_miss', icon: '💎', name: 'Perfect Memory', desc: 'Win without a single mistake.', check: () => stats.perfectWin },
  { id: 'boss_kill', icon: '👑', name: "King's Challenger", desc: 'Defeat the stage 5 boss.', check: () => stats.bossKilled },
  { id: 'xp100', icon: '⭐', name: 'New Level', desc: 'Reach 100 XP.', check: () => stats.totalXP >= 100 },
  { id: 'items3', icon: '🎒', name: 'Collector', desc: 'Use 3 items.', check: () => stats.itemsUsed >= 3 },
  { id: 'stage3', icon: '🌊', name: 'Survivor', desc: 'Reach stage 3.', check: () => stats.highestStage >= 3 },
  { id: 'wins5', icon: '🩸', name: 'Warrior', desc: 'Win 5 games.', check: () => stats.wins >= 5 },
];

/* ════════════════════════════════════════════
   MODULE: PERSISTENCE (localStorage)
════════════════════════════════════════════ */
const SAVE_KEY = 'nilalang_v2_save';

let progress = { unlockedStages: [1], clearedStages: [], level: 1, xp: 0, achievements: [] };
let stats = { wins: 0, totalXP: 0, bestCombo: 0, highestStage: 1, bossKilled: false, perfectWin: false, itemsUsed: 0 };
let inventory = { potion: 2, shield: 1, double: 1, reveal: 1 };
let localHistory = []; // Fallback for network errors

async function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.progress) progress = s.progress;
      if (s.stats) stats = s.stats;
      if (s.inventory) inventory = s.inventory;
      if (s.localHistory) localHistory = s.localHistory;
    }

    if (localStorage.getItem('just_reset')) return;

    if (gameAPI.isAuthenticated()) {
      const res = await gameAPI.getDashboardStats();
      if (res.success && res.data) {
        const s = res.data.stats;
        stats.wins = s.total_wins;
        stats.totalXP = s.total_score;
        stats.bestCombo = s.best_combo;
        stats.highestStage = s.highest_stage;
        if (s.level) progress.level = s.level;
        if (s.xp) progress.xp = s.xp;
        for (let i = 1; i <= s.highest_stage; i++) {
          if (!progress.unlockedStages.includes(i)) progress.unlockedStages.push(i);
        }
      }
    }
  } catch (e) {}

  renderTitleScreen(); // ← DAPAT NANDITO SA LOOB, bago magsara ang function
}

function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ progress, stats, inventory, localHistory })); } catch (e) { }
}
async function resetProgress() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  
  localStorage.removeItem(SAVE_KEY);
  localStorage.setItem('just_reset', '1'); // ← flag
  
  progress = { unlockedStages: [1], clearedStages: [], level: 1, xp: 0, achievements: [] };
  stats = { wins: 0, totalXP: 0, bestCombo: 0, highestStage: 1, bossKilled: false, perfectWin: false, itemsUsed: 0 };
  inventory = { potion: 2, shield: 1, double: 1, reveal: 1 };
  localHistory = [];
  saveProgress();

  // Clear backend
  if (gameAPI.isAuthenticated()) {
    try {
      await fetch(`${API_BASE_URL}/history/reset`, {
        method: 'DELETE',
        headers: gameAPI.getAuthHeaders()
      });
    } catch (e) {}
  }

  renderTitleScreen();
  await loadDashboard();
  await loadHistoryIntoSidePanel();
  localStorage.removeItem('just_reset');

  alert('All progress, dashboard and history have been reset.');
}

function gainXP(amount) {
  const XP_PER_LEVEL = 80;
  progress.xp += amount; stats.totalXP += amount;
  let leveled = false;
  while (progress.xp >= XP_PER_LEVEL) {
    progress.xp -= XP_PER_LEVEL; progress.level++; leveled = true;
    inventory.potion = (inventory.potion || 0) + 1;
  }
  saveProgress();
  return { amount, leveled, level: progress.level, xp: progress.xp, max: XP_PER_LEVEL };
}

function checkAchievements() {
  ACH_DEFS.forEach(a => {
    if (!progress.achievements.includes(a.id) && a.check()) {
      progress.achievements.push(a.id); saveProgress(); showAchievementUnlock(a);
    }
  });
}

function showAchievementUnlock(a) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,0.95);border:1px solid var(--gold);
    border-radius:8px;padding:10px 22px;z-index:800;
    display:flex;align-items:center;gap:10px;
    animation:fadeInUp 0.4s ease,fadeOut 0.5s ease 2.5s forwards;
    font-family:'Cinzel Decorative',serif;
  `;
  el.innerHTML = `
    <span style="font-size:1.5rem">${a.icon}</span>
    <div>
      <div style="font-size:0.55rem;color:var(--gold);letter-spacing:0.1em;text-transform:uppercase">Achievement Unlocked!</div>
      <div style="font-size:0.65rem;color:var(--bone)">${a.name}</div>
    </div>
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
  SFX.levelUp();
}

/* ════════════════════════════════════════════
   MODULE: STATE
════════════════════════════════════════════ */
let curStageIdx = 0, curStage = STAGES[0];
let playerHP, aiHP, aiMaxHP, playerMaxHP;
let combo = 0, score = 0, totalDmgDealt = 0, missCount = 0;
let playerBuffs = { shield: 0, doubleDmg: false }, aiBuffs = {};
let isGameOver = false, currentTurn = 'player', isPaused = false;
let flipped = [], locked = false, pairs = 0, moves = 0, started = false;
let timerInterval = null, seconds = 0, timeLimit = 0;
let wrongStreak = 0, missedThisGame = false;
let aiMemoryMap = {};

function resetBattleState() {
  playerMaxHP = curStage.maxHP; aiMaxHP = curStage.aiMaxHP;
  playerHP = playerMaxHP; aiHP = aiMaxHP;
  combo = 0; score = 0; totalDmgDealt = 0; missCount = 0;
  playerBuffs = { shield: 0, doubleDmg: false }; aiBuffs = {};
  isGameOver = false; currentTurn = 'player'; isPaused = false;
  flipped = []; locked = false; pairs = 0; moves = 0; started = false;
  seconds = 0; timeLimit = curStage.timeLimit;
  wrongStreak = 0; missedThisGame = false; aiMemoryMap = {};
}

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function setLore(text, delay = 0) { /* Lore system disabled */ }

/* ════════════════════════════════════════════
   SCREEN MANAGEMENT
════════════════════════════════════════════ */
function showScreen(id) {
  closePanel(); // Auto-close side panel on navigation
  closeMobileMenu(); // Auto-close mobile menu on navigation
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.full-overlay').forEach(o => o.classList.remove('active'));
  if (id === 'titleScreen') renderTitleScreen();
}

function toggleMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const footer = document.getElementById('actionFooter');
  if (toggle && footer) {
    toggle.classList.toggle('active');
    footer.classList.toggle('active');
  }
}

function closeMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const footer = document.getElementById('actionFooter');
  if (toggle && footer) {
    toggle.classList.remove('active');
    footer.classList.remove('active');
  }
}

/* ════════════════════════════════════════════
   DASHBOARD & HISTORY
 ════════════════════════════════════════════ */
async function loadDashboard() {
  const container = document.getElementById('dashboardSide');
  if (!container) return;

  const user = gameAPI.getCurrentUser();
  const res = await gameAPI.getDashboardStats();

  let s = stats; // Fallback to current session stats
  let recent = localHistory.slice(0, 5);

  if (res.success && res.data) {
    s = res.data.stats;
    recent = res.data.recent_games || [];
  }

  const winRate = s.total_games > 0 ? (s.total_wins / s.total_games * 100) : (s.win_rate || 0);

  let html = `
    <div class="dash-user-title">Soul Archive: ${user ? user.username : 'WARRIOR'}</div>
    
    <div class="dash-performance">
      <div class="perf-ring">${Math.round(winRate)}%</div>
      <div class="perf-info">
        <span class="perf-label">Combat Win Rate</span>
        <span class="perf-val">${s.total_wins || stats.wins} Wins / ${s.total_games || (stats.wins + 5)} Battles</span>
      </div>
    </div>
    
    <div class="best-stage-card">
      <div class="bsc-title">🏆 Personal Record</div>
      <div class="bsc-grid">
        <div class="bsc-item">
          <span class="bsc-label">Highest Stage</span>
          <span class="bsc-val">Level ${s.highest_stage || stats.highestStage}</span>
        </div>
        <div class="bsc-item">
          <span class="bsc-label">Total Score</span>
          <span class="bsc-val">${s.total_score || stats.totalXP}</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

async function loadHistoryIntoSidePanel() {
  const container = document.getElementById('historySideList');
  if (!container) return;

  container.innerHTML = `<div class="loading">Invoking past memories...</div>`;

  let historyData = [];
  const res = await gameAPI.getGameHistory(1);

  if (res.success && res.history && res.history.length > 0) {
    historyData = res.history;
  } else {
    // Fallback to local history
    historyData = localHistory;
  }

  if (historyData.length > 0) {
    container.innerHTML = historyData.slice(0, 10).map(h => {
      const dateStr = new Date(h.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="side-history-item ${h.result}">
          <div class="shi-main">
            <span class="shi-stage">Lvl ${h.stage_id} — ${h.result.toUpperCase()}</span>
            <span class="shi-date" style="font-size:0.5rem; color:var(--ash);">${dateStr}</span>
          </div>
          <div class="shi-details">
            <span>${h.score} pts</span>
            <span>${h.moves} moves</span>
          </div>
        </div>
      `;
    }).join('');
  } else {
    container.innerHTML = `<div class="empty-state" style="text-align:center; padding:15px; font-size:0.6rem; color:var(--ash);">
      No battle records found in the abyss.
    </div>`;
  }
}

async function openHistory() {
  // Keeping this for full modal view if needed, but the user prefers side panel
  const overlay = document.getElementById('historyOverlay');
  const container = document.getElementById('historyList');
  if (!overlay || !container) return;

  overlay.classList.add('active');
  container.innerHTML = `<div class="loading">Invoking past memories...</div>`;

  const res = await gameAPI.getGameHistory();
  if (res.success && res.history && res.history.length > 0) {
    container.innerHTML = res.history.map(h => `
      <div class="history-item ${h.result}">
        <div class="hi-main">
          <span class="hi-stage">Level ${h.stage_id} Battle</span>
          <span class="hi-result ${h.result}">${h.result}</span>
        </div>
        <div class="hi-details">
          <div class="hi-detail-item">
            <span class="hi-label">Score</span>
            <span class="hi-val">${h.score}</span>
          </div>
          <div class="hi-detail-item">
            <span class="hi-label">Moves</span>
            <span class="hi-val">${h.moves}</span>
          </div>
          <div class="hi-detail-item">
            <span class="hi-label">Duration</span>
            <span class="hi-val">${fmt(h.time_seconds)}</span>
          </div>
        </div>
        <div class="hi-date">${new Date(h.played_at).toLocaleString()}</div>
      </div>
    `).join('');
  } else {
    container.innerHTML = `<div class="empty-state" style="text-align:center; padding:40px 20px; color:var(--ash);">
      <div style="font-size:3rem; margin-bottom:10px; opacity:0.3;">📜</div>
      <p>The archives are empty. No battles have been fought yet.</p>
    </div>`;
  }
}

function closeHistory() {
  const overlay = document.getElementById('historyOverlay');
  if (overlay) overlay.classList.remove('active');
}

/* ════════════════════════════════════════════
   TITLE SCREEN
════════════════════════════════════════════ */
function renderTitleScreen() {
  const elLevel = document.getElementById('tsLevel');
  const elXP = document.getElementById('tsXP');
  const elWins = document.getElementById('tsWins');
  const elCombo = document.getElementById('tsBestCombo');

  if (elLevel) elLevel.textContent = progress.level;
  if (elXP) elXP.textContent = progress.xp;
  if (elWins) elWins.textContent = stats.wins;
  if (elCombo) elCombo.textContent = stats.bestCombo;

  const grid = document.getElementById('stageGrid');
  if (grid) {
    grid.innerHTML = '';
    STAGES.forEach((st, i) => {
      const unlocked = progress.unlockedStages.includes(st.id);
      const cleared = progress.clearedStages.includes(st.id);
      const btn = document.createElement('button');
      btn.className = 'stage-btn' + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '');
      btn.style.cssText = `color:var(--bone);background:rgba(0,0,0,0.5);border-color:${st.color};`;
      if (!unlocked) btn.style.borderColor = 'rgba(255,255,255,0.1)';
      btn.innerHTML = `
        <span class="stage-num">${st.emoji}</span>
        <span class="stage-name">Level ${st.id}</span>
        <span class="stage-name" style="font-size:0.46rem;color:var(--bone-dim)">${st.name}</span>
        <span class="stage-pairs">${st.pairs} pairs${st.timeLimit ? ` · ⏱ ${st.timeLimit}s` : ''}</span>
        ${st.boss ? '<span class="stage-pairs" style="color:#ff4444">👑 BOSS</span>' : ''}
      `;
      if (unlocked) btn.onclick = () => startStage(i);
      grid.appendChild(btn);
    });
  }
}

/* ════════════════════════════════════════════
   START STAGE
════════════════════════════════════════════ */
function startStage(idx) {
  curStageIdx = idx; curStage = STAGES[idx];
  resetBattleState();
  showScreen('gameScreen');
  document.querySelectorAll('.full-overlay').forEach(o => o.classList.remove('active'));

  bgMusic.play().catch(() => { });
  musicPlaying = true;
  document.getElementById('musicBtnGame').textContent = '🔊';

  document.getElementById('stageBannerTitle').textContent = `Level ${curStage.id}`;
  document.getElementById('stageBannerName').textContent = curStage.name;
  document.getElementById('stageDisplay').textContent = curStage.id;
  document.getElementById('aiName').textContent = `${curStage.aiTitle.toUpperCase()}`;

  const aiImg = document.getElementById('aiAvatarImg');
  if (aiImg) aiImg.style.borderColor = curStage.boss ? 'var(--gold)' : 'var(--ai-clr)';
  document.body.classList.toggle('boss-stage', !!curStage.boss);

  document.getElementById('playerHpMax').textContent = `/ ${playerMaxHP}`;
  document.getElementById('aiHpMax').textContent = `/ ${aiMaxHP}`;
  document.getElementById('board').style.setProperty('--cols', curStage.gridCols);

  if (curStage.timeLimit > 0) {
    document.getElementById('timerPill').style.display = 'flex';
    document.getElementById('timerDisplay').textContent = fmt(curStage.timeLimit);
  } else {
    document.getElementById('timerPill').style.display = 'flex';
    document.getElementById('timerDisplay').textContent = '0:00';
  }

  updateHP('player'); updateHP('ai');
  updateStats(); updateComboUI(); renderBuffs(); renderBoard();

  locked = true;
  let count = 3;
  const countEl = document.createElement('div');
  countEl.id = 'countdown';
  countEl.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.75);z-index:999;
    font-family:'Cinzel Decorative',serif;
    font-size:6rem;color:var(--gold);
    text-shadow:0 0 40px rgba(255,200,0,0.8);
    pointer-events:none;
  `;
  countEl.textContent = count;
  document.body.appendChild(countEl);

  const countInterval = setInterval(() => {
    count--;
    if (count > 0) { countEl.textContent = count; SFX.wrong(); }
    else if (count === 0) {
      countEl.textContent = 'GO!';
      countEl.style.color = '#ff4444';
      countEl.style.textShadow = '0 0 40px rgba(255,0,0,0.8)';
      SFX.win();
    } else {
      clearInterval(countInterval);
      countEl.remove();
      locked = false;
      const lores = curStage.openingLore;
      lores.forEach((l, i) => setLore(l, i * 2200));
      setTimeout(() => setLore('Click a card to start…'), lores.length * 200);
    }
  }, 1000);
}

function restartStage() { startStage(curStageIdx); }

function goNextStage() {
  const next = curStageIdx + 1;
  if (next < STAGES.length) {
    document.querySelectorAll('.full-overlay').forEach(o => o.classList.remove('active'));
    startStage(next);
  } else {
    showScreen('titleScreen');
  }
}

/* ════════════════════════════════════════════
   HUD UPDATES
════════════════════════════════════════════ */
function updateStats() {
  document.getElementById('movesDisplay').textContent = moves;
  document.getElementById('pairsDisplay').textContent = `${pairs}/${curStage.pairs}`;
  document.getElementById('scoreDisplay').textContent = score;
  if (curStage.timeLimit > 0) {
    const rem = clamp(curStage.timeLimit - seconds, 0, curStage.timeLimit);
    document.getElementById('timerDisplay').textContent = fmt(rem);
    document.getElementById('timerPill').classList.toggle('timer-warning', rem <= 15);
  } else {
    document.getElementById('timerDisplay').textContent = fmt(seconds);
  }
}

function updateHP(who, mode = 'damage') {
  const hp = who === 'player' ? playerHP : aiHP;
  const maxH = who === 'player' ? playerMaxHP : aiMaxHP;
  const fill = document.getElementById(who === 'player' ? 'playerFill' : 'aiFill');
  const num = document.getElementById(who === 'player' ? 'playerHpNum' : 'aiHpNum');
  const pct = clamp((hp / maxH) * 100, 0, 100);

  fill.style.width = pct + '%';
  num.textContent = Math.max(0, Math.round(hp));

  const isLow = pct < 28;
  fill.classList.toggle('low', isLow);
  if (!isLow) {
    fill.style.background = who === 'player'
      ? 'linear-gradient(90deg,#1565c0,#4fc3f7)'
      : 'linear-gradient(90deg,#c0392b,#ff8888)';
  }

  fill.classList.remove('dmg-anim', 'heal-anim');
  void fill.offsetWidth;
  fill.classList.add(mode === 'heal' ? 'heal-anim' : 'dmg-anim');
  setTimeout(() => fill.classList.remove('dmg-anim', 'heal-anim'), 550);
}

function updateComboUI() {
  const b = document.getElementById('comboBadge');
  b.classList.remove('tier-2', 'tier-3', 'tier-4');
  if (combo >= 1) {
    const dmg = curStage.comboBase * combo;
    const icons = ['', '🔥', '🔥🔥', '⚡🔥', '👹💀'];
    const icon = icons[Math.min(combo, 4)];
    b.textContent = `${icon} COMBO x${combo} [${dmg} DMG]`;
    b.classList.add('visible');
    if (combo >= 4) b.classList.add('tier-4');
    else if (combo >= 3) b.classList.add('tier-3');
    else if (combo >= 2) b.classList.add('tier-2');
    b.classList.remove('pop');
    void b.offsetWidth;
    b.style.animation = 'comboPop 0.38s ease both';
    setTimeout(() => b.style.animation = '', 400);
  } else {
    b.classList.remove('visible');
  }
}

function renderBuffs() {
  const pb = document.getElementById('playerBuffs');
  pb.innerHTML = '';
  if (playerBuffs.shield > 0) {
    const p = document.createElement('span');
    p.className = 'buff-pip'; p.textContent = `🛡️ x${playerBuffs.shield}`;
    pb.appendChild(p);
  }
  if (playerBuffs.doubleDmg) {
    const p = document.createElement('span');
    p.className = 'buff-pip'; p.textContent = '⚔️ 2×DMG';
    pb.appendChild(p);
  }
}

function setTurn(who) {
  currentTurn = who;
}

/* ════════════════════════════════════════════
   BATTLE FX
════════════════════════════════════════════ */
function spawnFloat(text, cls, side) {
  const el = document.createElement('div');
  el.className = 'float-num ' + cls;
  el.textContent = text;

  const target = side === 'left' ? document.querySelector('.fighter.player') : document.querySelector('.fighter.enemy');
  if (target) {
    const rect = target.getBoundingClientRect();
    el.style.width = '200px';
    el.style.textAlign = 'center';
    el.style.left = (rect.left + rect.width / 2 - 100) + 'px';
    el.style.top = (rect.top - 20) + 'px';
  } else {
    const hud = document.querySelector('.battle-hud').getBoundingClientRect();
    el.style.left = (side === 'left' ? hud.left + 40 : hud.right - 130) + 'px';
    el.style.top = (hud.top + 10) + 'px';
  }

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function doFlash(cls) {
  const el = document.getElementById('hitFlash');
  el.className = 'hit-flash ' + cls;
  void el.offsetWidth;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'flashFade 0.35s ease forwards';
  const avatarImg = cls === 'f-player'
    ? document.querySelector('#playerAvatar img')
    : document.querySelector('#aiAvatarImg');
  if (avatarImg) {
    avatarImg.classList.remove('avatar-hit');
    void avatarImg.offsetWidth;
    avatarImg.classList.add('avatar-hit');
    setTimeout(() => avatarImg.classList.remove('avatar-hit'), 380);
  }
}

function doShake() {
  document.body.classList.remove('shaking');
  void document.body.offsetWidth;
  document.body.classList.add('shaking');
  setTimeout(() => document.body.classList.remove('shaking'), 500);
}

const SCARE_DATA = [
  { text: "DON'T LOOK!!", draw: (svg) => drawSkull(svg) },
  { text: "IT IS COMING!", draw: (svg) => drawDemon(svg) },
  { text: "IT SEES YOU", draw: (svg) => drawEye(svg) },
  { text: "DO YOU HEAR THAT?", draw: (svg) => drawGhost(svg) },
  { text: "", draw: (svg) => drawSkull(svg) },
  { text: "", draw: (svg) => drawDemon(svg) },
];

function drawSkull(svg) {
  svg.innerHTML = `
    <circle cx="100" cy="90" r="72" fill="#1a0000" stroke="#cc0000" stroke-width="2.5"/>
    <ellipse cx="100" cy="155" rx="42" ry="22" fill="#1a0000" stroke="#cc0000" stroke-width="2"/>
    <ellipse cx="72" cy="82" rx="22" ry="26" fill="#000"/>
    <ellipse cx="128" cy="82" rx="22" ry="26" fill="#000"/>
    <ellipse cx="72" cy="82" rx="10" ry="13" fill="#ff0000" opacity="0.85"/>
    <ellipse cx="128" cy="82" rx="10" ry="13" fill="#ff0000" opacity="0.85"/>
    <ellipse cx="72" cy="82" rx="4" ry="5" fill="#fff" opacity="0.6"/>
    <ellipse cx="128" cy="82" rx="4" ry="5" fill="#fff" opacity="0.6"/>
    <path d="M93 108 L100 96 L107 108 Z" fill="#000"/>
    <rect x="70" y="140" width="12" height="18" rx="2" fill="#e8e8d0" stroke="#cc0000" stroke-width="1"/>
    <rect x="86" y="138" width="12" height="20" rx="2" fill="#e8e8d0" stroke="#cc0000" stroke-width="1"/>
    <rect x="102" y="138" width="12" height="20" rx="2" fill="#e8e8d0" stroke="#cc0000" stroke-width="1"/>
    <rect x="118" y="140" width="12" height="18" rx="2" fill="#e8e8d0" stroke="#cc0000" stroke-width="1"/>
    <path d="M100 18 L95 55 L105 70" stroke="#cc0000" stroke-width="1.5" fill="none" opacity="0.7"/>
    <path d="M60 50 L75 80" stroke="#cc0000" stroke-width="1" fill="none" opacity="0.5"/>
  `;
}

function drawDemon(svg) {
  svg.innerHTML = `
    <ellipse cx="100" cy="105" rx="78" ry="88" fill="#1a0008" stroke="#880022" stroke-width="2"/>
    <path d="M55 42 L35 5 L65 38" fill="#3d0010" stroke="#cc0022" stroke-width="1.5"/>
    <path d="M145 42 L165 5 L135 38" fill="#3d0010" stroke="#cc0022" stroke-width="1.5"/>
    <ellipse cx="75" cy="90" rx="20" ry="20" fill="#000"/>
    <ellipse cx="125" cy="90" rx="20" ry="20" fill="#000"/>
    <ellipse cx="75" cy="90" rx="12" ry="14" fill="#ff2200"/>
    <ellipse cx="125" cy="90" rx="12" ry="14" fill="#ff2200"/>
    <ellipse cx="75" cy="90" rx="5" ry="7" fill="#000"/>
    <ellipse cx="125" cy="90" rx="5" ry="7" fill="#000"/>
    <path d="M58 135 Q100 175 142 135" stroke="#cc0022" stroke-width="3" fill="none"/>
    <path d="M68 135 L72 152 M82 138 L83 156 M100 140 L100 158 M118 138 L117 156 M132 135 L128 152"
      stroke="#e8e0c0" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M55 68 L88 78" stroke="#cc0022" stroke-width="3" stroke-linecap="round"/>
    <path d="M145 68 L112 78" stroke="#cc0022" stroke-width="3" stroke-linecap="round"/>
  `;
}

function drawEye(svg) {
  svg.innerHTML = `
    <ellipse cx="100" cy="100" rx="90" ry="90" fill="#080010"/>
    <path d="M100 100 Q60 60 20 40" stroke="#880000" stroke-width="1.5" fill="none" opacity="0.6"/>
    <path d="M100 100 Q140 55 178 38" stroke="#880000" stroke-width="1.5" fill="none" opacity="0.6"/>
    <ellipse cx="100" cy="100" rx="54" ry="54" fill="#d4c8a0"/>
    <ellipse cx="100" cy="100" rx="32" ry="32" fill="#5a1a00"/>
    <ellipse cx="100" cy="100" rx="28" ry="28" fill="#8b2500"/>
    <ellipse cx="100" cy="100" rx="14" ry="14" fill="#000"/>
    <ellipse cx="90" cy="90" rx="5" ry="7" fill="#fff" opacity="0.35"/>
    <path d="M46 100 Q100 55 154 100" stroke="#1a0000" stroke-width="3" fill="none"/>
    <path d="M46 100 Q100 145 154 100" stroke="#1a0000" stroke-width="3" fill="none"/>
  `;
}

function drawGhost(svg) {
  svg.innerHTML = `
    <path d="M30 200 L30 90 Q30 20 100 20 Q170 20 170 90 L170 200
             L152 182 L136 200 L118 182 L100 200 L82 182 L64 200 L48 182 Z"
      fill="#c8c8d8" stroke="#8888aa" stroke-width="2"/>
    <path d="M30 200 L30 90 Q30 20 100 20 Q170 20 170 90 L170 200
             L152 182 L136 200 L118 182 L100 200 L82 182 L64 200 L48 182 Z"
      fill="#1a0020" opacity="0.55"/>
    <ellipse cx="72" cy="95" rx="20" ry="24" fill="#000"/>
    <ellipse cx="128" cy="95" rx="20" ry="24" fill="#000"/>
    <ellipse cx="72" cy="95" rx="10" ry="13" fill="#cc0033" opacity="0.9"/>
    <ellipse cx="128" cy="95" rx="10" ry="13" fill="#cc0033" opacity="0.9"/>
    <ellipse cx="100" cy="148" rx="22" ry="28" fill="#000"/>
    <ellipse cx="100" cy="148" rx="14" ry="18" fill="#330010"/>
  `;
}

function triggerJumpscare() {
  const d = SCARE_DATA[Math.floor(Math.random() * SCARE_DATA.length)];
  const svg = document.getElementById('scareSVG');
  const textEl = document.getElementById('scareText');
  if (!svg || !textEl) return;
  d.draw(svg);
  textEl.textContent = d.text;
  const el = document.getElementById('jumpscare');
  if (!el) return;
  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');
  SFX.scare();
  setTimeout(() => el.classList.remove('active'), 450);
}

/* ════════════════════════════════════════════
   BATTLE LOGIC
════════════════════════════════════════════ */
function playerMatchEffect(char) {
  const isCrit = Math.random() < 0.22;
  let dmg = curStage.comboBase * combo;
  if (playerBuffs.doubleDmg) { dmg *= 2; playerBuffs.doubleDmg = false; renderBuffs(); }
  if (isCrit) dmg = Math.round(dmg * 2);
  dmg = Math.round(dmg);

  aiHP = clamp(aiHP - dmg, 0, aiMaxHP);
  totalDmgDealt += dmg; score += dmg + (combo * 5);
  updateHP('ai', 'damage'); updateStats();
  spawnFloat((isCrit ? '💥 CRIT! -' : '-') + dmg, isCrit ? 'crit' : 'dmg-ai', 'right');
  doFlash('f-ai'); doShake(); SFX.hitAI(isCrit);

  const reward = char.reward;
  if (reward === 'heal') {
    const h = curStage.healAmt;
    playerHP = clamp(playerHP + h, 0, playerMaxHP);
    updateHP('player', 'heal');
    spawnFloat('+' + h + ' HP ✨', 'heal', 'left');
    doFlash('f-heal'); SFX.heal();
    setTimeout(() => showRewardPopup('💚', 'Health Restored!', `+${h} HP from ${char.name}`), 300);
  } else if (reward === 'power') {
    playerBuffs.doubleDmg = true; renderBuffs();
    spawnFloat('⚔️ 2× DMG!', 'power', 'left');
    doFlash('f-power'); SFX.power();
    setTimeout(() => showRewardPopup('⚔️', 'Double Strike!', `Next match = 2× damage`), 300);
  }

  tryDropItem(char.name);
  setLore(`${isCrit ? '💥 CRITICAL! ' : ''}${dmg} damage to ${curStage.aiTitle}!`);
}

function playerMissEffect() {
  if (playerBuffs.shield > 0) {
    playerBuffs.shield--; renderBuffs();
    setLore('🛡️ Shield blocked the damage!');
    SFX.item(); return;
  }
  const isCrit = Math.random() < 0.14;
  const dmg = isCrit ? Math.round(curStage.missDmg * 1.6) : curStage.missDmg;
  playerHP = clamp(playerHP - dmg, 0, playerMaxHP);
  updateHP('player', 'damage');
  spawnFloat((isCrit ? '💥 CRIT! -' : '-') + dmg, isCrit ? 'crit' : 'dmg-player', 'left');
  doFlash('f-player'); doShake(); SFX.hitPl();
  missCount++; missedThisGame = true;
}

function aiMatchEffect() {
  combo = 0; updateComboUI();
  const isCrit = Math.random() < 0.14;
  const base = Math.floor(curStage.aiMaxHP * 0.12);
  const dmg = isCrit ? Math.round(base * 1.6) : base;
  playerHP = clamp(playerHP - dmg, 0, playerMaxHP);
  updateHP('player', 'damage');
  spawnFloat((isCrit ? '💥 CRIT! -' : '-') + dmg, isCrit ? 'crit' : 'dmg-player', 'left');
  doFlash('f-player'); doShake(); SFX.hitPl();

  const h = curStage.aiHealAmt;
  aiHP = clamp(aiHP + h, 0, aiMaxHP);
  updateHP('ai', 'heal');
  spawnFloat('+' + h + ' HP 👹', 'heal', 'right');
  SFX.heal();
}

function aiMissEffect() {
  const dmg = curStage.aiMissDmg;
  aiHP = clamp(aiHP - dmg, 0, aiMaxHP);
  updateHP('ai', 'damage');
  spawnFloat('-' + dmg, 'dmg-ai', 'right');
  doFlash('f-ai'); SFX.hitAI(false);
}

/* ════════════════════════════════════════════
   REWARD POPUP
════════════════════════════════════════════ */
function showRewardPopup(icon, title, desc) {
  const old = document.querySelector('.reward-popup');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'reward-popup';
  el.innerHTML = `<div class="rp-icon">${icon}</div><div class="rp-title">${title}</div><div class="rp-desc">${desc}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

/* ════════════════════════════════════════════
   SHUFFLE CARDS
════════════════════════════════════════════ */
function shuffleCards() {
  const board = document.getElementById('board');
  const cards = [...board.querySelectorAll('.card:not(.matched)')];
  if (cards.length < 2) return;
  SFX.shuffle();
  cards.forEach((c, i) => setTimeout(() => c.classList.add('shuffle-out'), i * 22));
  setTimeout(() => {
    const data = cards.map(c => ({
      name: c.dataset.name, idx: c.dataset.charIdx,
      char: curStage.characters.find(ch => ch.name === c.dataset.name),
    }));
    const shuffled = shuffle(data);
    cards.forEach((c, i) => {
      const { name, char, idx } = shuffled[i];
      c.dataset.name = name; c.dataset.charIdx = idx;
      c.dataset.boardIdx = i;
      c.querySelector('.card-emoji').textContent = char.emoji;
      c.querySelector('.card-name').textContent = char.name;
      c.querySelector('.card-tagline').textContent = char.tagline;
      c.classList.remove('flipped', 'shuffle-out');
    });
    cards.forEach((c, i) => setTimeout(() => {
      c.classList.add('shuffle-in');
      setTimeout(() => c.classList.remove('shuffle-in'), 280);
    }, i * 24));
  }, cards.length * 22 + 260);
}

/* ════════════════════════════════════════════
   REVEAL ALL (item)
════════════════════════════════════════════ */
function doRevealAll() {
  const board = document.getElementById('board');
  const cards = [...board.querySelectorAll('.card:not(.matched)')];
  cards.forEach(c => c.classList.add('flipped'));
  setTimeout(() => {
    cards.forEach(c => { if (!c.classList.contains('matched')) c.classList.remove('flipped'); });
  }, 2000);
}

/* ════════════════════════════════════════════
   MODULE: AI
════════════════════════════════════════════ */
function aiTurn() {
  if (isGameOver) return;
  setTurn('ai');
  const board = document.getElementById('board');
  const unmatched = [...board.querySelectorAll('.card:not(.matched)')];
  if (unmatched.length < 2) { endAiTurn(); return; }
  let cardA = null, cardB = null;
  const useMemory = Math.random() < curStage.aiAccuracy && Object.keys(aiMemoryMap).length >= 2;
  if (useMemory) {
    const grouped = {};
    Object.entries(aiMemoryMap).forEach(([boardIdx, name]) => {
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(boardIdx);
    });
    const pair = Object.values(grouped).find(g => g.length >= 2);
    if (pair) {
      const a = board.querySelector(`[data-board-idx="${pair[0]}"]:not(.matched)`);
      const b = board.querySelector(`[data-board-idx="${pair[1]}"]:not(.matched)`);
      if (a && b) { cardA = a; cardB = b; }
    }
  }
  if (!cardA || !cardB) {
    const sh = shuffle([...unmatched]);
    cardA = sh[0]; cardB = sh[1];
  }
  setTimeout(() => {
    cardA.classList.add('ai-reveal', 'flipped');
    aiMemoryMap[cardA.dataset.boardIdx] = cardA.dataset.name;
    setTimeout(() => {
      cardB.classList.add('ai-reveal', 'flipped');
      aiMemoryMap[cardB.dataset.boardIdx] = cardB.dataset.name;
      setTimeout(() => {
        if (cardA.dataset.name === cardB.dataset.name) {
          setTimeout(() => {
          cardA.classList.add('matched', 'ai-matched'); cardB.classList.add('matched', 'ai-matched');
            cardA.classList.remove('flipped', 'ai-reveal'); cardB.classList.remove('flipped', 'ai-reveal');
            pairs++; updateStats(); SFX.match(); aiMatchEffect();
            if (!isGameOver) {
              if (playerHP <= 0) endGame('lose');
              else if (pairs >= curStage.pairs) endGame('lose', 'The creatures finished the board!');
              else aiTurn();
            }
          }, 450);
        } else {
          cardA.classList.add('wrong'); cardB.classList.add('wrong');
          setTimeout(() => {
            cardA.classList.remove('flipped', 'wrong', 'ai-reveal');
            cardB.classList.remove('flipped', 'wrong', 'ai-reveal');
            aiMissEffect();
            if (curStage.id >= 3) shuffleCards();
            if (!isGameOver) {
              if (aiHP <= 0) endGame('win');
              else endAiTurn();
            }
          }, 850);
        }
      }, 650);
    }, 600);
  }, 600);
}

function endAiTurn() {
  if (isGameOver) return;
  setTurn('player'); locked = false;
}

/* ════════════════════════════════════════════
   TIMER
════════════════════════════════════════════ */
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    seconds++; updateStats();
    if (curStage.timeLimit > 0 && seconds >= curStage.timeLimit && !isGameOver) {
      stopTimer();
      if (playerHP > aiHP) endGame('win', "Time's Up! You survived!");
      else endGame('lose', "Time's Up! Darkness won.");
    }
  }, 1000);
}
function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

/* ════════════════════════════════════════════
   BOARD RENDERING
════════════════════════════════════════════ */
function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  const sub = curStage.characters.slice(0, curStage.pairs);
  const deck = shuffle([...sub, ...sub]);
  deck.forEach((char, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.name = char.name;
    card.dataset.boardIdx = i;
    card.dataset.reward = char.reward;
    if (char.reward !== 'none') card.classList.add('has-reward');
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back">
          <div class="card-back-sym">⛧</div>
          <div class="card-back-txt">Creatures</div>
        </div>
        <div class="card-face card-front">
          <div class="card-emoji">${char.emoji}</div>
          <div class="card-name">${char.name}</div>
          <div class="card-tagline">${char.tagline}</div>
          ${char.reward !== 'none' ? `<div class="card-reward ${char.reward}">${char.reward === 'heal' ? '💚 Heal' : '⚔️ Power'}</div>` : ''}
        </div>
      </div>`;
    card.addEventListener('click', () => flipCard(card));
    board.appendChild(card);
  });
}

/* ════════════════════════════════════════════
   FLIP LOGIC
════════════════════════════════════════════ */
function flipCard(card) {
  if (locked || isGameOver || isPaused || currentTurn !== 'player') return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
  if (!started) { started = true; startTimer(); }
  SFX.flip();
  card.classList.add('flipped');
  flipped.push(card);
  aiMemoryMap[card.dataset.boardIdx] = card.dataset.name;
  if (flipped.length === 2) {
    moves++; updateStats(); locked = true;
    const [a, b] = flipped;
    if (a.dataset.name === b.dataset.name) {
      combo++; if (combo > stats.bestCombo) stats.bestCombo = combo;
      updateComboUI();
      setTimeout(() => {
        a.classList.add('matched'); b.classList.add('matched');
        a.classList.remove('flipped'); b.classList.remove('flipped');
        flipped = []; pairs++; SFX.match();
        playerMatchEffect(curStage.characters.find(c => c.name === a.dataset.name));
        updateStats();
        if (!isGameOver) {
          if (aiHP <= 0 || pairs >= curStage.pairs) endGame('win');
          else locked = false;
        }
      }, 500);
    } else {
      combo = 0; updateComboUI(); wrongStreak++;
      SFX.wrong();
      if (wrongStreak >= 3 && Math.random() < 0.38) { triggerJumpscare(); wrongStreak = 0; }
      a.classList.add('wrong'); b.classList.add('wrong');
      setTimeout(() => {
        a.classList.remove('flipped', 'wrong'); b.classList.remove('flipped', 'wrong');
        flipped = []; playerMissEffect();
        if (curStage.id >= 3) shuffleCards();
        if (!isGameOver) {
          if (playerHP <= 0) endGame('lose');
          else setTimeout(() => aiTurn(), 1400);
        }
      }, 850);
    }
  }
}

/* ════════════════════════════════════════════
   GAME OVER
════════════════════════════════════════════ */
function endGame(result, customMsg = '') {
  if (isGameOver) return;
  isGameOver = true; stopTimer(); locked = true;

  // SAVE TO LOCAL HISTORY (Fallback)
  const resultData = {
    stage_id: curStage.id,
    stage_name: curStage.name,
    result: result,
    moves: moves,
    time_seconds: seconds,
    score: score,
    played_at: new Date().toISOString()
  };
  localHistory.unshift(resultData);
  if (localHistory.length > 20) localHistory.pop();
  saveProgress();

  // BACKEND INTEGRATION
  if (typeof gameAPI !== 'undefined' && gameAPI.isAuthenticated()) {
    gameAPI.saveGameResult({
      ...resultData,
      pairs_found: pairs,
      combo_max: stats.bestCombo
    }).then(() => {
      if (typeof loadDashboard === 'function') {
        loadDashboard();
        loadHistoryIntoSidePanel();
      }
    });
  }

  if (result === 'win') {
    SFX.win(); stats.wins++;
    if (!missedThisGame) stats.perfectWin = true;
    if (curStage.boss) stats.bossKilled = true;
    if (curStage.id > stats.highestStage) stats.highestStage = curStage.id;
    const nextId = curStage.id + 1;
    if (nextId <= STAGES.length && !progress.unlockedStages.includes(nextId)) progress.unlockedStages.push(nextId);
    if (!progress.clearedStages.includes(curStage.id)) progress.clearedStages.push(curStage.id);
    const xpGain = 20 + pairs * 3 + combo * 2 + (missedThisGame ? 0 : 15) + (curStage.boss ? 30 : 0);
    const xpResult = gainXP(xpGain);
    if (xpResult.leveled) setTimeout(() => { SFX.levelUp(); showRewardPopup('⭐', 'Level Up!', `Level ${xpResult.level}!`); inventory.potion++; saveProgress(); }, 800);
    checkAchievements();
    document.getElementById('winTitle').textContent = curStage.boss ? 'Boss Defeated!' : 'You Win!';
    document.getElementById('winSubtitle').textContent = customMsg || `You defeated the ${curStage.aiTitle}!`;
    document.getElementById('winStats').innerHTML = `
      <div class="ov-stat"><div class="ov-stat-val">${moves}</div><div class="ov-stat-label">Moves</div></div>
      <div class="ov-stat"><div class="ov-stat-val">${fmt(seconds)}</div><div class="ov-stat-label">Time</div></div>
      <div class="ov-stat"><div class="ov-stat-val">${totalDmgDealt}</div><div class="ov-stat-label">Damage</div></div>
      <div class="ov-stat"><div class="ov-stat-val gold">+${xpGain} XP</div><div class="ov-stat-label">Experience</div></div>
    `;
    document.getElementById('xpLabel').textContent = `XP ${progress.xp}/80 · Level ${progress.level}`;
    document.getElementById('xpBarFill').style.width = (progress.xp / 80 * 100) + '%';
    const hasNext = curStageIdx + 1 < STAGES.length;
    document.getElementById('nextStageBtn').textContent = hasNext ? 'Next Stage →' : '🏆 Victory!';
    document.getElementById('nextStageBtn').onclick = hasNext ? goNextStage : () => showScreen('titleScreen');
    document.getElementById('winOverlay').classList.add('active');
  } else {
    SFX.lose();
    document.getElementById('loseSubtitle').textContent = customMsg || `The ${curStage.aiTitle} has prevailed…`;
    document.getElementById('loseStats').innerHTML = `
      <div class="ov-stat"><div class="ov-stat-val">${moves}</div><div class="ov-stat-label">Moves</div></div>
      <div class="ov-stat"><div class="ov-stat-val">${fmt(seconds)}</div><div class="ov-stat-label">Time</div></div>
      <div class="ov-stat"><div class="ov-stat-val">${missCount}</div><div class="ov-stat-label">Mistakes</div></div>
    `;
    saveProgress();
    document.getElementById('loseOverlay').classList.add('active');
  }
}

/* ════════════════════════════════════════════
   SIDE PANEL
════════════════════════════════════════════ */
function openPanel() {
  const isTitle = document.getElementById('titleScreen').classList.contains('active');
  const spTitle = document.querySelector('.side-panel .sp-title');
  const invGrid = document.getElementById('inventoryGrid');
  const achList = document.getElementById('achievementList');
  const dashSide = document.getElementById('dashboardSide');
  const historyList = document.getElementById('historySideList');

  if (isTitle) {
    if (spTitle) spTitle.textContent = '📜 Chronicles & Stats';
    if (invGrid) invGrid.style.display = 'none';
    if (achList) achList.style.display = 'flex';
    if (dashSide) dashSide.style.display = 'block';
    if (historyList) historyList.style.display = 'block';
    renderAchievements();
    loadDashboard();
    loadHistoryIntoSidePanel();
  } else {
    if (spTitle) spTitle.textContent = '🎒 Your Spirit Bag';
    if (invGrid) invGrid.style.display = 'grid';
    if (achList) achList.style.display = 'none';
    if (dashSide) dashSide.style.display = 'block';
    if (historyList) historyList.style.display = 'block';
    renderInventory();
    loadDashboard();
    loadHistoryIntoSidePanel();
  }

  const el = document.getElementById('sidePanel');
  if (el) el.classList.add('open');
}
function closePanel() {
  const el = document.getElementById('sidePanel');
  if (el) el.classList.remove('open');
}
function renderInventory() {
  const grid = document.getElementById('inventoryGrid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.entries(ITEM_DEFS).forEach(([key, def]) => {
    const count = inventory[key] || 0;
    const div = document.createElement('div');
    div.className = 'inv-item' + (count === 0 ? ' empty' : '');
    div.innerHTML = `<span class="ii-emoji">${def.emoji}</span><span class="ii-name">${def.name}</span>${count > 0 ? `<span class="ii-count">${count}</span>` : ''}`;
    if (count > 0) div.onclick = () => { if (currentTurn === 'player' && !isGameOver && !locked) { closePanel(); def.effect(); stats.itemsUsed++; saveProgress(); checkAchievements(); } };
    grid.appendChild(div);
  });
}
function renderAchievements() {
  const list = document.getElementById('achievementList');
  if (!list) return;
  list.innerHTML = '';
  ACH_DEFS.forEach(a => {
    const earned = progress.achievements.includes(a.id);
    const div = document.createElement('div');
    div.className = 'ach-item ' + (earned ? 'earned' : 'locked');
    div.innerHTML = `
      <span class="ach-icon">${a.icon}</span>
      <div class="ach-info">
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
      </div>
      ${earned ? '<span class="ach-check">✓</span>' : ''}
    `;
    list.appendChild(div);
  });
}

/* ════════════════════════════════════════════
   AUTHENTICATION UI
════════════════════════════════════════════ */
function updateAuthUI() {
  const loggedIn = document.getElementById('loggedInState');
  if (typeof gameAPI !== 'undefined' && gameAPI.isAuthenticated() && gameAPI.getCurrentUser()) {
    if (loggedIn) loggedIn.style.display = 'flex';
    const nameEl = document.getElementById('displayUsername');
    if (nameEl) nameEl.textContent = gameAPI.getCurrentUser().username;
  } else {
    if (loggedIn) loggedIn.style.display = 'none';
  }
}

function handleLogoutAction() {
  if (!confirm('Are you sure you want to logout?')) return;
  if (typeof gameAPI !== 'undefined') gameAPI.logout();
  window.location.href = 'auth.html';
}

/* ════════════════════════════════════════════
   ATMOSPHERIC DROPS
════════════════════════════════════════════ */
function spawnDrops() {
  const c = document.getElementById('drops');
  if (!c) return;
  c.innerHTML = '';
  const syms = ['🩸', '·', '∘', '⛧', '✦', '*', '♱'];
  for (let i = 0; i < 45; i++) {
    const d = document.createElement('div');
    d.className = 'drop'; d.textContent = syms[Math.floor(Math.random() * syms.length)];
    d.style.left = Math.random() * 100 + 'vw';
    d.style.fontSize = (0.4 + Math.random() * 0.9) + 'rem';
    d.style.animationDuration = (12 + Math.random() * 18) + 's';
    d.style.animationDelay = '-' + (Math.random() * 15) + 's';
    const colors = ['rgba(180,0,0,0.4)', 'rgba(220,50,50,0.3)', 'rgba(120,120,120,0.3)'];
    d.style.color = colors[Math.floor(Math.random() * colors.length)];
    c.appendChild(d);
  }
}

function resetGameForNewUser(stats) {
  // Clear local storage progress
  localStorage.removeItem('flipmatch_progress');
  localStorage.removeItem('flipmatch_stats');
  localStorage.removeItem('flipmatch_inventory');

  // Re-initialize with backend data or defaults
  progress = {
    unlockedStages: stats ? Array.from({ length: stats.highest_stage }, (_, i) => i + 1) : [1],
    clearedStages: [],
    xp: stats ? stats.xp : 0,
    level: stats ? stats.level : 1,
    achievements: []
  };

  inventory = { potion: 1, scroll: 0, shield: 0 };

  // Save the fresh start
  saveProgress();

  // Refresh UI
  renderTitleScreen();
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
loadProgress();
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadDashboard();
  spawnDrops();
  renderTitleScreen();
});