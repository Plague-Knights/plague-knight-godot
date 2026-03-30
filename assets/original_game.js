// ============================================================
// Plague Knight: Vector — Main Game Engine
// ============================================================

// ---- Chain Config (switch between testnet/mainnet) ----
const CHAIN = {
  id: 1946,
  idHex: '0x79A',
  name: 'Soneium Minato',
  rpc: 'https://rpc.minato.soneium.org',
  explorer: 'https://soneium-minato.blockscout.com',
  currency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  isTestnet: true,
  // Contract addresses (deployed below)
  contracts: {
    plagueKeys: '',   // filled after deploy
    jackpot: '',      // filled after deploy
  }
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const GRID = 12;
const TILE = 60; // logical tile size (used for grid math)

// ---- Camera & Animation ----
const VIEW_TILES = 7; // how many tiles visible across viewport
const RENDER_TILE = canvas.width / VIEW_TILES; // ~102px per tile on screen
const ANIM_DURATION = 150; // ms for movement slide
const BUMP_DURATION = 120; // ms for wall bump
const CAM_LERP = 0.15; // camera smoothing factor

let animX = 6, animY = 6; // player visual position (fractional tiles)
let camX = 0, camY = 0; // camera center in tile coords (fractional)
let animating = false; // true while player slide is in progress
let animStartTime = 0;
let animFromX = 0, animFromY = 0;
let animToX = 0, animToY = 0;
let bumpAnim = null; // { fromX, fromY, toX, toY, startTime, duration }

// Entity animation: maps entity reference -> { fromX, fromY, toX, toY, startTime }
let entityAnims = new Map();

// Visual effects queue
let vfx = []; // { type, x, y, startTime, duration, color }

// ---- State ----
let state = null;
let inputLocked = false;
let logLines = [];
let animQueue = [];

// ---- Persistent Data (localStorage) ----
function loadPersistent(key, fallback) {
  try { const v = localStorage.getItem('pk_' + key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function savePersistent(key, val) {
  try { localStorage.setItem('pk_' + key, JSON.stringify(val)); } catch {}
}

let careerXP = loadPersistent('xp', 0);
let careerRuns = loadPersistent('runs', 0);
let unlockedMutations = loadPersistent('mutations', []);
let leaderboard = loadPersistent('leaderboard', []);
let firstTownGuardKill = loadPersistent('firstTGKill', false);

// ============================================================
// Auth / Sign-in System
// ============================================================
let pkAuth = loadPersistent('auth', null); // { type: 'wallet'|'guest', address: '0x...', nickname: 'Name' }

function truncateAddress(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function getPlayerDisplayName() {
  if (!pkAuth) return 'AAA';
  if (pkAuth.nickname) return pkAuth.nickname;
  if (pkAuth.address) return truncateAddress(pkAuth.address);
  return 'Guest';
}

function getLeaderboardName() {
  if (!pkAuth) return 'AAA';
  if (pkAuth.nickname) return pkAuth.nickname.slice(0, 15);
  if (pkAuth.address) return truncateAddress(pkAuth.address);
  return 'Guest';
}

function isSignedIn() {
  return pkAuth !== null;
}

function signOut() {
  pkAuth = null;
  savePersistent('auth', null);
  showAuthScreen();
}

function setNickname(name) {
  if (!pkAuth) return;
  pkAuth.nickname = name.trim().slice(0, 15);
  savePersistent('auth', pkAuth);
  updatePlayerInfoBar();
  updateHUDNickname();
}

function showAuthScreen() {
  const screen = document.getElementById('auth-screen');
  screen.classList.remove('hidden');
  document.getElementById('auth-step-connect').classList.remove('hidden');
  document.getElementById('auth-step-nickname').classList.add('hidden');
  document.getElementById('auth-wallet-error').textContent = '';
}

function hideAuthScreen() {
  document.getElementById('auth-screen').classList.add('hidden');
}

function showNicknameStep(info) {
  document.getElementById('auth-step-connect').classList.add('hidden');
  document.getElementById('auth-step-nickname').classList.remove('hidden');
  document.getElementById('auth-connected-info').innerHTML = info || '';
  const field = document.getElementById('auth-nickname-field');
  field.value = pkAuth && pkAuth.nickname ? pkAuth.nickname : '';
  field.focus();
}

async function connectWallet() {
  const errorEl = document.getElementById('auth-wallet-error');
  errorEl.textContent = '';

  if (typeof window.ethereum === 'undefined') {
    errorEl.textContent = 'No wallet detected. Install MetaMask or another Web3 wallet.';
    return;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    const address = accounts[0];
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    let balanceStr = '';
    try {
      const balance = await provider.getBalance(address);
      balanceStr = parseFloat(ethers.formatEther(balance)).toFixed(4) + ' ETH';
    } catch {}

    pkAuth = {
      type: 'wallet',
      address: address,
      nickname: pkAuth && pkAuth.nickname ? pkAuth.nickname : '',
      chainId: chainId,
      balance: balanceStr,
    };
    savePersistent('auth', pkAuth);

    let info = `<span style="color:#4ae04a">Connected:</span> <span style="font-family:monospace">${truncateAddress(address)}</span>`;
    if (balanceStr) info += ` | <span style="color:#eab308">${balanceStr}</span>`;
    if (chainId !== CHAIN.id) {
      info += `<br><span style="color:#ef4444">Not on ${CHAIN.name} (current chain: ${chainId}). Switch to play.</span>`;
      info += `<br><a href="#" onclick="switchToSoneium(); return false;" style="color:#4ae04a;font-size:13px">Switch to ${CHAIN.name}</a>`;
    } else {
      info += ` | <span style="color:#4ae04a">${CHAIN.name}${CHAIN.isTestnet ? ' (Testnet)' : ''}</span>`;
    }
    showNicknameStep(info);
  } catch (err) {
    if (err.code === 4001) {
      errorEl.textContent = 'Connection rejected by user.';
    } else {
      errorEl.textContent = 'Wallet connection failed: ' + (err.message || err);
    }
  }
}

function playAsGuest() {
  pkAuth = {
    type: 'guest',
    address: null,
    nickname: '',
  };
  savePersistent('auth', pkAuth);
  showNicknameStep('<span style="color:#7a6a5a">Playing as Guest</span>');
}

function finalizeAuth() {
  const field = document.getElementById('auth-nickname-field');
  const name = field.value.trim().slice(0, 15);
  if (name) {
    pkAuth.nickname = name;
  } else if (pkAuth.type === 'guest') {
    pkAuth.nickname = 'Guest';
  }
  savePersistent('auth', pkAuth);
  hideAuthScreen();
  updatePlayerInfoBar();
  updateHUDNickname();
}

async function tryAutoReconnectWallet() {
  if (!pkAuth || pkAuth.type !== 'wallet' || !pkAuth.address) return;
  if (typeof window.ethereum === 'undefined') return;

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_accounts', []);
    if (accounts.length > 0 && accounts[0].toLowerCase() === pkAuth.address.toLowerCase()) {
      // Still connected, refresh balance + chain
      const network = await provider.getNetwork();
      pkAuth.chainId = Number(network.chainId);
      try {
        const balance = await provider.getBalance(accounts[0]);
        pkAuth.balance = parseFloat(ethers.formatEther(balance)).toFixed(4) + ' ETH';
      } catch {}
      savePersistent('auth', pkAuth);
    }
  } catch {}
}

async function switchToSoneium() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN.idHex }],
    });
  } catch (switchError) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN.idHex,
            chainName: CHAIN.name,
            nativeCurrency: CHAIN.currency,
            rpcUrls: [CHAIN.rpc],
            blockExplorerUrls: [CHAIN.explorer],
          }],
        });
      } catch {}
    }
  }
  // Refresh after switch
  if (pkAuth && pkAuth.type === 'wallet') {
    await tryAutoReconnectWallet();
    updatePlayerInfoBar();
  }
}

function updatePlayerInfoBar() {
  const bar = document.getElementById('player-info-bar');
  if (!bar) return;

  if (!pkAuth) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  document.getElementById('player-info-name').textContent = getPlayerDisplayName();

  const addrEl = document.getElementById('player-info-address');
  if (pkAuth.type === 'wallet' && pkAuth.address) {
    addrEl.textContent = truncateAddress(pkAuth.address);
    addrEl.style.display = '';
  } else {
    addrEl.style.display = 'none';
  }

  const balEl = document.getElementById('player-info-balance');
  if (pkAuth.balance) {
    balEl.textContent = pkAuth.balance;
    balEl.style.display = '';
  } else {
    balEl.style.display = 'none';
  }

  const netEl = document.getElementById('player-info-network');
  if (pkAuth.type === 'wallet' && pkAuth.chainId) {
    if (pkAuth.chainId === CHAIN.id) {
      netEl.textContent = CHAIN.name;
      netEl.className = 'player-info-network network-ok';
      netEl.style.display = '';
    } else {
      netEl.textContent = 'Not Base';
      netEl.className = 'player-info-network network-warn';
      netEl.style.display = '';
    }
  } else {
    netEl.style.display = 'none';
  }
}

function updateHUDNickname() {
  const el = document.getElementById('hud-player-name');
  const nameEl = document.getElementById('hud-nickname');
  if (!el || !nameEl) return;
  if (pkAuth && pkAuth.nickname) {
    nameEl.textContent = pkAuth.nickname;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

// Wire up auth screen buttons
document.getElementById('auth-wallet-btn').addEventListener('click', connectWallet);
document.getElementById('auth-guest-btn').addEventListener('click', playAsGuest);
document.getElementById('auth-enter-btn').addEventListener('click', finalizeAuth);
document.getElementById('auth-nickname-field').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') finalizeAuth();
});

// Sign out
document.getElementById('player-info-signout').addEventListener('click', (e) => {
  e.preventDefault();
  signOut();
});

// Edit nickname
document.getElementById('player-info-edit').addEventListener('click', (e) => {
  e.preventDefault();
  const modal = document.getElementById('edit-nickname-modal');
  modal.classList.remove('hidden');
  const field = document.getElementById('edit-nickname-field');
  field.value = pkAuth ? pkAuth.nickname || '' : '';
  field.focus();
});

document.getElementById('edit-nickname-save').addEventListener('click', () => {
  const field = document.getElementById('edit-nickname-field');
  const name = field.value.trim().slice(0, 15);
  if (name) setNickname(name);
  document.getElementById('edit-nickname-modal').classList.add('hidden');
});

document.getElementById('edit-nickname-cancel').addEventListener('click', () => {
  document.getElementById('edit-nickname-modal').classList.add('hidden');
});

document.getElementById('edit-nickname-field').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('edit-nickname-save').click();
});

// On page load: check auth state
(function initAuth() {
  if (isSignedIn()) {
    hideAuthScreen();
    updatePlayerInfoBar();
    updateHUDNickname();
    tryAutoReconnectWallet();
  } else {
    showAuthScreen();
  }

  // Listen for wallet account/chain changes
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (pkAuth && pkAuth.type === 'wallet') {
        if (accounts.length === 0) {
          signOut();
        } else {
          pkAuth.address = accounts[0];
          savePersistent('auth', pkAuth);
          updatePlayerInfoBar();
        }
      }
    });
    window.ethereum.on('chainChanged', (chainIdHex) => {
      if (pkAuth && pkAuth.type === 'wallet') {
        pkAuth.chainId = parseInt(chainIdHex, 16);
        savePersistent('auth', pkAuth);
        updatePlayerInfoBar();
      }
    });
  }
})();

// ---- Economy: Keys ----
let keys = loadPersistent('keys', -1); // -1 = first load
if (keys === -1) { keys = 3; savePersistent('keys', keys); }
let lastFreeKeyDate = loadPersistent('lastFreeKey', '');
let isFreeRun = false; // set per-run

function todayStr() { return new Date().toISOString().slice(0, 10); }

function hasDailyFreeKey() {
  return lastFreeKeyDate !== todayStr();
}

function claimDailyFreeKey() {
  if (!hasDailyFreeKey()) return false;
  keys++;
  lastFreeKeyDate = todayStr();
  savePersistent('keys', keys);
  savePersistent('lastFreeKey', lastFreeKeyDate);
  return true;
}

// ---- Economy: Streak ----
let dailyStreak = loadPersistent('streak', 0);
let lastRunDate = loadPersistent('lastRunDate', '');

function updateStreak() {
  const today = todayStr();
  if (lastRunDate === today) {
    dailyStreak++;
  } else {
    dailyStreak = 1;
    lastRunDate = today;
  }
  savePersistent('streak', dailyStreak);
  savePersistent('lastRunDate', lastRunDate);
}

// ---- Economy: Daily First Run Bonus ----
let lastPaidRunDate = loadPersistent('lastPaidRunDate', '');

function isFirstPaidRunToday() {
  return lastPaidRunDate !== todayStr();
}

// ---- Economy: Total Infected (lifetime) ----
let totalLifetimeInfected = loadPersistent('totalInfected', 0);

// ---- Economy: Quest Progress ----
const QUESTS = [
  { id: 'infect50',   label: 'Infect 50 buildings total',     target: 50, reward: 1, stat: 'buildings' },
  { id: 'kill10',     label: 'Defeat 10 enemies total',       target: 10, reward: 1, stat: 'enemies' },
  { id: 'town5',      label: 'Reach Town 5 in a single run',  target: 5,  reward: 2, stat: 'maxTown' },
  { id: 'pills20',    label: 'Collect 20 plague pills total',  target: 20, reward: 1, stat: 'pills' },
  { id: 'runs10',     label: 'Complete 10 runs',               target: 10, reward: 2, stat: 'runs' },
];
let questProgress = loadPersistent('questProgress', { buildings: 0, enemies: 0, maxTown: 1, pills: 0, runs: 0, claimed: [] });
// Ensure claimed array exists for old saves
if (!questProgress.claimed) questProgress.claimed = [];

