// Cyber Danmaku - UI and HUD Controller

let hudNeedsUpdate = false;

function updateHUD() {
  hudNeedsUpdate = true;
}

function renderHUD() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('graze').textContent = grazeCount;
  
  const goldEl = document.getElementById('gold');
  if (goldEl) {
    goldEl.textContent = `${gold.toLocaleString()} G`;
  }
  const shopGoldEl = document.getElementById('shopGold');
  if (shopGoldEl) {
    shopGoldEl.textContent = gold.toLocaleString();
  }

  // Update Wave and Stage indicator based on play mode
  let waveText = '';
  if (gameState === STATES.BOSS_BATTLE) {
    if (currentPlayMode === 'score_attack' && scoreAttackType === 'boss_rush') {
      waveText = `BOSS ${bossRushIndex} / 3`;
    } else {
      waveText = 'BOSS';
    }
  } else if (currentPlayMode === 'story') {
    const maxWave = (currentStage === '1-5' || currentStage === '2-5') ? 3 : 5;
    waveText = `STAGE ${currentStage}<br>WAVE ${currentWave} / ${maxWave}`;
  } else if (currentPlayMode === 'score_attack') {
    if (scoreAttackType === 'boss_rush') {
      waveText = `BOSS ${bossRushIndex} / 3`;
    } else {
      waveText = `WAVE ${currentWave}`;
    }
  } else {
    waveText = currentDifficulty === 'endless' ? `WAVE ${currentWave}` : `${currentWave} / 10`;
  }
  document.getElementById('wave').innerHTML = waveText;

  // Draw lives as icons
  const livesEl = document.getElementById('lives');
  livesEl.innerHTML = '';
  if (player) {
    for (let i = 0; i < player.lives; i++) {
      livesEl.innerHTML += '🛸 ';
    }
  }

  // Draw bombs as icons
  const bombsEl = document.getElementById('bombs');
  bombsEl.innerHTML = '';
  if (player) {
    for (let i = 0; i < player.bombs; i++) {
      bombsEl.innerHTML += '💥 ';
    }
  }
}

function drawBossHealthBar() {
  const barW = 480;
  const barH = 10;
  const barX = (BASE_WIDTH - barW) / 2;
  const barY = 50;

  // Background frame
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(barX, barY, barW, barH);

  // Fill current Hp
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = boss.color;
  ctx.fillRect(barX, barY, barW * ratio, barH);

  // Borders
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX, barY, barW, barH);

  // Phase index text with name representation
  ctx.font = "12px 'Orbitron'";
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  let bossName = 'CYBER OVERLORD';
  if (currentPlayMode === 'story') {
    if (currentStage === '2-5') bossName = 'STAR LIGHT';
    else if (currentStage === '3-5') bossName = 'PROMINENCE FLARE';
    else bossName = 'EARTH INVADER';
  } else if (currentPlayMode === 'score_attack' && scoreAttackType === 'boss_rush') {
    if (bossRushIndex === 2) bossName = 'STAR LIGHT';
    else if (bossRushIndex === 3) bossName = 'PROMINENCE FLARE';
    else bossName = 'EARTH INVADER';
  }
  ctx.fillText(`${bossName} - PHASE ${boss.currentPhase} / ${boss.maxPhases}`, barX, barY - 10);
}



