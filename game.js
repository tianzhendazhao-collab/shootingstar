// Cyber Danmaku - Core Orchestrator & Input Handler

// ----------------------------------------------------
// MAIN LOOP RUNNER
// ----------------------------------------------------

// Telemetry variables
let lastFpsUpdateTime = 0;
let frameCountSinceLastUpdate = 0;
let lastFrameTime = 0;
const fpsInterval = 1000 / 60; // target ~16.67ms per frame

function updateConnectionTelemetry() {
  const connEl = document.getElementById('telemetryConnection');
  const pingRow = document.getElementById('telemetryPingRow');
  if (!connEl) return;
  
  if (isMultiplayer) {
    const activeCount = lobbyPlayers.length;
    connEl.textContent = `ONLINE (${activeCount}/4)`;
    connEl.style.color = '#00ffff';
    connEl.style.textShadow = '0 0 8px rgba(0, 255, 255, 0.4)';
    if (pingRow) pingRow.style.display = 'flex';
  } else {
    connEl.textContent = 'OFFLINE';
    connEl.style.color = '#777799';
    connEl.style.textShadow = 'none';
    if (pingRow) pingRow.style.display = 'none';
  }
}

function gameLoop(currentTime) {
  if (!lastFrameTime) {
    lastFrameTime = currentTime;
  }
  
  const elapsed = currentTime - lastFrameTime;
  
  if (elapsed >= fpsInterval) {
    // Keep timing alignment steady by accounting for requestAnimationFrame fluctuations
    lastFrameTime = currentTime - (elapsed % fpsInterval);
    
    const startTime = performance.now();
    
    update();
    draw();
    
    const endTime = performance.now();
    const frameDuration = endTime - startTime;
    
    // Update Frame MS HUD
    const msEl = document.getElementById('telemetryMs');
    if (msEl) {
      msEl.textContent = `${Math.round(frameDuration)} ms`;
    }
    
    // Calculate FPS
    frameCountSinceLastUpdate++;
    const now = performance.now();
    if (now - lastFpsUpdateTime >= 1000) {
      const fps = (frameCountSinceLastUpdate * 1000) / (now - lastFpsUpdateTime);
      const fpsEl = document.getElementById('telemetryFps');
      if (fpsEl) {
        fpsEl.textContent = Math.round(fps).toString();
      }
      frameCountSinceLastUpdate = 0;
      lastFpsUpdateTime = now;
      
      // Periodically sync the connection state in sidebar
      updateConnectionTelemetry();
    }
  }
  
  requestAnimationFrame(gameLoop);
}

// Start game loop immediately
lastFpsUpdateTime = performance.now();
requestAnimationFrame(gameLoop);

// ----------------------------------------------------
// INPUT & MOUSE EVENT COORDINATOR
// ----------------------------------------------------

// Prevent default browser context menu on right-click
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (gameState !== STATES.PLAYING && gameState !== STATES.BOSS_BATTLE && gameState !== STATES.BOSS_WARNING) return;

  // Use cached canvas bounds to prevent layout reflows and eliminate delay
  if (!canvasRect) updateCanvasBounds();

  targetMouseX = (e.clientX - canvasRect.left) * scaleX;
  targetMouseY = (e.clientY - canvasRect.top) * scaleY;
});

// Touch controls support
window.addEventListener('touchmove', (e) => {
  if (gameState !== STATES.PLAYING && gameState !== STATES.BOSS_BATTLE && gameState !== STATES.BOSS_WARNING) return;
  if (e.target === canvas) {
    e.preventDefault();
  }

  if (!canvasRect) updateCanvasBounds();
  const touch = e.touches[0];

  targetMouseX = (touch.clientX - canvasRect.left) * scaleX;
  targetMouseY = (touch.clientY - canvasRect.top) * scaleY;
}, { passive: false });

// Bomb triggers (Space or Canvas Left Click)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (gameState === STATES.PLAYING || gameState === STATES.BOSS_BATTLE) {
      player.triggerBomb();
    }
  }
});

canvas.addEventListener('click', (e) => {
  if (gameState === STATES.PLAYING || gameState === STATES.BOSS_BATTLE) {
    player.triggerBomb();
  }
});

// ----------------------------------------------------
// CORE ENGINE UPDATES & RENDER
// ----------------------------------------------------