function updateQuestProgress(s) {
  questProgress.buildings += s.runStats.buildingsInfected;
  questProgress.enemies += s.runStats.enemiesKilled;
  questProgress.maxTown = Math.max(questProgress.maxTown, s.townNum);
  questProgress.pills += s.runStats.pillsCollected;
  questProgress.runs++;
  savePersistent('questProgress', questProgress);
}

function claimQuest(questId) {
  if (questProgress.claimed.includes(questId)) return false;
  const q = QUESTS.find(x => x.id === questId);
  if (!q) return false;
  if (questProgress[q.stat] < q.target) return false;
  questProgress.claimed.push(questId);
  keys += q.reward;
  savePersistent('questProgress', questProgress);
  savePersistent('keys', keys);
  return true;
}

// ---- Integrity Check (anti-cheat for casual DevTools manipulation) ----
const PK_INTEGRITY_SALT = 'PlagueKnight_v1_s4lt';

function computeIntegrityHash() {
  const values = {
    xp: careerXP,
    runs: careerRuns,
    keys: keys,
    totalInfected: totalLifetimeInfected,
    mutations: unlockedMutations,
    lbScores: leaderboard.map(e => e.score),
  };
  return btoa(JSON.stringify(values) + PK_INTEGRITY_SALT);
}

function verifyIntegrity() {
  const stored = loadPersistent('integrity', null);
  if (!stored) return; // first run, no hash yet
  const expected = computeIntegrityHash();
  if (stored !== expected) {
    console.warn('[PlagueKnight] Save data integrity mismatch — resetting to defaults.');
    careerXP = 0;
    careerRuns = 0;
    keys = -1;
    totalLifetimeInfected = 0;
    unlockedMutations = [];
    leaderboard = [];
    firstTownGuardKill = false;
    saveAll();
  }
}

function saveAll() {
  savePersistent('xp', careerXP);
  savePersistent('runs', careerRuns);
  savePersistent('mutations', unlockedMutations);
  savePersistent('leaderboard', leaderboard);
  savePersistent('firstTGKill', firstTownGuardKill);
  savePersistent('keys', keys);
  savePersistent('totalInfected', totalLifetimeInfected);
  savePersistent('integrity', computeIntegrityHash());
}

// Run integrity check after all persistent data is loaded
verifyIntegrity();

// ============================================================
// Mutation Definitions
// ============================================================
const MUTATION_BRANCHES = [
  {
    name: 'Virulence', color: '#4ae04a', icon: '\u2623',
    mutations: [
      { id: 'virulence_1', name: 'Infection Chains I', desc: '20% chance free infection spread', tier: 0, cost: 75 },
      { id: 'virulence_2', name: 'Plague Carrier', desc: '10% power refund on kill', tier: 1, cost: 200 },
      { id: 'virulence_3', name: 'Infection Chains II', desc: '40% chance free infection spread', tier: 2, cost: 500 },
    ]
  },
  {
    name: 'Survival', color: '#38bdf8', icon: '\u2764',
    mutations: [
      { id: 'survival_1', name: 'Resilient Strain I', desc: '10% dodge chance', tier: 0, cost: 80 },
      { id: 'survival_2', name: 'Energy Reserve I', desc: '+5 max energy', tier: 1, cost: 200 },
      { id: 'survival_3', name: 'Resilient Strain II', desc: '20% dodge chance', tier: 2, cost: 500 },
    ]
  },
  {
    name: 'Mobility', color: '#eab308', icon: '\u26A1',
    mutations: [
      { id: 'mobility_1', name: 'Swift Plague I', desc: 'First 5 moves per town free', tier: 0, cost: 60 },
      { id: 'mobility_2', name: "Pathfinder's Eye", desc: '+1 vision range', tier: 1, cost: 175 },
      { id: 'mobility_3', name: 'Swift Plague II', desc: 'First 10 moves per town free', tier: 2, cost: 450 },
    ]
  },
  {
    name: 'Efficiency', color: '#a855f7', icon: '\u2618',
    mutations: [
      { id: 'efficiency_1', name: 'Opportunist I', desc: 'Shops give +1 power', tier: 0, cost: 50 },
      { id: 'efficiency_2', name: 'Pill Collector', desc: '20% more pill drops', tier: 1, cost: 150 },
      { id: 'efficiency_3', name: 'Opportunist II', desc: 'Shops give +2 power', tier: 2, cost: 400 },
    ]
  },
  {
    name: 'Dominance', color: '#ef4444', icon: '\u2620',
    mutations: [
      { id: 'dominance_1', name: 'Wanted Management I', desc: '20% slower wanted escalation', tier: 0, cost: 100 },
      { id: 'dominance_2', name: "Hunter's Mark", desc: '15% more town guards spawn', tier: 1, cost: 250 },
      { id: 'dominance_3', name: 'Infection Multiplier I', desc: '+1% infected pts per 50 pts', tier: 2, cost: 600 },
    ]
  },
];

function getMutationById(id) {
  for (const branch of MUTATION_BRANCHES)
    for (const m of branch.mutations)
      if (m.id === id) return m;
  return null;
}

function canUnlockMutation(mutId) {
  const m = getMutationById(mutId);
  if (!m) return false;
  if (unlockedMutations.includes(mutId)) return false;
  if (careerXP < m.cost) return false;
  // Check prerequisite: must have previous tier in same branch
  if (m.tier > 0) {
    for (const branch of MUTATION_BRANCHES) {
      const idx = branch.mutations.findIndex(x => x.id === mutId);
      if (idx >= 0 && idx > 0) {
        const prev = branch.mutations[idx - 1];
        if (!unlockedMutations.includes(prev.id)) return false;
      }
    }
  }
  return true;
}

function unlockMutation(mutId) {
  if (!canUnlockMutation(mutId)) return false;
  const m = getMutationById(mutId);
  careerXP -= m.cost;
  unlockedMutations.push(mutId);
  saveAll();
  return true;
}

function applyMutations(s) {
  // Apply all unlocked mutation effects to game state at run start
  s.mutFreeSpreadChance = 0;
  s.mutPowerRefundChance = 0;
  s.mutDodgeChance = 0;
  s.mutFreeMoves = 0;
  s.mutFreeMovesLeft = 0;
  s.mutShopBonus = 0;
  s.mutPillDropBonus = 0;
  s.mutWantedSlowdown = 0;
  s.mutGuardSpawnBonus = 0;
  s.mutInfMultPerPts = 0;

  for (const id of unlockedMutations) {
    switch (id) {
      case 'virulence_1': s.mutFreeSpreadChance = 0.2; break;
      case 'virulence_2': s.mutPowerRefundChance = 0.1; break;
      case 'virulence_3': s.mutFreeSpreadChance = 0.4; break;
      case 'survival_1': s.mutDodgeChance = 0.1; break;
      case 'survival_2': s.maxEnergy += 5; s.energy += 5; break;
      case 'survival_3': s.mutDodgeChance = 0.2; break;
      case 'mobility_1': s.mutFreeMoves = 5; s.mutFreeMovesLeft = 5; break;
      case 'mobility_2': s.vision += 1; break;
      case 'mobility_3': s.mutFreeMoves = 10; s.mutFreeMovesLeft = 10; break;
      case 'efficiency_1': s.mutShopBonus = 1; break;
      case 'efficiency_2': s.mutPillDropBonus = 0.2; break;
      case 'efficiency_3': s.mutShopBonus = 2; break;
      case 'dominance_1': s.mutWantedSlowdown = 0.2; break;
      case 'dominance_2': s.mutGuardSpawnBonus = 0.15; break;
      case 'dominance_3': s.mutInfMultPerPts = 0.01; break;
    }
  }
}

// ============================================================
// XP Calculation
// ============================================================
function calcRunXP(s) {
  let xp = 0;
  // Pills: 1 pill = 2 XP base
  xp += s.totalPillsCollected * 2;
  // Run completion bonus
  xp += 5 + (s.townsCleared * 2);
  // Infected points milestone (every 100 pts = 25 XP)
  xp += Math.floor(s.totalInfected / 100) * 25;
  // First town guard kill bonus
  if (!firstTownGuardKill && s.runStats.townGuardsKilled > 0) {
    xp += 20;
  }
  // Shark mitigation
  const sharkMod = 1 / (1 + (careerRuns / 200));
  xp = Math.round(xp * sharkMod);
  return xp;
}

function awardXP(s) {
  const xp = calcRunXP(s);
  careerXP = Math.min(42000, careerXP + xp);
  careerRuns++;
  if (s.runStats.townGuardsKilled > 0) firstTownGuardKill = true;
  saveAll();
  return xp;
}

// ============================================================
// Leaderboard
// ============================================================
function getScore(s) {
  return s.totalInfected + s.townsCleared * 20 + s.pills * 5;
}

function isHighScore(score) {
  if (leaderboard.length < 10) return true;
  return score > leaderboard[leaderboard.length - 1].score;
}

function addLeaderboardEntry(name, s) {
  const entry = {
    name: name.slice(0, 15),
    score: getScore(s),
    infected: s.totalInfected,
    towns: s.townsCleared,
    pills: s.totalPillsCollected,
    date: new Date().toISOString().slice(0, 10),
    freeRun: isFreeRun || false,
  };
  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);
  if (leaderboard.length > 10) leaderboard.length = 10;
  saveAll();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderLeaderboardHTML() {
  if (leaderboard.length === 0) return '<div class="lb-empty">No runs recorded yet.</div>';
  let html = '<table class="lb-table"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Inf</th><th>Towns</th><th>Pills</th><th>Date</th></tr></thead><tbody>';
  leaderboard.forEach((e, i) => {
    const cls = i === 0 ? 'lb-gold' : i === 1 ? 'lb-silver' : i === 2 ? 'lb-bronze' : '';
    const freeTag = e.freeRun ? ' <span style="color:#7a6a5a;font-size:11px">(Free)</span>' : '';
    const rawName = e.name.length > 3 ? e.name : e.name.toUpperCase();
    const displayName = escapeHtml(rawName);
    html += `<tr class="${cls}"><td>${i + 1}</td><td>${displayName}${freeTag}</td><td>${escapeHtml(e.score)}</td><td>${escapeHtml(e.infected)}</td><td>${escapeHtml(e.towns)}</td><td>${escapeHtml(e.pills)}</td><td>${escapeHtml(e.date)}</td></tr>`;
  });
  html += '</tbody></table>';
  return html;
}

// ============================================================
// Mutation Tree Rendering
// ============================================================
function renderMutationTree() {
  const container = document.getElementById('mutation-tree');
  document.getElementById('mutation-xp').textContent = careerXP.toLocaleString();

  let html = '';
  for (const branch of MUTATION_BRANCHES) {
    html += `<div class="mt-branch">`;
    html += `<div class="mt-branch-header" style="color:${branch.color}"><span class="mt-branch-icon">${branch.icon}</span> ${branch.name}</div>`;
    html += `<div class="mt-nodes">`;
    branch.mutations.forEach((m, i) => {
      const unlocked = unlockedMutations.includes(m.id);
      const canBuy = canUnlockMutation(m.id);
      let nodeClass = 'mt-node';
      if (unlocked) nodeClass += ' mt-unlocked';
      else if (canBuy) nodeClass += ' mt-affordable';
      else nodeClass += ' mt-locked';

      const tierLabel = i === 0 ? 'Basic' : i === 1 ? 'Advanced' : 'Mastery';

      html += `<div class="${nodeClass}" data-mut="${m.id}" style="--branch-color:${branch.color}">`;
      html += `<div class="mt-tier">${tierLabel}</div>`;
      html += `<div class="mt-name">${m.name}</div>`;
      html += `<div class="mt-desc">${m.desc}</div>`;
      html += `<div class="mt-cost">${unlocked ? 'UNLOCKED' : m.cost + ' XP'}</div>`;
      html += `</div>`;

      // connector line between nodes
      if (i < branch.mutations.length - 1) {
        html += `<div class="mt-connector" style="--branch-color:${branch.color}"><div class="mt-line ${unlocked ? 'mt-line-active' : ''}"></div></div>`;
      }
    });
    html += `</div></div>`;
  }
  container.innerHTML = html;

  // Attach click handlers
  container.querySelectorAll('.mt-node').forEach(node => {
    node.addEventListener('click', () => {
      const mutId = node.dataset.mut;
      if (unlockMutation(mutId)) {
        renderMutationTree();
      }
    });
  });
}

function openMutationModal() {
  document.getElementById('mutation-modal').classList.remove('hidden');
  renderMutationTree();
}

function closeMutationModal() {
  document.getElementById('mutation-modal').classList.add('hidden');
}

function openLeaderboardModal() {
  document.getElementById('leaderboard-modal').classList.remove('hidden');
  document.getElementById('leaderboard-table').innerHTML = renderLeaderboardHTML();
}

function closeLeaderboardModal() {
  document.getElementById('leaderboard-modal').classList.add('hidden');
}

// Wire up modal buttons
document.getElementById('mutations-btn').addEventListener('click', openMutationModal);
document.getElementById('mutation-close').addEventListener('click', closeMutationModal);
document.getElementById('leaderboard-btn').addEventListener('click', openLeaderboardModal);
document.getElementById('leaderboard-close').addEventListener('click', closeLeaderboardModal);

