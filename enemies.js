// Cyber Danmaku - Enemy Subsystems (Regular Enemies, Bosses, and Waves)

class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.timer = 0;
    this.dead = false;

    // Difficulty multipliers
    const diff = currentDifficulty;
    let hpMult = diff === 'normal' ? 1.0 : diff === 'hard' ? 1.5 : 2.2;
    let fireRateMult = diff === 'normal' ? 1.0 : diff === 'hard' ? 1.25 : 1.5;

    // Endless score attack scaling: HP scales continuously by 3% per wave
    if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
      hpMult *= (1.0 + (currentWave - 1) * 0.03);
      fireRateMult *= (1.0 + Math.floor((currentWave - 1) / 10) * 0.1);
    }

    // Story mode stage difficulty scaling
    if (currentPlayMode === 'story') {
      const parts = currentStage.split('-');
      const world = parseInt(parts[0]) || 1;
      const stageNum = parseInt(parts[1]) || 1;

      // Force hard base metrics, World 2 difficulty matches World 1!
      hpMult = 2.2;
      fireRateMult = 1.6;
      
      // Explicit scaling factors (no more weak 0.7x starting multipliers!)
      const hpScaleMap = { 1: 1.00, 2: 1.15, 3: 1.30, 4: 1.45, 5: 1.60 };
      const fireScaleMap = { 1: 1.00, 2: 1.15, 3: 1.30, 4: 1.45, 5: 1.50 };
      
      hpMult *= (hpScaleMap[stageNum] || 1.0);
      fireRateMult *= (fireScaleMap[stageNum] || 1.0);
    }

    // Base type settings
    switch (type) {
      case 'sniper': // purple
        this.width = 30;
        this.height = 30;
        this.maxHp = Math.round(5 * hpMult);
        this.color = '#bd00ff';
        this.points = 150;
        this.shootInterval = Math.round(90 / fireRateMult);
        this.targetY = 120 + Math.random() * 80;
        this.vx = (Math.random() * 2 - 1) * 1.5;
        this.vy = 2;
        break;

      case 'spreader': // green
        this.width = 36;
        this.height = 36;
        this.maxHp = Math.round(15 * hpMult);
        this.color = '#39ff14';
        this.points = 300;
        this.shootInterval = Math.round(130 / fireRateMult);
        this.targetY = 100 + Math.random() * 120;
        this.vx = 0;
        this.vy = 1.5;
        break;

      case 'spiraler': // cyan
        this.width = 32;
        this.height = 32;
        this.maxHp = Math.round(10 * hpMult);
        this.color = '#00ffff';
        this.points = 250;
        
        // Dynamically scale fire rate based on story mode stage index to make early stages easier
        let spiralInterval = 8;
        if (currentPlayMode === 'story') {
          const parts = currentStage.split('-');
          const world = parseInt(parts[0]) || 1;
          const stageNum = parseInt(parts[1]) || 1;
          if (world === 1) {
            if (stageNum === 3) spiralInterval = 16;      // Half the fire density (16 frames)
            else if (stageNum === 4) spiralInterval = 12; // Moderate fire density (12 frames)
          } else {
            if (stageNum === 1) spiralInterval = 12;
            else spiralInterval = 8;
          }
        }
        this.shootInterval = Math.round(spiralInterval / fireRateMult);
        
        this.shootDuration = 80;
        this.shootTimer = 0;
        this.centerX = x;
        this.orbitRadius = 50 + Math.random() * 60;
        this.orbitSpeed = 0.02 + Math.random() * 0.015;
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.vy = 1;
        this.vx = (Math.random() * 2 - 1) * 0.5; // Orbit center drift velocity
        this.targetY = 100 + Math.random() * 100; // Hover target height
        break;

      case 'waver': // yellow
        this.width = 32;
        this.height = 32;
        this.maxHp = Math.round(12 * hpMult);
        this.color = '#ffb700';
        this.points = 200;
        this.shootInterval = Math.round(36 / fireRateMult);
        this.targetY = 150 + Math.random() * 100;
        this.waveSpeed = 0.04;
        this.vx = 2.5;
        this.vy = 1.2;
        break;

      case 'burster': // red
        this.width = 28;
        this.height = 28;
        this.maxHp = Math.round(3.0 * hpMult);
        this.color = '#ff0055';
        this.points = 180;
        this.shootInterval = Math.round(100 / fireRateMult);
        this.vy = 4; // Fast entry
        this.vx = 0;
        this.burstCount = 0;
        this.burstCooldown = 0;
        break;

      case 'suicider': // orange, suicide bomber
        this.width = 30;
        this.height = 30;
        this.maxHp = Math.round(0.9 * hpMult);
        this.color = '#ff5500';
        this.points = 250;
        this.shootInterval = 999999; // Do not fire normal bullets
        this.vy = 2.0;
        this.vx = (Math.random() * 2 - 1) * 0.8;
        this.suicideTimer = 180; // 3 seconds to detonate
        break;
      case 'splitter': // magenta, fires splitting bullets
        this.width = 32;
        this.height = 32;
        this.maxHp = Math.round(10 * hpMult);
        this.color = '#ff007f';
        this.points = 280;
        this.shootInterval = Math.round(110 / fireRateMult);
        this.targetY = 80 + Math.random() * 90;
        this.vy = 1.8;
        this.vx = (Math.random() * 2 - 1) * 0.6;
        break;

      case 'solar_spark': // orange, fast speed
        this.width = 24;
        this.height = 24;
        this.maxHp = Math.round(5 * hpMult);
        this.color = '#ff4400';
        this.points = 180;
        this.shootInterval = Math.round(70 / fireRateMult);
        this.vy = 3.5;
        this.vx = 2.5; // zig-zag velocity
        this.targetY = 180;
        break;

      case 'corona_bomber': // yellow-orange, heavy
        this.width = 38;
        this.height = 38;
        this.maxHp = Math.round(20 * hpMult);
        this.color = '#ffaa00';
        this.points = 400;
        this.shootInterval = Math.round(120 / fireRateMult);
        this.targetY = 90 + Math.random() * 60;
        this.vx = 0.5;
        this.vy = 1.0;
        break;

      case 'prominence_shield': // gold, shield active
        this.width = 32;
        this.height = 32;
        this.maxHp = Math.round(15 * hpMult);
        this.color = '#ffd700';
        this.points = 350;
        this.shootInterval = Math.round(140 / fireRateMult);
        this.targetY = 80 + Math.random() * 80;
        this.vx = 0.8;
        this.vy = 1.2;
        this.shieldHp = Math.round(15 * hpMult); // Shield value
        this.maxShieldHp = this.shieldHp;
        break;
    }
    this.hp = this.maxHp;
    this.shootCooldown = Math.random() * 30 + 10; // offset fire timers
  }

  takeDamage(amt) {
    if (this.type === 'prominence_shield' && this.shieldHp > 0) {
      this.shieldHp -= amt;
      Sound.playBossHit();
      if (this.shieldHp < 0) {
        this.hp += this.shieldHp;
        this.shieldHp = 0;
      }
      if (this.shieldHp === 0) {
        for (let i = 0; i < 8; i++) {
          particles.push(new Particle(this.x, this.y, Math.random() * 4 - 2, Math.random() * 4 - 2, 3, '#00ffff', 0.05));
        }
      }
    } else {
      this.hp -= amt;
    }
    Sound.playBossHit(); // Soft hit sound
    if (this.hp <= 0) {
      this.dead = true;
      this.explode();
    }
  }

  explode() {
    Sound.playExplode();
    score += this.points;
    updateHUD();

    // Spawn score popup indicator
    particles.push(new ScoreText(this.x, this.y, this.points));

    // Award gold (10% of points)
    const goldEarned = Math.round(this.points * 0.1);
    addGold(goldEarned, this.x, this.y);

    // Spawn item drop occasionally (Only on Host in multiplayer)
    if (!isMultiplayer || isHost) {
      const dropRoll = Math.random();
      if (dropRoll < 0.18) { // 18% drop rate
        let itemType = 'power';
        let itemColor = '#ffb700'; // Yellow P
        const typeRoll = Math.random();
        if (typeRoll < 0.5) {
          itemType = 'power';
          itemColor = '#ffb700';
        } else if (typeRoll < 0.8) {
          itemType = 'shield';
          itemColor = '#00ffff'; // Cyan S
        } else {
          itemType = 'heal';
          itemColor = '#39ff14'; // Green H
        }
        const itemId = 'item_' + nextItemId++;
        if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'spawnItem',
            itemId: itemId,
            itemType: itemType,
            color: itemColor,
            x: this.x,
            y: this.y
          }));
        }
        const item = new Item(this.x, this.y, itemType, itemColor);
        item.id = itemId;
        items.push(item);
      }
    }

    // Spawn explosion debris
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push(new Particle(
        this.x,
        this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() * 4 + 1.5,
        this.color,
        0.03
      ));
    }
  }

  suicideExplode() {
    this.dead = true;
    Sound.playExplode();
    triggerScreenShake(20, 6);

    // Spawn massive warning debris
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particles.push(new Particle(
        this.x,
        this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() * 5 + 2,
        '#ff1a00',
        0.02
      ));
    }

    // High density full 360-degree ring bullet spread (24 bullets base, scales up in Endless)
    let bulletCount = 24;
    if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
      bulletCount = 24 + Math.min(3, Math.floor((currentWave - 1) / 10)) * 4; // 24, 28, 32, 36 max
    }
    const rSpeed = 3.5;
    for (let i = 0; i < bulletCount; i++) {
      const angle = (Math.PI * 2 / bulletCount) * i;
      enemyBullets.push(new EnemyBullet(
        this.x,
        this.y,
        Math.cos(angle) * rSpeed,
        Math.sin(angle) * rSpeed,
        6.5,
        '#ff003c'
      ));
    }
  }

  update() {
    this.timer++;

    // Movement AI
    switch (this.type) {
      case 'sniper':
        if (this.y < this.targetY) {
          this.y += this.vy;
        } else {
          this.x += this.vx;
          if (this.x < 50 || this.x > BASE_WIDTH - 50) {
            this.vx *= -1;
          }
        }
        break;

      case 'spreader':
        if (this.y < this.targetY) {
          this.y += this.vy;
        }
        break;

      case 'spiraler':
        // Orbit in a circle and hover at targetY (stop dropping down)
        this.orbitAngle += this.orbitSpeed;
        this.centerX += this.vx;
        if (this.y < this.targetY) {
          this.y += this.vy;
        }
        this.x = this.centerX + Math.cos(this.orbitAngle) * this.orbitRadius;
        
        if (this.x < 30 || this.x > BASE_WIDTH - 30) {
          this.vx *= -1;
        }
        break;

      case 'waver':
        if (this.y < this.targetY) {
          this.y += this.vy;
        } else {
          // Sway left and right
          this.x += this.vx;
          if (this.x < 40 || this.x > BASE_WIDTH - 40) {
            this.vx *= -1;
          }
        }
        break;

      case 'burster':
        // Rushes in, slows down, fires, then rushes away
        if (this.timer < 50) {
          this.y += this.vy;
          this.vy *= 0.95; // decelerate
        } else if (this.timer > 150) {
          this.vy = Math.min(this.vy + 0.2, 7);
          this.y += this.vy;
        }
        break;

      case 'suicider':
        // Move downwards and bounce on walls, detonate when timer hits zero
        this.y += this.vy;
        this.x += this.vx;
        if (this.x < 30 || this.x > BASE_WIDTH - 30) {
          this.vx *= -1;
        }
        
        this.suicideTimer--;
        if (this.suicideTimer <= 0 && !this.dead) {
          this.suicideExplode();
        }
        break;



      case 'splitter':
        // Hover at targetY, then drift left/right
        if (this.y < this.targetY) {
          this.y += this.vy;
        } else {
          this.x += this.vx;
          if (this.x < 40 || this.x > BASE_WIDTH - 40) {
            this.vx *= -1;
          }
        }
        break;

      case 'solar_spark':
        // zig-zag down
        this.y += this.vy;
        this.x += this.vx;
        if (this.x < 30 || this.x > BASE_WIDTH - 30) {
          this.vx *= -1;
        }
        break;

      case 'corona_bomber':
        // slow hover entry
        if (this.y < this.targetY) {
          this.y += this.vy;
        } else {
          this.x += this.vx;
          if (this.x < 60 || this.x > BASE_WIDTH - 60) {
            this.vx *= -1;
          }
        }
        break;

      case 'prominence_shield':
        // hover and move slowly side to side
        if (this.y < this.targetY) {
          this.y += this.vy;
        } else {
          this.x += this.vx;
          if (this.x < 50 || this.x > BASE_WIDTH - 50) {
            this.vx *= -1;
          }
        }
        break;
    }

    // Shooting AI
    if (this.y > 0 && this.y < BASE_HEIGHT - 50 && this.x > 0 && this.x < BASE_WIDTH) {
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else {
        this.fire();
      }
    }

    // Remove if off screen after entering
    if (this.y > BASE_HEIGHT + 50) {
      this.dead = true;
    }
  }

  fire() {
    const diff = currentDifficulty;
    let speedMult = diff === 'normal' ? 1.0 : diff === 'hard' ? 1.25 : 1.5;

    // Story mode stage bullet speed scaling
    if (currentPlayMode === 'story') {
      speedMult = 1.4; 
    }

    const parts = currentStage.split('-');
    const world = parseInt(parts[0]) || 1;
    const stageNum = parseInt(parts[1]) || 1;

    switch (this.type) {
      case 'sniper':
        // Fired aimed bullet at player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const bulletSpeed = 4 * speedMult;
        
        if (dist > 0) {
          if (currentPlayMode === 'story') {
            // Stage 1-1, 1-2: 1 aimed bullet. Stage 1-3+: 3-way aimed. World 2 goes up to 5-way.
            if (world === 1 && stageNum <= 2) {
              enemyBullets.push(new EnemyBullet(this.x, this.y, (dx / dist) * bulletSpeed, (dy / dist) * bulletSpeed, 6, '#bd00ff'));
            } else {
              const baseAngle = Math.atan2(dy, dx);
              const count = (world === 2 && stageNum >= 3) ? 5 : 3;
              const spread = (world === 2 && stageNum >= 3) ? 8 : 12; // degrees spread
              for (let i = 0; i < count; i++) {
                const angle = baseAngle + (i - (count - 1) / 2) * (spread * Math.PI / 180);
                enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed, 6, '#bd00ff'));
              }
            }
          } else {
            // Score Attack logic
            if (diff === 'normal') {
              if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
                const baseAngle = Math.atan2(dy, dx);
                const count = 1 + Math.min(3, Math.floor((currentWave - 1) / 10)) * 2; // 1, 3, 5, 7 bullets
                const spread = count === 1 ? 0 : count === 3 ? 12 : count === 5 ? 8 : 6;
                for (let i = 0; i < count; i++) {
                  const angle = baseAngle + (i - (count - 1) / 2) * (spread * Math.PI / 180);
                  enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed, 6, '#bd00ff'));
                }
              } else {
                enemyBullets.push(new EnemyBullet(this.x, this.y, (dx / dist) * bulletSpeed, (dy / dist) * bulletSpeed, 6, '#bd00ff'));
              }
            } else {
              const baseAngle = Math.atan2(dy, dx);
              const count = diff === 'hard' ? 3 : 5;
              const spread = diff === 'hard' ? 12 : 8; // degrees spread
              for (let i = 0; i < count; i++) {
                const angle = baseAngle + (i - (count - 1) / 2) * (spread * Math.PI / 180);
                enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed, 6, '#bd00ff'));
              }
            }
          }
        }
        this.shootCooldown = this.shootInterval;
        break;

      case 'spreader':
        // Fires expanding ring of bullets (scaled by stage in story mode)
        let ringCount = diff === 'normal' ? 12 : diff === 'hard' ? 18 : 24;
        if (currentPlayMode === 'story') {
          if (world === 1) {
            const ringCountMap = { 1: 8, 2: 10, 3: 12, 4: 15, 5: 18 };
            ringCount = ringCountMap[stageNum] || 18;
          } else {
            const ringCountMap = { 1: 14, 2: 16, 3: 18, 4: 20, 5: 24 };
            ringCount = ringCountMap[stageNum] || 24;
          }
        } else if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
          ringCount = 12 + Math.min(6, Math.floor((currentWave - 1) / 10)) * 2; // 12, 14, 16, 18, 20, 22, 24 bullets max
        }
        const rSpeed = 2.2 * speedMult;
        for (let i = 0; i < ringCount; i++) {
          const angle = (Math.PI * 2 / ringCount) * i + (this.timer * 0.05); // slight offset over time
          enemyBullets.push(new EnemyBullet(
            this.x,
            this.y,
            Math.cos(angle) * rSpeed,
            Math.sin(angle) * rSpeed,
            5.5,
            '#39ff14'
          ));
        }
        this.shootCooldown = this.shootInterval;
        break;

      case 'spiraler':
        // Rapid spinning fire
        const spiralSpeed = 3.0 * speedMult;
        const spiralAngle = this.timer * 0.15;
        
        // Double spiral (Story Mode: Stage 1-5+, Score Attack: non-normal difficulty)
        let doubleSpiral = diff !== 'normal';
        if (currentPlayMode === 'story') {
          doubleSpiral = (world === 1 && stageNum >= 5) || (world === 2 && stageNum >= 3);
        }

        if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
          const ways = 1 + Math.min(3, Math.floor((currentWave - 1) / 10)); // 1, 2, 3, 4 streams max
          for (let w = 0; w < ways; w++) {
            const ang = spiralAngle + (Math.PI * 2 / ways) * w;
            enemyBullets.push(new EnemyBullet(
              this.x,
              this.y,
              Math.cos(ang) * spiralSpeed,
              Math.sin(ang) * spiralSpeed,
              5,
              '#00ffff'
            ));
          }
        } else {
          enemyBullets.push(new EnemyBullet(
            this.x,
            this.y,
            Math.cos(spiralAngle) * spiralSpeed,
            Math.sin(spiralAngle) * spiralSpeed,
            5,
            '#00ffff'
          ));
          if (doubleSpiral) {
            enemyBullets.push(new EnemyBullet(
              this.x,
              this.y,
              Math.cos(spiralAngle + Math.PI) * spiralSpeed,
              Math.sin(spiralAngle + Math.PI) * spiralSpeed,
              5,
              '#00ffff'
            ));
          }
        }
        this.shootCooldown = this.shootInterval;
        break;

      case 'waver':
        // Swaying bullets
        const waverSpeed = 1.6 * speedMult;
        const shootAngle = Math.PI / 2 + Math.sin(this.timer * 0.1) * 0.5; // oscillate angle
        if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
          const count = 1 + Math.min(3, Math.floor((currentWave - 1) / 10)); // 1, 2, 3, 4 streams max
          const spread = 12;
          for (let i = 0; i < count; i++) {
            const angle = shootAngle + (i - (count - 1) / 2) * (spread * Math.PI / 180);
            enemyBullets.push(new EnemyBullet(
              this.x,
              this.y,
              Math.cos(angle) * waverSpeed,
              Math.sin(angle) * waverSpeed,
              5,
              '#ffb700',
              'waver'
            ));
          }
        } else {
          enemyBullets.push(new EnemyBullet(
            this.x,
            this.y,
            Math.cos(shootAngle) * waverSpeed,
            Math.sin(shootAngle) * waverSpeed,
            5,
            '#ffb700',
            'waver'
          ));
        }
        this.shootCooldown = this.shootInterval;
        break;

      case 'burster':
        // Fast burst shots at player
        let maxBurst = 3;
        if (currentPlayMode === 'story') {
          if (world === 1) {
            if (stageNum <= 2) maxBurst = 2;
          } else {
            maxBurst = stageNum >= 3 ? 4 : 3;
          }
        } else if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
          maxBurst = 3 + Math.min(3, Math.floor((currentWave - 1) / 10)); // 3, 4, 5, 6 bursts max
        }
        if (this.burstCount < maxBurst) {
          const bDx = player.x - this.x;
          const bDy = player.y - this.y;
          const bDist = Math.sqrt(bDx * bDx + bDy * bDy);
          const bSpeed = 5 * speedMult;
          if (bDist > 0) {
            enemyBullets.push(new EnemyBullet(
              this.x,
              this.y,
              (bDx / bDist) * bSpeed,
              (bDy / bDist) * bSpeed,
              5,
              '#ff0055'
            ));
          }
          this.burstCount++;
          this.shootCooldown = 8; // Quick fire during burst
        } else {
          this.burstCount = 0;
          this.shootCooldown = this.shootInterval; // Heavy reload time
        }
        break;

      case 'splitter':
        // Fires slow split bullet targeted at player
        const sDx = player.x - this.x;
        const sDy = player.y - this.y;
        const sDist = Math.sqrt(sDx * sDx + sDy * sDy);
        const sSpeed = 3.5 * speedMult;
        if (sDist > 0) {
          if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
            const baseAngle = Math.atan2(sDy, sDx);
            const count = 1 + Math.min(2, Math.floor((currentWave - 1) / 10)); // 1, 2, 3 split bullets max
            const spread = 12;
            for (let i = 0; i < count; i++) {
              const angle = baseAngle + (i - (count - 1) / 2) * (spread * Math.PI / 180);
              enemyBullets.push(new EnemyBullet(
                this.x,
                this.y,
                Math.cos(angle) * sSpeed,
                Math.sin(angle) * sSpeed,
                7,
                '#ff007f',
                'split'
              ));
            }
          } else {
            enemyBullets.push(new EnemyBullet(
              this.x,
              this.y,
              (sDx / sDist) * sSpeed,
              (sDy / sDist) * sSpeed,
              7,
              '#ff007f',
              'split'
            ));
          }
        }
        this.shootCooldown = this.shootInterval;
        break;

      case 'solar_spark':
        // fast 3-way shot downward
        const sparkSpeed = 5.0 * speedMult;
        const sparkBaseAngle = Math.PI / 2;
        let sparkCount = 3;
        if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
          sparkCount = 3 + Math.min(3, Math.floor((currentWave - 1) / 10)); // 3, 4, 5, 6 spread max
        }
        const sparkSpread = 15; // degrees spread
        for (let i = 0; i < sparkCount; i++) {
          const angle = sparkBaseAngle + (i - (sparkCount - 1) / 2) * (sparkSpread * Math.PI / 180);
          enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * sparkSpeed, Math.sin(angle) * sparkSpeed, 5, '#ff4400'));
        }
        this.shootCooldown = this.shootInterval;
        break;

      case 'corona_bomber':
        // 8-way splitting burst
        const cbSpeed = 2.0 * speedMult;
        let cbCount = 8;
        if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
          cbCount = 8 + Math.min(3, Math.floor((currentWave - 1) / 10)) * 2; // 8, 10, 12, 14 way max
        }
        for (let i = 0; i < cbCount; i++) {
          const angle = (Math.PI * 2 / cbCount) * i;
          enemyBullets.push(new EnemyBullet(
            this.x,
            this.y,
            Math.cos(angle) * cbSpeed,
            Math.sin(angle) * cbSpeed,
            7,
            '#ffaa00',
            'split'
          ));
        }
        this.shootCooldown = this.shootInterval;
        break;

      case 'prominence_shield':
        // 5 giant bouncing balls
        const psSpeed = 2.5 * speedMult;
        let psCount = 5;
        if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
          psCount = 5 + Math.min(3, Math.floor((currentWave - 1) / 10)); // 5, 6, 7, 8 spread max
        }
        for (let i = 0; i < psCount; i++) {
          const angle = Math.PI / 2 + (i - (psCount - 1) / 2) * (15 * Math.PI / 180);
          enemyBullets.push(new EnemyBullet(
            this.x,
            this.y,
            Math.cos(angle) * psSpeed,
            Math.sin(angle) * psSpeed,
            9,
            '#ffd700',
            'bounce',
            2 // 2 bounces
          ));
        }
        this.shootCooldown = this.shootInterval;
        break;
    }
  }

  draw() {


    ctx.strokeStyle = this.color;
    ctx.fillStyle = '#050510';
    ctx.lineWidth = 2;
    
    // Custom vector shapes for enemies
    ctx.beginPath();
    switch (this.type) {
      case 'sniper':
        ctx.moveTo(this.x, this.y + 15);
        ctx.lineTo(this.x - 15, this.y - 10);
        ctx.lineTo(this.x, this.y - 5);
        ctx.lineTo(this.x + 15, this.y - 10);
        break;

      case 'spreader':
        ctx.moveTo(this.x - 15, this.y - 15);
        ctx.lineTo(this.x + 15, this.y - 15);
        ctx.lineTo(this.x + 15, this.y + 15);
        ctx.lineTo(this.x - 15, this.y + 15);
        break;

      case 'spiraler':
        // Diamond shape
        ctx.moveTo(this.x, this.y - 16);
        ctx.lineTo(this.x + 16, this.y);
        ctx.lineTo(this.x, this.y + 16);
        ctx.lineTo(this.x - 16, this.y);
        break;

      case 'waver':
        // Hexagon
        ctx.moveTo(this.x, this.y - 15);
        ctx.lineTo(this.x + 15, this.y - 7);
        ctx.lineTo(this.x + 15, this.y + 7);
        ctx.lineTo(this.x, this.y + 15);
        ctx.lineTo(this.x - 15, this.y + 7);
        ctx.lineTo(this.x - 15, this.y - 7);
        break;

      case 'burster':
        // Downward pointing arrow
        ctx.moveTo(this.x, this.y + 15);
        ctx.lineTo(this.x - 14, this.y - 12);
        ctx.lineTo(this.x, this.y - 4);
        ctx.lineTo(this.x + 14, this.y - 12);
        break;

      case 'suicider':
        // Orange diamond warning shape
        ctx.moveTo(this.x, this.y - 15);
        ctx.lineTo(this.x + 15, this.y);
        ctx.lineTo(this.x, this.y + 15);
        ctx.lineTo(this.x - 15, this.y);
        
        // Fast flashing orange/red/white when close to self-destruction
        if (this.suicideTimer < 60 && Math.floor(this.suicideTimer / 4) % 2 === 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.fillStyle = '#ff1a00';
        } else {
          ctx.strokeStyle = '#ff5500';
          ctx.fillStyle = '#1a0500';
        }
        break;
      case 'splitter': // butterfly shape
        ctx.moveTo(this.x - 15, this.y - 12);
        ctx.lineTo(this.x, this.y - 2);
        ctx.lineTo(this.x + 15, this.y - 12);
        ctx.lineTo(this.x + 8, this.y + 12);
        ctx.lineTo(this.x - 8, this.y + 12);
        break;

      case 'solar_spark':
        // Fast triangle/arrow
        ctx.moveTo(this.x, this.y + 12);
        ctx.lineTo(this.x - 12, this.y - 12);
        ctx.lineTo(this.x, this.y - 4);
        ctx.lineTo(this.x + 12, this.y - 12);
        break;

      case 'corona_bomber':
        // spiked circle (sun-like)
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i + (this.timer * 0.02);
          ctx.lineTo(this.x + Math.cos(angle) * 19, this.y + Math.sin(angle) * 19);
          ctx.lineTo(this.x + Math.cos(angle + 0.39) * 13, this.y + Math.sin(angle + 0.39) * 13);
        }
        break;

      case 'prominence_shield':
        // Hexagon
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i;
          ctx.lineTo(this.x + Math.cos(angle) * 16, this.y + Math.sin(angle) * 16);
        }
        break;
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // HP bar for green/heavy enemies
    if (this.hp < this.maxHp) {
      const barW = this.width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(this.x - barW / 2, this.y - this.height / 2 - 10, barW, 4);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - barW / 2, this.y - this.height / 2 - 10, barW * (this.hp / this.maxHp), 4);
    }

    // Draw Shield Ring for prominence_shield
    if (this.type === 'prominence_shield' && this.shieldHp > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 22 + Math.sin(this.timer * 0.1) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 + (this.shieldHp / this.maxShieldHp) * 0.4})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

