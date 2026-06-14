// Cyber Danmaku - Multiplayer Synchronization Component

let isLobbyLocked = false;
let lobbyGameMode = 'story';
let deadPlayerCountdown = {};
let spawnedResurrectShards = {};

// Telemetry Ping variables
let pingIntervalId = null;
let lastPingSentTime = 0;

function startPingTimer() {
  if (pingIntervalId) clearInterval(pingIntervalId);
  
  pingIntervalId = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      lastPingSentTime = performance.now();
      socket.send(JSON.stringify({
        type: 'ping'
      }));
    }
  }, 2000);
}

function stopPingTimer() {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  const pingEl = document.getElementById('telemetryPing');
  if (pingEl) pingEl.textContent = '-- ms';
}

function connectWebSocket(onConnectCallback) {
  if (socket) {
    socket.close();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket connected to', wsUrl);
    if (onConnectCallback) onConnectCallback();
    startPingTimer();
  };

  socket.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
      return;
    }
    handleServerMessage(data);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateMultiplayerStatus('接続エラーが発生しました。');
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
    stopPingTimer();
    if (isMultiplayer && gameState !== STATES.MENU) {
      alert('サーバーとの接続が切断されました。');
      returnToMenu();
    }
  };
}

function handleServerMessage(data) {
  switch (data.type) {
    case 'roomCreated':
      isMultiplayer = true;
      isHost = true;
      roomCode = data.roomCode;
      myPlayerIndex = 1;
      lobbyPlayers = [1];
      isLobbyLocked = false;
      lobbyGameMode = 'story';
      updateMultiplayerStatus(`ルームコード: ${roomCode} (待機中)`);
      renderLobbyMembers(lobbyPlayers);
      showLobbyActiveUI(true);
      break;

    case 'roomJoined':
      isMultiplayer = true;
      isHost = false;
      roomCode = data.roomCode;
      myPlayerIndex = data.playerIndex;
      lobbyPlayers = data.players;
      isLobbyLocked = data.locked || false;
      lobbyGameMode = data.gameMode || 'story';
      updateMultiplayerStatus(isLobbyLocked ? `ルームコード: ${roomCode} (ロック中)` : `ルームコード: ${roomCode} (待機中)`);
      renderLobbyMembers(lobbyPlayers);
      showLobbyActiveUI(false);
      break;

    case 'playerJoined':
      if (!lobbyPlayers.includes(data.playerIndex)) {
        lobbyPlayers.push(data.playerIndex);
      }
      renderLobbyMembers(lobbyPlayers);
      Sound.playClick();
      break;

    case 'playerLeft':
      lobbyPlayers = lobbyPlayers.filter(p => p !== data.playerIndex);
      renderLobbyMembers(lobbyPlayers);
      if (otherPlayers[data.playerIndex]) {
        delete otherPlayers[data.playerIndex];
      }
      break;

    case 'hostDisconnected':
      alert(data.message || 'ホストが切断されました。');
      returnToMenu();
      break;

    case 'lobbyLockStatus':
      isLobbyLocked = data.locked;
      updateLobbyLockUI();
      updateMultiplayerStatus(isLobbyLocked ? `ルームコード: ${roomCode} (ロック中)` : `ルームコード: ${roomCode} (待機中)`);
      break;

    case 'lobbyConfigSync':
      lobbyGameMode = data.gameMode;
      updateLobbyModeUI();
      break;

    case 'error':
      updateMultiplayerStatus(data.message);
      if (socket) {
        socket.close();
        socket = null;
      }
      break;

    case 'startGame':
      startMultiplayerMatch(data.gameMode);
      break;

    case 'sync': {
      const pIdx = data.senderIndex;
      if (pIdx) {
        if (!otherPlayers[pIdx]) {
          otherPlayers[pIdx] = { active: true };
        }
        otherPlayers[pIdx].x = data.x;
        otherPlayers[pIdx].y = data.y;
        otherPlayers[pIdx].selectedShip = data.selectedShip;
        otherPlayers[pIdx].powerLevel = data.powerLevel;
        otherPlayers[pIdx].shieldTimer = data.shieldTimer;
        otherPlayers[pIdx].invincible = data.invincible;
        otherPlayers[pIdx].lives = data.lives;
      }
      break;
    }

    case 'shoot':
      spawnFriendlyBullet(data.x, data.y, data.vx, data.vy, data.bulletType, data.color, data.powerLevel, true);
      break;

    case 'spawnDrone': {
      const count = data.powerLevel || 1;
      for (let i = 0; i < count; i++) {
        const offsetX = (i - (count - 1) / 2) * 25;
        const d = new SummonedDrone(data.x + offsetX, data.y, data.powerLevel, data.senderIndex);
        playerDrones.push(d);
      }
      break;
    }

    case 'bomb':
      triggerRemoteBomb(data.x, data.y, data.senderIndex);
      break;

    case 'spawnEnemy':
      spawnEnemyOnClient(data.enemyId, data.enemyType, data.x, data.y);
      break;

    case 'enemyDamage':
      applyDamageToEnemy(data.enemyId, data.damage);
      break;

    case 'bossDamage':
      if (boss && !boss.dead && gameState === STATES.BOSS_BATTLE) {
        boss.hp -= data.damage;
        if (boss.hp <= 0) {
          boss.phaseCleared();
        }
      }
      break;

    case 'spawnItem':
      spawnItemOnClient(data.itemId, data.itemType, data.color, data.x, data.y);
      break;

    case 'itemCollect':
      collectItemOnClient(data.itemId);
      break;

    case 'graze':
      if (isHost) {
        score += data.scorePlus;
        grazeCount += data.grazePlus;
        updateHUD();
      }
      break;

    case 'gameStateChange':
      if (data.state === 'gameover') {
        gameOver();
      } else if (data.state === 'victory') {
        victory();
      } else if (data.state === 'stage_clear') {
        stageClear();
      } else if (data.state === 'boss_warning') {
        startBossWarning();
      }
      break;

    case 'nextStage':
      proceedToNextStage();
      break;

    case 'resurrect': {
      const targetIdx = data.targetPlayerIndex;
      items = items.filter(item => item.type !== 'resurrect_p' + targetIdx);
      if (targetIdx === myPlayerIndex) {
        if (player) {
          player.lives = 1;
          player.invincible = true;
          player.invincibleTimer = 120;
          player.shieldTimer = 0;
        }
        Sound.playVictory();
        updateHUD();
      } else {
        if (otherPlayers[targetIdx]) {
          otherPlayers[targetIdx].lives = 1;
          otherPlayers[targetIdx].invincible = true;
        }
        Sound.playClick();
      }
      break;
    }
    case 'pong': {
      const now = performance.now();
      const rtt = now - lastPingSentTime;
      const pingEl = document.getElementById('telemetryPing');
      if (pingEl) {
        pingEl.textContent = `${Math.round(rtt)} ms`;
      }
      break;
    }
  }
}