// ---- Upgrade Definitions ----
const UPGRADES = {
  common: [
    { name: 'Thick Cloak',    desc: '+2 max energy',           apply: s => { s.maxEnergy += 2; s.energy = Math.min(s.energy + 2, s.maxEnergy); } },
    { name: 'Herb Pouch',     desc: '+1 starting power',       apply: s => { s.bonusPower += 1; } },
    { name: 'Leather Boots',  desc: 'Move costs reduced 20%',  apply: s => { s.moveCostMod = Math.max(0, s.moveCostMod - 0.2); } },
    { name: 'Plague Salve',   desc: '+3 energy now',            apply: s => { s.energy = Math.min(s.energy + 3, s.maxEnergy); } },
    { name: 'Rat Familiar',   desc: '+1 vision range',          apply: s => { s.vision += 1; } },
  ],
  rare: [
    { name: 'Miasma Vial',    desc: 'Infect costs -1 power',   apply: s => { s.infectCostMod = Math.max(-2, s.infectCostMod - 1); } },
    { name: 'Shadow Step',    desc: '25% chance free move',     apply: s => { s.freeMoveChance = Math.min(0.75, s.freeMoveChance + 0.25); } },
    { name: 'Iron Mask',      desc: 'Watchmen drain -1',        apply: s => { s.watchmanReduction += 1; } },
    { name: 'Plague Doctor',  desc: '+5 max energy',            apply: s => { s.maxEnergy += 5; s.energy = Math.min(s.energy + 5, s.maxEnergy); } },
    { name: 'Dark Tonic',     desc: 'Hand carts give +1 extra', apply: s => { s.cartBonus += 1; } },
  ],
  epic: [
    { name: 'Black Death',    desc: 'All infect +2 pts',        apply: s => { s.infectPtBonus += 2; } },
    { name: 'Carrion Crown',  desc: 'Town bonus +5 energy',     apply: s => { s.townBonusEnergy += 5; } },
    { name: 'Wraith Cloak',   desc: 'Enemies 30% miss chance',  apply: s => { s.enemyMissChance = Math.min(0.6, s.enemyMissChance + 0.3); } },
    { name: 'Pandemic',       desc: 'Virus pickup lasts +3',    apply: s => { s.virusBonusTurns += 3; } },
    { name: 'Soul Harvest',   desc: 'Kill enemies for +1 pill', apply: s => { s.soulHarvest = true; } },
  ],
};

// ---- Tile Types ----
const T = {
  EMPTY: 0, WALL: 1, ROAD: 2, BUILDING1: 3, BUILDING2: 4, BUILDING3: 5,
  PUB: 6, SHOP: 7, DOOR: 8, HORSE_CART: 9, TRAP: 10, HAND_CART: 11,
  VIRUS: 12, PILL: 13, BUILDING_INSIDE: 14,
};

// ---- Entity Types ----
const E = {
  CIVILIAN: 'civilian', WATCHMAN: 'watchman', PATROL: 'patrol',
  GATEKEEPER: 'gatekeeper', TOWN_GUARD: 'town_guard',
  NIGHT_WATCH: 'night_watch', VAULT_KEEPER: 'vault_keeper',
};

// ---- Helpers ----
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function chance(pct) { return Math.random() < pct; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---- Logging ----
function log(msg, color) {
  logLines.push({ msg, color: color || '#c8b894', time: Date.now() });
  if (logLines.length > 4) logLines.shift();
  renderLog();
}

function renderLog() {
  const el = document.getElementById('log');
  el.innerHTML = logLines.map(l =>
    `<div class="log-line" style="color:${l.color}">${l.msg}</div>`
  ).join('');
}

// ---- HUD ----
function updateHUD() {
  document.getElementById('hud-energy').textContent = state.energy;
  document.getElementById('hud-power').textContent = state.power;
  document.getElementById('hud-infected').textContent = state.totalInfected;
  document.getElementById('hud-town').textContent = state.townNum;
  document.getElementById('hud-pills').textContent = state.pills;
  document.getElementById('hud-turn').textContent = state.turnCount;
  const stars = state.wantedLevel;
  document.getElementById('hud-wanted').textContent = stars > 0 ? '\u2605'.repeat(stars) : '-';
}

// ============================================================
// Map Generation
// ============================================================
function generateTown(townNum) {
  const grid = Array.from({ length: GRID }, () => Array(GRID).fill(T.EMPTY));
  const entities = [];

  // Border walls
  for (let x = 0; x < GRID; x++) { grid[0][x] = T.WALL; grid[GRID - 1][x] = T.WALL; }
  for (let y = 0; y < GRID; y++) { grid[y][0] = T.WALL; grid[y][GRID - 1] = T.WALL; }

  // --- Organic road generation ---
  // Town square near center (2x2 or 3x3)
  const sqSize = chance(0.4) ? 3 : 2;
  const sqX = rng(4, 7 - sqSize + 1);
  const sqY = rng(4, 7 - sqSize + 1);
  for (let dy = 0; dy < sqSize; dy++)
    for (let dx = 0; dx < sqSize; dx++)
      grid[sqY + dy][sqX + dx] = T.ROAD;

  // Helper: carve a winding road from (y0,x0) toward (y1,x1)
  function carveRoad(y0, x0, y1, x1) {
    let cy = y0, cx = x0;
    let steps = 0;
    while ((cy !== y1 || cx !== x1) && steps < 40) {
      if (cy >= 1 && cy < GRID - 1 && cx >= 1 && cx < GRID - 1) grid[cy][cx] = T.ROAD;
      // Biased random walk toward target
      const goVert = (cy !== y1) && (cx === x1 || chance(0.5));
      if (goVert) {
        cy += Math.sign(y1 - cy);
      } else {
        cx += Math.sign(x1 - cx);
      }
      // Random jog: occasionally step sideways
      if (chance(0.25) && steps > 0) {
        if (goVert && cx > 1 && cx < GRID - 2) cx += pick([-1, 1]);
        else if (!goVert && cy > 1 && cy < GRID - 2) cy += pick([-1, 1]);
      }
      cy = clamp(cy, 1, GRID - 2);
      cx = clamp(cx, 1, GRID - 2);
      steps++;
    }
    if (cy >= 1 && cy < GRID - 1 && cx >= 1 && cx < GRID - 1) grid[cy][cx] = T.ROAD;
  }

  // Main roads: from square center toward each edge
  const sqCx = sqX + Math.floor(sqSize / 2);
  const sqCy = sqY + Math.floor(sqSize / 2);
  carveRoad(sqCy, sqCx, 1, sqCx + rng(-1, 1));           // north
  carveRoad(sqCy, sqCx, GRID - 2, sqCx + rng(-1, 1));    // south
  carveRoad(sqCy, sqCx, sqCy + rng(-1, 1), 1);            // west
  carveRoad(sqCy, sqCx, sqCy + rng(-1, 1), GRID - 2);     // east

  // Extra winding road or L-shaped path for variety
  const extraRoads = rng(1, 2 + Math.floor(townNum / 3));
  for (let i = 0; i < extraRoads; i++) {
    // Pick random road tile as start, random edge-ish tile as end
    const ry0 = rng(2, GRID - 3), rx0 = rng(2, GRID - 3);
    const ry1 = rng(2, GRID - 3), rx1 = rng(2, GRID - 3);
    carveRoad(ry0, rx0, ry1, rx1);
  }

  // Small alleys branching off roads
  const alleyCount = rng(2, 4);
  for (let i = 0; i < alleyCount; i++) {
    // Find a random road tile
    const roadCells = [];
    for (let y = 2; y < GRID - 2; y++)
      for (let x = 2; x < GRID - 2; x++)
        if (grid[y][x] === T.ROAD) roadCells.push({ y, x });
    if (roadCells.length === 0) break;
    const start = pick(roadCells);
    const dir = pick([[0, 1], [0, -1], [1, 0], [-1, 0]]);
    const len = rng(2, 4);
    let ay = start.y, ax = start.x;
    for (let s = 0; s < len; s++) {
      ay += dir[0]; ax += dir[1];
      if (ay < 1 || ay >= GRID - 1 || ax < 1 || ax >= GRID - 1) break;
      grid[ay][ax] = T.ROAD;
    }
  }

  // --- Place buildings along roads ---
  function canPlace(y, x, w, h) {
    if (y + h > GRID - 1 || x + w > GRID - 1 || y < 1 || x < 1) return false;
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (grid[y + dy][x + dx] !== T.EMPTY) return false;
    return true;
  }

  function isAdjacentToRoad(y, x, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        for (const [ny, nx] of [[y+dy-1,x+dx],[y+dy+1,x+dx],[y+dy,x+dx-1],[y+dy,x+dx+1]]) {
          if (ny >= 0 && ny < GRID && nx >= 0 && nx < GRID && grid[ny][nx] === T.ROAD) return true;
        }
      }
    }
    return false;
  }

  const buildingDefs = [];
  // Town variety: some towns dense, some open
  const densityMod = chance(0.3) ? 2 : (chance(0.3) ? -1 : 0);
  const numBuildings = clamp(4 + Math.floor(townNum / 2) + densityMod, 3, 12);
  let hasPub = false, hasShop = false;

  for (let i = 0; i < numBuildings; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      let type, w, h;
      if (!hasPub && i >= numBuildings - 2) {
        type = T.PUB; w = 2; h = 2; hasPub = true;
      } else if (!hasShop && i >= numBuildings - 1) {
        type = T.SHOP; w = 1; h = 1; hasShop = true;
      } else {
        const r = Math.random();
        if (r < 0.30) { type = T.BUILDING1; w = 1; h = 1; }
        else if (r < 0.55) { type = T.BUILDING2; w = 2; h = 1; }
        else if (r < 0.70) { type = T.BUILDING3; w = 3; h = 1; }
        else if (r < 0.80) { type = T.PUB; w = 2; h = 2; hasPub = true; }
        else { type = T.SHOP; w = 1; h = 1; hasShop = true; }
      }

      const py = rng(1, GRID - 2 - h + 1);
      const px = rng(1, GRID - 2 - w + 1);
      if (canPlace(py, px, w, h) && isAdjacentToRoad(py, px, w, h)) {
        for (let dy = 0; dy < h; dy++)
          for (let dx = 0; dx < w; dx++)
            grid[py + dy][px + dx] = type;
        // Door on road-adjacent edge
        const doorCandidates = [];
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            for (const [ny, nx] of [[py+dy-1,px+dx],[py+dy+1,px+dx],[py+dy,px+dx-1],[py+dy,px+dx+1]]) {
              if (ny >= 0 && ny < GRID && nx >= 0 && nx < GRID && grid[ny][nx] === T.ROAD) {
                doorCandidates.push({ y: py + dy, x: px + dx });
              }
            }
          }
        }
        if (doorCandidates.length > 0) {
          const door = pick(doorCandidates);
          grid[door.y][door.x] = T.DOOR;
        }
        buildingDefs.push({ type, x: px, y: py, w, h, infected: false });
        placed = true;
      }
    }
  }

  // Force pub and shop if missing
  if (!hasPub) {
    for (let y = 2; y < GRID - 3; y++) {
      for (let x = 2; x < GRID - 3; x++) {
        if (canPlace(y, x, 2, 2)) {
          grid[y][x] = T.PUB; grid[y][x+1] = T.PUB;
          grid[y+1][x] = T.PUB; grid[y+1][x+1] = T.DOOR;
          buildingDefs.push({ type: T.PUB, x, y, w: 2, h: 2, infected: false });
          hasPub = true; break;
        }
      }
      if (hasPub) break;
    }
  }
  if (!hasShop) {
    for (let y = 2; y < GRID - 2; y++) {
      for (let x = 2; x < GRID - 2; x++) {
        if (grid[y][x] === T.EMPTY) {
          grid[y][x] = T.DOOR;
          buildingDefs.push({ type: T.SHOP, x, y, w: 1, h: 1, infected: false });
          hasShop = true; break;
        }
      }
      if (hasShop) break;
    }
  }

  // Ensure connectivity: BFS from town square, fill unreachable non-wall with road
  const visited = Array.from({ length: GRID }, () => Array(GRID).fill(false));
  const queue = [{ y: sqCy, x: sqCx }];
  visited[sqCy][sqCx] = true;
  while (queue.length > 0) {
    const { y, x } = queue.shift();
    for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const ny = y + dy, nx = x + dx;
      if (ny >= 1 && ny < GRID - 1 && nx >= 1 && nx < GRID - 1 && !visited[ny][nx]) {
        const t = grid[ny][nx];
        if (t === T.ROAD || t === T.EMPTY || t === T.DOOR || t === T.TRAP || t === T.HAND_CART || t === T.VIRUS || t === T.PILL) {
          visited[ny][nx] = true;
          queue.push({ y: ny, x: nx });
        }
      }
    }
  }
  // Any walkable tile not visited — carve road to it
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      if (grid[y][x] === T.ROAD && !visited[y][x]) {
        carveRoad(y, x, sqCy, sqCx);
      }
    }
  }

  // Place horse cart on a road tile near an edge
  let hcPlaced = false;
  const edgeRoads = [];
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      if (grid[y][x] === T.ROAD && (y <= 2 || y >= GRID - 3 || x <= 2 || x >= GRID - 3)) {
        edgeRoads.push({ y, x });
      }
    }
  }
  if (edgeRoads.length > 0) {
    const hc = pick(edgeRoads);
    grid[hc.y][hc.x] = T.HORSE_CART;
    hcPlaced = true;
  }
  if (!hcPlaced) {
    // Fallback: wall edge
    for (let attempt = 0; attempt < 50 && !hcPlaced; attempt++) {
      const edge = rng(0, 3);
      let hx, hy;
      if (edge === 0) { hy = 0; hx = rng(2, GRID - 3); }
      else if (edge === 1) { hy = GRID - 1; hx = rng(2, GRID - 3); }
      else if (edge === 2) { hx = 0; hy = rng(2, GRID - 3); }
      else { hx = GRID - 1; hy = rng(2, GRID - 3); }
      grid[hy][hx] = T.HORSE_CART;
      hcPlaced = true;
    }
  }

  // Scatter items on empty/road tiles
  const empties = [];
  for (let y = 1; y < GRID - 1; y++)
    for (let x = 1; x < GRID - 1; x++)
      if (grid[y][x] === T.EMPTY || grid[y][x] === T.ROAD) empties.push({ y, x, isRoad: grid[y][x] === T.ROAD });

  // Traps — fewer in early towns, scaling up
  const numTraps = townNum <= 1 ? rng(1, 2) : rng(2, 2 + Math.floor(townNum * 0.8));
  for (let i = 0; i < numTraps && empties.length; i++) {
    const idx = rng(0, empties.length - 1);
    const { y, x } = empties.splice(idx, 1)[0];
    if (grid[y][x] === T.EMPTY || grid[y][x] === T.ROAD) grid[y][x] = T.TRAP;
  }

  // Hand carts — more plentiful for resource recovery
  const numCarts = rng(2, 3);
  for (let i = 0; i < numCarts && empties.length; i++) {
    const idx = rng(0, empties.length - 1);
    const { y, x } = empties.splice(idx, 1)[0];
    if (grid[y][x] === T.EMPTY || grid[y][x] === T.ROAD) grid[y][x] = T.HAND_CART;
  }

  // Virus pickup
  if (chance(0.4 + townNum * 0.05)) {
    const idx = rng(0, empties.length - 1);
    if (empties.length > 0) {
      const { y, x } = empties.splice(idx, 1)[0];
      if (grid[y][x] === T.EMPTY || grid[y][x] === T.ROAD) grid[y][x] = T.VIRUS;
    }
  }

  // Pills
  const numPills = rng(1, 3);
  for (let i = 0; i < numPills && empties.length; i++) {
    const idx = rng(0, empties.length - 1);
    const { y, x } = empties.splice(idx, 1)[0];
    if (grid[y][x] === T.EMPTY || grid[y][x] === T.ROAD) grid[y][x] = T.PILL;
  }

  // Spawn enemies
  const roadTiles = [];
  for (let y = 1; y < GRID - 1; y++)
    for (let x = 1; x < GRID - 1; x++)
      if (grid[y][x] === T.ROAD) roadTiles.push({ y, x });

  // Civilians — scale with town
  const numCiv = rng(2, 3 + Math.floor(townNum * 0.7));
  for (let i = 0; i < numCiv && roadTiles.length; i++) {
    const pos = roadTiles.splice(rng(0, roadTiles.length - 1), 1)[0];
    entities.push({ type: E.CIVILIAN, x: pos.x, y: pos.y, alive: true });
  }

  // Watchmen — scale with town
  const numWatch = rng(1, 1 + Math.floor(townNum * 0.6));
  for (let i = 0; i < numWatch && roadTiles.length; i++) {
    const pos = roadTiles.splice(rng(0, roadTiles.length - 1), 1)[0];
    entities.push({ type: E.WATCHMAN, x: pos.x, y: pos.y, alive: true });
  }

  // Patrols — more in later towns
  const numPatrol = Math.floor(townNum / 2) + (townNum >= 3 ? 1 : 0) + (townNum >= 6 ? 1 : 0);
  for (let i = 0; i < numPatrol && roadTiles.length; i++) {
    const pos = roadTiles.splice(rng(0, roadTiles.length - 1), 1)[0];
    entities.push({ type: E.PATROL, x: pos.x, y: pos.y, alive: true, dir: rng(0, 3) });
  }

  // Town Guard (rare, from town 3+)
  const guardBonus = (state && state.mutGuardSpawnBonus) ? state.mutGuardSpawnBonus : 0;
  // Night Watch spawns scale with wanted (added in later towns)
  if (townNum >= 4) {
    const nw = rng(1, Math.floor(townNum / 3));
    for (let i = 0; i < nw && roadTiles.length; i++) {
      const pos = roadTiles.splice(rng(0, roadTiles.length - 1), 1)[0];
      entities.push({ type: E.NIGHT_WATCH, x: pos.x, y: pos.y, stunned: 0 });
    }
  }

  // Vault Keeper in later towns
  if (townNum >= 3 && chance(0.3 + townNum * 0.05) && roadTiles.length) {
    const pos = roadTiles.splice(rng(0, roadTiles.length - 1), 1)[0];
    entities.push({ type: E.VAULT_KEEPER, x: pos.x, y: pos.y });
  }

  if (townNum >= 3 && chance(0.3 + townNum * 0.12 + guardBonus) && roadTiles.length) {
    const pos = roadTiles.splice(rng(0, roadTiles.length - 1), 1)[0];
    entities.push({ type: E.TOWN_GUARD, x: pos.x, y: pos.y, alive: true });
  }

  // Vault Keeper (rare)
  if (chance(0.2) && roadTiles.length) {
    const pos = roadTiles.splice(rng(0, roadTiles.length - 1), 1)[0];
    entities.push({ type: E.VAULT_KEEPER, x: pos.x, y: pos.y, alive: true, fleeing: false });
  }

  return { grid, entities, buildings: buildingDefs, sqCx, sqCy };
}

