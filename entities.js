// Cyber Danmaku - Entity Subsystems (VFX Particles, Items, and Collisions)

class Item {
  constructor(x, y, type, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() * 2 - 1) * 0.8;
    this.vy = -1.5; // slight pop upward initially
    this.radius = 12;
    this.type = type; // 'power', 'heal', 'shield'
    this.color = color;
    this.dead = false;
  }

  update() {
    if (this.type.startsWith('resurrect_')) {
      // Ensure initial random velocity is set if not already present or zero
      if (this.vx === undefined || this.vy === undefined || (this.vx === 0 && this.vy === 0)) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.8;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
      }

      // Magnet effect pulling towards player if close
      let magnetActive = false;
      if (player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 16900) { // 130 * 130
          magnetActive = true;
          const dist = Math.sqrt(distSq); // Only calculate Math.sqrt if close enough
          // Accelerate towards player (stronger pull for resurrect shard to help collect)
          this.vx += (dx / dist) * 0.6;
          this.vy += (dy / dist) * 0.6;
          // Cap speed
          const speedSq = this.vx * this.vx + this.vy * this.vy;
          if (speedSq > 49) { // 7.0 * 7.0 = 49
            const speed = Math.sqrt(speedSq);
            this.vx = (this.vx / speed) * 7.0;
            this.vy = (this.vy / speed) * 7.0;
          }
        }
      }

      if (!magnetActive) {
        // Periodically nudge direction randomly to keep it moving unpredictably
        if (!this.nudgeTimer) this.nudgeTimer = 0;
        this.nudgeTimer++;
        if (this.nudgeTimer > 90) { // Every 1.5 seconds
          this.nudgeTimer = 0;
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 1.0;
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
        }

        // Apply bounce on screen boundaries
        const offset = 20; // Allow it to float slightly off edges before bouncing
        if (this.x < offset && this.vx < 0) {
          this.vx = -this.vx;
        } else if (this.x > BASE_WIDTH - offset && this.vx > 0) {
          this.vx = -this.vx;
        }
        if (this.y < offset && this.vy < 0) {
          this.vy = -this.vy;
        } else if (this.y > BASE_HEIGHT - offset && this.vy > 0) {
          this.vy = -this.vy;
        }
      }

      this.x += this.vx;
      this.y += this.vy;

      // Clamp position inside viewport so it doesn't get lost
      this.x = Math.max(5, Math.min(BASE_WIDTH - 5, this.x));
      this.y = Math.max(5, Math.min(BASE_HEIGHT - 5, this.y));

      return; // Skip normal item physics
    }

    // Magnet effect pulling towards player if close
    if (player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 16900) { // 130 * 130
        const dist = Math.sqrt(distSq); // Only calculate Math.sqrt if close enough
        // Accelerate towards player
        this.vx += (dx / dist) * 0.45;
        this.vy += (dy / dist) * 0.45;
        // Cap speed
        const speedSq = this.vx * this.vx + this.vy * this.vy;
        if (speedSq > 30.25) { // 5.5 * 5.5 = 30.25
          const speed = Math.sqrt(speedSq);
          this.vx = (this.vx / speed) * 5.5;
          this.vy = (this.vy / speed) * 5.5;
        }
      } else {
        // Normal gravity drift
        this.vx *= 0.95;
        this.vy = Math.min(this.vy + 0.08, 1.8);
      }
    } else {
      this.vx *= 0.95;
      this.vy = Math.min(this.vy + 0.08, 1.8);
    }

    this.x += this.vx;
    this.y += this.vy;

    // Delete if off bottom screen
    if (this.y > BASE_HEIGHT + 30) {
      this.dead = true;
    }
  }

  draw() {
    if (this.type.startsWith('resurrect_')) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      
      ctx.beginPath();
      // Diamond shape
      ctx.moveTo(this.x, this.y - 14);
      ctx.lineTo(this.x + 10, this.y);
      ctx.lineTo(this.x, this.y + 14);
      ctx.lineTo(this.x - 10, this.y);
      ctx.closePath();
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = this.color;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      
      // Pulsing outer ring
      const pulse = 14 + Math.sin(Date.now() * 0.006) * 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Player index text
      ctx.font = "900 10px 'Orbitron'";
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const pNum = this.type.split('_')[1].toUpperCase(); // 'P1', 'P2', etc.
      ctx.fillText(pNum, this.x, this.y);
      
      ctx.restore();
      return; // Skip normal item drawing
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#030308';
    ctx.fill();

    // Draw letter symbol inside item capsule
    ctx.font = "900 11px 'Orbitron'";
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let char = 'P';
    if (this.type === 'heal') char = 'H';
    else if (this.type === 'shield') char = 'S';
    
    ctx.fillText(char, this.x, this.y);
  }
}