function updateMultiplayerStatus(text) {
  const el = document.getElementById('multiplayerStatus');
  if (el) el.textContent = text;
}

function renderLobbyMembers(activeIndices = [1]) {
  const container = document.getElementById('lobbyMembers');
  if (!container) return;
  
  container.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const card = document.createElement('div');
    const isActive = activeIndices.includes(i);
    card.className = `lobby-member${isActive ? ` active-p${i}` : ''}`;
    
    let label = `${i}P`;
    if (i === myPlayerIndex && isMultiplayer) {
      label += ' (YOU)';
    } else if (i === 1) {
      label += ' (HOST)';
    } else {
      label += isActive ? ' (READY)' : ' (EMPTY)';
    }
    card.textContent = label;
    container.appendChild(card);
  }
}

function createMultiplayerRoom() {
  updateMultiplayerStatus('サーバーに接続中...');
  connectWebSocket(() => {
    updateMultiplayerStatus('ルームを作成中...');
    socket.send(JSON.stringify({
      type: 'createRoom'
    }));
  });
}

function joinMultiplayerRoom() {
  const codeInput = document.getElementById('roomCodeInput');
  const code = codeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    alert('4桁のルームコードを入力してください。');
    return;
  }
  updateMultiplayerStatus('サーバーに接続中...');
  connectWebSocket(() => {
    updateMultiplayerStatus(`ルーム ${code} に参加中...`);
    socket.send(JSON.stringify({
      type: 'joinRoom',
      roomCode: code
    }));
  });
}