// ============================================================
// Game State Init
// ============================================================
function initState() {
  const town = generateTown(1);
  // Find a road tile for player start near center
  let startX = 6, startY = 6;
  for (let r = 0; r < 5; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const ty = 6 + dy, tx = 6 + dx;
        if (ty > 0 && ty < GRID - 1 && tx > 0 && tx < GRID - 1) {
          const t = town.grid[ty][tx];
          if (t === T.ROAD || t === T.EMPTY) { startX = tx; startY = ty; r = 99; break; }
        }
      }
      if (r >= 99) break;
    }
  }

  const s = {
    // Player position
    px: startX, py: startY,
    // Resources
    energy: 15, maxEnergy: 15, power: 7, maxPower: 99,
    totalInfected: 0, townInfected: 0, pills: 0,
    // Town
    townNum: 1, town,
    // Wanted
    wantedLevel: 0,
    // Virus free actions
    virusFree: 0,
    // Stun (player stunned turns)
    stunned: 0,
    // Upgrade modifiers
    bonusPower: 0, moveCostMod: 1.0, freeMoveChance: 0,
    infectCostMod: 0, watchmanReduction: 0, cartBonus: 0,
    infectPtBonus: 0, townBonusEnergy: 0, enemyMissChance: 0,
    virusBonusTurns: 0, soulHarvest: false, vision: 4,
    // Tracking
    townsCleared: 0, enemiesKilled: 0, buildingsInfected: 0,
    totalPillsCollected: 0, turnCount: 0,
    // Free move on spawn (1 free move to look around)
    freeSpawnMove: 1,
    // Game state
    gameOver: false, running: false,
    // Run stats (Phase 2)
    runStats: {
      totalMoves: 0,
      enemiesKilled: 0,
      buildingsInfected: 0,
      pillsCollected: 0,
      townsCompleted: 0,
      townGuardsKilled: 0,
      startTime: Date.now(),
    },
    // Mutation runtime state
    mutFreeSpreadChance: 0,
    mutPowerRefundChance: 0,
    mutDodgeChance: 0,
    mutFreeMoves: 0,
    mutFreeMovesLeft: 0,
    mutShopBonus: 0,
    mutPillDropBonus: 0,
    mutWantedSlowdown: 0,
    mutGuardSpawnBonus: 0,
    mutInfMultPerPts: 0,
  };

  // Apply mutations
  applyMutations(s);

  return s;
}

// ============================================================
// Drawing
// ============================================================
const COLORS = {
  bg: '#0d0d15',
  wall: '#2a2018',
  road: '#1a1510',
  road_line: '#2a2518',
  building1: '#4a3828',
  building2: '#3a2a1a',
  building3: '#352518',
  pub: '#5a3020',
  shop: '#2a3828',
  door: '#6a5030',
  door_infected: '#3a6a30',
  horse_cart: '#5a4a20',
  trap: '#1a1510', // hidden
  hand_cart: '#4a4030',
  virus: '#30603a',
  pill: '#2050a0',
  fog: '#0a0a0f',
  player: '#30a830',
  player_hood: '#208020',
  civilian: '#8a7a6a',
  watchman: '#a04040',
  patrol: '#b05030',
  gatekeeper: '#802060',
  town_guard: '#c03030',
  night_watch: '#3040a0',
  vault_keeper: '#a0a030',
  infected_glow: '#30a830',
};

// Convert world tile coords to screen pixel coords (camera-aware)
function toScreen(tileX, tileY) {
  const scale = RENDER_TILE; // pixels per tile on screen
  const sx = (tileX - camX) * scale + canvas.width / 2;
  const sy = (tileY - camY) * scale + canvas.height / 2;
  return { x: sx, y: sy };
}

function drawTileAt(x, y, tileType, infected) {
  const s = toScreen(x, y);
  const sz = RENDER_TILE;
  // Cull off-screen tiles
  if (s.x + sz < 0 || s.x > canvas.width || s.y + sz < 0 || s.y > canvas.height) return;

  switch (tileType) {
    case T.WALL:        Sprites.wall(ctx, s.x, s.y, sz); break;
    case T.ROAD:        Sprites.road(ctx, s.x, s.y, sz); break;
    case T.BUILDING1:   Sprites.building1(ctx, s.x, s.y, sz); if (infected) Sprites.infected(ctx, s.x, s.y, sz); break;
    case T.BUILDING2:   Sprites.building2(ctx, s.x, s.y, sz); if (infected) Sprites.infected(ctx, s.x, s.y, sz); break;
    case T.BUILDING3:   Sprites.building3(ctx, s.x, s.y, sz); if (infected) Sprites.infected(ctx, s.x, s.y, sz); break;
    case T.PUB:         Sprites.pub(ctx, s.x, s.y, sz); if (infected) Sprites.infected(ctx, s.x, s.y, sz); break;
    case T.SHOP:        Sprites.shop(ctx, s.x, s.y, sz); if (infected) Sprites.infected(ctx, s.x, s.y, sz); break;
    case T.DOOR:        Sprites.door(ctx, s.x, s.y, sz); if (infected) Sprites.infected(ctx, s.x, s.y, sz); break;
    case T.HORSE_CART:  Sprites.grass(ctx, s.x, s.y, sz); Sprites.horseCart(ctx, s.x, s.y, sz); break;
    case T.TRAP:        Sprites.grass(ctx, s.x, s.y, sz); break;
    case T.HAND_CART:   Sprites.grass(ctx, s.x, s.y, sz); Sprites.handcart(ctx, s.x, s.y, sz); break;
    case T.VIRUS:       Sprites.grass(ctx, s.x, s.y, sz); Sprites.virus(ctx, s.x, s.y, sz); break;
    case T.PILL:        Sprites.grass(ctx, s.x, s.y, sz); Sprites.plaguePill(ctx, s.x, s.y, sz); break;
    default:            Sprites.grass(ctx, s.x, s.y, sz);
  }
}

function drawEntity(ent) {
  if (!ent.alive) return;
  // Interpolate entity position if animating
  let ex = ent.x, ey = ent.y;
  const ea = entityAnims.get(ent);
  if (ea) {
    const t = clamp((Date.now() - ea.startTime) / ANIM_DURATION, 0, 1);
    ex = ea.fromX + (ea.toX - ea.fromX) * t;
    ey = ea.fromY + (ea.toY - ea.fromY) * t;
    if (t >= 1) entityAnims.delete(ent);
  }
  const s = toScreen(ex, ey);
  const sz = RENDER_TILE;
  if (s.x + sz < 0 || s.x > canvas.width || s.y + sz < 0 || s.y > canvas.height) return;

  switch (ent.type) {
    case E.CIVILIAN:    Sprites.civilian(ctx, s.x, s.y, sz); break;
    case E.WATCHMAN:    Sprites.watchman(ctx, s.x, s.y, sz); break;
    case E.PATROL:      Sprites.patrol(ctx, s.x, s.y, sz); break;
    case E.GATEKEEPER:  Sprites.gatekeeper(ctx, s.x, s.y, sz); break;
    case E.TOWN_GUARD:  Sprites.townGuard(ctx, s.x, s.y, sz); break;
    case E.NIGHT_WATCH: Sprites.nightWatch(ctx, s.x, s.y, sz); break;
    case E.VAULT_KEEPER:Sprites.vaultKeeper(ctx, s.x, s.y, sz); break;
  }
}

