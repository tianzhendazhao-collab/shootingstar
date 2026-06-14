// Cyber Danmaku - Player Ship & Weapon Option Subsystems

class Player {
  constructor() {
    this.x = BASE_WIDTH / 2;
    this.y = BASE_HEIGHT - 100;
    this.width = 40;
    this.height = 40;
    this.hitboxRadius = 3;   // Tiny hitbox for danmaku dodging
    this.grazeRadius = 18;   // Larger radius for grazing points
    this.lives = 3;
    this.bombs = 3;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.shootCooldown = 0;
    this.shootInterval = 8; // In frames (approx 7.5 shots/sec)
    this.powerLevel = 1;    // Weapon Power Level: 1 (3-way), 2 (5-way), 3 (7-way)
    this.shieldTimer = 0;   // Invincibility shield duration

    // Customized ship settings
    this.droneCooldown = 0;
    this.selectedShip = localStorage.getItem('danmaku_selected_ship') || 'default';
  }

  update() {
    if (this.lives <= 0) return;

    // Sync coordinate updates from mouse/touch event variables once per frame
    this.x = targetMouseX;
    this.y = targetMouseY;
    
    // Constrain coordinates to grid dimensions
    this.x = Math.max(this.width/2, Math.min(BASE_WIDTH - this.width/2, this.x));
    this.y = Math.max(this.height/2, Math.min(BASE_HEIGHT - this.height/2, this.y));

    // Dispatch position sync in multiplayer
    if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'sync',
        x: this.x,
        y: this.y,
        selectedShip: this.selectedShip,
        powerLevel: this.powerLevel,
        shieldTimer: this.shieldTimer,
        invincible: this.invincible,
        lives: this.lives
      }));
    }

    // Invincibility shield timer update
    if (this.shieldTimer > 0) {
      this.shieldTimer--;
      this.invincible = true;
      this.invincibleTimer = Math.max(this.invincibleTimer, 2); // keep invincible
    }

    // Invincibility flashing
    if (this.invincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    // Update drone deploy cooldown
    if (this.droneCooldown > 0) {
      this.droneCooldown--;
    }

    // Auto-fire bullets
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else {
      this.shoot();
      this.shootCooldown = this.shootInterval;
    }
  }

  shoot() {
    if (this.lives <= 0) return;
    Sound.playShoot();
    const bulletSpeed = 16;
    
    // Choose bullet color based on player index in multiplayer, default to cyan
    const bulletColor = isMultiplayer ? PLAYER_COLORS[myPlayerIndex] : '#00f3ff';

    if (this.selectedShip === 'homing') {
      const bSpeed = 12; // slightly slower for homing missiles
      if (this.powerLevel === 1) {
        spawnFriendlyBullet(this.x - 10, this.y, -3, -bSpeed, 'homing', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x + 10, this.y, 3, -bSpeed, 'homing', bulletColor, this.powerLevel);
      } else if (this.powerLevel === 2) {
        spawnFriendlyBullet(this.x, this.y - 15, 0, -bSpeed, 'homing', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x - 15, this.y, -4, -bSpeed, 'homing', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x + 15, this.y, 4, -bSpeed, 'homing', bulletColor, this.powerLevel);
      } else {
        spawnFriendlyBullet(this.x - 10, this.y - 15, -1, -bSpeed, 'homing', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x + 10, this.y - 15, 1, -bSpeed, 'homing', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x - 20, this.y, -5, -bSpeed, 'homing', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x + 20, this.y, 5, -bSpeed, 'homing', bulletColor, this.powerLevel);
      }
    } 
    else if (this.selectedShip === 'split') {
      spawnFriendlyBullet(this.x, this.y - 15, 0, -8, 'split', bulletColor, this.powerLevel);
      
      if (this.powerLevel >= 2) {
        spawnFriendlyBullet(this.x - 12, this.y, 0, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x + 12, this.y, 0, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
      }
      if (this.powerLevel === 3) {
        spawnFriendlyBullet(this.x - 20, this.y, 0, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x + 20, this.y, 0, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
      }
    } 
    else if (this.selectedShip === 'drone') {
      spawnFriendlyBullet(this.x, this.y - 15, 0, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
      if (this.powerLevel >= 2) {
        spawnFriendlyBullet(this.x - 10, this.y, -2, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x + 10, this.y, 2, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
      }
      if (this.powerLevel === 3) {
        spawnFriendlyBullet(this.x - 18, this.y, -4, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
        spawnFriendlyBullet(this.x + 18, this.y, 4, -bulletSpeed, 'normal', bulletColor, this.powerLevel);
      }
      
      // Deploy drone helper
      if (this.droneCooldown <= 0) {
        const droneOwner = isMultiplayer ? myPlayerIndex : 1;
        playerDrones.push(new SummonedDrone(this.x, this.y, this.powerLevel, droneOwner));
        this.droneCooldown = 150; // deploy every 2.5 seconds
        
        if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'spawnDrone',
            x: this.x,
            y: this.y,
            powerLevel: this.powerLevel
          }));
        }
      }
    } 
    else {
      // Default ship weapons
      spawnFriendlyBullet(this.x, this.y - 15, 0, -bulletSpeed, 'normal', bulletColor, this.powerLevel);

      if (this.powerLevel === 1) {
        const angleLeft = -12 * Math.PI / 180;
        spawnFriendlyBullet(this.x - 10, this.y - 10, Math.sin(angleLeft) * bulletSpeed, Math.cos(angleLeft) * -bulletSpeed, 'normal', bulletColor, this.powerLevel);
        const angleRight = 12 * Math.PI / 180;
        spawnFriendlyBullet(this.x + 10, this.y - 10, Math.sin(angleRight) * bulletSpeed, Math.cos(angleRight) * -bulletSpeed, 'normal', bulletColor, this.powerLevel);
      } 
      else if (this.powerLevel === 2) {
        const angles = [-10, 10, -20, 20];
        angles.forEach(deg => {
          const rad = deg * Math.PI / 180;
          spawnFriendlyBullet(
            this.x + Math.sin(rad) * 15,
            this.y - 10,
            Math.sin(rad) * bulletSpeed,
            Math.cos(rad) * -bulletSpeed,
            'normal',
            bulletColor,
            this.powerLevel
          );
        });
      } 
      else if (this.powerLevel === 3) {
        const angles = [-8, 8, -16, 16, -24, 24];
        angles.forEach(deg => {
          const rad = deg * Math.PI / 180;
          spawnFriendlyBullet(
            this.x + Math.sin(rad) * 20,
            this.y - 10,
            Math.sin(rad) * bulletSpeed,
            Math.cos(rad) * -bulletSpeed,
            'normal',
            bulletColor,
            this.powerLevel
          );
        });
      }
    }


  }

  triggerBomb() {
    if (this.lives <= 0) return;
    if (isMultiplayer && !isHost) return; // Only room leader can use bombs in multiplayer
    if (this.bombs <= 0) return;
    this.bombs--;
    updateHUD();

    // Dispatch bomb message in multiplayer
    if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'bomb',
        x: this.x,
        y: this.y
      }));
    }

    // Trigger bomb effect
    Sound.playBomb();
    triggerScreenShake(30, 8);

    // Create an expanding shockwave particle
    particles.push(new Shockwave(this.x, this.y));

    // Damage all active enemies and clear bullets
    enemies.forEach(e => {
      e.takeDamage(50);
    });
    if (boss) {
      boss.takeDamage(60);
    }

    // Clear all enemy bullets and convert to graze points
    enemyBullets.forEach(b => {
      // Create tiny fading score particles at bullet spots
      particles.push(new Particle(b.x, b.y, 0, -1, 4, '#ffb700', 0.03, 'score'));
      score += 10;
    });
    enemyBullets = [];
    updateHUD();
  }

  takeDamage() {
    if (this.invincible || this.lives <= 0) return;

    this.lives--;
    this.powerLevel = Math.max(1, this.powerLevel - 1); // Downgrade weapon power on hit!
    updateHUD();
    Sound.playPlayerHit();
    triggerScreenShake(20, 6);

    // Spawn massive player explosion particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particles.push(new Particle(
        this.x,
        this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() * 6 + 2,
        PLAYER_COLORS[myPlayerIndex] || '#00ffea',
        0.02
      ));
    }

    // Clear bullets around player to give them breathing room
    enemyBullets = [];

    if (this.lives <= 0) {
      // Check if all players are dead
      let allDead = true;
      if (isMultiplayer) {
        Object.values(otherPlayers).forEach(op => {
          if (op && op.lives > 0) allDead = false;
        });
      } else {
        allDead = true;
      }
      
      if (allDead) {
        if (!isMultiplayer || isHost) {
          gameOver();
          if (typeof notifyGameStateChange === 'function') {
            notifyGameStateChange('gameover');
          }
        }
      }
    } else {
      this.invincible = true;
      this.invincibleTimer = 120; // 2 seconds at 60 FPS
    }
  }

  draw() {
    if (this.lives <= 0) return;

    // Draw Invincible Shield if active (outside ship flashing so it stays visible)
    if (this.shieldTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.grazeRadius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 + Math.sin(this.shieldTimer * 0.1) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Flashing visual when invincible
    if (this.invincible && !this.shieldTimer && Math.floor(this.invincibleTimer / 4) % 2 === 0) {
      return;
    }

    // Draw Thruster particles
    if (Math.random() > 0.3) {
      particles.push(new Particle(
        this.x,
        this.y + 20,
        Math.random() * 2 - 1,
        Math.random() * 3 + 2,
        Math.random() * 4 + 2,
        '#ff0055',
        0.05
      ));
    }

    // Draw ship (vector style neon)
    ctx.lineWidth = 2;
    const myColor = isMultiplayer ? PLAYER_COLORS[myPlayerIndex] : '#00ffff';
    ctx.strokeStyle = myColor;
    ctx.fillStyle = '#010f1a';
    ctx.beginPath();
    // Center point tip
    ctx.moveTo(this.x, this.y - 20);
    // Left Wing
    ctx.lineTo(this.x - 20, this.y + 15);
    // Left Inner
    ctx.lineTo(this.x - 6, this.y + 5);
    // Right Inner
    ctx.lineTo(this.x + 6, this.y + 5);
    // Right Wing
    ctx.lineTo(this.x + 20, this.y + 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw player index label above ship in multiplayer
    if (isMultiplayer) {
      ctx.font = "900 10px 'Orbitron'";
      ctx.fillStyle = myColor;
      ctx.textAlign = 'center';
      ctx.fillText(`${myPlayerIndex}P`, this.x, this.y - 26);
    }

    // Core Hitbox Indicator (Glowing red/white dot in center)
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

class PlayerBullet {
  constructor(x, y, vx, vy, color = '#00f3ff') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 4;
    this.damage = 1;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

class PlayerHomingMissile {
  constructor(x, y, vx, vy, color = '#ffd700') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 4;
    this.damage = 1;
    this.dead = false;
    this.timer = 0;
    this.color = color;
  }

  update() {
    this.timer++;
    // Homing logic: find the closest active enemy or boss
    let target = null;
    let minDist = 999999;

    enemies.forEach(e => {
      if (!e.dead && e.y > -10 && e.y < BASE_HEIGHT) {
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
          minDist = dist;
          target = e;
        }
      }
    });

    if (boss && !boss.dead && gameState === STATES.BOSS_BATTLE) {
      const dx = boss.x - this.x;
      const dy = boss.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < minDist) {
        minDist = dist;
        target = boss;
      }
    }

    if (target) {
      // Rotate velocity vector towards target
      const targetDx = target.x - this.x;
      const targetDy = target.y - this.y;
      const targetAngle = Math.atan2(targetDy, targetDx);
      const currentAngle = Math.atan2(this.vy, this.vx);
      
      // Interpolate angle slowly to make it smooth homing
      let angleDiff = targetAngle - currentAngle;
      // Normalize angle diff to -PI to PI
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      
      const turnSpeed = 0.12; // smooth turn rate
      const newAngle = currentAngle + Math.max(-turnSpeed, Math.min(turnSpeed, angleDiff));
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = Math.cos(newAngle) * speed;
      this.vy = Math.sin(newAngle) * speed;
    }

    this.x += this.vx;
    this.y += this.vy;
    
    // Delete if off screen
    if (this.x < -20 || this.x > BASE_WIDTH + 20 || this.y < -20 || this.y > BASE_HEIGHT + 20) {
      this.dead = true;
    }
  }

  draw() {
    // Glowing neon orange/yellow missile trail
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    

  }
}

class PlayerExplosionEffect {
  constructor(x, y, radius, color = '#00ffff') {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = radius;
    this.speed = 6;
    this.alpha = 1;
    this.color = color;
    this.dead = false;
  }

  update() {
    this.radius += this.speed;
    this.alpha = Math.max(0, 1 - (this.radius / this.maxRadius));
    if (this.radius >= this.maxRadius) {
      this.dead = true;
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Outer colored ring
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(1, this.radius - 15), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

class PlayerExplosiveBullet {
  constructor(x, y, vx, vy, powerLevel, color = '#00ffff') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 10; // Large glowing ball
    this.damage = 4; // High direct hit damage
    this.powerLevel = powerLevel;
    this.dead = false;
    this.timer = 0;
    this.exploded = false;
    this.color = color;
  }

  update() {
    this.timer++;
    this.x += this.vx;
    this.y += this.vy;
    
    // Explode automatically near the top of the screen or after 35 frames
    if (this.timer >= 35 && !this.exploded) {
      this.explode();
    }
    
    if (this.x < -20 || this.x > BASE_WIDTH + 20 || this.y < -20 || this.y > BASE_HEIGHT + 20) {
      this.dead = true;
    }
  }

  explode() {
    this.exploded = true;
    this.dead = true;
    Sound.playExplode();
    
    // Calculate range explosion parameters based on powerLevel
    const explosionRadius = this.powerLevel === 1 ? 65 : this.powerLevel === 2 ? 85 : 110;
    const explosionDamage = this.powerLevel === 1 ? 4 : this.powerLevel === 2 ? 7 : 10;

    // Only deal damage if this is not a remote bullet
    if (!this.isRemote) {
      // Deal damage to all enemies in range
      enemies.forEach(e => {
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < explosionRadius + e.width/2) {
          e.takeDamage(explosionDamage);
          if (isMultiplayer) {
            socket.send(JSON.stringify({
              type: 'enemyDamage',
              enemyId: e.id,
              damage: explosionDamage
            }));
          }
        }
      });

      // Deal damage to Boss if in range
      if (boss && !boss.dead && gameState === STATES.BOSS_BATTLE) {
        const dx = boss.x - this.x;
        const dy = boss.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < explosionRadius + boss.width/2) {
          boss.takeDamage(explosionDamage);
          if (isMultiplayer) {
            socket.send(JSON.stringify({
              type: 'bossDamage',
              damage: explosionDamage
            }));
          }
        }
      }
    }

    // Spawn visual explosion effect
    particles.push(new PlayerExplosionEffect(this.x, this.y, explosionRadius, this.color));

    // Spawn spark particles for extra juice
    for (let i = 0; i < 15; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = Math.random() * 5 + 2;
      particles.push(new Particle(
        this.x,
        this.y,
        Math.cos(ang) * sp,
        Math.sin(ang) * sp,
        Math.random() * 4 + 2,
        this.color,
        0.04
      ));
    }
  }

  draw() {
    // Large glowing sphere matching bullet color
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = this.color + '59';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

function spawnFriendlyBullet(x, y, vx, vy, type, color, powerLevel, isRemote = false) {
  let bullet;
  if (type === 'homing') {
    bullet = new PlayerHomingMissile(x, y, vx, vy, color);
  } else if (type === 'split') {
    bullet = new PlayerExplosiveBullet(x, y, vx, vy, powerLevel, color);
  } else {
    bullet = new PlayerBullet(x, y, vx, vy, color);
  }
  bullet.isRemote = isRemote;
  playerBullets.push(bullet);

  // If local player fired and in multiplayer, broadcast
  if (!isRemote && isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'shoot',
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      bulletType: type,
      color: color,
      powerLevel: powerLevel
    }));
  }
}