function startMultiplayerGame() {
  if (isMultiplayer && isHost && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'startGame',
      gameMode: lobbyGameMode
    }));
    startMultiplayerMatch(lobbyGameMode);
  }
}

function startMultiplayerMatch(gameMode = 'story') {
  Sound.playClick();
  Sound.init();
  if (bgmActive) {
    Sound.setBGMEnabled(true);
  }

  score = 0;
  grazeCount = 0;
  loopCount = 1;
  warningTimer = 0;
  shakeTime = 0;
  document.getElementById('viewport').classList.remove('shake');

  player = new Player();
  targetMouseX = BASE_WIDTH / 2;
  targetMouseY = BASE_HEIGHT - 100;
  playerBullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  items = [];
  playerDrones = [];
  boss = null;

  waveTimer = 0;
  waveEnemiesSpawned = 0;
  waveFinishedSpawning = false;
  waveTransitionTimer = 0;
  nextEnemyId = 0;
  nextItemId = 0;
  deadPlayerCountdown = {};
  spawnedResurrectShards = {};

  // Setup gameplay parameters based on mode selected in lobby
  bossRushIndex = 1;
  bossRushTransitionTimer = 0;

  if (gameMode === 'story') {
    currentPlayMode = 'story';
    scoreAttackType = null;
    currentGameMode = 'waves';
    currentStage = '1-1';
    currentWave = 1;
    currentDifficulty = 'hard'; // Hard metrics for boss count etc.
    player.bombs = 1; // 1 bomb limit
  } else if (gameMode === 'endless') {
    currentPlayMode = 'score_attack';
    scoreAttackType = 'endless';
    currentGameMode = 'waves';
    currentWave = 1;
    currentDifficulty = 'normal';
    player.bombs = 3;
  } else if (gameMode === 'boss_rush') {
    currentPlayMode = 'score_attack';
    scoreAttackType = 'boss_rush';
    currentGameMode = 'boss';
    currentDifficulty = 'hard';
    bossRushIndex = 1;
    bossRushTransitionTimer = 1; // start warning on next frame
    player.bombs = 3;
  }

  Object.keys(otherPlayers).forEach(pIdx => {
    otherPlayers[pIdx] = {
      x: BASE_WIDTH / 2,
      y: BASE_HEIGHT - 100,
      selectedShip: 'default',
      powerLevel: 1,
      shieldTimer: 0,
      invincible: false,
      lives: 3,
      active: true
    };
  });

  renderHUD();

  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('gameOverOverlay').classList.add('hidden');
  document.getElementById('victoryOverlay').classList.add('hidden');
  document.getElementById('stageClearOverlay').classList.add('hidden');
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');

  updateCanvasBounds();

  gameState = STATES.PLAYING;
}

function notifyGameStateChange(state) {
  if (isMultiplayer && isHost && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'gameStateChange',
      state: state
    }));
  }
}

function triggerRemoteBomb(x, y, senderIndex) {
  Sound.playBomb();
  triggerScreenShake(30, 8);
  particles.push(new Shockwave(x, y));

  enemies.forEach(e => {
    e.takeDamage(50);
  });
  if (boss) {
    boss.takeDamage(60);
  }

  enemyBullets.forEach(b => {
    particles.push(new Particle(b.x, b.y, 0, -1, 4, '#ffb700', 0.03, 'score'));
    score += 10;
  });
  enemyBullets = [];
  updateHUD();
}

function spawnEnemyOnClient(enemyId, enemyType, x, y) {
  const e = new Enemy(x, y, enemyType);
  e.id = enemyId;
  enemies.push(e);
}

function applyDamageToEnemy(enemyId, damage) {
  const e = enemies.find(enemy => enemy.id === enemyId);
  if (e && !e.dead) {
    e.takeDamage(damage);
  }
}

function spawnItemOnClient(itemId, itemType, color, x, y) {
  const item = new Item(x, y, itemType, color);
  item.id = itemId;
  items.push(item);
}

function collectItemOnClient(itemId) {
  const item = items.find(i => i.id === itemId);
  if (item) {
    item.dead = true;
  }
}

// ----------------------------------------------------
// MULTIPLAYER LOBBY UI & SYNCHRONIZATION HELPERS
// ----------------------------------------------------