function startGame() {
  Sound.playClick();
  
  if (socket) {
    socket.close();
    socket = null;
  }
  isMultiplayer = false;
  isHost = false;
  myPlayerIndex = 1;
  otherPlayers = {};

  // Initialize Audio
  Sound.init();
  if (bgmActive) {
    Sound.setBGMEnabled(true);
  }

  // Reset game states
  score = 0;
  grazeCount = 0;
  loopCount = 1;
  warningTimer = 0; // Reset warning timer
  shakeTime = 0;    // Reset screenshake timer
  document.getElementById('viewport').classList.remove('shake');

  player = new Player();
  targetMouseX = BASE_WIDTH / 2;
  targetMouseY = BASE_HEIGHT - 100;
  playerBullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  items = []; // Reset items array
  playerDrones = []; // Reset drones array
  boss = null;

  waveTimer = 0;
  waveEnemiesSpawned = 0;
  waveFinishedSpawning = false;
  waveTransitionTimer = 0;

  // Initialize based on play mode
  bossRushIndex = 1;
  bossRushTransitionTimer = 0;

  if (currentPlayMode === 'story') {
    // Force default stage if none selected
    if (!currentStage.startsWith('1-') && !currentStage.startsWith('2-') && !currentStage.startsWith('3-')) {
      currentStage = '1-1';
    }
    currentWave = 1;
    currentDifficulty = 'hard'; // Force hard difficulty for story mode boss phase counts
    player.bombs = 1; // Story mode bomb count is locked to 1
  } else if (currentPlayMode === 'score_attack') {
    currentWave = 1;
    if (scoreAttackType === 'boss_rush') {
      currentDifficulty = 'hard';
      bossRushIndex = 1;
      bossRushTransitionTimer = 1; // Start boss warning on next frame
    } else {
      // endless
      currentDifficulty = 'normal';
    }
  } else {
    currentWave = 1;
    currentDifficulty = 'normal';
    currentGameMode = 'waves';
  }

  renderHUD(); // Instant rendering of initial status

  // Hide menus and reveal canvas
  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('gameOverOverlay').classList.add('hidden');
  document.getElementById('victoryOverlay').classList.add('hidden');
  document.getElementById('stageClearOverlay').classList.add('hidden'); // Ensure hidden
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');

  updateCanvasBounds(); // Cache initial bounds

  gameState = STATES.PLAYING;
}

function gameOver() {
  gameState = STATES.GAMEOVER;
  Sound.playDefeat();
  Sound.stopBGM();

  // Stop screen shake instantly on game over
  shakeTime = 0;
  document.getElementById('viewport').classList.remove('shake');

  document.getElementById('finalScoreLose').textContent = score.toLocaleString();
  document.getElementById('finalGrazeLose').textContent = grazeCount;
  document.getElementById('finalWaveLose').textContent = currentWave === 10 && boss ? 'BOSS' : currentWave;

  // Set up button texts and states
  const retryBtn = document.getElementById('retryLoseButton');
  const menuBtn = document.getElementById('menuLoseButton');
  if (isMultiplayer) {
    if (isHost) {
      if (retryBtn) {
        retryBtn.textContent = 'RE-BOOT SYSTEM';
        retryBtn.disabled = false;
      }
      if (menuBtn) {
        menuBtn.textContent = 'RETURN TO MENU';
      }
    } else {
      if (retryBtn) {
        retryBtn.textContent = 'WAITING FOR HOST...';
        retryBtn.disabled = true;
      }
      if (menuBtn) {
        menuBtn.textContent = 'LEAVE ROOM';
      }
    }
  } else {
    if (retryBtn) {
      retryBtn.textContent = 'RE-BOOT SYSTEM';
      retryBtn.disabled = false;
    }
    if (menuBtn) {
      menuBtn.textContent = 'RETURN TO MENU';
    }
  }

  document.getElementById('gameOverOverlay').classList.remove('hidden');
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');
}

function victory() {
  gameState = STATES.VICTORY;
  Sound.playVictory();
  Sound.stopBGM();

  // Stop screen shake instantly on victory
  shakeTime = 0;
  document.getElementById('viewport').classList.remove('shake');

  // Converted gold from final score (1% of score)
  const goldEarned = Math.round(score * 0.01);
  addGold(goldEarned, BASE_WIDTH / 2, BASE_HEIGHT / 2);

  document.getElementById('finalScoreWin').textContent = score.toLocaleString();
  document.getElementById('finalGrazeWin').textContent = grazeCount;

  const goldEl = document.getElementById('victoryGold');
  if (goldEl) {
    goldEl.textContent = `+${goldEarned.toLocaleString()} G`;
  }

  // Set up button texts and states
  const retryBtn = document.getElementById('retryWinButton');
  const menuBtn = document.getElementById('menuWinButton');
  if (isMultiplayer) {
    if (isHost) {
      if (retryBtn) {
        retryBtn.textContent = 'REPLAY SIMULATION';
        retryBtn.disabled = false;
      }
      if (menuBtn) {
        menuBtn.textContent = 'RETURN TO MENU';
      }
    } else {
      if (retryBtn) {
        retryBtn.textContent = 'WAITING FOR HOST...';
        retryBtn.disabled = true;
      }
      if (menuBtn) {
        menuBtn.textContent = 'LEAVE ROOM';
      }
    }
  } else {
    if (retryBtn) {
      retryBtn.textContent = 'REPLAY SIMULATION';
      retryBtn.disabled = false;
    }
    if (menuBtn) {
      menuBtn.textContent = 'RETURN TO MENU';
    }
  }

  document.getElementById('victoryOverlay').classList.remove('hidden');
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');
}