class SummonedDrone {
  constructor(x, y, powerLevel, ownerIndex = 1) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = -4; // Launches forward
    this.width = 16;
    this.height = 16;
    this.timer = 0;
    this.lifespan = 240; // 4 seconds (240 frames)
    this.dead = false;
    this.shootCooldown = 0;
    this.powerLevel = powerLevel;
    this.ownerIndex = ownerIndex;
    this.color = isMultiplayer ? PLAYER_COLORS[ownerIndex] : '#39ff14';
  }

  update() {
    this.timer++;
    if (this.timer >= this.lifespan) {
      this.dead = true;
      // Explode fade out particles
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const sp = Math.random() * 2 + 1;
        particles.push(new Particle(this.x, this.y, Math.cos(angle) * sp, Math.sin(angle) * sp, 2, this.color, 0.05));
      }
      return;
    }

    // AI: find nearest enemy/boss to target for shooting directions
    let target = null;
    let minDist = 999999;

    enemies.forEach(e => {
      if (!e.dead && e.y > -10 && e.y < BASE_HEIGHT) {
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
          minDist = dist;
          target = e;
        }
      }
    });

    if (boss && !boss.dead && gameState === STATES.BOSS_BATTLE) {
      const dx = boss.x - this.x;
      const dy = boss.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < minDist) {
        minDist = dist;
        target = boss;
      }
    }

    // AI: Float towards target enemy, hovering 100px BELOW it
    if (target) {
      const destX = target.x;
      const destY = Math.min(BASE_HEIGHT - 50, target.y + 100);
      
      this.vx += (destX - this.x) * 0.05;
      this.vy += (destY - this.y) * 0.05;
      
      // Decelerate drift
      this.vx *= 0.85;
      this.vy *= 0.85;
    } else {
      // Just float slowly above owner
      const owner = (this.ownerIndex === myPlayerIndex) ? player : otherPlayers[this.ownerIndex];
      if (owner && owner.lives > 0) {
        const destX = owner.x + Math.sin(this.timer * 0.05) * 40;
        const destY = owner.y - 80;
        this.vx += (destX - this.x) * 0.03;
        this.vy += (destY - this.y) * 0.03;
        this.vx *= 0.88;
        this.vy *= 0.88;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    // Shooting
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else {
      this.shoot(target);
    }
  }

  shoot(target) {
    Sound.playShoot();
    const bSpeed = 10;
    
    // Shoot straight down or towards target
    let tx = 0;
    let ty = -bSpeed; // Fires UP! (friendly bullets fire UP)
    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 0) {
        tx = (dx / dist) * bSpeed;
        ty = (dy / dist) * bSpeed;
      }
    }

    const bulletColor = isMultiplayer ? PLAYER_COLORS[this.ownerIndex] : '#39ff14';
    const isRemote = this.ownerIndex !== myPlayerIndex;
    spawnFriendlyBullet(this.x, this.y, tx, ty, 'normal', bulletColor, this.powerLevel, isRemote);
    
    // Power level controls fire rate
    this.shootCooldown = this.powerLevel === 1 ? 20 : this.powerLevel === 2 ? 15 : 10;
  }

  draw() {
    ctx.strokeStyle = this.color;
    ctx.fillStyle = '#010f05';
    ctx.lineWidth = 1.5;
    
    // Small delta wing subship shape
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 8);
    ctx.lineTo(this.x - 8, this.y + 6);
    ctx.lineTo(this.x, this.y + 2);
    ctx.lineTo(this.x + 8, this.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center glow dot
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Thruster flame
    if (Math.random() < 0.5) {
      particles.push(new Particle(
        this.x,
        this.y + 8,
        -this.vx * 0.2 + (Math.random() * 0.6 - 0.3),
        Math.random() * 2 + 1,
        2,
        '#ffb700',
        0.1
      ));
    }
  }
}