function update() {
  if (gameState === STATES.PAUSED) {
    return;
  }

  // Screenshake decay
  if (shakeTime > 0) {
    shakeTime--;
    if (shakeTime <= 0) {
      document.getElementById('viewport').classList.remove('shake');
    }
  }

  // Update Particles (Limit maximum particles to 120 for GC and render performance)
  if (particles.length > 120) {
    particles = particles.slice(particles.length - 120);
  }
  particles.forEach(p => p.update());
  particles = particles.filter(p => !p.dead && p.alpha > 0);

  updateStars();
  planetAngle += 0.0025;
  gameFrame++;

  if (gameState === STATES.PLAYING || gameState === STATES.BOSS_BATTLE || gameState === STATES.BOSS_WARNING) {
    player.update();
    
    if (isMultiplayer) {
      Object.keys(otherPlayers).forEach(pIdx => {
        const op = otherPlayers[pIdx];
        if (op && op.shieldTimer > 0) {
          op.shieldTimer--;
        }
      });
      
      if (isHost && typeof updateMultiplayerResurrections === 'function') {
        updateMultiplayerResurrections();
      }
    }

    playerBullets.forEach(b => b.update());
    enemyBullets.forEach(b => b.update());
    enemies.forEach(e => e.update());
    playerDrones.forEach(d => d.update());

    // Filter dead enemies
    enemies = enemies.filter(e => !e.dead);
    playerDrones = playerDrones.filter(d => !d.dead);

    // Update Boss if active
    if (gameState === STATES.BOSS_BATTLE && boss) {
      boss.update();
      if (boss.dead) {
        boss = null;
      }
    }

    // Spawn wave entities
    if (gameState === STATES.PLAYING) {
      if (currentPlayMode !== 'score_attack' || scoreAttackType !== 'boss_rush') {
        spawnEnemyWave();
      }
    } else if (gameState === STATES.BOSS_WARNING) {
      updateBossWarning();
    }

    // Update Boss Rush Transition Timer if active
    if (currentPlayMode === 'score_attack' && scoreAttackType === 'boss_rush' && bossRushTransitionTimer > 0) {
      bossRushTransitionTimer--;
      if (bossRushTransitionTimer === 0) {
        startBossWarning();
      }
    }

    // Check collisions
    checkCollisions();

    // Update Items
    items.forEach(item => item.update());
    items = items.filter(item => !item.dead);
  }

  // Draw HUD update once per frame if scheduled to prevent DOM layout bottlenecks
  if (hudNeedsUpdate) {
    renderHUD();
    hudNeedsUpdate = false;
  }
}

function draw() {
  drawSpaceBackground();

  // Apply Screenshake translation
  ctx.save();
  if (shakeTime > 0) {
    const dx = (Math.random() * 2 - 1) * shakeIntensity;
    const dy = (Math.random() * 2 - 1) * shakeIntensity;
    ctx.translate(dx, dy);
  }

  // Background grid/starfields can be drawn here for parallax
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.015)';
  ctx.lineWidth = 1;
  for (let i = 0; i < BASE_WIDTH; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, BASE_HEIGHT);
    ctx.stroke();
  }
  for (let j = 0; j < BASE_HEIGHT; j += 40) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(BASE_WIDTH, j);
    ctx.stroke();
  }

  // Draw Entities using additive blending for glow
  ctx.globalCompositeOperation = 'screen';

  particles.forEach(p => p.draw());
  items.forEach(item => item.draw());
  playerBullets.forEach(b => b.draw());
  enemyBullets.forEach(b => b.draw());
  
  ctx.globalCompositeOperation = 'source-over'; // restore default
  
  enemies.forEach(e => e.draw());
  playerDrones.forEach(d => d.draw());

  if (gameState === STATES.BOSS_BATTLE && boss) {
    boss.draw();
  }

  // Draw other players
  if (isMultiplayer) {
    Object.keys(otherPlayers).forEach(pIdx => {
      const op = otherPlayers[pIdx];
      if (op && op.active && op.lives > 0) {
        if (op.shieldTimer > 0) {
          ctx.beginPath();
          ctx.arc(op.x, op.y, 18 + 6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 + Math.sin(op.shieldTimer * 0.1) * 0.2})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        if (op.invincible && !op.shieldTimer && Math.floor(Date.now() / 100) % 2 === 0) {
          return;
        }

        if (Math.random() > 0.3) {
          particles.push(new Particle(
            op.x,
            op.y + 20,
            Math.random() * 2 - 1,
            Math.random() * 3 + 2,
            Math.random() * 4 + 2,
            '#ff0055',
            0.05
          ));
        }

        ctx.lineWidth = 2;
        const opColor = PLAYER_COLORS[pIdx] || '#ffffff';
        ctx.strokeStyle = opColor;
        ctx.fillStyle = '#010f1a';
        ctx.beginPath();
        ctx.moveTo(op.x, op.y - 20);
        ctx.lineTo(op.x - 20, op.y + 15);
        ctx.lineTo(op.x - 6, op.y + 5);
        ctx.lineTo(op.x + 6, op.y + 5);
        ctx.lineTo(op.x + 20, op.y + 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font = "900 10px 'Orbitron'";
        ctx.fillStyle = opColor;
        ctx.textAlign = 'center';
        ctx.fillText(`${pIdx}P`, op.x, op.y - 26);

        ctx.beginPath();
        ctx.arc(op.x, op.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(op.x, op.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    });
  }

  if (player) {
    player.draw();
  }

  // Draw Boss health bar at top if fighting boss
  if (gameState === STATES.BOSS_BATTLE && boss) {
    drawBossHealthBar();
  }

  ctx.restore(); // Undo screenshake translation
}