function toggleSFX() {
  sfxActive = !sfxActive;
  localStorage.setItem('danmaku_sfx_active', sfxActive);
  const btn = document.getElementById('sfxToggle');
  btn.classList.toggle('active', sfxActive);
  Sound.setSFXEnabled(sfxActive);
  Sound.playClick();
}

function toggleBGM() {
  bgmActive = !bgmActive;
  localStorage.setItem('danmaku_bgm_active', bgmActive);
  const btn = document.getElementById('bgmToggle');
  btn.classList.toggle('active', bgmActive);
  
  if (gameState === STATES.PLAYING || gameState === STATES.BOSS_BATTLE) {
    Sound.setBGMEnabled(bgmActive);
  } else {
    // Just toggle setting
    Sound.bgmEnabled = bgmActive;
  }
  Sound.playClick();
}

function returnToMenu() {
  Sound.playClick();
  Sound.stopBGM();
  
  if (socket) {
    socket.close();
    socket = null;
  }
  isMultiplayer = false;
  isHost = false;
  myPlayerIndex = 1;
  otherPlayers = {};
  
  if (typeof resetLobbyUI === 'function') {
    resetLobbyUI();
  } else {
    const statusEl = document.getElementById('multiplayerStatus');
    if (statusEl) statusEl.textContent = 'READY TO CONNECT';
    const lobbyStartBtn = document.getElementById('lobbyStartButton');
    if (lobbyStartBtn) lobbyStartBtn.style.display = 'none';
  }
  
  gameState = STATES.MENU;
  
  player = null;
  boss = null;
  playerBullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  items = [];
  playerDrones = [];
  
  document.getElementById('menuOverlay').classList.remove('hidden');
  document.getElementById('gameOverOverlay').classList.add('hidden');
  document.getElementById('victoryOverlay').classList.add('hidden');
  document.getElementById('stageClearOverlay').classList.add('hidden');
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');
  
  updateCanvasBounds(); // Cache bounds when menu returns
  renderStageSelect(); // Update stage select grid to reflect unlocked stages!
  renderShopGrid(); // Ensure shop grid is updated too!
}



function addGold(amount, x, y) {
  if (amount <= 0) return;
  gold += amount;
  localStorage.setItem('danmaku_gold', gold);
  updateHUD();
  
  // Spawn floating text particle
  particles.push(new ScoreText(x, y, `+${amount} G`, '#ffd700', 1.1));
}

function renderShopGrid() {
  const gridEl = document.getElementById('shopGrid');
  if (!gridEl) return;

  gridEl.innerHTML = '';
  
  const selectedShipId = localStorage.getItem('danmaku_selected_ship') || 'default';

  Object.values(SHIPS).forEach(ship => {
    const isPurchased = purchasedShips.includes(ship.id);
    const isSelected = selectedShipId === ship.id;

    const card = document.createElement('div');
    card.className = `shop-card${isSelected ? ' selected' : ''}`;

    let costHtml = '';
    let btnHtml = '';

    if (ship.id === 'default') {
      costHtml = `<div class="cost" style="color: var(--green);">FREE</div>`;
      if (isSelected) {
        btnHtml = `<button class="shop-btn selected" disabled>EQUIPPED</button>`;
      } else {
        btnHtml = `<button class="shop-btn" onclick="selectShip('${ship.id}')">EQUIP</button>`;
      }
    } else if (isPurchased) {
      costHtml = `<div class="owned-label">OWNED</div>`;
      if (isSelected) {
        btnHtml = `<button class="shop-btn selected" disabled>EQUIPPED</button>`;
      } else {
        btnHtml = `<button class="shop-btn owned" onclick="selectShip('${ship.id}')">EQUIP</button>`;
      }
    } else {
      costHtml = `<div class="cost">${ship.cost.toLocaleString()} G</div>`;
      btnHtml = `<button class="shop-btn" onclick="buyShip('${ship.id}')">BUY</button>`;
    }

    card.innerHTML = `
      <h3>${ship.name}</h3>
      <p>${ship.desc}</p>
      ${costHtml}
      ${btnHtml}
    `;
    
    gridEl.appendChild(card);
  });
  
  const shopGoldEl = document.getElementById('shopGold');
  if (shopGoldEl) {
    shopGoldEl.textContent = gold.toLocaleString();
  }
}