function drawPlayer() {
  // Use animated position
  let px = animX, py = animY;
  if (bumpAnim) {
    const t = clamp((Date.now() - bumpAnim.startTime) / bumpAnim.duration, 0, 1);
    // Bump out then back: triangle wave peaking at 0.5
    const f = t < 0.5 ? t * 2 : (1 - t) * 2;
    px = bumpAnim.fromX + (bumpAnim.toX - bumpAnim.fromX) * f * 0.25;
    py = bumpAnim.fromY + (bumpAnim.toY - bumpAnim.fromY) * f * 0.25;
    if (t >= 1) bumpAnim = null;
  }

  const s = toScreen(px, py);
  const sz = RENDER_TILE;
  const cx = s.x + sz / 2, cy = s.y + sz / 2;

  // Plague glow
  if (state.virusFree > 0) {
    ctx.fillStyle = 'rgba(48, 255, 48, 0.15)';
    ctx.beginPath(); ctx.arc(cx, cy, sz * 0.47, 0, Math.PI * 2); ctx.fill();
  }

  Sprites.player(ctx, s.x, s.y, sz);

  // Stun indicator
  if (state.stunned > 0) {
    ctx.fillStyle = '#ffff00';
    ctx.font = `bold ${Math.round(sz * 0.23)}px serif`;
    ctx.fillText('\u2733', s.x + sz * 0.08, s.y + sz * 0.2);
  }
}

function drawFog() {
  const vision = state.vision;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const d = dist({ x: state.px, y: state.py }, { x, y });
      const s = toScreen(x, y);
      const sz = RENDER_TILE;
      if (s.x + sz < 0 || s.x > canvas.width || s.y + sz < 0 || s.y > canvas.height) continue;
      if (d > vision) {
        Sprites.fog(ctx, s.x, s.y, sz);
      } else if (d === vision) {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.6)';
        ctx.fillRect(s.x, s.y, sz, sz);
      }
    }
  }
}

// VFX helpers
function addVFX(type, x, y, color, duration) {
  vfx.push({ type, x, y, startTime: Date.now(), duration: duration || 300, color });
}

function drawVFX() {
  const now = Date.now();
  for (let i = vfx.length - 1; i >= 0; i--) {
    const fx = vfx[i];
    const t = (now - fx.startTime) / fx.duration;
    if (t >= 1) { vfx.splice(i, 1); continue; }
    const s = toScreen(fx.x, fx.y);
    const sz = RENDER_TILE;

    if (fx.type === 'infect') {
      // Green glow pulse
      const alpha = 0.5 * (1 - t);
      ctx.fillStyle = `rgba(48, 232, 48, ${alpha})`;
      ctx.fillRect(s.x - sz * 0.1, s.y - sz * 0.1, sz * 1.2, sz * 1.2);
    } else if (fx.type === 'damage') {
      // Red flash on player
      const alpha = 0.6 * (1 - t);
      ctx.fillStyle = `rgba(255, 40, 40, ${alpha})`;
      const ps = toScreen(animX, animY);
      ctx.fillRect(ps.x, ps.y, sz, sz);
    }
  }
}

function isInfectedTile(y, x) {
  for (const b of state.town.buildings) {
    if (b.infected && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
    // Check door too
    if (b.infected) {
      const t = state.town.grid[y][x];
      if (t === T.DOOR && x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h) return true;
    }
  }
  return false;
}

function updateCamera() {
  // Smoothly lerp camera toward player animated position
  const targetX = animX;
  const targetY = animY;
  // Clamp so camera doesn't show outside grid
  const halfView = VIEW_TILES / 2;
  const clampedX = clamp(targetX + 0.5, halfView, GRID - halfView);
  const clampedY = clamp(targetY + 0.5, halfView, GRID - halfView);
  camX += (clampedX - camX) * CAM_LERP;
  camY += (clampedY - camY) * CAM_LERP;
}

function updateAnimations() {
  const now = Date.now();
  if (animating) {
    const t = clamp((now - animStartTime) / ANIM_DURATION, 0, 1);
    // Ease-out quad
    const e = 1 - (1 - t) * (1 - t);
    animX = animFromX + (animToX - animFromX) * e;
    animY = animFromY + (animToY - animFromY) * e;
    if (t >= 1) {
      animX = animToX;
      animY = animToY;
      animating = false;
      inputLocked = false;
    }
  }
}

function render() {
  if (!state) return;

  updateAnimations();
  updateCamera();

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines (very subtle)
  ctx.strokeStyle = 'rgba(40, 30, 20, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID; i++) {
    const sx = toScreen(i, 0);
    const sy = toScreen(0, i);
    ctx.beginPath(); ctx.moveTo(sx.x, 0); ctx.lineTo(sx.x, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, sy.y); ctx.lineTo(canvas.width, sy.y); ctx.stroke();
  }

  // Tiles
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      drawTileAt(x, y, state.town.grid[y][x], isInfectedTile(y, x));

  // Entities
  for (const ent of state.town.entities)
    if (ent.alive && dist({ x: state.px, y: state.py }, ent) <= state.vision)
      drawEntity(ent);

  // Player
  drawPlayer();

  // VFX overlays
  drawVFX();

  // Fog
  drawFog();

  updateHUD();
}

// ============================================================
// Game Logic
// ============================================================
function getBuildingAt(y, x) {
  for (const b of state.town.buildings) {
    // Check main tiles and door (door is within or adjacent)
    for (let dy = 0; dy < b.h; dy++)
      for (let dx = 0; dx < b.w; dx++)
        if (b.y + dy === y && b.x + dx === x) return b;
  }
  return null;
}

function entityAt(y, x) {
  return state.town.entities.find(e => e.alive && e.x === x && e.y === y);
}

function infectBuilding(building) {
  if (building.infected) { log('Already infected.', '#7a6a5a'); return; }

  let powerCost, infPts;
  switch (building.type) {
    case T.BUILDING1: powerCost = 2; infPts = 2; break;
    case T.BUILDING2: powerCost = 3; infPts = 3; break;
    case T.BUILDING3: powerCost = 4; infPts = 4; break;
    case T.PUB:       powerCost = 5; infPts = 6; break;
    case T.SHOP:      powerCost = 2; infPts = 2; break;
    default: return;
  }

  powerCost = Math.max(1, powerCost + state.infectCostMod);

  if (state.virusFree > 0) powerCost = 0;

  if (state.power < powerCost) {
    log('Not enough plague power! Need ' + powerCost, '#ef4444');
    return;
  }

  state.power -= powerCost;
  infPts += state.infectPtBonus;
  // Dominance mutation: +1% per 50 infected points
  if (state.mutInfMultPerPts > 0) {
    const bonus = Math.floor(state.totalInfected / 50) * state.mutInfMultPerPts;
    infPts = Math.round(infPts * (1 + bonus));
  }
  state.totalInfected += infPts;
  state.townInfected += infPts;
  state.buildingsInfected++;
  state.runStats.buildingsInfected++;
  building.infected = true;

  log(`Infected ${building.type === T.PUB ? 'Pub' : building.type === T.SHOP ? 'Shop' : 'building'}! +${infPts} pts`, '#4ae04a');

  // Shop bonus: gives energy
  if (building.type === T.SHOP) {
    const shopPower = 3 + state.mutShopBonus;
    state.power += shopPower;
    log('Shop looted! +' + shopPower + ' plague power', '#a855f7');
  }

  // Free spread mutation: chance to auto-infect another nearby building
  if (state.mutFreeSpreadChance > 0 && chance(state.mutFreeSpreadChance)) {
    const nearbyBuildings = state.town.buildings.filter(b => !b.infected && b !== building && dist({x: building.x, y: building.y}, {x: b.x, y: b.y}) <= 4);
    if (nearbyBuildings.length > 0) {
      const target = pick(nearbyBuildings);
      target.infected = true;
      const bonusPts = 1 + state.infectPtBonus;
      state.totalInfected += bonusPts;
      state.townInfected += bonusPts;
      state.buildingsInfected++;
      state.runStats.buildingsInfected++;
      log('Plague spreads! Nearby building infected! +' + bonusPts + ' pts', '#40ff40');
    }
  }

  // Watchman spawn chance
  let watchChance = 0;
  if (building.type === T.BUILDING1) watchChance = 0.33;
  else if (building.type === T.BUILDING2) watchChance = 0.66;
  else if (building.type === T.BUILDING3) watchChance = 1.0;
  else if (building.type === T.PUB) watchChance = 1.0;

  if (chance(watchChance)) {
    // Spawn watchman near building
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dy, dx] of dirs) {
      const ny = building.y + dy, nx = building.x + dx;
      if (ny > 0 && ny < GRID - 1 && nx > 0 && nx < GRID - 1) {
        const t = state.town.grid[ny][nx];
        if ((t === T.ROAD || t === T.EMPTY) && !entityAt(ny, nx)) {
          state.town.entities.push({ type: E.WATCHMAN, x: nx, y: ny, alive: true });
          log('A Watchman appears!', '#a04040');
          break;
        }
      }
    }
  }

  // Pub spawns gatekeeper
  if (building.type === T.PUB) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dy, dx] of dirs) {
      const ny = building.y + dy, nx = building.x + dx;
      if (ny > 0 && ny < GRID - 1 && nx > 0 && nx < GRID - 1) {
        const t = state.town.grid[ny][nx];
        if ((t === T.ROAD || t === T.EMPTY) && !entityAt(ny, nx)) {
          state.town.entities.push({ type: E.GATEKEEPER, x: nx, y: ny, alive: true });
          log('A Gatekeeper blocks the way!', '#802060');
          break;
        }
      }
    }
  }

  // Update wanted level
  updateWanted();
}

function updateWanted() {
  // Wanted slowdown mutation: thresholds are higher
  const slow = 1 + state.mutWantedSlowdown;
  const inf = state.townInfected;
  if (inf >= Math.round(25 * slow)) state.wantedLevel = 5;
  else if (inf >= Math.round(18 * slow)) state.wantedLevel = 4;
  else if (inf >= Math.round(12 * slow)) state.wantedLevel = 3;
  else if (inf >= Math.round(7 * slow)) state.wantedLevel = 2;
  else if (inf >= Math.round(3 * slow)) state.wantedLevel = 1;
  else state.wantedLevel = 0;

  // Spawn night watch based on wanted level
  if (state.wantedLevel >= 3 && chance(0.3)) {
    const empties = [];
    for (let y = 1; y < GRID - 1; y++)
      for (let x = 1; x < GRID - 1; x++)
        if ((state.town.grid[y][x] === T.ROAD || state.town.grid[y][x] === T.EMPTY) && !entityAt(y, x) && dist({x, y}, {x: state.px, y: state.py}) > 3)
          empties.push({y, x});
    if (empties.length) {
      const pos = pick(empties);
      state.town.entities.push({ type: E.NIGHT_WATCH, x: pos.x, y: pos.y, alive: true });
      if (state.wantedLevel >= 4) log('The Night Watch hunts you...', '#3040a0');
    }
  }
}

function handleEntityEncounter(ent) {
  if (!ent.alive) return;

  // Mutation dodge chance
  if (state.mutDodgeChance > 0 && ent.type !== E.CIVILIAN && ent.type !== E.VAULT_KEEPER) {
    if (chance(state.mutDodgeChance)) {
      log('Dodged! Resilient Strain protects you.', '#38bdf8');
      return;
    }
  }

  // Enemy miss chance (upgrade)
  if (state.enemyMissChance > 0 && ent.type !== E.CIVILIAN && ent.type !== E.VAULT_KEEPER) {
    if (chance(state.enemyMissChance)) {
      log('Enemy missed! Your Wraith Cloak conceals you.', '#a855f7');
      return;
    }
  }

  switch (ent.type) {
    case E.CIVILIAN: {
      const cost = Math.max(0, 1 + state.infectCostMod);
      if (state.virusFree > 0 || state.power >= cost) {
        if (state.virusFree <= 0) state.power -= cost;
        ent.alive = false;
        const pts = 1 + state.infectPtBonus;
        state.totalInfected += pts;
        state.townInfected += pts;
        state.enemiesKilled++;
        state.runStats.enemiesKilled++;
        log('Infected a civilian! +' + pts + ' pts', '#4ae04a');
        if (state.soulHarvest) { state.pills++; state.totalPillsCollected++; state.runStats.pillsCollected++; }
        // Power refund mutation
        if (state.mutPowerRefundChance > 0 && chance(state.mutPowerRefundChance)) {
          state.power += 1;
          log('Plague Carrier: +1 power refunded!', '#4ae04a');
        }
      } else {
        log('Not enough power to infect civilian!', '#ef4444');
        return; // Don't move onto them
      }
      break;
    }

    case E.WATCHMAN: {
      const drain = Math.max(0, 1 - state.watchmanReduction);
      state.energy -= drain;
      ent.alive = false;
      state.enemiesKilled++;
      state.runStats.enemiesKilled++;
      if (drain > 0) log('Watchman! -' + drain + ' energy', '#ef4444');
      else log('Defeated a Watchman effortlessly!', '#4ae04a');
      if (state.soulHarvest) { state.pills++; state.totalPillsCollected++; state.runStats.pillsCollected++; }
      if (state.mutPowerRefundChance > 0 && chance(state.mutPowerRefundChance)) { state.power += 1; log('Plague Carrier: +1 power refunded!', '#4ae04a'); }
      break;
    }

    case E.PATROL: {
      const drain = 1;
      state.energy -= drain;
      ent.alive = false;
      state.enemiesKilled++;
      state.runStats.enemiesKilled++;
      log('Patrol caught you! -1 energy', '#ef4444');
      if (state.soulHarvest) { state.pills++; state.totalPillsCollected++; state.runStats.pillsCollected++; }
      if (state.mutPowerRefundChance > 0 && chance(state.mutPowerRefundChance)) { state.power += 1; log('Plague Carrier: +1 power refunded!', '#4ae04a'); }
      break;
    }

    case E.GATEKEEPER: {
      state.energy -= 2;
      ent.alive = false;
      state.enemiesKilled++;
      state.runStats.enemiesKilled++;
      log('Gatekeeper! -2 energy', '#ef4444');
      if (state.soulHarvest) { state.pills++; state.totalPillsCollected++; state.runStats.pillsCollected++; }
      if (state.mutPowerRefundChance > 0 && chance(state.mutPowerRefundChance)) { state.power += 1; log('Plague Carrier: +1 power refunded!', '#4ae04a'); }
      break;
    }

    case E.TOWN_GUARD: {
      state.energy -= 3;
      ent.alive = false;
      state.enemiesKilled++;
      state.runStats.enemiesKilled++;
      state.runStats.townGuardsKilled++;
      // Jackpot drop
      const jackpot = rng(3, 6);
      state.power += jackpot;
      log('Town Guard! -3 energy, but dropped ' + jackpot + ' power!', '#eab308');
      if (state.soulHarvest) { state.pills++; state.totalPillsCollected++; state.runStats.pillsCollected++; }
      break;
    }

    case E.NIGHT_WATCH: {
      // Can't kill — stun costs 1 power
      if (state.power >= 1) {
        state.power -= 1;
        state.stunned = 2;
        ent.alive = false; // They flee after stun
        log('Night Watch! Stunned for 2 turns, -1 power', '#3040a0');
      } else {
        state.energy -= 2;
        state.stunned = 2;
        log('Night Watch overpowers you! -2 energy, stunned!', '#ef4444');
      }
      break;
    }

    case E.VAULT_KEEPER: {
      // Drops power, tries to run
      if (!ent.fleeing) {
        const drop = rng(2, 5);
        state.power += drop;
        ent.fleeing = true;
        ent.alive = false;
        state.enemiesKilled++;
        state.runStats.enemiesKilled++;
        log('Caught the Vault Keeper! +' + drop + ' power!', '#eab308');
        if (state.soulHarvest) { state.pills++; state.totalPillsCollected++; state.runStats.pillsCollected++; }
      }
      break;
    }
  }

  checkGameOver();
}