function resetLobbyUI() {
  isLobbyLocked = false;
  lobbyGameMode = 'story';
  
  const actionsEl = document.getElementById('lobbyConnectActions');
  if (actionsEl) actionsEl.style.display = 'flex';
  
  const hostEl = document.getElementById('lobbyHostOptions');
  if (hostEl) hostEl.style.display = 'none';
  
  const guestEl = document.getElementById('lobbyGuestWaiting');
  if (guestEl) guestEl.style.display = 'none';
  
  const statusEl = document.getElementById('multiplayerStatus');
  if (statusEl) statusEl.textContent = 'READY TO CONNECT';
  
  const lobbyStartBtn = document.getElementById('lobbyStartButton');
  if (lobbyStartBtn) lobbyStartBtn.style.display = 'none';

  const leaveLobbyBtn = document.getElementById('leaveLobbyButton');
  if (leaveLobbyBtn) leaveLobbyBtn.style.display = 'none';
  
  updateLobbyModeUI();
  updateLobbyLockUI();
}

function showLobbyActiveUI(isHostFlag) {
  const actionsEl = document.getElementById('lobbyConnectActions');
  if (actionsEl) actionsEl.style.display = 'none';
  
  const leaveLobbyBtn = document.getElementById('leaveLobbyButton');
  if (leaveLobbyBtn) leaveLobbyBtn.style.display = 'block';
  
  if (isHostFlag) {
    const hostEl = document.getElementById('lobbyHostOptions');
    if (hostEl) hostEl.style.display = 'flex';
    
    const guestEl = document.getElementById('lobbyGuestWaiting');
    if (guestEl) guestEl.style.display = 'none';
    
    const lobbyStartBtn = document.getElementById('lobbyStartButton');
    if (lobbyStartBtn) lobbyStartBtn.style.display = 'block';
    
    // Setup locked boss rush based on host story cleared status
    const isStoryCleared = localStorage.getItem('danmaku_story_cleared') === 'true';
    const bossRushCard = document.getElementById('lobbyModeBossRushCard');
    const lockIcon = document.getElementById('lobbyBossRushLockIcon');
    if (isStoryCleared) {
      if (bossRushCard) bossRushCard.classList.remove('locked');
      if (lockIcon) lockIcon.style.display = 'none';
    } else {
      if (bossRushCard) bossRushCard.classList.add('locked');
      if (lockIcon) lockIcon.style.display = 'inline';
    }
  } else {
    const hostEl = document.getElementById('lobbyHostOptions');
    if (hostEl) hostEl.style.display = 'none';
    
    const guestEl = document.getElementById('lobbyGuestWaiting');
    if (guestEl) guestEl.style.display = 'flex';
    
    const lobbyStartBtn = document.getElementById('lobbyStartButton');
    if (lobbyStartBtn) lobbyStartBtn.style.display = 'none';
  }
  
  updateLobbyModeUI();
  updateLobbyLockUI();
}

function leaveMultiplayerLobby() {
  Sound.playClick();
  stopPingTimer();
  if (socket) {
    socket.close();
    socket = null;
  }
  isMultiplayer = false;
  isHost = false;
  myPlayerIndex = 1;
  otherPlayers = {};
  
  resetLobbyUI();
}

function toggleLobbyLock() {
  if (!isMultiplayer || !isHost || !socket || socket.readyState !== WebSocket.OPEN) return;
  Sound.playClick();
  socket.send(JSON.stringify({
    type: 'toggleLock'
  }));
}

function updateLobbyLockUI() {
  const lockBtn = document.getElementById('lobbyLockButton');
  if (!lockBtn) return;
  
  if (isLobbyLocked) {
    lockBtn.textContent = 'UNLOCK LOBBY';
    lockBtn.style.borderColor = 'var(--magenta)';
    lockBtn.style.boxShadow = '0 0 15px var(--magenta-glow)';
    lockBtn.style.background = 'rgba(255, 0, 127, 0.08)';
  } else {
    lockBtn.textContent = 'LOCK LOBBY';
    lockBtn.style.borderColor = 'var(--cyan)';
    lockBtn.style.boxShadow = '0 0 15px var(--cyan-glow)';
    lockBtn.style.background = 'rgba(0, 255, 255, 0.08)';
  }
}