function selectShip(shipId) {
  if (!purchasedShips.includes(shipId) && shipId !== 'default') return;
  
  localStorage.setItem('danmaku_selected_ship', shipId);
  if (player) {
    player.selectedShip = shipId;
  }
  Sound.playClick();
  renderShopGrid();
}

function buyShip(shipId) {
  const ship = SHIPS[shipId];
  if (!ship) return;
  
  if (gold < ship.cost) {
    Sound.playPlayerHit(); // Buzz error sound
    alert("GOLDが不足しています！");
    return;
  }
  
  gold -= ship.cost;
  localStorage.setItem('danmaku_gold', gold);
  purchasedShips.push(shipId);
  localStorage.setItem('danmaku_purchased_ships', JSON.stringify(purchasedShips));
  
  localStorage.setItem('danmaku_selected_ship', shipId);
  if (player) {
    player.selectedShip = shipId;
  }
  
  Sound.playVictory();
  renderShopGrid();
  updateHUD();
}

function selectPlayMode(mode) {
  if (isMultiplayer && mode !== 'multiplayer') {
    Sound.playPlayerHit(); // Buzz error sound
    alert('マルチプレイロビーに入室中は他のモードを選択できません。ロビーから退出（LEAVE LOBBY）してください。');
    return;
  }

  currentPlayMode = mode;
  Sound.playHover();

  document.querySelectorAll('.playmode-card').forEach(card => {
    card.classList.remove('selected');
  });

  const card = document.querySelector(`.playmode-card.${mode}`);
  if (card) card.classList.add('selected');

  const storyPanel = document.getElementById('storySettings');
  const shopPanel = document.getElementById('shopSettings');
  const multiplayerPanel = document.getElementById('multiplayerSettings');
  const scoreAttackPanel = document.getElementById('scoreAttackSettings');
  const startButton = document.getElementById('startButton');

  // Hide all settings panels by default
  storyPanel.classList.add('hidden');
  shopPanel.classList.add('hidden');
  shopPanel.style.opacity = '0';
  shopPanel.style.pointerEvents = 'none';
  multiplayerPanel.classList.add('hidden');
  multiplayerPanel.style.opacity = '0';
  multiplayerPanel.style.pointerEvents = 'none';
  scoreAttackPanel.classList.add('hidden');
  scoreAttackPanel.style.opacity = '0';
  scoreAttackPanel.style.pointerEvents = 'none';

  if (mode === 'shop') {
    shopPanel.classList.remove('hidden');
    if (startButton) startButton.style.display = 'none';
    renderShopGrid();
    setTimeout(() => {
      shopPanel.style.opacity = '1';
      shopPanel.style.pointerEvents = 'auto';
    }, 50);
  } else if (mode === 'multiplayer') {
    multiplayerPanel.classList.remove('hidden');
    if (startButton) startButton.style.display = 'none';
    updateMultiplayerStatus('READY TO CONNECT');
    renderLobbyMembers([1]);
    document.getElementById('lobbyStartButton').style.display = 'none';
    setTimeout(() => {
      multiplayerPanel.style.opacity = '1';
      multiplayerPanel.style.pointerEvents = 'auto';
    }, 50);
  } else if (mode === 'score_attack') {
    scoreAttackPanel.classList.remove('hidden');
    if (startButton) startButton.style.display = 'block';
    
    // Check unlock status for Boss Rush
    const isStoryCleared = localStorage.getItem('danmaku_story_cleared') === 'true';
    const bossRushCard = document.getElementById('scoreBossRushCard');
    const lockIcon = document.getElementById('bossRushLockIcon');
    
    if (isStoryCleared) {
      bossRushCard.classList.remove('locked');
      if (lockIcon) lockIcon.style.display = 'none';
    } else {
      bossRushCard.classList.add('locked');
      if (lockIcon) lockIcon.style.display = 'inline';
    }
    
    selectScoreAttackType('endless', false);
    
    setTimeout(() => {
      scoreAttackPanel.style.opacity = '1';
      scoreAttackPanel.style.pointerEvents = 'auto';
    }, 50);
  } else {
    storyPanel.classList.remove('hidden');
    if (startButton) startButton.style.display = 'block';
    renderStageSelect(); // Ensure stage select grid is up-to-date
  }
}