function handleTileEffect(y, x) {
  const tile = state.town.grid[y][x];

  switch (tile) {
    case T.TRAP:
      state.energy -= 1;
      state.town.grid[y][x] = T.ROAD; // Revealed
      log('TRAP! -1 energy!', '#ef4444');
      checkGameOver();
      break;

    case T.HAND_CART:
      if (state.energy >= 1) {
        state.energy -= 1;
        const gain = 1 + state.cartBonus;
        state.power += gain;
        state.town.grid[y][x] = T.ROAD;
        log('Hand cart: -1 energy, +' + gain + ' power', '#a855f7');
      }
      break;

    case T.VIRUS:
      const dur = 5 + state.virusBonusTurns;
      state.virusFree = dur;
      state.town.grid[y][x] = T.ROAD;
      log('Virus pickup! Free plague power for ' + dur + ' actions!', '#40ff40');
      break;

    case T.PILL:
      state.pills++;
      state.totalPillsCollected++;
      state.runStats.pillsCollected++;
      state.town.grid[y][x] = T.ROAD;
      log('Plague pill collected!', '#38bdf8');
      // Pill Collector mutation: 20% chance for bonus pill
      if (state.mutPillDropBonus > 0 && chance(state.mutPillDropBonus)) {
        state.pills++;
        state.totalPillsCollected++;
        state.runStats.pillsCollected++;
        log('Pill Collector: Bonus pill!', '#38bdf8');
      }
      break;

    case T.HORSE_CART:
      advanceTown();
      break;
  }
}

function advanceTown() {
  state.townsCleared++;
  state.runStats.townsCompleted++;
  state.townNum++;
  state.townInfected = 0;
  // Starting wanted level increases in later towns (GDD: +1 at Town 6+, +2 at Town 11+)
  let startWanted = 0;
  if (state.townNum >= 11) startWanted = 2;
  else if (state.townNum >= 6) startWanted = 1;
  state.wantedLevel = startWanted;
  state.virusFree = 0;
  state.stunned = 0;
  // Reset free moves mutation per town
  state.mutFreeMovesLeft = state.mutFreeMoves;
  state.freeSpawnMove = 1;

  // Town completion bonus
  const energyGain = 15 + state.townBonusEnergy;
  state.energy = Math.min(state.energy + energyGain, state.maxEnergy + energyGain);
  state.maxEnergy = Math.max(state.maxEnergy, state.energy);
  state.power = 7 + state.bonusPower;

  log('Advancing to Town ' + state.townNum + '! +' + energyGain + ' energy', '#eab308');

  // Show upgrade panel
  showUpgradePanel();
}

function showUpgradePanel() {
  inputLocked = true;
  const panel = document.getElementById('upgrade-panel');
  const cardsDiv = document.getElementById('upgrade-cards');
  panel.classList.remove('hidden');

  // Roll 3 upgrades
  const offers = [];
  for (let i = 0; i < 3; i++) {
    const roll = Math.random();
    let rarity;
    if (roll < 0.3) rarity = 'common';
    else if (roll < 0.7) rarity = 'rare';
    else rarity = 'epic';

    const pool = UPGRADES[rarity];
    offers.push({ ...pick(pool), rarity });
  }

  cardsDiv.innerHTML = offers.map((u, i) => `
    <div class="upgrade-card ${u.rarity}" data-idx="${i}">
      <div class="upgrade-rarity">${u.rarity}</div>
      <div class="upgrade-name">${u.name}</div>
      <div class="upgrade-desc">${u.desc}</div>
    </div>
  `).join('');

  cardsDiv.querySelectorAll('.upgrade-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx);
      offers[idx].apply(state);
      log('Upgrade: ' + offers[idx].name + '!', offers[idx].rarity === 'epic' ? '#a855f7' : offers[idx].rarity === 'rare' ? '#3b82f6' : '#9ca3af');
      panel.classList.add('hidden');

      // Generate new town
      state.town = generateTown(state.townNum);
      // Place player
      let placed = false;
      for (let y = 1; y < GRID - 1 && !placed; y++)
        for (let x = 1; x < GRID - 1 && !placed; x++)
          if (state.town.grid[y][x] === T.ROAD || state.town.grid[y][x] === T.EMPTY) {
            state.px = x; state.py = y; placed = true;
          }

      // Reset animation state for new town
      animX = state.px;
      animY = state.py;
      camX = state.px + 0.5;
      camY = state.py + 0.5;
      animating = false;
      bumpAnim = null;
      entityAnims.clear();
      vfx = [];
      inputLocked = false;
    });
  });
}

function movePatrols() {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const ent of state.town.entities) {
    if (!ent.alive) continue;

    if (ent.type === E.PATROL) {
      // Move toward player if nearby, otherwise random
      let dx = 0, dy = 0;
      const d = dist(ent, { x: state.px, y: state.py });
      if (d <= 4) {
        dx = Math.sign(state.px - ent.x);
        dy = Math.sign(state.py - ent.y);
        // Prefer one axis
        if (Math.random() < 0.5) dx = 0; else dy = 0;
      } else {
        const dir = dirs[ent.dir];
        dy = dir[0]; dx = dir[1];
        if (chance(0.3)) ent.dir = rng(0, 3);
      }

      const nx = ent.x + dx, ny = ent.y + dy;
      if (nx > 0 && nx < GRID - 1 && ny > 0 && ny < GRID - 1) {
        const t = state.town.grid[ny][nx];
        if ((t === T.ROAD || t === T.EMPTY || t === T.TRAP || t === T.HAND_CART || t === T.VIRUS || t === T.PILL) && !entityAt(ny, nx)) {
          const ox = ent.x, oy = ent.y;
          ent.x = nx; ent.y = ny;
          entityAnims.set(ent, { fromX: ox, fromY: oy, toX: nx, toY: ny, startTime: Date.now() });
        }
      }

      // If patrol lands on player
      if (ent.x === state.px && ent.y === state.py) {
        handleEntityEncounter(ent);
      }
    }

    // Vault keeper flees
    if (ent.type === E.VAULT_KEEPER && !ent.fleeing) {
      const d = dist(ent, { x: state.px, y: state.py });
      if (d <= 3) {
        // Run away from player
        const dx = Math.sign(ent.x - state.px);
        const dy = Math.sign(ent.y - state.py);
        const ox = ent.x, oy = ent.y;
        const nx = ent.x + dx, ny = ent.y + dy;
        if (nx > 0 && nx < GRID - 1 && ny > 0 && ny < GRID - 1) {
          const t = state.town.grid[ny][nx];
          if ((t === T.ROAD || t === T.EMPTY) && !entityAt(ny, nx)) {
            ent.x = nx; ent.y = ny;
            entityAnims.set(ent, { fromX: ox, fromY: oy, toX: nx, toY: ny, startTime: Date.now() });
          }
        }
      }
    }

    // Night watch moves toward player
    if (ent.type === E.NIGHT_WATCH) {
      const d = dist(ent, { x: state.px, y: state.py });
      if (d <= 5) {
        let dx = Math.sign(state.px - ent.x);
        let dy = Math.sign(state.py - ent.y);
        if (Math.random() < 0.5) dx = 0; else dy = 0;
        const ox = ent.x, oy = ent.y;
        const nx = ent.x + dx, ny = ent.y + dy;
        if (nx > 0 && nx < GRID - 1 && ny > 0 && ny < GRID - 1) {
          const t = state.town.grid[ny][nx];
          if ((t === T.ROAD || t === T.EMPTY) && !entityAt(ny, nx)) {
            ent.x = nx; ent.y = ny;
            entityAnims.set(ent, { fromX: ox, fromY: oy, toX: nx, toY: ny, startTime: Date.now() });
          }
        }
        if (ent.x === state.px && ent.y === state.py) {
          handleEntityEncounter(ent);
        }
      }
    }
  }
}

function checkGameOver() {
  if (state.energy <= 0) {
    state.energy = 0;
    state.gameOver = true;
    state.running = false;
    showGameOver();
  }
}