class Particle {
  constructor(x, y, vx, vy, radius, color, decay = 0.02, type = 'normal') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.alpha = 1;
    this.decay = decay;
    this.type = type;
    this.dead = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    
    if (this.type === 'score') {
      ctx.fillStyle = '#ffb700';
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

// Bomb shockwave shock expanding circle
class Shockwave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = 750;
    this.speed = 14;
    this.alpha = 1;
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
    ctx.lineWidth = 6;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffff';
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Nested ring
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(1, this.radius - 30), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// Graze notification floating text
class ScoreText {
  constructor(x, y, text, color = '#ffb700', scale = 1.0) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.alpha = 1.0;
    this.decay = 0.02;
    this.vy = -1.2;
    this.scale = scale;
    this.dead = false;
  }

  update() {
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.font = `${Math.round(14 * this.scale)}px 'Orbitron'`;
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

function triggerScreenShake(time, intensity) {
  shakeTime = time;
  shakeIntensity = intensity;
  document.getElementById('viewport').classList.add('shake');
}

function checkCollisions() {
  if (gameState !== STATES.PLAYING && gameState !== STATES.BOSS_BATTLE) return;

  // 1. Player Bullets vs Enemies
  playerBullets.forEach(pb => {
    // Only local player checks collisions for their own bullets
    if (pb.isRemote) return;

    enemies.forEach(e => {
      // Circle vs Box simple hit check
      const ex = e.x;
      const ey = e.y;
      const ew = e.width;
      const eh = e.height;
      if (pb.x > ex - ew/2 && pb.x < ex + ew/2 && pb.y > ey - eh/2 && pb.y < ey + eh/2) {
        if (!pb.dead) {
          e.takeDamage(pb.damage);
          if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'enemyDamage',
              enemyId: e.id,
              damage: pb.damage
            }));
          }
          if (typeof pb.explode === 'function') {
            if (!pb.exploded) pb.explode();
          } else {
            pb.dead = true;
          }
          
          // Spawn small impact spark
          particles.push(new Particle(pb.x, pb.y, Math.random()*4 - 2, Math.random()*2 - 4, 2, '#00f3ff', 0.08));
        }
      }
    });

    // Player Bullets vs Boss
    if (boss && !boss.dead && gameState === STATES.BOSS_BATTLE) {
      const bx = boss.x;
      const by = boss.y;
      const bw = boss.width;
      const bh = boss.height;
      const bColor = boss.color; // Save color before taking damage
      if (pb.x > bx - bw/2 && pb.x < bx + bw/2 && pb.y > by - bh/2 && pb.y < by + bh/2) {
        if (!pb.dead) {
          boss.takeDamage(pb.damage);
          if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'bossDamage',
              damage: pb.damage
            }));
          }
          if (typeof pb.explode === 'function') {
            if (!pb.exploded) pb.explode();
          } else {
            pb.dead = true;
          }
          