class EnemyBullet {
  constructor(x, y, vx, vy, radius, color, type = 'normal', bouncesLeft = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.type = type;
    this.timer = 0;
    this.dead = false;
    this.grazed = false;
    this.bouncesLeft = bouncesLeft;
    this.splitDone = false;
  }

  update() {
    this.timer++;

    if (this.type === 'waver') {
      // Add sign wave sway sideways to their speed vector
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      // perpendicular vector
      const px = -this.vy / (speed || 1);
      const py = this.vx / (speed || 1);
      const sway = Math.sin(this.timer * 0.08) * 1.5;
      
      this.x += this.vx + px * sway;
      this.y += this.vy + py * sway;
    } else if (this.type === 'split' && !this.splitDone) {
      // Slow down, then split into smaller bullets
      this.vx *= 0.92;
      this.vy *= 0.92;
      
      if (Math.abs(this.vx) < 0.15 && Math.abs(this.vy) < 0.15) {
        this.splitDone = true;
        this.dead = true;
        
        // Spawn smaller bullets in a ring
        const count = currentDifficulty === 'normal' ? 6 : currentDifficulty === 'hard' ? 8 : 10;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i;
          const sp = 2.5;
          enemyBullets.push(new EnemyBullet(
            this.x,
            this.y,
            Math.cos(angle) * sp,
            Math.sin(angle) * sp,
            4,
            '#ff007f' // Magenta split bullets
          ));
        }
      } else {
        this.x += this.vx;
        this.y += this.vy;
      }
    } else if (this.type === 'bounce') {
      this.x += this.vx;
      this.y += this.vy;
      // Bounce off walls
      if (this.x < this.radius || this.x > BASE_WIDTH - this.radius) {
        if (this.bouncesLeft > 0) {
          this.vx *= -1;
          this.bouncesLeft--;
          this.color = '#ffb700'; // Flash color on bounce
        }
      }
    } else if (this.type === 'explode_wall') {
      this.x += this.vx;
      this.y += this.vy;
      
      // Explode on hitting left, right, or bottom boundaries
      if (this.x < this.radius || this.x > BASE_WIDTH - this.radius || this.y > BASE_HEIGHT - this.radius) {
        this.dead = true;
        
        const count = currentDifficulty === 'normal' ? 8 : currentDifficulty === 'hard' ? 12 : 16;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i;
          const sp = 2.2;
          enemyBullets.push(new EnemyBullet(
            this.x,
            this.y,
            Math.cos(angle) * sp,
            Math.sin(angle) * sp,
            4,
            '#ff0055' // Red sparks
          ));
        }
        Sound.playExplode();
      }
    } else if (this.type === 'delayed_homing') {
      if (this.timer < 30) {
        this.x += this.vx;
        this.y += this.vy;
      } else if (this.timer < 65) {
        this.vx *= 0.85;
        this.vy *= 0.85;
        this.x += this.vx;
        this.y += this.vy;
      } else if (this.timer === 65) {
        const dx = player ? player.x - this.x : 0;
        const dy = player ? player.y - this.y : BASE_HEIGHT;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const sp = currentDifficulty === 'normal' ? 3.0 : currentDifficulty === 'hard' ? 4.2 : 5.4;
        if (dist > 0) {
          this.vx = (dx / dist) * sp;
          this.vy = (dy / dist) * sp;
        } else {
          this.vy = sp;
        }
      } else {
        this.x += this.vx;
        this.y += this.vy;
      }
    } else {
      this.x += this.vx;
      this.y += this.vy;
    }

    // Delete if way off screen
    if (this.x < -30 || this.x > BASE_WIDTH + 30 || this.y < -30 || this.y > BASE_HEIGHT + 30) {
      this.dead = true;
    }
  }

  draw() {
    // Neon core-glow drawing logic
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

class Boss {
  constructor(difficulty) {
    this.x = BASE_WIDTH / 2;
    this.y = -100;
    this.targetY = 150;
    this.width = 100;
    this.height = 70;
    this.timer = 0;
    this.dead = false;

    // Boss configuration (story mode boss is always hard mode specs)
    this.difficulty = currentPlayMode === 'story' ? 'hard' : difficulty;
    
    // Set max phases
    if (this.difficulty === 'normal') this.maxPhases = 1;
    else this.maxPhases = 3;
    
    this.currentPhase = 1;
    this.isStarLight = (currentPlayMode === 'story' && currentStage === '2-5') ||
                       (currentPlayMode === 'score_attack' && scoreAttackType === 'boss_rush' && bossRushIndex === 2);
    this.isProminenceFlare = (currentPlayMode === 'story' && currentStage === '3-5') ||
                             (currentPlayMode === 'score_attack' && scoreAttackType === 'boss_rush' && bossRushIndex === 3);
    
    if (this.isStarLight) {
      this.color = '#ffd700';
    } else if (this.isProminenceFlare) {
      this.color = '#ff5500';
    } else {
      this.color = '#ff007f';
    }

    // Base Hp is 500 for all phases (no increase per phase or endless loops)
    this.maxHp = 500;
    this.hp = this.maxHp;

    // Movement speeds
    this.vx = 2;
    this.vy = 1.5;

    this.bulletTimer = 0;
    this.patternState = 0;
  }

  takeDamage(amt) {
    this.hp -= amt;
    Sound.playBossHit();

    if (this.hp <= 0) {
      this.phaseCleared();
    }
  }

  phaseCleared() {
    Sound.playBossExplode();
    triggerScreenShake(40, 10);
    
    // Spawn massive burst particles
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      particles.push(new Particle(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 6 + 2, this.color, 0.015));
    }

    // Convert all screen bullets to score
    enemyBullets.forEach(b => {
      particles.push(new Particle(b.x, b.y, 0, -1.5, 5, '#ffb700', 0.03, 'score'));
      score += 15;
    });
    enemyBullets = [];

    if (this.currentPhase < this.maxPhases) {
      this.currentPhase++;
      
      // Update color based on phase
      if (this.isStarLight) {
        const starColors = { 2: '#00f3ff', 3: '#ffffff' };
        this.color = starColors[this.currentPhase] || '#ffd700';
      } else if (this.isProminenceFlare) {
        const flareColors = { 2: '#ff8800', 3: '#ff3300' };
        this.color = flareColors[this.currentPhase] || '#ff5500';
        if (this.currentPhase === 3) {
          this.targetY = 320;
        }
      } else {
        const colors = { 2: '#bd00ff', 3: '#ffb700', 4: '#39ff14', 5: '#00ffff' };
        this.color = colors[this.currentPhase] || '#ff007f';
      }

      // Refill Hp for next phase (all phases have the same 500 HP)
      this.maxHp = 500;
      this.hp = this.maxHp;
      this.timer = 0;

      // Reward player with a bomb or extra life (story mode bomb capacity is limited to 1)
      const maxBombsLimit = currentPlayMode === 'story' ? 1 : 5;
      if (player.bombs < maxBombsLimit) player.bombs++;
      else if (player.lives < 5) player.lives++;
      
      updateHUD();
      
      // Flash screen red/white
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(0,0,BASE_WIDTH,BASE_HEIGHT);
      
      // Award gold for phase clear: 200 G
      addGold(200, this.x, this.y);
    } else {
      this.dead = true;
      this.bossDefeated();
    }
  }

  bossDefeated() {
    // Spawn HP item in Boss Rush when boss is defeated (Only on Host in multiplayer)
    if (currentPlayMode === 'score_attack' && scoreAttackType === 'boss_rush') {
      if (!isMultiplayer || isHost) {
        const itemId = 'item_' + nextItemId++;
        const newItem = new Item(this.x, this.y, 'heal', '#39ff14');
        newItem.id = itemId;
        items.push(newItem);
        
        if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'spawnItem',
            itemId: itemId,
            itemType: 'heal',
            color: '#39ff14',
            x: this.x,
            y: this.y
          }));
        }
      }
    }

    // Award gold for boss defeat: 1500 G
    addGold(1500, this.x, this.y);
    // Normal/Hard Victory or Story Mode Victory
    score += 10000;
    updateHUD();
    if (currentPlayMode === 'story') {
      if (currentStage === '1-5' || currentStage === '2-5') {
        stageClear();
      } else if (currentStage === '3-5') {
        localStorage.setItem('danmaku_story_cleared', 'true');
        victory();
      }
    } else if (currentPlayMode === 'score_attack' && scoreAttackType === 'boss_rush') {
      if (bossRushIndex < 3) {
        bossRushIndex++;
        // Proceed to next boss
        gameState = STATES.PLAYING;
        waveTimer = 0;
        waveEnemiesSpawned = 0;
        waveFinishedSpawning = false;
        waveTransitionTimer = 0;
        particles.push(new ScoreText(BASE_WIDTH / 2, BASE_HEIGHT / 2 - 50, `BOSS DEFEATED!`, '#39ff14', 1.5));
        bossRushTransitionTimer = 120; // 2 seconds delay
      } else {
        victory();
      }
    } else {
      victory();
    }
    boss = null; // Clean reference!
  }

  update() {
    this.timer++;
    this.bulletTimer++;

    // Hover entry from top
    if (this.y < this.targetY) {
      this.y += this.vy;
      return; // Wait until fully entered to shoot
    }

    // Side to side movement
    if (this.isProminenceFlare && (this.currentPhase === 1 || this.currentPhase === 3)) {
      // Stay in center
      this.x += (BASE_WIDTH / 2 - this.x) * 0.1;
    } else {
      this.x += this.vx;
      if (this.x < 100 || this.x > BASE_WIDTH - 100) {
        this.vx *= -1;
      }
    }
    
    // Hover slightly up and down (Disabled for Prominence Flare)
    if (this.isProminenceFlare) {
      this.y = this.targetY;
    } else {
      this.y = this.targetY + Math.sin(this.timer * 0.02) * 15;
    }

    // Bullet Firing Logic per Phase
    this.firePatterns();
  }

  firePatterns() {
    const diff = this.difficulty;
    const speedMult = (diff === 'normal' ? 1.0 : diff === 'hard' ? 1.25 : 1.5);
    
    if (this.isStarLight) {
      this.fireStarLightPatterns(diff, speedMult);
      return;
    }
    if (this.isProminenceFlare) {
      this.fireProminenceFlarePatterns(diff, speedMult);
      return;
    }

    // Choose attack logic based on current phase
    switch (this.currentPhase) {
      case 1:
        // Expanding Rings + Targeted spreads (count and ways scale)
        if (this.bulletTimer % 60 === 0) {
          const count = diff === 'normal' ? 16 : diff === 'hard' ? 24 : 32;
          const speed = 2.4 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6, '#ff007f'));
          }
        }
        
        if (this.bulletTimer % 90 === 30) {
          // aimed spreads
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 0) {
            const baseAngle = Math.atan2(dy, dx);
            const speed = 3.5 * speedMult;
            const ways = diff === 'normal' ? 3 : diff === 'hard' ? 5 : 7;
            const spread = diff === 'normal' ? 15 : diff === 'hard' ? 12 : 9;
            for (let i = 0; i < ways; i++) {
              const angle = baseAngle + (i - (ways - 1) / 2) * (spread * Math.PI / 180);
              enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6.5, '#00ffff'));
            }
          }
        }

        // Bouncing Wall Bullets (left & right)
        if (this.bulletTimer % 180 === 120) {
          const count = diff === 'normal' ? 6 : diff === 'hard' ? 10 : 16;
          const sp = 1.8 * speedMult;
          for (let i = 0; i < count; i++) {
            // Left spray
            const angleLeft = Math.PI - Math.PI/4 + (Math.PI/2) * (i / (count - 1));
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angleLeft) * sp, Math.sin(angleLeft) * sp, 6, '#ffb700', 'bounce', 2));
            // Right spray
            const angleRight = -Math.PI/4 + (Math.PI/2) * (i / (count - 1));
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angleRight) * sp, Math.sin(angleRight) * sp, 6, '#ffb700', 'bounce', 2));
          }
        }
        break;

      case 2:
        // Rotating multi-lasers + aimed green bursts
        const laserSpeed = 3.6 * speedMult;
        const rotateSpeed = (diff === 'normal' ? 0.045 : diff === 'hard' ? 0.06 : 0.075) * speedMult;
        const baseAngle = this.timer * rotateSpeed;
        
        // Multi-stream lasers (Normal: 2, Hard: 3, Endless: 4 streams)
        if (this.bulletTimer % 3 === 0) {
          const streams = diff === 'normal' ? 2 : diff === 'hard' ? 3 : 4;
          for (let s = 0; s < streams; s++) {
            const ang = baseAngle + (Math.PI * 2 / streams) * s;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(ang) * laserSpeed, Math.sin(ang) * laserSpeed, 5, '#bd00ff'));
          }
        }

        // aimed bursts
        if (this.bulletTimer % 80 === 0) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const bSp = 4.2 * speedMult;
          if (dist > 0) {
            enemyBullets.push(new EnemyBullet(this.x, this.y, (dx / dist) * bSp, (dy / dist) * bSp, 6, '#39ff14'));
          }
        }

        // Large Exploding Wall Bullets
        if (this.bulletTimer % 150 === 75) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 0) {
            const targetAngle = Math.atan2(dy, dx);
            const sp = 4.0 * speedMult;
            const count = diff === 'normal' ? 1 : diff === 'hard' ? 2 : 3;
            for (let i = 0; i < count; i++) {
              const angle = targetAngle + (i - (count - 1) / 2) * (18 * Math.PI / 180);
              enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * sp, Math.sin(angle) * sp, 10, '#39ff14', 'explode_wall'));
            }
          }
        }
        break;

      case 3:
        // Dual counter-rotating spirals (Criss-cross patterns)
        const spiralSpeed = 2.8 * speedMult;
        const angleA = this.timer * 0.08;
        const angleB = -this.timer * 0.08;
        
        // spirals fire interval scales with difficulty (Normal: 6, Hard: 4, Endless: 3 frames)
        const spiralInterval = diff === 'normal' ? 6 : diff === 'hard' ? 4 : 3;
        if (this.bulletTimer % spiralInterval === 0) {
          // Clockwise Cyan
          enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angleA) * spiralSpeed, Math.sin(angleA) * spiralSpeed, 5.5, '#00ffff'));
          // Counter-Clockwise Yellow
          enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angleB) * spiralSpeed, Math.sin(angleB) * spiralSpeed, 5.5, '#ffb700'));
        }
        
        // Occasional screen clear ring
        if (this.bulletTimer % 140 === 0) {
          const count = diff === 'normal' ? 14 : diff === 'hard' ? 22 : 30;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 1.8 * speedMult, Math.sin(angle) * 1.8 * speedMult, 6.5, '#ff007f'));
          }
        }

        // Delayed Homing Rings
        if (this.bulletTimer % 200 === 100) {
          const count = diff === 'normal' ? 10 : diff === 'hard' ? 16 : 24;
          const sp = 2.4 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * sp, Math.sin(angle) * sp, 5.5, '#00ffff', 'delayed_homing'));
          }
        }
        break;

      case 4:
        // Splitting Bullets + scissor diagonal streams
        if (this.bulletTimer % 45 === 0) {
          const count = diff === 'normal' ? 3 : diff === 'hard' ? 5 : 7;
          const speed = 4.0 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = Math.PI / 3 + (Math.PI / 3) * (i / (count - 1));
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 9, '#39ff14', 'split'));
          }
        }
        
        // Fast random aimed sparks
        const sparkInterval = diff === 'normal' ? 16 : diff === 'hard' ? 12 : 8;
        if (this.bulletTimer % sparkInterval === 0) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const sp = 5.0 * speedMult;
          if (dist > 0) {
            enemyBullets.push(new EnemyBullet(
              this.x,
              this.y,
              (dx/dist)*sp + (Math.random()*2 - 1)*0.5,
              (dy/dist)*sp + (Math.random()*2 - 1)*0.5,
              4.5,
              '#ff007f'
            ));
          }
        }

        // Scissor diagonal streams crossing
        if (this.bulletTimer % 120 === 60) {
          const sp = 3.6 * speedMult;
          const count = diff === 'normal' ? 6 : diff === 'hard' ? 12 : 18;
          for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            // Left scissor stream
            enemyBullets.push(new EnemyBullet(this.x - 50, this.y, Math.cos(Math.PI/3 + t*Math.PI/6) * sp, Math.sin(Math.PI/3 + t*Math.PI/6) * sp, 5, '#bd00ff'));
            // Right scissor stream
            enemyBullets.push(new EnemyBullet(this.x + 50, this.y, Math.cos(2*Math.PI/3 - t*Math.PI/6) * sp, Math.sin(2*Math.PI/3 - t*Math.PI/6) * sp, 5, '#bd00ff'));
          }
        }
        break;

      case 5:
        // OVERDRIVE (Final 발광 / Chaos Phase)
        const odLaserSpeed = 3.8 * speedMult;
        const odRotateAngle = this.timer * 0.12;
        
        // Rapid rotating spirals (Normal: 2-way, Hard: 4-way, Endless: 6-way!)
        const ways = diff === 'normal' ? 2 : diff === 'hard' ? 4 : 6;
        if (this.bulletTimer % 3 === 0) {
          for (let i = 0; i < ways; i++) {
            const ang = odRotateAngle + (Math.PI * 2 / ways) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(ang) * odLaserSpeed, Math.sin(ang) * odLaserSpeed, 5, '#00ffff'));
          }
        }

        // Periodic aimed rings
        if (this.bulletTimer % 55 === 0) {
          const count = diff === 'normal' ? 16 : diff === 'hard' ? 24 : 36;
          const ringSp = 2.2 * speedMult;
          const bDx = player.x - this.x;
          const bDy = player.y - this.y;
          const baseAng = Math.atan2(bDy, bDx);
          for (let i = 0; i < count; i++) {
            const angle = baseAng + (Math.PI * 2 / count) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * ringSp, Math.sin(angle) * ringSp, 5.5, '#ff007f'));
          }
        }
        
        // Single splitter bullet down
        if (this.bulletTimer % 80 === 40) {
          enemyBullets.push(new EnemyBullet(this.x, this.y, (player.x - this.x)*0.01, 3.5 * speedMult, 9, '#39ff14', 'split'));
        }

        // Alternate Bouncing and Exploding bullets in final phase
        if (this.bulletTimer % 180 === 90) {
          for (let i = 0; i < 3; i++) {
            const angle = Math.PI/3 + (Math.PI/3) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 4.0 * speedMult, Math.sin(angle) * 4.0 * speedMult, 10, '#39ff14', 'explode_wall'));
          }
        }
        if (this.bulletTimer % 180 === 0) {
          const count = diff === 'normal' ? 6 : 12;
          for (let i = 0; i < count; i++) {
            const angle = Math.PI/4 + (Math.PI/2) * (i / (count - 1));
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 2.0 * speedMult, Math.sin(angle) * 2.0 * speedMult, 6, '#ffb700', 'bounce', 1));
          }
        }
        break;
    }
  }

  fireProminenceFlarePatterns(diff, speedMult) {
    switch (this.currentPhase) {
      case 1:
        // Phase 1: その場に静止して激しい全方位攻撃を高頻度で繰り返し（攻撃頻度アップ）
        if (this.bulletTimer % 20 === 0) {
          const count = 36;
          const speed = 2.5 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (this.timer * 0.03);
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6.0, '#ff5500'));
          }
          Sound.playBossHit();
        }
        if (this.bulletTimer % 30 === 10) {
          const count = 32;
          const speed = 2.0 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i - (this.timer * 0.03);
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5.5, '#ffaa00'));
          }
        }
        break;

      case 2:
        // Phase 2: 左右に動き出し、高速、通常、低速の全方位攻撃を連射（攻撃頻度・密度アップ）
        if (this.bulletTimer % 45 === 0) {
          const count = 30;
          const speed = 5.2 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5.5, '#ff3300'));
          }
        }
        if (this.bulletTimer % 45 === 15) {
          const count = 30;
          const speed = 3.2 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + 0.1;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5.5, '#ffaa00'));
          }
        }
        if (this.bulletTimer % 45 === 30) {
          const count = 30;
          const speed = 1.5 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + 0.2;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6.0, '#ffd700'));
          }
        }
        break;

      case 3:
        // Phase 3: 画面中央に降りてきて静止、自機狙いの弾幕を公転する三角形の先端から連射しビームのように
        if (this.orbitTriangles && this.orbitTriangles.length > 0) {
          if (this.bulletTimer % 3 === 0) {
            const bulletSpeed = 7.5 * speedMult;
            this.orbitTriangles.forEach(tri => {
              const tDx = player.x - tri.x;
              const tDy = player.y - tri.y;
              const tDist = Math.sqrt(tDx*tDx + tDy*tDy);
              if (tDist > 0) {
                enemyBullets.push(new EnemyBullet(
                  tri.x,
                  tri.y,
                  (tDx / tDist) * bulletSpeed,
                  (tDy / tDist) * bulletSpeed,
                  4.5,
                  '#ffd700'
                ));
              }
            });
          }
        }

        // 定期的な全方位弾
        if (this.bulletTimer % 70 === 0) {
          const count = 20;
          const speed = 2.0 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6.0, '#ff3300'));
          }
        }
        break;
    }
  }

  fireStarLightPatterns(diff, speedMult) {
    switch (this.currentPhase) {
      case 1:
        // Tip streams: spiral streams from the 5 rotating tips
        if (this.bulletTimer % 5 === 0) {
          const spikes = 5;
          const rot = -Math.PI / 2 + this.timer * 0.015;
          const step = (Math.PI * 2) / spikes;
          const bSpeed = 2.4 * speedMult;
          for (let i = 0; i < spikes; i++) {
            const angle = rot + step * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * bSpeed, Math.sin(angle) * bSpeed, 5.5, '#ffd700'));
          }
        }
        // aimed spreads
        if (this.bulletTimer % 80 === 0) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 0) {
            const baseAngle = Math.atan2(dy, dx);
            const count = 5;
            const spread = 12;
            for (let i = 0; i < count; i++) {
              const angle = baseAngle + (i - (count - 1) / 2) * (spread * Math.PI / 180);
              enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 3.2 * speedMult, Math.sin(angle) * 3.2 * speedMult, 6.0, '#00f3ff'));
            }
          }
        }
        break;

      case 2:
        // Super slow, extremely high density random scatter (the slow scatter pattern requested by the user)
        if (this.bulletTimer % 2 === 0) {
          // Fire 4 random slow bullets
          for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const sp = (0.5 + Math.random() * 0.9) * speedMult;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * sp, Math.sin(angle) * sp, 5.0, '#ffd700'));
          }
        }
        // Periodically fire slow aimed rings to force movement
        if (this.bulletTimer % 120 === 0) {
          const count = 22;
          const ringSp = 1.4 * speedMult;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * ringSp, Math.sin(angle) * ringSp, 6.5, '#00f3ff'));
          }
        }
        break;

      case 3:
        // STAR OVERDRIVE (Final 발광形態)
        // 1. Tip streams (fast, counter-rotating)
        if (this.bulletTimer % 4 === 0) {
          const spikes = 5;
          const rot = -Math.PI / 2 - this.timer * 0.02;
          const step = (Math.PI * 2) / spikes;
          const bSpeed = 2.8 * speedMult;
          for (let i = 0; i < spikes; i++) {
            const angle = rot + step * i;
            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * bSpeed, Math.sin(angle) * bSpeed, 5.5, '#ffffff'));
          }
        }
        // 2. 3-way split bullets
        if (this.bulletTimer % 80 === 0) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 0) {
            const baseAngle = Math.atan2(dy, dx);
            for (let i = -1; i <= 1; i++) {
              const angle = baseAngle + i * (15 * Math.PI / 180);
              enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 3.6 * speedMult, Math.sin(angle) * 3.6 * speedMult, 8.0, '#00f3ff', 'split'));
            }
          }
        }
        // 3. Waving scissor streams from sides
        if (this.bulletTimer % 15 === 0) {
          const waverSpeed = 2.5 * speedMult;
          const tAngleA = Math.PI / 2 + Math.sin(this.timer * 0.12) * 0.6;
          const tAngleB = Math.PI / 2 - Math.sin(this.timer * 0.12) * 0.6;
          enemyBullets.push(new EnemyBullet(this.x - 40, this.y, Math.cos(tAngleA) * waverSpeed, Math.sin(tAngleA) * waverSpeed, 5.0, '#ffd700', 'waver'));
          enemyBullets.push(new EnemyBullet(this.x + 40, this.y, Math.cos(tAngleB) * waverSpeed, Math.sin(tAngleB) * waverSpeed, 5.0, '#ffd700', 'waver'));
        }
        break;
    }
  }

  draw() {
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = '#01050e';

    if (this.isStarLight) {
      // Beautiful rotating and pulsating 5-spoked star shape
      ctx.beginPath();
      const spikes = 5;
      const outerRadius = 50 + Math.sin(this.timer * 0.08) * 3; // slight pulsation
      const innerRadius = 22;
      let rot = -Math.PI / 2 + this.timer * 0.015; // rotate star
      const step = Math.PI / spikes;

      let startX = this.x + Math.cos(rot) * outerRadius;
      let startY = this.y + Math.sin(rot) * outerRadius;
      ctx.moveTo(startX, startY);
      for (let i = 0; i < spikes; i++) {
        rot += step;
        let x1 = this.x + Math.cos(rot) * innerRadius;
        let y1 = this.y + Math.sin(rot) * innerRadius;
        ctx.lineTo(x1, y1);

        rot += step;
        let x2 = this.x + Math.cos(rot) * outerRadius;
        let y2 = this.y + Math.sin(rot) * outerRadius;
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner glowing core ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18 + Math.sin(this.timer * 0.1) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      // Central energy crystal
      ctx.beginPath();
      ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      // Core white light
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // Spawn star spark particles at star tips occasionally
      if (Math.random() < 0.2) {
        const tipIndex = Math.floor(Math.random() * 5);
        const tipAngle = -Math.PI / 2 + this.timer * 0.015 + (Math.PI * 2 / spikes) * tipIndex;
        const tipX = this.x + Math.cos(tipAngle) * outerRadius;
        const tipY = this.y + Math.sin(tipAngle) * outerRadius;
        particles.push(new Particle(
          tipX,
          tipY,
          Math.cos(tipAngle) * 1.2,
          Math.sin(tipAngle) * 1.2,
          Math.random() * 3 + 1.5,
          this.color,
          0.04
        ));
      }
    } else if (this.isProminenceFlare) {
      // Beautiful boiling sun with orbiting triangles
      ctx.save();
      // Draw solar flares / prominence spikes on body
      ctx.strokeStyle = this.color;
      ctx.fillStyle = '#1c0500';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const spikesSp = 12;
      for (let i = 0; i < spikesSp * 2; i++) {
        const angle = (Math.PI / spikesSp) * i + this.timer * 0.005;
        const radius = (i % 2 === 0) ? 42 + Math.sin(this.timer * 0.1) * 3 : 30;
        const sx = this.x + Math.cos(angle) * radius;
        const sy = this.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main circular body
      ctx.beginPath();
      ctx.arc(this.x, this.y, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner glowing core
      ctx.beginPath();
      ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // orbiting triangles
      const triCount = 5;
      const rot = this.timer * 0.02;
      ctx.lineWidth = 2;
      ctx.fillStyle = '#ff3300';
      ctx.strokeStyle = '#ffcc00';
      
      this.orbitTriangles = []; // Store coordinates for phase 3 shooting tips!
      
      for (let i = 0; i < triCount; i++) {
        const angle = rot + (Math.PI * 2 / triCount) * i;
        const tx = this.x + Math.cos(angle) * 60;
        const ty = this.y + Math.sin(angle) * 60;
        
        // Save coordinates for laser tip positions!
        this.orbitTriangles.push({ x: tx, y: ty, angle: angle });

        ctx.beginPath();
        // Pointing outwards
        ctx.moveTo(tx + Math.cos(angle) * 10, ty + Math.sin(angle) * 10);
        ctx.lineTo(tx + Math.cos(angle + Math.PI - 0.6) * 7, ty + Math.sin(angle + Math.PI - 0.6) * 7);
        ctx.lineTo(tx + Math.cos(angle + Math.PI + 0.6) * 7, ty + Math.sin(angle + Math.PI + 0.6) * 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Giant Boss Mech Visual (vector shapes)
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + 35); // Center tip
      ctx.lineTo(this.x - 30, this.y + 15);
      ctx.lineTo(this.x - 50, this.y + 30); // Left Wing-tip
      ctx.lineTo(this.x - 45, this.y - 15);
      ctx.lineTo(this.x - 25, this.y - 30);
      ctx.lineTo(this.x + 25, this.y - 30);
      ctx.lineTo(this.x + 45, this.y - 15);
      ctx.lineTo(this.x + 50, this.y + 30); // Right Wing-tip
      ctx.lineTo(this.x + 30, this.y + 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Secondary core shield ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20 + Math.sin(this.timer * 0.1) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.stroke();

      // Central core energy crystal
      ctx.beginPath();
      ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      // Core white light
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }
}

// Story Mode unique wave spawns config (Stages 1-1 to 1-5, 5 waves each)
const storyWaveSpawns = {
  '1-1': {
    1: [[30, 0.3, 'sniper'], [30, 0.7, 'sniper'], [60, 0.5, 'sniper']],
    2: [[30, 0.2, 'sniper'], [30, 0.8, 'sniper'], [60, 0.4, 'sniper'], [60, 0.6, 'sniper']],
    3: [[30, 0.3, 'sniper'], [30, 0.7, 'sniper'], [60, 0.5, 'spreader'], [90, 0.2, 'spreader'], [90, 0.8, 'sniper']],
    4: [[30, 0.3, 'spreader'], [30, 0.7, 'spreader'], [60, 0.5, 'sniper'], [90, 0.3, 'spreader'], [90, 0.7, 'sniper']],
    5: [[30, 0.2, 'sniper'], [30, 0.8, 'sniper'], [60, 0.3, 'spreader'], [60, 0.7, 'spreader'], [90, 0.5, 'spreader'], [120, 0.2, 'sniper'], [120, 0.8, 'sniper']]
  },
  '1-2': {
    1: [[30, 0.3, 'waver'], [30, 0.7, 'waver'], [60, 0.5, 'waver']],
    2: [[30, 0.2, 'waver'], [30, 0.8, 'waver'], [60, 0.4, 'waver'], [60, 0.6, 'waver']],
    3: [[30, 0.3, 'sniper'], [30, 0.7, 'sniper'], [60, 0.5, 'waver'], [90, 0.2, 'waver'], [90, 0.8, 'sniper']],
    4: [[30, 0.3, 'spreader'], [30, 0.7, 'spreader'], [60, 0.5, 'waver'], [90, 0.3, 'spreader'], [90, 0.7, 'waver']],
    5: [[30, 0.2, 'waver'], [30, 0.8, 'waver'], [60, 0.3, 'spreader'], [60, 0.7, 'spreader'], [90, 0.5, 'spreader'], [120, 0.2, 'waver'], [120, 0.8, 'waver']]
  },
  '1-3': {
    1: [[30, 0.3, 'spiraler'], [30, 0.7, 'spiraler'], [60, 0.5, 'spiraler']],
    2: [[30, 0.2, 'spiraler'], [30, 0.8, 'spiraler'], [60, 0.4, 'spiraler'], [60, 0.6, 'spiraler']],
    3: [[30, 0.3, 'waver'], [30, 0.7, 'waver'], [60, 0.5, 'spiraler'], [90, 0.2, 'spiraler'], [90, 0.8, 'waver']],
    4: [[30, 0.3, 'spreader'], [30, 0.7, 'spreader'], [60, 0.5, 'spiraler'], [90, 0.3, 'spreader'], [90, 0.7, 'spiraler']],
    5: [[30, 0.2, 'spiraler'], [30, 0.8, 'spiraler'], [60, 0.3, 'waver'], [60, 0.7, 'waver'], [90, 0.5, 'spreader'], [120, 0.25, 'spiraler'], [120, 0.75, 'spiraler'], [140, 0.5, 'waver']]
  },
  '1-4': {
    1: [[30, 0.3, 'burster'], [30, 0.7, 'burster'], [60, 0.5, 'burster']],
    2: [[30, 0.2, 'burster'], [30, 0.8, 'burster'], [60, 0.4, 'burster'], [60, 0.6, 'burster']],
    3: [[30, 0.3, 'spiraler'], [30, 0.7, 'spiraler'], [60, 0.5, 'burster'], [90, 0.2, 'burster'], [90, 0.8, 'spiraler']],
    4: [[30, 0.2, 'waver'], [30, 0.8, 'waver'], [60, 0.3, 'burster'], [60, 0.7, 'burster'], [90, 0.5, 'waver'], [120, 0.5, 'burster']],
    5: [[30, 0.2, 'burster'], [30, 0.8, 'burster'], [60, 0.3, 'spiraler'], [60, 0.7, 'spiraler'], [90, 0.5, 'spreader'], [120, 0.2, 'burster'], [120, 0.8, 'burster'], [140, 0.3, 'spiraler'], [140, 0.7, 'spreader']]
  },
  '1-5': { // Heavy hybrid wave series before the boss
    1: [[30, 0.2, 'spiraler'], [30, 0.8, 'spiraler'], [60, 0.35, 'burster'], [60, 0.65, 'burster'], [90, 0.5, 'spiraler']],
    2: [[30, 0.2, 'burster'], [30, 0.8, 'burster'], [60, 0.3, 'waver'], [60, 0.7, 'waver'], [90, 0.5, 'spreader'], [120, 0.2, 'burster'], [120, 0.8, 'burster'], [140, 0.5, 'waver']],
    3: []
  },
  '2-1': {
    1: [[30, 0.5, 'splitter'], [45, 0.3, 'sniper'], [45, 0.7, 'sniper'], [65, 0.2, 'suicider'], [65, 0.8, 'suicider'], [90, 0.4, 'splitter'], [90, 0.6, 'splitter']],
    2: [[30, 0.3, 'sniper'], [30, 0.7, 'sniper'], [55, 0.25, 'waver'], [55, 0.75, 'waver'], [80, 0.5, 'suicider'], [105, 0.3, 'splitter'], [105, 0.7, 'splitter']],
    3: [[30, 0.2, 'waver'], [30, 0.8, 'waver'], [60, 0.5, 'spreader'], [85, 0.3, 'sniper'], [85, 0.7, 'sniper'], [110, 0.2, 'suicider'], [110, 0.8, 'suicider'], [130, 0.5, 'splitter']],
    4: [[30, 0.3, 'spreader'], [30, 0.7, 'spreader'], [60, 0.25, 'spiraler'], [60, 0.75, 'spiraler'], [90, 0.5, 'waver'], [115, 0.3, 'splitter'], [115, 0.7, 'splitter']],
    5: [[30, 0.2, 'suicider'], [30, 0.8, 'suicider'], [55, 0.3, 'burster'], [55, 0.7, 'burster'], [80, 0.5, 'spiraler'], [110, 0.2, 'splitter'], [110, 0.8, 'splitter'], [130, 0.5, 'waver']]
  },
  '2-2': {
    1: [[30, 0.3, 'waver'], [30, 0.7, 'waver'], [55, 0.5, 'spiraler'], [80, 0.2, 'splitter'], [80, 0.8, 'splitter'], [105, 0.4, 'sniper'], [105, 0.6, 'sniper']],
    2: [[30, 0.2, 'splitter'], [30, 0.8, 'splitter'], [55, 0.5, 'spreader'], [80, 0.3, 'waver'], [80, 0.7, 'waver'], [105, 0.2, 'suicider'], [105, 0.8, 'suicider']],
    3: [[30, 0.2, 'spiraler'], [30, 0.8, 'spiraler'], [60, 0.4, 'suicider'], [60, 0.6, 'suicider'], [90, 0.3, 'splitter'], [90, 0.7, 'splitter'], [120, 0.5, 'waver']],
    4: [[30, 0.3, 'burster'], [30, 0.7, 'burster'], [55, 0.2, 'spreader'], [55, 0.8, 'spreader'], [85, 0.5, 'suicider'], [110, 0.3, 'splitter'], [110, 0.7, 'spiraler']],
    5: [[30, 0.2, 'spreader'], [30, 0.8, 'spreader'], [55, 0.3, 'suicider'], [55, 0.7, 'suicider'], [80, 0.5, 'burster'], [105, 0.25, 'splitter'], [105, 0.75, 'splitter'], [130, 0.4, 'waver'], [130, 0.6, 'waver']]
  },
  '2-3': {
    1: [[30, 0.3, 'spiraler'], [30, 0.7, 'spiraler'], [55, 0.2, 'suicider'], [55, 0.8, 'suicider'], [80, 0.4, 'splitter'], [80, 0.6, 'splitter'], [105, 0.5, 'burster']],
    2: [[30, 0.2, 'suicider'], [30, 0.8, 'suicider'], [55, 0.3, 'spiraler'], [55, 0.7, 'spiraler'], [80, 0.5, 'splitter'], [105, 0.2, 'waver'], [105, 0.8, 'waver']],
    3: [[30, 0.25, 'suicider'], [30, 0.75, 'suicider'], [55, 0.5, 'spiraler'], [80, 0.3, 'splitter'], [80, 0.7, 'splitter'], [105, 0.2, 'burster'], [105, 0.8, 'burster'], [130, 0.5, 'spreader']],
    4: [[30, 0.25, 'spreader'], [30, 0.75, 'spreader'], [55, 0.3, 'suicider'], [55, 0.7, 'suicider'], [80, 0.5, 'waver'], [105, 0.3, 'splitter'], [105, 0.7, 'splitter'], [125, 0.5, 'spiraler']],
    5: [[30, 0.15, 'waver'], [30, 0.85, 'waver'], [55, 0.3, 'suicider'], [55, 0.7, 'suicider'], [80, 0.5, 'burster'], [105, 0.2, 'splitter'], [105, 0.8, 'splitter'], [125, 0.3, 'waver'], [125, 0.7, 'waver'], [145, 0.5, 'spreader']]
  },
  '2-4': {
    1: [[30, 0.2, 'spreader'], [30, 0.8, 'spreader'], [55, 0.3, 'suicider'], [55, 0.7, 'suicider'], [80, 0.5, 'burster'], [105, 0.3, 'splitter'], [105, 0.7, 'splitter'], [130, 0.5, 'spiraler']],
    2: [[30, 0.15, 'spiraler'], [30, 0.85, 'spiraler'], [55, 0.3, 'splitter'], [55, 0.7, 'splitter'], [80, 0.5, 'waver'], [105, 0.2, 'splitter'], [105, 0.8, 'splitter'], [130, 0.3, 'spreader'], [130, 0.7, 'spreader']],
    3: [[30, 0.2, 'suicider'], [30, 0.8, 'suicider'], [55, 0.3, 'splitter'], [55, 0.7, 'splitter'], [80, 0.5, 'spiraler'], [105, 0.25, 'splitter'], [105, 0.75, 'splitter'], [130, 0.3, 'burster'], [130, 0.7, 'burster']],
    4: [[30, 0.2, 'burster'], [30, 0.8, 'burster'], [55, 0.35, 'suicider'], [55, 0.65, 'suicider'], [80, 0.5, 'waver'], [105, 0.2, 'splitter'], [105, 0.8, 'splitter'], [130, 0.3, 'spiraler'], [130, 0.7, 'spiraler']],
    5: [[30, 0.15, 'sniper'], [30, 0.85, 'sniper'], [55, 0.3, 'suicider'], [55, 0.7, 'suicider'], [80, 0.5, 'burster'], [105, 0.2, 'splitter'], [105, 0.8, 'splitter'], [130, 0.3, 'waver'], [130, 0.7, 'waver'], [150, 0.5, 'spreader']]
  },
  '2-5': {
    1: [[30, 0.2, 'waver'], [30, 0.8, 'waver'], [55, 0.3, 'suicider'], [55, 0.7, 'suicider'], [80, 0.5, 'spiraler'], [105, 0.25, 'splitter'], [105, 0.75, 'splitter'], [130, 0.3, 'burster'], [130, 0.7, 'burster']],
    2: [[30, 0.15, 'suicider'], [30, 0.85, 'suicider'], [55, 0.3, 'suicider'], [55, 0.7, 'suicider'], [80, 0.5, 'waver'], [105, 0.2, 'splitter'], [105, 0.8, 'splitter'], [130, 0.3, 'spiraler'], [130, 0.7, 'spreader'], [150, 0.2, 'burster'], [150, 0.8, 'burster']],
    3: [] // Immediately transitions to Boss Battle, no spawns needed
  },
  '3-1': {
    1: [[30, 0.3, 'solar_spark'], [30, 0.7, 'solar_spark'], [60, 0.5, 'sniper']],
    2: [[30, 0.2, 'solar_spark'], [30, 0.8, 'solar_spark'], [60, 0.4, 'solar_spark'], [60, 0.6, 'solar_spark']],
    3: [[30, 0.3, 'solar_spark'], [30, 0.7, 'solar_spark'], [60, 0.5, 'corona_bomber'], [90, 0.2, 'corona_bomber'], [90, 0.8, 'sniper']],
    4: [[30, 0.3, 'corona_bomber'], [30, 0.7, 'corona_bomber'], [60, 0.5, 'solar_spark'], [90, 0.3, 'corona_bomber'], [90, 0.7, 'solar_spark']],
    5: [[30, 0.2, 'solar_spark'], [30, 0.8, 'solar_spark'], [60, 0.3, 'corona_bomber'], [60, 0.7, 'corona_bomber'], [90, 0.5, 'corona_bomber'], [120, 0.2, 'solar_spark'], [120, 0.8, 'solar_spark']]
  },
  '3-2': {
    1: [[30, 0.3, 'prominence_shield'], [30, 0.7, 'prominence_shield'], [60, 0.5, 'waver']],
    2: [[30, 0.2, 'prominence_shield'], [30, 0.8, 'prominence_shield'], [60, 0.4, 'prominence_shield'], [60, 0.6, 'prominence_shield']],
    3: [[30, 0.3, 'solar_spark'], [30, 0.7, 'solar_spark'], [60, 0.5, 'prominence_shield'], [90, 0.2, 'prominence_shield'], [90, 0.8, 'waver']],
    4: [[30, 0.3, 'corona_bomber'], [30, 0.7, 'corona_bomber'], [60, 0.5, 'prominence_shield'], [90, 0.3, 'corona_bomber'], [90, 0.7, 'prominence_shield']],
    5: [[30, 0.2, 'prominence_shield'], [30, 0.8, 'prominence_shield'], [60, 0.3, 'corona_bomber'], [60, 0.7, 'corona_bomber'], [90, 0.5, 'solar_spark'], [120, 0.2, 'prominence_shield'], [120, 0.8, 'prominence_shield']]
  },
  '3-3': {
    1: [[30, 0.3, 'solar_spark'], [30, 0.7, 'solar_spark'], [60, 0.5, 'spiraler']],
    2: [[30, 0.2, 'prominence_shield'], [30, 0.8, 'prominence_shield'], [60, 0.4, 'corona_bomber'], [60, 0.6, 'corona_bomber']],
    3: [[30, 0.3, 'waver'], [30, 0.7, 'waver'], [60, 0.5, 'solar_spark'], [90, 0.2, 'solar_spark'], [90, 0.8, 'prominence_shield']],
    4: [[30, 0.3, 'spreader'], [30, 0.7, 'spreader'], [60, 0.5, 'corona_bomber'], [90, 0.3, 'spreader'], [90, 0.7, 'prominence_shield']],
    5: [[30, 0.2, 'solar_spark'], [30, 0.8, 'solar_spark'], [60, 0.3, 'prominence_shield'], [60, 0.7, 'prominence_shield'], [90, 0.5, 'corona_bomber'], [120, 0.25, 'solar_spark'], [120, 0.75, 'solar_spark'], [140, 0.5, 'waver']]
  },
  '3-4': {
    1: [[30, 0.3, 'burster'], [30, 0.7, 'burster'], [60, 0.5, 'solar_spark']],
    2: [[30, 0.2, 'corona_bomber'], [30, 0.8, 'corona_bomber'], [60, 0.4, 'prominence_shield'], [60, 0.6, 'prominence_shield']],
    3: [[30, 0.3, 'spiraler'], [30, 0.7, 'spiraler'], [60, 0.5, 'solar_spark'], [90, 0.2, 'solar_spark'], [90, 0.8, 'corona_bomber']],
    4: [[30, 0.2, 'waver'], [30, 0.8, 'waver'], [60, 0.3, 'prominence_shield'], [60, 0.7, 'prominence_shield'], [90, 0.5, 'waver'], [120, 0.5, 'burster']],
    5: [[30, 0.2, 'solar_spark'], [30, 0.8, 'solar_spark'], [60, 0.3, 'corona_bomber'], [60, 0.7, 'corona_bomber'], [90, 0.5, 'prominence_shield'], [120, 0.2, 'burster'], [120, 0.8, 'burster'], [140, 0.3, 'solar_spark'], [140, 0.7, 'prominence_shield']]
  },
  '3-5': {
    1: [[30, 0.2, 'prominence_shield'], [30, 0.8, 'prominence_shield'], [60, 0.35, 'solar_spark'], [60, 0.65, 'solar_spark'], [90, 0.5, 'corona_bomber']],
    2: [[30, 0.2, 'burster'], [30, 0.8, 'burster'], [60, 0.3, 'prominence_shield'], [60, 0.7, 'prominence_shield'], [90, 0.5, 'corona_bomber'], [120, 0.2, 'solar_spark'], [120, 0.8, 'solar_spark'], [140, 0.5, 'corona_bomber']],
    3: [] // Immediately transitions to Boss Battle, no spawns needed
  }
};

function spawnEnemyWave() {
  if (gameState !== STATES.PLAYING) return;

  // Instantly trigger boss warning on Stage 1-5, 2-5, and 3-5 on Wave 3
  if (currentPlayMode === 'story' && (currentStage === '1-5' || currentStage === '2-5' || currentStage === '3-5') && currentWave === 3) {
    startBossWarning();
    return;
  }

  waveTimer++;

  // Configuration of waves (1 to 10)
  const waveSpawns = {
    1: [
      [30, 0.3, 'sniper'],
      [60, 0.7, 'solar_spark'],
      [120, 0.2, 'sniper'],
      [150, 0.8, 'solar_spark'],
      [220, 0.5, 'sniper']
    ],
    2: [
      [30, 0.5, 'spreader'],
      [120, 0.25, 'splitter'],
      [120, 0.75, 'splitter'],
      [200, 0.3, 'spreader'],
      [200, 0.7, 'spreader']
    ],
    3: [
      [30, 0.1, 'spiraler'],
      [60, 0.5, 'suicider'],
      [100, 0.3, 'spiraler'],
      [140, 0.5, 'suicider'],
      [180, 0.7, 'spreader']
    ],
    4: [
      [30, 0.2, 'waver'],
      [80, 0.5, 'splitter'],
      [140, 0.3, 'waver'],
      [200, 0.7, 'splitter']
    ],
    5: [
      [30, 0.3, 'burster'],
      [80, 0.5, 'prominence_shield'],
      [140, 0.7, 'burster'],
      [200, 0.3, 'prominence_shield']
    ],
    6: [
      [30, 0.2, 'corona_bomber'],
      [80, 0.8, 'splitter'],
      [130, 0.5, 'suicider'],
      [180, 0.3, 'corona_bomber'],
      [220, 0.7, 'splitter']
    ],
    7: [
      [30, 0.15, 'solar_spark'],
      [80, 0.5, 'corona_bomber'],
      [130, 0.3, 'spiraler'],
      [130, 0.7, 'spiraler'],
      [180, 0.85, 'solar_spark']
    ],
    8: [
      [30, 0.5, 'prominence_shield'],
      [80, 0.25, 'spreader'],
      [80, 0.75, 'spreader'],
      [140, 0.5, 'waver'],
      [200, 0.3, 'prominence_shield'],
      [200, 0.7, 'waver']
    ],
    9: [
      [30, 0.2, 'burster'],
      [70, 0.5, 'splitter'],
      [110, 0.3, 'suicider'],
      [110, 0.7, 'suicider'],
      [160, 0.1, 'sniper'],
      [160, 0.9, 'sniper'],
      [200, 0.5, 'burster']
    ],
    10: [ // FINAL WAVE (Heavy hybrid of advanced types)
      [30, 0.5, 'corona_bomber'],
      [60, 0.2, 'prominence_shield'],
      [60, 0.8, 'prominence_shield'],
      [100, 0.5, 'splitter'],
      [130, 0.3, 'suicider'],
      [130, 0.7, 'suicider'],
      [170, 0.25, 'spiraler'],
      [170, 0.75, 'spiraler'],
      [200, 0.5, 'solar_spark'],
      [230, 0.3, 'corona_bomber'],
      [230, 0.7, 'solar_spark']
    ]
  };

  // Determine current active schedule based on play mode
  let schedule = null;
  if (currentPlayMode === 'story') {
    const stageSpawns = storyWaveSpawns[currentStage];
    schedule = stageSpawns ? stageSpawns[currentWave] : null;
  } else {
    const waveIndex = currentWave <= 10 ? currentWave : ((currentWave - 1) % 10) + 1;
    schedule = waveSpawns[waveIndex];
  }
  
  if (!schedule) return;

  // Run through schedule to spawn
  schedule.forEach(spawn => {
    const time = spawn[0];
    if (waveTimer === time) {
      const x = spawn[1] * BASE_WIDTH;
      const type = spawn[2];
      const enemyId = 'e_' + nextEnemyId++;
      
      if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'spawnEnemy',
          enemyId: enemyId,
          enemyType: type,
          x: x,
          y: -30
        }));
      }
      
      const newEnemy = new Enemy(x, -30, type);
      newEnemy.id = enemyId;
      enemies.push(newEnemy);
      waveEnemiesSpawned++;
    }
  });

  const lastSpawnTime = schedule[schedule.length - 1][0];
  if (waveTimer > lastSpawnTime) {
    waveFinishedSpawning = true;
  }

  // Go to next wave when current is empty and spawning finished
  if (waveFinishedSpawning && enemies.length === 0) {
    let shouldProceedWave = false;
    if (currentPlayMode === 'score_attack' && scoreAttackType === 'endless') {
      shouldProceedWave = true;
    } else {
      const maxWave = (currentPlayMode === 'story' && (currentStage === '1-5' || currentStage === '2-5' || currentStage === '3-5')) ? 3 : (currentPlayMode === 'story' ? 5 : 10);
      shouldProceedWave = currentWave < maxWave;
    }

    if (shouldProceedWave) {
      waveTransitionTimer++;
      if (waveTransitionTimer === 1) {
        // Show brief text popup
        particles.push(new ScoreText(BASE_WIDTH / 2, BASE_HEIGHT / 2 - 50, `WAVE ${currentWave} CLEARED!`, '#39ff14', 1.5));
      }
      if (waveTransitionTimer > 90) { // 1.5 seconds gap
        currentWave++;
        waveTimer = 0;
        waveEnemiesSpawned = 0;
        waveFinishedSpawning = false;
        waveTransitionTimer = 0;
        updateHUD();
      }
    } else {
      // Reached the end of wave series for this stage/loop
      if (currentPlayMode === 'story') {
        const stageIndex = parseInt(currentStage.split('-')[1]) || 1;
        if (stageIndex < 5) {
          stageClear();
        } else {
          startBossWarning(); // Spawn hard boss at Stage 1-5
        }
      } else {
        startBossWarning(); // Trigger Boss battle after wave 10
      }
    }
  }
}

function startBossWarning() {
  gameState = STATES.BOSS_WARNING;
  warningTimer = 0;
  enemyBullets = []; // Clear leftover bullets
  
  // Show Boss Warn Banner in CSS with fixed text
  const alertEl = document.getElementById('bossAlert');
  alertEl.textContent = 'WARNING!';
  alertEl.classList.add('show');
}

function updateBossWarning() {
  warningTimer++;
  
  // Screenshake siren effect
  if (warningTimer % 30 === 0) {
    Sound.playPlayerHit(); // alarm sound simulation
    triggerScreenShake(15, 3);
  }

  if (warningTimer > 180) { // 3 seconds warning
    document.getElementById('bossAlert').classList.remove('show');
    gameState = STATES.BOSS_BATTLE;
    boss = new Boss(currentDifficulty);
    renderHUD();
  }
}