function selectScoreAttackType(type, playSound = true) {
  const isStoryCleared = localStorage.getItem('danmaku_story_cleared') === 'true';
  if (type === 'boss_rush' && !isStoryCleared) {
    if (playSound) Sound.playPlayerHit(); // Buzz error sound
    alert("ボスラッシュは、すべてのワールドをクリアすると解放されます！");
    return;
  }
  
  scoreAttackType = type;
  if (playSound) Sound.playClick();
  
  const endlessCard = document.getElementById('scoreEndlessCard');
  const bossRushCard = document.getElementById('scoreBossRushCard');
  
  if (type === 'endless') {
    endlessCard.classList.add('selected');
    bossRushCard.classList.remove('selected');
  } else {
    endlessCard.classList.remove('selected');
    bossRushCard.classList.add('selected');
  }
}

function stageClear() {
  gameState = STATES.STAGE_CLEAR;
  Sound.playVictory();
  Sound.stopBGM();

  shakeTime = 0;
  document.getElementById('viewport').classList.remove('shake');

  // Save clear unlock progress (supports world 1, 2, and 3, max 15 stages)
  const parts = currentStage.split('-');
  const world = parseInt(parts[0]) || 1;
  const stageNum = parseInt(parts[1]) || 1;
  const stageIdx = (world - 1) * 5 + stageNum;
  const nextStageIdx = stageIdx + 1;
  const currentUnlocked = parseInt(localStorage.getItem('danmaku_story_unlocked') || 1);
  if (nextStageIdx > currentUnlocked) {
    localStorage.setItem('danmaku_story_unlocked', Math.min(15, nextStageIdx));
  }

  // Converted gold from stage clear score (1% of score)
  const goldEarned = Math.round(score * 0.01);
  addGold(goldEarned, BASE_WIDTH / 2, BASE_HEIGHT / 2);

  document.getElementById('stageClearTitle').textContent = `STAGE ${currentStage} CLEARED`;
  document.getElementById('stageClearScore').textContent = score.toLocaleString();
  document.getElementById('stageClearGraze').textContent = grazeCount;

  const goldEl = document.getElementById('stageClearGold');
  if (goldEl) {
    goldEl.textContent = `+${goldEarned.toLocaleString()} G`;
  }

  // Set up button texts and states
  const nextBtn = document.getElementById('nextStageButton');
  const menuBtn = document.getElementById('menuClearButton');
  if (isMultiplayer) {
    if (isHost) {
      if (nextBtn) {
        nextBtn.textContent = 'PROCEED TO NEXT STAGE';
        nextBtn.disabled = false;
      }
      if (menuBtn) {
        menuBtn.textContent = 'RETURN TO MENU';
      }
    } else {
      if (nextBtn) {
        nextBtn.textContent = 'WAITING FOR HOST...';
        nextBtn.disabled = true;
      }
      if (menuBtn) {
        menuBtn.textContent = 'LEAVE ROOM';
      }
    }
  } else {
    if (nextBtn) {
      nextBtn.textContent = 'PROCEED TO NEXT STAGE';
      nextBtn.disabled = false;
    }
    if (menuBtn) {
      menuBtn.textContent = 'RETURN TO MENU';
    }
  }

  document.getElementById('stageClearOverlay').classList.remove('hidden');
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');
}

