// Cyber Danmaku - Core Game Engine Setup & Globals

// Canvas and Context setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const BASE_WIDTH = 600;
const BASE_HEIGHT = 800;
canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

// State machine
const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  BOSS_WARNING: 'boss_warning',
  BOSS_BATTLE: 'boss_battle',
  STAGE_CLEAR: 'stage_clear',
  GAMEOVER: 'gameover',
  VICTORY: 'victory',
  PAUSED: 'paused'
};

let gameState = STATES.MENU;
let currentPlayMode = 'story';    // 'story' | 'multiplayer' | 'shop'
let currentStage = '1-1';         // '1-1' to '2-5'
let currentWorld = 1;             // 1: earth, 2: moon
let currentDifficulty = 'normal'; // 'normal', 'hard', 'endless'
let currentGameMode = 'waves';    // 'waves', 'boss' (Boss Rush)
let score = 0;
let grazeCount = 0;
let currentWave = 1;
let loopCount = 1; // Used in Endless mode
let scoreAttackType = 'endless'; // 'endless' | 'boss_rush'
let bossRushIndex = 1;           // 1 to 3
let bossRushTransitionTimer = 0;

// Multiplayer global states
let isMultiplayer = false;
let isHost = false;
let socket = null;
let myPlayerIndex = 1;
let otherPlayers = {};
let roomCode = '';
let lobbyPlayers = [1];
const PLAYER_COLORS = {
  1: '#00ffff', // Blue/Cyan
  2: '#ff0055', // Red
  3: '#ffb700', // Yellow
  4: '#39ff14'  // Green
};
let nextEnemyId = 0;
let nextItemId = 0;
let gameFrame = 0;

// Canvas bounds caching variables for latency reduction (eliminates getBoundingClientRect layout thrashing)
let canvasRect = null;
let scaleX = 1;
let scaleY = 1;
let targetMouseX = BASE_WIDTH / 2;
let targetMouseY = BASE_HEIGHT - 100;

function updateCanvasBounds() {
  if (!canvas) return;
  canvasRect = canvas.getBoundingClientRect();
  scaleX = BASE_WIDTH / (canvasRect.width || 1);
  scaleY = BASE_HEIGHT / (canvasRect.height || 1);
}

// Update bounds on window event hooks
window.addEventListener('resize', updateCanvasBounds);
window.addEventListener('scroll', updateCanvasBounds);

// Screenshake state
let shakeTime = 0;
let shakeIntensity = 0;

// Keys state
const keys = {};

// Entities pools
let player = null;
let playerBullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let items = [];
let boss = null;
let playerDrones = []; // Allied options/drones pool

// Background space/celestial rendering state variables
let stars = [];
let planetX = BASE_WIDTH * 0.75;
let planetY = 220;
let planetAngle = 0;

// Wave Manager state
let waveTimer = 0;
let waveEnemiesSpawned = 0;
let waveFinishedSpawning = false;
let waveTransitionTimer = 0;
let warningTimer = 0;

// Audio toggles state
let sfxActive = true;
let bgmActive = false;

// Gold and Purchased Ships State
let gold = parseInt(localStorage.getItem('danmaku_gold')) || 0;
let purchasedShips = ['default'];
try {
  const saved = localStorage.getItem('danmaku_purchased_ships');
  if (saved) {
    purchasedShips = JSON.parse(saved);
    if (!Array.isArray(purchasedShips)) purchasedShips = ['default'];
    if (!purchasedShips.includes('default')) purchasedShips.push('default');
  }
} catch (e) {
  purchasedShips = ['default'];
}

// Ships database config
const SHIPS = {
  default: { id: 'default', name: 'NEON FIGHTER', cost: 0, desc: '正面＋角度付きの直線ネオン弾を放つ初期機体。' },
  homing: { id: 'homing', name: 'HOMING STRIKER', cost: 5000, desc: '敵を自動で追従するプラズマ弾を発射する。' },
  split: { id: 'split', name: 'STARDUST SPLITTER', cost: 8000, desc: '正面に巨大なエネルギー球を射出し、敵に当たると爆発。' },
  drone: { id: 'drone', name: 'DRONE COMMANDER', cost: 12000, desc: 'ミニドローンを召喚し、数秒間敵を自動攻撃。' }
};

// Background space and planet drawing functions
function initStars() {
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * BASE_WIDTH,
      y: Math.random() * BASE_HEIGHT,
      speed: Math.random() * 1.5 + 0.5,
      size: Math.random() * 2 + 0.5,
      color: `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.3})`
    });
  }
}

function updateStars() {
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > BASE_HEIGHT) {
      s.y = -10;
      s.x = Math.random() * BASE_WIDTH;
    }
  });
}