function setLobbyGameMode(mode) {
  if (!isMultiplayer || !isHost) return;
  
  if (mode === 'boss_rush') {
    const isStoryCleared = localStorage.getItem('danmaku_story_cleared') === 'true';
    if (!isStoryCleared) {
      Sound.playPlayerHit(); // Error buzz sound
      alert('ストーリーモードをクリアすると解放されます！');
      return;
    }
  }
  
  Sound.playHover();
  lobbyGameMode = mode;
  updateLobbyModeUI();
  
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'lobbyConfigSync',
      gameMode: mode
    }));
  }
}

function updateLobbyModeUI() {
  document.querySelectorAll('.diff-card.lobby-mode').forEach(card => {
    card.classList.remove('selected');
  });
  
  const modeIdMap = {
    'story': 'lobbyModeStoryCard',
    'endless': 'lobbyModeEndlessCard',
    'boss_rush': 'lobbyModeBossRushCard'
  };
  const cardId = modeIdMap[lobbyGameMode] || 'lobbyModeStoryCard';
  const selectedCard = document.getElementById(cardId);
  if (selectedCard) selectedCard.classList.add('selected');
  
  const guestModeText = document.getElementById('lobbyGuestModeText');
  if (guestModeText) {
    let modeLabel = 'STORY MODE';
    if (lobbyGameMode === 'endless') {
      modeLabel = 'ENDLESS MODE';
    } else if (lobbyGameMode === 'boss_rush') {
      modeLabel = 'BOSS RUSH';
    }
    guestModeText.textContent = modeLabel;
  }
}

function resurrectPlayer(playerIndex) {
  if (!isMultiplayer) return;

  items = items.filter(item => item.type !== 'resurrect_p' + playerIndex);

  if (playerIndex === myPlayerIndex) {
    if (player) {
      player.lives = 1;
      player.invincible = true;
      player.invincibleTimer = 120;
      player.shieldTimer = 0;
    }
    Sound.playVictory();
    updateHUD();
  } else {
    if (otherPlayers[playerIndex]) {
      otherPlayers[playerIndex].lives = 1;
      otherPlayers[playerIndex].invincible = true;
    }
    Sound.playClick();
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'resurrect',
      targetPlayerIndex: playerIndex
    }));
  }
}

function updateMultiplayerResurrections() {
  if (!isMultiplayer || !isHost) return;

  let allDead = true;
  if (player && player.lives > 0) allDead = false;
  Object.keys(otherPlayers).forEach(pIdx => {
    const op = otherPlayers[pIdx];
    if (op && op.active && op.lives > 0) allDead = false;
  });

  if (allDead) {
    gameOver();
    notifyGameStateChange('gameover');
    return;
  }

  const checkPlayerResurrection = (pIdx, currentLives) => {
    if (currentLives <= 0) {
      if (!spawnedResurrectShards[pIdx] && !deadPlayerCountdown[pIdx] && deadPlayerCountdown[pIdx] !== 0) {
        deadPlayerCountdown[pIdx] = 180;
      }

      if (deadPlayerCountdown[pIdx] > 0) {
        deadPlayerCountdown[pIdx]--;
        if (deadPlayerCountdown[pIdx] === 0) {
          const itemId = 'resurrect_' + pIdx + '_' + nextItemId++;
          const itemColor = PLAYER_COLORS[pIdx] || '#ffffff';
          const itemType = 'resurrect_p' + pIdx;

          const newItem = new Item(BASE_WIDTH / 2, -40, itemType, itemColor);
          newItem.id = itemId;
          items.push(newItem);

          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'spawnItem',
              itemId: itemId,
              itemType: itemType,
              color: itemColor,
              x: BASE_WIDTH / 2,
              y: -40
            }));
          }

          spawnedResurrectShards[pIdx] = true;
          delete deadPlayerCountdown[pIdx];
        }
      }
    } else {
      delete deadPlayerCountdown[pIdx];
      delete spawnedResurrectShards[pIdx];
    }
  };

  if (player) {
    checkPlayerResurrection(1, player.lives);
  }

  Object.keys(otherPlayers).forEach(pIdxStr => {
    const pIdx = parseInt(pIdxStr);
    const op = otherPlayers[pIdx];
    if (op && op.active) {
      checkPlayerResurrection(pIdx, op.lives);
    }
  });
}

window.resurrectPlayer = resurrectPlayer;
window.updateMultiplayerResurrections = updateMultiplayerResurrections;