function proceedToNextStage() {
  Sound.playClick();

  // Send next stage message in multiplayer if we are the host
  if (isMultiplayer && isHost && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'nextStage'
    }));
  }

  // Reset dead player/resurrect metadata on stage change
  if (typeof deadPlayerCountdown !== 'undefined') deadPlayerCountdown = {};
  if (typeof spawnedResurrectShards !== 'undefined') spawnedResurrectShards = {};

  // Move to next stage (Stage 1-1 -> 1-2 -> ... -> 2-5 -> 3-1 -> 3-2...)
  const parts = currentStage.split('-');
  const world = parseInt(parts[0]);
  const stage = parseInt(parts[1]);
  if (stage < 5) {
    currentStage = `${world}-${stage + 1}`;
  } else if (world === 1) {
    currentStage = `2-1`;
    currentWorld = 2; // Auto-switch world tab
    const titleEl = document.getElementById('worldSelectTitle');
    if (titleEl) titleEl.textContent = `STAGE SELECT: moon`;
    document.querySelectorAll('.world-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById('tabWorld2');
    if (activeTab) activeTab.classList.add('active');
  } else if (world === 2) {
    currentStage = `3-1`;
    currentWorld = 3; // Auto-switch world tab
    const titleEl = document.getElementById('worldSelectTitle');
    if (titleEl) titleEl.textContent = `STAGE SELECT: sun`;
    document.querySelectorAll('.world-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById('tabWorld3');
    if (activeTab) activeTab.classList.add('active');
  }

  // Reset wave and timers
  currentWave = 1;
  waveTimer = 0;
  waveEnemiesSpawned = 0;
  waveFinishedSpawning = false;
  waveTransitionTimer = 0;

  // Clear all active bullets and entities to guarantee a clean start
  playerBullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  items = [];
  playerDrones = [];

  // Reset player status (lives, bombs, power and active shield effects) on stage transition
  if (player) {
    player.lives = 3;
    player.bombs = 1; // Story mode bomb count is locked to 1
    player.powerLevel = 1;
    player.shieldTimer = 0;
    
    // Grant temporary 2-second safety shield
    player.invincible = true;
    player.invincibleTimer = 120;
  }

  renderHUD();
  renderStageSelect(); // Update menu select state behind overlay

  document.getElementById('stageClearOverlay').classList.add('hidden');
  gameState = STATES.PLAYING;

  if (bgmActive) {
    Sound.setBGMEnabled(true);
  }
}

function selectWorld(worldNum) {
  currentWorld = worldNum;
  Sound.playClick();

  // Update tab CSS classes
  document.querySelectorAll('.world-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const activeTab = document.getElementById(`tabWorld${worldNum}`);
  if (activeTab) activeTab.classList.add('active');

  const titleEl = document.getElementById('worldSelectTitle');
  if (titleEl) {
    titleEl.textContent = `STAGE SELECT: ${worldNum === 1 ? 'earth' : worldNum === 2 ? 'moon' : 'sun'}`;
  }

  // Automatically select the first unlocked stage of this world
  const unlockedMax = parseInt(localStorage.getItem('danmaku_story_unlocked') || 1);
  const firstStageIdx = (worldNum - 1) * 5 + 1;
  if (firstStageIdx <= unlockedMax) {
    currentStage = `${worldNum}-1`;
  }

  renderStageSelect();
}

function renderStageSelect() {
  const gridEl = document.getElementById('stageSelectGrid');
  if (!gridEl) return;

  gridEl.innerHTML = '';
  const unlockedMax = parseInt(localStorage.getItem('danmaku_story_unlocked') || 1);

  for (let i = 1; i <= 5; i++) {
    const stageName = `${currentWorld}-${i}`;
    const stageIdx = (currentWorld - 1) * 5 + i;
    const isLocked = stageIdx > unlockedMax;
    const isSelected = currentStage === stageName;

    const card = document.createElement('div');
    card.className = `stage-card${isSelected ? ' selected' : ''}${isLocked ? ' locked' : ''}`;
    
    let lockSymbol = isLocked ? ' 🔒' : '';
    let subtext = isLocked ? 'LOCKED' : (i === 5 ? 'BOSS' : 'ACTIVE');

    card.innerHTML = `
      <h3>Stage ${stageName}${lockSymbol}</h3>
    `;

    if (!isLocked) {
      card.addEventListener('click', () => {
        selectStoryStage(stageName);
      });
    }

    gridEl.appendChild(card);
  }
}

function selectStoryStage(stageName) {
  const parts = stageName.split('-');
  const world = parseInt(parts[0]);
  const stageNum = parseInt(parts[1]);
  const stageIdx = (world - 1) * 5 + stageNum;

  const unlockedMax = parseInt(localStorage.getItem('danmaku_story_unlocked') || 1);
  if (stageIdx > unlockedMax) return; // Locked stage

  currentStage = stageName;
  Sound.playHover();
  renderStageSelect();
}

function handleRetry() {
  if (isMultiplayer) {
    if (isHost && typeof startMultiplayerGame === 'function') {
      startMultiplayerGame();
    }
  } else {
    startGame();
  }
}

// Bind UI event listeners
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('retryLoseButton').addEventListener('click', handleRetry);
document.getElementById('retryWinButton').addEventListener('click', handleRetry);
document.getElementById('menuLoseButton').addEventListener('click', returnToMenu);
document.getElementById('menuWinButton').addEventListener('click', returnToMenu);
document.getElementById('nextStageButton').addEventListener('click', proceedToNextStage);
document.getElementById('menuClearButton').addEventListener('click', returnToMenu);

document.getElementById('sfxToggle').addEventListener('click', toggleSFX);
document.getElementById('bgmToggle').addEventListener('click', toggleBGM);

// Mouse Hover sounds for menus
document.querySelectorAll('.btn-neon, .diff-card, .mode-card, .toggle-container, .playmode-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    Sound.playHover();
  });
});