function drawSpaceBackground() {
  // Deep space dark blue gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  bgGrad.addColorStop(0, '#000008');
  bgGrad.addColorStop(1, '#000214');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  // Draw scrolling stars
  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.fill();
  });

  // Draw Planet based on current world in story mode or default
  if (currentPlayMode === 'story') {
    if (currentStage.startsWith('3-')) {
      drawSunBackground();
    } else if (currentStage.startsWith('2-')) {
      drawMoonBackground();
    } else {
      drawEarthBackground();
    }
  } else if (currentPlayMode === 'score_attack' && scoreAttackType === 'boss_rush') {
    if (bossRushIndex === 3) {
      drawSunBackground();
    } else if (bossRushIndex === 2) {
      drawMoonBackground();
    } else {
      drawEarthBackground();
    }
  } else {
    drawEarthBackground();
  }
}

function drawEarthBackground() {
  ctx.save();
  // Outer glowing atmosphere halo
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 162, 255, 0.25)';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 162, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Planet clipping path
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.clip();

  // Ocean base
  ctx.fillStyle = '#003ba3';
  ctx.fillRect(planetX - 155, planetY - 155, 310, 310);

  // Landmasses (drifting with planetAngle for slow self-rotation)
  ctx.fillStyle = '#1e7520';
  
  // Landmass 1 (Eurasia-like)
  ctx.beginPath();
  ctx.arc(planetX - 50 + Math.sin(planetAngle) * 50, planetY - 40, 75, 0, Math.PI * 2);
  ctx.fill();

  // Landmass 2 (Americas-like)
  ctx.beginPath();
  ctx.arc(planetX + 60 + Math.sin(planetAngle) * 50, planetY + 50, 85, 0, Math.PI * 2);
  ctx.fill();

  // Landmass 3 (Australia/Islands-like)
  ctx.beginPath();
  ctx.arc(planetX - 40 + Math.sin(planetAngle + 2) * 50, planetY + 90, 45, 0, Math.PI * 2);
  ctx.fill();

  // Clouds layer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(planetX - 10 + Math.sin(planetAngle * 1.5) * 60, planetY - 60, 55, 0, Math.PI * 2);
  ctx.arc(planetX + 50 + Math.sin(planetAngle * 1.5) * 60, planetY - 10, 45, 0, Math.PI * 2);
  ctx.arc(planetX - 60 + Math.sin(planetAngle * 1.5 + 1.5) * 60, planetY + 40, 40, 0, Math.PI * 2);
  ctx.fill();

  // Shadow overlay (Sunlight coming from top-left)
  const shadowGrad = ctx.createRadialGradient(planetX - 60, planetY - 60, 10, planetX, planetY, 150);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shadowGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.65)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMoonBackground() {
  ctx.save();
  // Faint outer white halo
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Moon clipping path
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.clip();

  // Moon surface base
  ctx.fillStyle = '#6d6d72';
  ctx.fillRect(planetX - 155, planetY - 155, 310, 310);

  // Craters (drifting slowly with planetAngle)
  const driftX = Math.sin(planetAngle * 0.5) * 15;
  const driftY = Math.cos(planetAngle * 0.5) * 5;

  ctx.fillStyle = '#49494c';
  ctx.strokeStyle = '#8c8c93';
  ctx.lineWidth = 1.5;

  // Crater 1
  ctx.beginPath();
  ctx.arc(planetX - 45 + driftX, planetY - 60 + driftY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crater 2
  ctx.beginPath();
  ctx.arc(planetX + 55 + driftX, planetY + 25 + driftY, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crater 3
  ctx.beginPath();
  ctx.arc(planetX - 20 + driftX, planetY + 70 + driftY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crater 4
  ctx.beginPath();
  ctx.arc(planetX + 15 + driftX, planetY - 15 + driftY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Shadow overlay (Sunlight from top-left)
  const shadowGrad = ctx.createRadialGradient(planetX - 60, planetY - 60, 10, planetX, planetY, 150);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shadowGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.65)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSunBackground() {
  ctx.save();
  // Outer glowing aura of the sun
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 68, 0, 0.25)';
  ctx.lineWidth = 15;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 150, 0, 0.5)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Sun clipping path
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.clip();

  // Red/Orange boiling core base
  ctx.fillStyle = '#cc2400';
  ctx.fillRect(planetX - 155, planetY - 155, 310, 310);

  // Rotating solar flares / prominence bubbles
  ctx.fillStyle = '#ff7700';
  for (let i = 0; i < 6; i++) {
    const angle = planetAngle + (Math.PI / 3) * i;
    const pulse = 8 * Math.sin(planetAngle * 6 + i);
    ctx.beginPath();
    ctx.arc(
      planetX + Math.cos(angle) * (65 + pulse),
      planetY + Math.sin(angle) * (65 + pulse),
      65,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Hot yellow inner core
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(planetX - 15, planetY - 15, 65, 0, Math.PI * 2);
  ctx.fill();

  // Solar shadow and light gradients
  const shadowGrad = ctx.createRadialGradient(planetX - 45, planetY - 45, 10, planetX, planetY, 150);
  shadowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(planetX, planetY, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