          particles.push(new Particle(pb.x, pb.y, Math.random()*4 - 2, Math.random()*2 - 4, 2, bColor, 0.08));
        }
      }
    }
  });

  // Clean dead player bullets
  playerBullets = playerBullets.filter(b => !b.dead && b.y > -10);

  // 2. Enemy Bullets vs Player (Hitbox & Graze)
  enemyBullets.forEach(eb => {
    const dx = player.x - eb.x;
    const dy = player.y - eb.y;
    const distSq = dx * dx + dy * dy;

    // Check hit registration (3px core hitbox + bullet size)
    const hitDist = player.hitboxRadius + eb.radius;
    if (distSq < hitDist * hitDist) {
      if (!player.invincible && player.lives > 0) {
        player.takeDamage();
        eb.dead = true;
      }
    } 
    // Check graze registration (18px graze boundary)
    else if (!eb.grazed && player.lives > 0) {
      const grazeDist = player.grazeRadius + eb.radius;
      if (distSq < grazeDist * grazeDist) {
        eb.grazed = true;
        grazeCount++;
        score += 50;
        updateHUD();

        // Spawn a glowing float text "+50 Graze"
        particles.push(new ScoreText(player.x + (Math.random() * 20 - 10), player.y - 15, 'GRAZE', '#bd00ff', 0.75));

        // Synthesizer graze chirp
        Sound.playHover();

        // Broadcast graze in multiplayer for client
        if (isMultiplayer && !isHost && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'graze',
            scorePlus: 50,
            grazePlus: 1
          }));
        }
      }
    }
  });

  // Clean dead enemy bullets
  enemyBullets = enemyBullets.filter(b => !b.dead);

  // 3. Enemies physical contact vs Player (Crash)
  if (!player.invincible && player.lives > 0) {
    enemies.forEach(e => {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const distSq = dx*dx + dy*dy;
      const crashDist = player.width/2 + e.width/2;
      
      if (distSq < crashDist * crashDist) {
        player.takeDamage();
        e.takeDamage(10); // deal crash damage to enemy too
        if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'enemyDamage',
            enemyId: e.id,
            damage: 10
          }));
        }
      }
    });
  }

  // 4. Player vs Items
  if (player && player.lives > 0) {
    items.forEach(item => {
      const dx = player.x - item.x;
      const dy = player.y - item.y;
      const distSq = dx * dx + dy * dy;
      const grabDist = player.width/2 + item.radius;
      
      if (distSq < grabDist * grabDist) {
        item.dead = true;
        Sound.playClick();
        
        if (item.type === 'power') {
          if (player.powerLevel >= 3) {
            score += 1500; // Power max bonus score
            particles.push(new ScoreText(player.x, player.y - 20, "POWER MAX! +1,500pts", '#ffb700', 1.25));
          } else {
            player.powerLevel = Math.min(3, player.powerLevel + 1);
            particles.push(new ScoreText(player.x, player.y - 20, `POWER UP! LV${player.powerLevel}`, '#ffb700', 1.25));
          }
          score += 500;
        } else if (item.type === 'heal') {
          if (player.lives >= 5) {
            score += 2500; // Lives max bonus score
            particles.push(new ScoreText(player.x, player.y - 20, "LIVES MAX! +2,500pts", '#39ff14', 1.25));
          } else {
            player.lives = Math.min(5, player.lives + 1);
            particles.push(new ScoreText(player.x, player.y - 20, "LIVES +1", '#39ff14', 1.25));
          }
          score += 500;
        } else if (item.type === 'shield') {
          player.shieldTimer = Math.max(player.shieldTimer, 300); // 5 seconds (300 frames)
          particles.push(new ScoreText(player.x, player.y - 20, "SHIELD ACTIVE!", '#00ffff', 1.25));
          score += 500;
        } else if (item.type.startsWith('resurrect_')) {
          const pIdxStr = item.type.split('_')[1]; // 'p1', 'p2' etc.
          const targetPIdx = parseInt(pIdxStr.replace('p', ''));
          if (typeof resurrectPlayer === 'function') {
            resurrectPlayer(targetPIdx);
          }
        }

        if (isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'itemCollect',
            itemId: item.id
          }));
        }

        updateHUD();
      }
    });
  }

  // 5. Player Drones vs Enemies / Boss (Crash explosion)
  playerDrones.forEach(d => {
    // Only local player checks collisions for their own drones in multiplayer
    const isRemote = d.ownerIndex !== myPlayerIndex;
    if (isRemote) return;

    enemies.forEach(e => {
      if (d.dead || e.dead) return;
      
      const dx = e.x - d.x;
      const dy = e.y - d.y;
      const distSq = dx * dx + dy * dy;
      const crashDist = d.width/2 + e.width/2;
      
      if (distSq < crashDist * crashDist) {
        d.dead = true;
        d.explodeOnCrash(e);
      }
    });

    if (boss && !boss.dead && gameState === STATES.BOSS_BATTLE && !d.dead) {
      const dx = boss.x - d.x;
      const dy = boss.y - d.y;
      const distSq = dx * dx + dy * dy;
      const crashDist = d.width/2 + boss.width/2;
      
      if (distSq < crashDist * crashDist) {
        d.dead = true;
        d.explodeOnCrash(boss);
      }
    }
  });
}