function showGameOver() {
  // Mercy system: refund key if died within first 5 turns
  let mercyRefunded = false;
  if (state.turnCount <= 5) {
    keys++;
    savePersistent('keys', keys);
    mercyRefunded = true;
  }

  // Update lifetime infected total
  totalLifetimeInfected += state.totalInfected;
  savePersistent('totalInfected', totalLifetimeInfected);

  // Update quest progress
  updateQuestProgress(state);

  // Award XP
  const xpGained = awardXP(state);
  const score = getScore(state);
  const elapsed = Math.round((Date.now() - state.runStats.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  document.getElementById('dpad').classList.add('dpad-hidden');
  document.querySelector('.overlay-title').textContent = 'The Plague Fades...';
  document.querySelector('.overlay-subtitle').textContent = 'Your energy is spent. The plague knight falls.';

  let mercyHTML = '';
  if (mercyRefunded) {
    mercyHTML = '<div class="mercy-refund">Key refunded -- bad luck protection!</div>';
  }

  document.getElementById('overlay-stats').innerHTML = `
    ${mercyHTML}
    <div class="stats-grid">
      <div class="stat-row"><span class="stat-label">Towns cleared:</span> <span class="stat-val">${state.townsCleared}</span></div>
      <div class="stat-row"><span class="stat-label">Buildings infected:</span> <span class="stat-val">${state.runStats.buildingsInfected}</span></div>
      <div class="stat-row"><span class="stat-label">Infected points:</span> <span class="stat-val">${state.totalInfected}</span></div>
      <div class="stat-row"><span class="stat-label">Enemies defeated:</span> <span class="stat-val">${state.runStats.enemiesKilled}</span></div>
      <div class="stat-row"><span class="stat-label">Pills collected:</span> <span class="stat-val">${state.runStats.pillsCollected}</span></div>
      <div class="stat-row"><span class="stat-label">Total moves:</span> <span class="stat-val">${state.runStats.totalMoves}</span></div>
      <div class="stat-row"><span class="stat-label">Time:</span> <span class="stat-val">${minutes}m ${seconds}s</span></div>
    </div>
    <br>
    <span style="color:#4ae04a;font-size:22px">Final Score: ${score}</span>
    ${isFreeRun ? '<div style="color:#7a6a5a;font-size:14px;margin-top:4px">(Free Run)</div>' : ''}
    <div style="color:#7a6a5a;font-size:13px;margin-top:6px">Daily Streak: ${dailyStreak} runs | Keys: ${keys}</div>
  `;

  // XP display
  document.getElementById('overlay-xp').innerHTML = `
    <span style="color:#eab308">+${xpGained} XP earned</span> &mdash;
    <span style="color:#c8b894">Total XP: ${careerXP.toLocaleString()} / 42,000</span>
    <span style="color:#7a6a5a">(Run #${careerRuns})</span>
  `;

  // Show inline leaderboard
  document.getElementById('overlay-leaderboard').innerHTML = renderLeaderboardHTML();

  // Check high score — auto-use nickname if signed in, fallback to initials prompt
  const initialsDiv = document.getElementById('overlay-initials');
  if (isHighScore(score)) {
    if (isSignedIn() && getLeaderboardName()) {
      // Auto-submit with nickname
      addLeaderboardEntry(getLeaderboardName(), state);
      document.getElementById('overlay-leaderboard').innerHTML = renderLeaderboardHTML();
      initialsDiv.classList.add('hidden');
    } else {
      // Fallback: show initials prompt for unsigned users
      initialsDiv.classList.remove('hidden');
      const field = document.getElementById('initials-field');
      field.value = '';
      field.focus();
      const submitBtn = document.getElementById('initials-submit');
      const handler = () => {
        const raw = field.value.trim().replace(/<[^>]*>/g, '').replace(/[^a-zA-Z0-9 _\-!.]/g, '').slice(0, 16) || 'AAA';
        addLeaderboardEntry(raw, state);
        initialsDiv.classList.add('hidden');
        document.getElementById('overlay-leaderboard').innerHTML = renderLeaderboardHTML();
        submitBtn.removeEventListener('click', handler);
      };
      submitBtn.addEventListener('click', handler);
      field.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
    }
  } else {
    initialsDiv.classList.add('hidden');
  }

  document.getElementById('start-btn').textContent = 'Try Again';
  updateStartScreenEconomy();
}

function startPlayerAnim(fromX, fromY, toX, toY) {
  animating = true;
  inputLocked = true;
  animStartTime = Date.now();
  animFromX = fromX;
  animFromY = fromY;
  animToX = toX;
  animToY = toY;
}

function startBumpAnim(dx, dy) {
  bumpAnim = {
    fromX: state.px, fromY: state.py,
    toX: state.px + dx, toY: state.py + dy,
    startTime: Date.now(), duration: BUMP_DURATION
  };
}

function tryMove(dx, dy) {
  if (inputLocked || animating || state.gameOver || !state.running) return;

  // Stunned check
  if (state.stunned > 0) {
    state.stunned--;
    state.turnCount++;
    log('Stunned! ' + state.stunned + ' turns remaining...', '#ffff00');
    movePatrols();
    if (state.virusFree > 0) state.virusFree--;
    return;
  }

  const nx = state.px + dx, ny = state.py + dy;
  if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
    startBumpAnim(dx, dy);
    return;
  }

  const tile = state.town.grid[ny][nx];

  // Can't walk through walls or solid buildings
  if (tile === T.WALL) {
    startBumpAnim(dx, dy);
    return;
  }
  if ([T.BUILDING1, T.BUILDING2, T.BUILDING3, T.PUB, T.SHOP].includes(tile)) {
    // Try to infect from adjacent
    const building = getBuildingAt(ny, nx);
    if (building && !building.infected) {
      infectBuilding(building);
      // Green glow VFX on the building
      addVFX('infect', nx, ny, '#4ae04a', 400);
      state.turnCount++;
      movePatrols();
      if (state.virusFree > 0) state.virusFree--;
    } else if (building && building.infected) {
      log('Already infected.', '#7a6a5a');
    }
    startBumpAnim(dx, dy);
    return;
  }

  // Movement energy cost
  let moveCost = 1;
  if (state.freeSpawnMove > 0) { moveCost = 0; state.freeSpawnMove--; }
  else if (state.virusFree > 0) moveCost = 0;
  else if (state.mutFreeMovesLeft > 0) { moveCost = 0; state.mutFreeMovesLeft--; }
  else if (chance(state.freeMoveChance)) { moveCost = 0; log('Shadow step!', '#a855f7'); }
  else moveCost = Math.max(0, Math.round(1 * state.moveCostMod));

  if (state.energy < moveCost) {
    log('Not enough energy to move!', '#ef4444');
    checkGameOver();
    return;
  }

  const oldX = state.px, oldY = state.py;
  state.energy -= moveCost;
  state.px = nx;
  state.py = ny;
  state.turnCount++;
  state.runStats.totalMoves++;

  // Start smooth slide animation
  startPlayerAnim(oldX, oldY, nx, ny);

  // Check for entity on tile
  const ent = entityAt(ny, nx);
  if (ent) {
    handleEntityEncounter(ent);
    // Red flash VFX if took damage from enemy
    if (ent.type !== E.CIVILIAN && ent.type !== E.VAULT_KEEPER) {
      addVFX('damage', nx, ny, '#ff4040', 350);
    }
  }

  // Tile effects
  handleTileEffect(ny, nx);

  // Decrease virus free
  if (state.virusFree > 0) state.virusFree--;

  // Move patrols and night watch (with animation)
  movePatrols();

  checkGameOver();
}

// ============================================================
// Click handler
// ============================================================
canvas.addEventListener('click', (e) => {
  if (inputLocked || animating || !state || state.gameOver || !state.running) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  // Convert screen pixel to tile coords using camera
  const tx = Math.floor((mx - canvas.width / 2) / RENDER_TILE + camX);
  const ty = Math.floor((my - canvas.height / 2) / RENDER_TILE + camY);

  const dx = tx - state.px;
  const dy = ty - state.py;

  // Only allow adjacent moves
  if (Math.abs(dx) + Math.abs(dy) === 1) {
    tryMove(dx, dy);
  } else if (Math.abs(dx) + Math.abs(dy) === 0) {
    // Click self — wait a turn
    state.turnCount++;
    if (state.stunned > 0) state.stunned--;
    movePatrols();
    if (state.virusFree > 0) state.virusFree--;
  }
});

// ============================================================
// Keyboard handler
// ============================================================
document.addEventListener('keydown', (e) => {
  if ((inputLocked && !bumpAnim) || animating || !state || !state.running) return;

  switch (e.key) {
    case 'ArrowUp': case 'w': case 'W': tryMove(0, -1); e.preventDefault(); break;
    case 'ArrowDown': case 's': case 'S': tryMove(0, 1); e.preventDefault(); break;
    case 'ArrowLeft': case 'a': case 'A': tryMove(-1, 0); e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D': tryMove(1, 0); e.preventDefault(); break;
    case ' ': // Wait
      state.turnCount++;
      if (state.stunned > 0) state.stunned--;
      movePatrols();
      if (state.virusFree > 0) state.virusFree--;
      e.preventDefault();
      break;
  }
});

// ---- Mobile D-Pad ----
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if ((inputLocked && !bumpAnim) || animating || !state || !state.running) return;
    const dir = btn.dataset.dir;
    switch (dir) {
      case 'up': tryMove(0, -1); break;
      case 'down': tryMove(0, 1); break;
      case 'left': tryMove(-1, 0); break;
      case 'right': tryMove(1, 0); break;
      case 'wait':
        state.turnCount++;
        if (state.stunned > 0) state.stunned--;
        movePatrols();
        if (state.virusFree > 0) state.virusFree--;
        break;
    }
  });
  btn.addEventListener('click', (e) => {
    if ((inputLocked && !bumpAnim) || animating || !state || !state.running) return;
    const dir = btn.dataset.dir;
    switch (dir) {
      case 'up': tryMove(0, -1); break;
      case 'down': tryMove(0, 1); break;
      case 'left': tryMove(-1, 0); break;
      case 'right': tryMove(1, 0); break;
      case 'wait':
        state.turnCount++;
        if (state.stunned > 0) state.stunned--;
        movePatrols();
        if (state.virusFree > 0) state.virusFree--;
        break;
    }
  });
});

// ---- Swipe support ----
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});
canvas.addEventListener('touchend', (e) => {
  if (!state || !state.running || animating) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (absDx < 30 && absDy < 30) return; // too short, treat as tap
  if (absDx > absDy) {
    tryMove(dx > 0 ? 1 : -1, 0);
  } else {
    tryMove(0, dy > 0 ? 1 : -1);
  }
});

// ============================================================
// Start / Restart
// ============================================================
document.getElementById('start-btn').addEventListener('click', () => {
  const startBtnEl = document.getElementById('start-btn');
  // Check keys
  if (keys <= 0 && !hasDailyFreeKey()) return; // no keys, button should be disabled

  // Determine if this is a free run (daily key)
  if (keys <= 0 && hasDailyFreeKey()) {
    claimDailyFreeKey();
    keys--; // consume the key we just gave
    isFreeRun = true;
  } else {
    keys--;
    isFreeRun = false;
  }
  savePersistent('keys', keys);

  // Track daily first paid run bonus
  let firstPaidBonus = false;
  if (!isFreeRun && isFirstPaidRunToday()) {
    firstPaidBonus = true;
    lastPaidRunDate = todayStr();
    savePersistent('lastPaidRunDate', lastPaidRunDate);
  }

  // Update streak
  updateStreak();

  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('overlay-initials').classList.add('hidden');
  document.getElementById('overlay-xp').innerHTML = '';
  document.getElementById('overlay-leaderboard').innerHTML = '';
  document.getElementById('dpad').classList.remove('dpad-hidden');
  state = initState();
  state.running = true;

  // Streak bonus: 4th+ run in a day gets +5 energy
  if (dailyStreak >= 4) {
    state.energy += 5;
    state.maxEnergy += 5;
  }

  // Daily first paid run bonus: +5 max energy
  if (firstPaidBonus) {
    state.energy += 5;
    state.maxEnergy += 5;
  }

  // Initialize animation and camera to player start
  animX = state.px;
  animY = state.py;
  camX = state.px + 0.5;
  camY = state.py + 0.5;
  animating = false;
  bumpAnim = null;
  entityAnims.clear();
  vfx = [];
  logLines = [];
  log('You arrive at Town 1. Spread the plague...', '#4ae04a');
  if (firstPaidBonus) log('First run bonus: +5 energy!', '#eab308');
  if (dailyStreak >= 4) log('Streak bonus: +5 energy!', '#eab308');
  if (isFreeRun) log('Free daily run! XP and mutations earned, marked on leaderboard.', '#7a6a5a');

  // Update start screen elements for next time
  updateStartScreenEconomy();
});

// ============================================================
// Economy UI: Start Screen Updates
// ============================================================
function updateStartScreenEconomy() {
  const keyCountEl = document.getElementById('economy-keys');
  const dailyKeyEl = document.getElementById('economy-daily-key');
  const streakEl = document.getElementById('economy-streak');
  const startBtnEl = document.getElementById('start-btn');
  const convertBtn = document.getElementById('convert-pts-btn');
  const convertInfo = document.getElementById('convert-info');

  if (keyCountEl) keyCountEl.textContent = 'Keys: ' + keys;
  if (dailyKeyEl) {
    if (hasDailyFreeKey()) {
      dailyKeyEl.textContent = 'Free Daily Key Available!';
      dailyKeyEl.style.display = '';
    } else {
      dailyKeyEl.style.display = 'none';
    }
  }
  if (streakEl) {
    const today = todayStr();
    const streakCount = (lastRunDate === today) ? dailyStreak : 0;
    streakEl.textContent = 'Daily Streak: ' + streakCount + ' runs';
    streakEl.style.display = streakCount > 0 ? '' : 'none';
  }

  // Start button state
  if (keys <= 0 && !hasDailyFreeKey()) {
    startBtnEl.textContent = 'No Keys';
    startBtnEl.classList.add('overlay-btn-disabled');
  } else {
    if (keys <= 0 && hasDailyFreeKey()) {
      startBtnEl.textContent = 'Begin Infection (Free Key)';
    } else {
      startBtnEl.textContent = state && state.gameOver ? 'Try Again' : 'Begin Infection';
    }
    startBtnEl.classList.remove('overlay-btn-disabled');
  }

  // Convert button
  if (convertBtn && convertInfo) {
    convertInfo.textContent = totalLifetimeInfected + ' / 500 pts';
    if (totalLifetimeInfected >= 500) {
      convertBtn.classList.remove('overlay-btn-disabled');
    } else {
      convertBtn.classList.add('overlay-btn-disabled');
    }
  }
}