let prePauseState = null;

function pauseGame() {
  if (gameState === STATES.PAUSED) return;
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (!pauseOverlay) return;

  Sound.playClick();

  if (isMultiplayer) {
    const warningEl = document.getElementById('pauseMultiplayerWarning');
    if (warningEl) warningEl.style.display = 'block';
  } else {
    const warningEl = document.getElementById('pauseMultiplayerWarning');
    if (warningEl) warningEl.style.display = 'none';
    prePauseState = gameState;
    gameState = STATES.PAUSED;
  }

  pauseOverlay.classList.remove('hidden');
}

function resumeGame() {
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (!pauseOverlay || pauseOverlay.classList.contains('hidden')) return;

  Sound.playClick();
  pauseOverlay.classList.add('hidden');

  if (!isMultiplayer && prePauseState) {
    gameState = prePauseState;
    prePauseState = null;
  }
}

// Bind UI buttons for pause overlay
document.getElementById('resumeButton').addEventListener('click', resumeGame);
document.getElementById('menuPauseButton').addEventListener('click', () => {
  Sound.playClick();
  const pauseOverlay = document.getElementById('pauseOverlay');
  if (pauseOverlay) pauseOverlay.classList.add('hidden');
  prePauseState = null;
  returnToMenu();
});

// ESC key listener to toggle pause overlay
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    e.preventDefault();

    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay && !pauseOverlay.classList.contains('hidden')) {
      resumeGame();
    } else if (gameState === STATES.PLAYING || gameState === STATES.BOSS_BATTLE || gameState === STATES.BOSS_WARNING) {
      pauseGame();
    }
  }
});

// Handle global scope hooks for UI elements
window.selectPlayMode = selectPlayMode;
window.selectStoryStage = selectStoryStage;
window.selectWorld = selectWorld;
window.selectScoreAttackType = selectScoreAttackType;
window.returnToMenu = returnToMenu;
window.buyShip = buyShip;
window.selectShip = selectShip;
window.renderShopGrid = renderShopGrid;
window.updateHUD = updateHUD;
window.renderHUD = renderHUD;
window.addGold = addGold;
window.startGame = startGame;
window.handleRetry = handleRetry;
window.gameOver = gameOver;
window.victory = victory;
window.stageClear = stageClear;
window.proceedToNextStage = proceedToNextStage;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;

// Initial selection setup on load
initStars();
selectPlayMode('story');

// Sync loaded gold & audio settings to UI elements
const goldEl = document.getElementById('gold');
if (goldEl) {
  goldEl.textContent = `${gold.toLocaleString()} G`;
}
const sfxBtn = document.getElementById('sfxToggle');
if (sfxBtn) {
  sfxBtn.classList.toggle('active', sfxActive);
}
const bgmBtn = document.getElementById('bgmToggle');
if (bgmBtn) {
  bgmBtn.classList.toggle('active', bgmActive);
}
Sound.sfxEnabled = sfxActive;
Sound.bgmEnabled = bgmActive;