// ============================================================
// Quest Modal
// ============================================================
function openQuestModal() {
  const modal = document.getElementById('quest-modal');
  modal.classList.remove('hidden');
  renderQuests();
}
function closeQuestModal() {
  document.getElementById('quest-modal').classList.add('hidden');
}
function renderQuests() {
  const container = document.getElementById('quest-list');
  let html = '';
  for (const q of QUESTS) {
    const progress = Math.min(questProgress[q.stat], q.target);
    const pct = Math.round((progress / q.target) * 100);
    const claimed = questProgress.claimed.includes(q.id);
    const canClaim = !claimed && progress >= q.target;
    html += `<div class="quest-item ${claimed ? 'quest-claimed' : ''}">
      <div class="quest-label">${q.label}</div>
      <div class="quest-bar-bg"><div class="quest-bar-fill" style="width:${pct}%"></div></div>
      <div class="quest-progress">${progress} / ${q.target}</div>
      <div class="quest-reward">${claimed ? 'Claimed' : '+' + q.reward + ' key' + (q.reward > 1 ? 's' : '')}</div>
      ${canClaim ? `<button class="quest-claim-btn" data-quest="${q.id}">Claim</button>` : ''}
    </div>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('.quest-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (claimQuest(btn.dataset.quest)) {
        renderQuests();
        updateStartScreenEconomy();
      }
    });
  });
}

// Convert infected points to keys
function convertPointsToKey() {
  if (totalLifetimeInfected < 500) return;
  totalLifetimeInfected -= 500;
  keys++;
  savePersistent('totalInfected', totalLifetimeInfected);
  savePersistent('keys', keys);
  updateStartScreenEconomy();
}

// Show leaderboard and XP on initial start screen
(function initStartScreen() {
  if (leaderboard.length > 0) {
    document.getElementById('overlay-leaderboard').innerHTML = renderLeaderboardHTML();
  }
  document.getElementById('overlay-xp').innerHTML = careerXP > 0
    ? `<span style="color:#c8b894">Total XP: ${careerXP.toLocaleString()} / 42,000</span> <span style="color:#7a6a5a">(${careerRuns} runs)</span>`
    : '';
  updateStartScreenEconomy();
  updatePlayerInfoBar();
  updateHUDNickname();
})();

// ============================================================
// Minimap
// ============================================================
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const MINIMAP_DOT = 4; // px per tile
minimapCanvas.width = GRID * MINIMAP_DOT;
minimapCanvas.height = GRID * MINIMAP_DOT;

function drawMinimap() {
  if (!state) return;
  const mctx = minimapCtx;
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  const vision = state.vision;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const d = dist({ x: state.px, y: state.py }, { x, y });
      if (d > vision) continue; // unexplored stays black
      const tile = state.town.grid[y][x];
      let color = '#222'; // default dark
      if (tile === T.ROAD || tile === T.TRAP) color = '#555';
      else if (tile === T.WALL) color = '#333';
      else if ([T.BUILDING1, T.BUILDING2, T.BUILDING3, T.PUB, T.DOOR].includes(tile)) color = '#6a4a2a';
      else if (tile === T.SHOP) color = '#2a5a2a';
      else if (tile === T.HORSE_CART) color = '#aa8a20';
      else if (tile === T.HAND_CART) color = '#aa8a20';
      else if (tile === T.VIRUS) color = '#30a830';
      else if (tile === T.PILL) color = '#2060c0';
      else if (tile === T.EMPTY) color = '#1a1a1a';
      mctx.fillStyle = color;
      mctx.fillRect(x * MINIMAP_DOT, y * MINIMAP_DOT, MINIMAP_DOT, MINIMAP_DOT);
    }
  }
  // Player dot
  mctx.fillStyle = '#4ae04a';
  mctx.fillRect(state.px * MINIMAP_DOT, state.py * MINIMAP_DOT, MINIMAP_DOT, MINIMAP_DOT);
}

// ============================================================
// Tile Tooltip
// ============================================================
const tooltipEl = document.getElementById('tile-tooltip');

function getTileTooltip(y, x) {
  if (x < 0 || x >= GRID || y < 0 || y >= GRID) return null;
  const d = dist({ x: state.px, y: state.py }, { x, y });
  if (d > state.vision) return null;
  const tile = state.town.grid[y][x];
  switch (tile) {
    case T.BUILDING1: return 'Small House \u2014 2 power, 33% watchman';
    case T.BUILDING2: return 'Large House \u2014 3 power, 66% watchman';
    case T.BUILDING3: return 'Manor \u2014 4 power, 100% watchman';
    case T.PUB: return 'Pub \u2014 5 power, spawns gatekeeper';
    case T.SHOP: return 'Shop \u2014 2 power, gives 3 power';
    case T.DOOR: {
      const b = getBuildingAt(y, x);
      if (b && b.infected) return 'Door (infected)';
      return 'Door \u2014 enter to infect';
    }
    case T.ROAD: return 'Road \u2014 1 energy to move';
    case T.HAND_CART: return 'Hand Cart \u2014 1 energy, gives power';
    case T.HORSE_CART: return 'Horse Cart \u2014 next town!';
    case T.VIRUS: return 'Virus \u2014 free plague actions';
    case T.PILL: return 'Plague Pill \u2014 collect it';
    case T.WALL: return 'Wall \u2014 impassable';
    case T.TRAP: return 'Road \u2014 1 energy to move'; // hidden trap looks like road
    default: return null;
  }
}

canvas.addEventListener('mousemove', (e) => {
  if (!state || !state.running) { tooltipEl.style.display = 'none'; return; }
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const tx = Math.floor((mx - canvas.width / 2) / RENDER_TILE + camX);
  const ty = Math.floor((my - canvas.height / 2) / RENDER_TILE + camY);
  const tip = getTileTooltip(ty, tx);

  // Check for entities too
  let entTip = null;
  if (tip) {
    const ent = state.town.entities.find(en => en.alive && en.x === tx && en.y === ty);
    if (ent && dist({ x: state.px, y: state.py }, ent) <= state.vision) {
      const names = { civilian: 'Civilian', watchman: 'Watchman', patrol: 'Patrol',
        gatekeeper: 'Gatekeeper', town_guard: 'Town Guard', night_watch: 'Night Watch', vault_keeper: 'Vault Keeper' };
      entTip = names[ent.type] || ent.type;
    }
  }

  if (tip) {
    tooltipEl.textContent = entTip ? entTip + ' | ' + tip : tip;
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = (e.clientX + 12) + 'px';
    tooltipEl.style.top = (e.clientY + 12) + 'px';
  } else {
    tooltipEl.style.display = 'none';
  }
});

canvas.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });

// ============================================================
// Floating Damage/Gain Numbers
// ============================================================
const floatContainer = document.getElementById('floating-numbers');

function showFloatingNumber(text, color) {
  if (!state) return;
  // Position above the player on screen
  const s = toScreen(animX, animY);
  const rect = canvas.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-num';
  el.textContent = text;
  el.style.color = color;
  el.style.left = (rect.left + s.x + RENDER_TILE / 2 - 15) + 'px';
  el.style.top = (rect.top + s.y - 10) + 'px';
  floatContainer.appendChild(el);
  setTimeout(() => el.remove(), 1050);
}

// ============================================================
// Screen Shake
// ============================================================
function screenShake() {
  canvas.classList.add('shake');
  setTimeout(() => canvas.classList.remove('shake'), 200);
}

// ============================================================
// Plague Particles (ambient)
// ============================================================
let plagueParticles = [];
const MAX_PARTICLES = 15;

function spawnPlagueParticle() {
  if (!state || !state.running) return;
  if (plagueParticles.length >= MAX_PARTICLES) return;
  // Spawn on a random revealed tile
  const rx = state.px + rng(-state.vision, state.vision);
  const ry = state.py + rng(-state.vision, state.vision);
  if (rx < 0 || rx >= GRID || ry < 0 || ry >= GRID) return;
  if (dist({ x: state.px, y: state.py }, { x: rx, y: ry }) > state.vision) return;
  plagueParticles.push({
    x: rx + Math.random(), y: ry + Math.random(),
    vx: (Math.random() - 0.5) * 0.01,
    vy: -0.005 - Math.random() * 0.01,
    life: 1.0,
    decay: 0.003 + Math.random() * 0.005,
    size: 1.5 + Math.random() * 2
  });
}

function updateAndDrawParticles() {
  if (Math.random() < 0.08) spawnPlagueParticle();
  for (let i = plagueParticles.length - 1; i >= 0; i--) {
    const p = plagueParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) { plagueParticles.splice(i, 1); continue; }
    const s = toScreen(p.x, p.y);
    if (s.x < 0 || s.x > canvas.width || s.y < 0 || s.y > canvas.height) { plagueParticles.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(74, 224, 74, ${p.life * 0.25})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// Infection Green Flash (building turns green briefly)
// ============================================================
let infectionFlashes = []; // { x, y, startTime }

function addInfectionFlash(x, y) {
  infectionFlashes.push({ x, y, startTime: Date.now() });
}

function drawInfectionFlashes() {
  const now = Date.now();
  for (let i = infectionFlashes.length - 1; i >= 0; i--) {
    const f = infectionFlashes[i];
    const t = (now - f.startTime) / 500; // 0.5s duration
    if (t >= 1) { infectionFlashes.splice(i, 1); continue; }
    const s = toScreen(f.x, f.y);
    const sz = RENDER_TILE;
    const alpha = 0.4 * (1 - t);
    ctx.fillStyle = `rgba(74, 224, 74, ${alpha})`;
    ctx.fillRect(s.x, s.y, sz, sz);
  }
}

// ============================================================
// Tutorial Overlay (first play only)
// ============================================================
const tutorialOverlay = document.getElementById('tutorial-overlay');
let tutorialShown = loadPersistent('tutorialShown', false);

function showTutorial() {
  if (tutorialShown) return;
  tutorialOverlay.classList.remove('hidden');
}

function dismissTutorial() {
  tutorialOverlay.classList.add('hidden');
  tutorialShown = true;
  savePersistent('tutorialShown', true);
}

tutorialOverlay.addEventListener('click', dismissTutorial);

// ============================================================
// Best Run Tracking
// ============================================================
let bestScore = loadPersistent('bestScore', 0);

// ============================================================
// Hook floating numbers + screen shake + infection flash
// into existing game functions by wrapping them
// ============================================================
const _origInfectBuilding = infectBuilding;
infectBuilding = function(building) {
  const oldInf = state.totalInfected;
  const oldPower = state.power;
  const oldEnergy = state.energy;
  _origInfectBuilding(building);
  // Show floating numbers for changes
  const infGain = state.totalInfected - oldInf;
  const powerChange = state.power - oldPower;
  const energyChange = state.energy - oldEnergy;
  if (infGain > 0) showFloatingNumber('+' + infGain + ' inf', '#4ae04a');
  if (powerChange > 0) showFloatingNumber('+' + powerChange + ' power', '#a855f7');
  if (powerChange < 0) showFloatingNumber(powerChange + ' power', '#a855f7');
  // Green flash on building tiles
  if (building.infected) {
    for (let dy = 0; dy < building.h; dy++)
      for (let dx = 0; dx < building.w; dx++)
        addInfectionFlash(building.x + dx, building.y + dy);
  }
};

const _origHandleTileEffect = handleTileEffect;
handleTileEffect = function(y, x) {
  const oldEnergy = state.energy;
  const oldPower = state.power;
  const oldPills = state.pills;
  _origHandleTileEffect(y, x);
  const eDiff = state.energy - oldEnergy;
  const pDiff = state.power - oldPower;
  const pillDiff = state.pills - oldPills;
  if (eDiff < 0) { showFloatingNumber(eDiff + ' energy', '#ef4444'); screenShake(); }
  if (eDiff > 0) showFloatingNumber('+' + eDiff + ' energy', '#4ae04a');
  if (pDiff > 0) showFloatingNumber('+' + pDiff + ' power', '#a855f7');
  if (pDiff < 0) showFloatingNumber(pDiff + ' power', '#ef4444');
  if (pillDiff > 0) showFloatingNumber('+' + pillDiff + ' pill', '#38bdf8');
};

const _origHandleEntityEncounter = handleEntityEncounter;
handleEntityEncounter = function(ent) {
  const oldEnergy = state.energy;
  const oldPower = state.power;
  _origHandleEntityEncounter(ent);
  const eDiff = state.energy - oldEnergy;
  const pDiff = state.power - oldPower;
  if (eDiff < 0) { showFloatingNumber(eDiff + ' energy', '#ef4444'); screenShake(); }
  if (pDiff > 0) showFloatingNumber('+' + pDiff + ' power', '#eab308');
  if (pDiff < 0) showFloatingNumber(pDiff + ' power', '#ef4444');
};

// ============================================================
// Patch showGameOver for Best Run indicator
// ============================================================
const _origShowGameOver = showGameOver;
showGameOver = function() {
  _origShowGameOver();
  const score = getScore(state);
  const isBest = score > bestScore;
  if (isBest) {
    bestScore = score;
    savePersistent('bestScore', bestScore);
  }
  // Insert best run badge
  const statsEl = document.getElementById('overlay-stats');
  if (isBest && score > 0) {
    statsEl.innerHTML += '<div class="best-run-badge">NEW BEST RUN!</div>';
  } else if (bestScore > 0) {
    statsEl.innerHTML += `<div style="color:#7a6a5a;font-size:14px;margin-top:6px">Best run: ${bestScore} pts</div>`;
  }
};

// ============================================================
// Override render to include minimap, particles, and flashes
// ============================================================
render = function() {
  if (!state) return;

  updateAnimations();
  updateCamera();

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(40, 30, 20, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID; i++) {
    const sx = toScreen(i, 0);
    const sy = toScreen(0, i);
    ctx.beginPath(); ctx.moveTo(sx.x, 0); ctx.lineTo(sx.x, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, sy.y); ctx.lineTo(canvas.width, sy.y); ctx.stroke();
  }

  // Tiles
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      drawTileAt(x, y, state.town.grid[y][x], isInfectedTile(y, x));

  // Infection flashes (before entities/player, after tiles)
  drawInfectionFlashes();

  // Entities
  for (const ent of state.town.entities)
    if (ent.alive && dist({ x: state.px, y: state.py }, ent) <= state.vision)
      drawEntity(ent);

  // Player
  drawPlayer();

  // Particles (subtle, on revealed tiles)
  updateAndDrawParticles();

  // VFX overlays
  drawVFX();

  // Fog
  drawFog();

  updateHUD();
  drawMinimap();
};

// ============================================================
// Patch start button to show tutorial and reset free spawn move
// ============================================================
const startBtn = document.getElementById('start-btn');
const _origStartListeners = startBtn.onclick; // won't work for addEventListener

// We need to add tutorial show after game starts. Wrap via a new listener.
startBtn.addEventListener('click', () => {
  // Show tutorial on first play (runs after the existing click handler)
  setTimeout(() => {
    if (state && state.running) showTutorial();
  }, 50);
});

// ============================================================
// Wire up economy buttons
// ============================================================
document.getElementById('quests-btn').addEventListener('click', openQuestModal);
document.getElementById('quest-close').addEventListener('click', closeQuestModal);
document.getElementById('convert-pts-btn').addEventListener('click', convertPointsToKey);

// ============================================================
// Animation loop (for glowing effects)
// ============================================================
function gameLoop() {
  if (state && state.running) {
    render();
  }
  requestAnimationFrame(gameLoop);
}
gameLoop();
