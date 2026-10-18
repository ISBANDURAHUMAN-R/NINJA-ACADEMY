/**
 * 3D Ninja Academy: Shadow Jutsu Simulator - AR Shinobi Mirror & Video Clone Engine
 * Displays the USER'S LIVE WEBCAM VIDEO FRONT & CENTER.
 * Spawns REAL VIDEO SHADOW CLONES OF THE USER with time-delayed playback,
 * billowing smoke explosions, and AR Jutsu effects directly anchored to the user's hands!
 */

class ShinobiARMirror {
  constructor(game) {
    this.game = game;
    this.isActive = true; // Default active!

    // DOM Elements
    this.container = document.getElementById("ar-mirror-container");
    this.canvas = document.getElementById("ar-mirror-canvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.video = document.getElementById("webcam-video");

    // Video Frame History Ring Buffer (stores past video frames for time-delayed clones)
    this.frameBuffer = [];
    this.maxBufferSize = 90; // ~3 seconds of history at 30fps
    this.bufferCanvas = document.createElement("canvas");
    this.bufferCtx = this.bufferCanvas.getContext("2d");

    // Clones State
    this.clonesMode = "none"; // "none", "shadow_clones" (3 clones), "shadow_army" (12+ clones)
    this.clones = [];
    this.smokePuffs = [];

    // Substitution State
    this.isSubstituted = false;
    this.substitutionTime = 0;

    // AR Jutsu Visual Effects State
    this.activeRasengan = null;
    this.activeChidori = false;
    this.activeShield = false;
    this.activeFireball = null;
    this.fireballParticles = [];
    this.lightningBolts = [];

    // Headband AR overlay
    this.showHeadband = true;

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Start video capture into buffer loop
    this.captureLoop();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.bufferCanvas.width = 480;
    this.bufferCanvas.height = 360;
  }

  // Ring buffer capture of live camera video
  captureLoop() {
    if (this.video && this.video.readyState >= 2) {
      const bw = this.bufferCanvas.width;
      const bh = this.bufferCanvas.height;

      // Draw current video frame (mirrored) into small offscreen buffer
      this.bufferCtx.save();
      this.bufferCtx.translate(bw, 0);
      this.bufferCtx.scale(-1, 1);
      this.bufferCtx.drawImage(this.video, 0, 0, bw, bh);
      this.bufferCtx.restore();

      // Store image bitmap or canvas clone
      const snapshot = document.createElement("canvas");
      snapshot.width = bw;
      snapshot.height = bh;
      snapshot.getContext("2d").drawImage(this.bufferCanvas, 0, 0);

      this.frameBuffer.push(snapshot);
      if (this.frameBuffer.length > this.maxBufferSize) {
        this.frameBuffer.shift();
      }
    }

    requestAnimationFrame(() => this.captureLoop());
  }

  // 1. Shadow Clone Jutsu (Summons 3 Video Clones of the User!)
  summonShadowClones() {
    this.clonesMode = "shadow_clones";
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Define 3 clone positions flanking the user
    this.clones = [
      {
        id: 1,
        // Left clone
        xFrac: 0.18,
        yFrac: 0.52,
        scale: 0.82,
        delayFrames: 14, // ~0.45s delay
        tintColor: "rgba(0, 240, 255, 0.25)",
        alpha: 0.92
      },
      {
        id: 2,
        // Right clone
        xFrac: 0.82,
        yFrac: 0.52,
        scale: 0.82,
        delayFrames: 28, // ~0.9s delay
        tintColor: "rgba(0, 240, 255, 0.25)",
        alpha: 0.92
      },
      {
        id: 3,
        // Upper left rear clone
        xFrac: 0.32,
        yFrac: 0.36,
        scale: 0.68,
        delayFrames: 42, // ~1.4s delay
        tintColor: "rgba(0, 180, 255, 0.3)",
        alpha: 0.85
      }
    ];

    // Spawn smoke explosion at each clone location
    this.clones.forEach((c, idx) => {
      setTimeout(() => {
        this.spawnSmokePuff(c.xFrac * w, c.yFrac * h, 1.4);
        if (window.shinobiAudio) window.shinobiAudio.playPoof(0.7);
      }, idx * 60);
    });
  }

  // 2. Ultimate Shadow Army (Summons 12-16 Video Clones of the User!)
  summonShadowArmy() {
    this.clonesMode = "shadow_army";
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.clones = [];
    const armyPositions = [
      // Back row (smaller, higher delay)
      { x: 0.12, y: 0.26, s: 0.52, d: 55 },
      { x: 0.28, y: 0.25, s: 0.52, d: 50 },
      { x: 0.50, y: 0.22, s: 0.50, d: 60 },
      { x: 0.72, y: 0.25, s: 0.52, d: 45 },
      { x: 0.88, y: 0.26, s: 0.52, d: 40 },
      // Middle row
      { x: 0.16, y: 0.42, s: 0.68, d: 35 },
      { x: 0.34, y: 0.40, s: 0.70, d: 25 },
      { x: 0.66, y: 0.40, s: 0.70, d: 30 },
      { x: 0.84, y: 0.42, s: 0.68, d: 20 },
      // Front row (beside user)
      { x: 0.22, y: 0.58, s: 0.85, d: 12 },
      { x: 0.78, y: 0.58, s: 0.85, d: 18 }
    ];

    armyPositions.forEach((pos, i) => {
      this.clones.push({
        id: i + 1,
        xFrac: pos.x,
        yFrac: pos.y,
        scale: pos.s,
        delayFrames: pos.d,
        tintColor: "rgba(0, 240, 255, 0.22)",
        alpha: 0.88
      });

      // Staggered smoke bursts
      setTimeout(() => {
        this.spawnSmokePuff(pos.x * w, pos.y * h, pos.s * 1.5);
      }, i * 40);
    });

    if (window.shinobiAudio) {
      window.shinobiAudio.playShadowArmy();
    }

    // Auto-dissolve shadow army after 10 seconds
    setTimeout(() => {
      this.dismissClones();
    }, 10000);
  }

  dismissClones() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.clones.forEach(c => {
      this.spawnSmokePuff(c.xFrac * w, c.yFrac * h, 1.0);
    });
    this.clones = [];
    this.clonesMode = "none";
    if (window.shinobiAudio) window.shinobiAudio.playPoof(0.6);
  }

  // 3. Substitution Jutsu (Replaces user's live video with a wooden log in smoke)
  triggerSubstitution() {
    this.isSubstituted = true;
    this.substitutionTime = 3.0; // 3 seconds substitution
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.spawnSmokePuff(w * 0.5, h * 0.52, 2.0);
    if (window.shinobiAudio) window.shinobiAudio.playSubstitution();
  }

  // 4. AR Rasengan in User's Palm
  triggerRasengan(handPos) {
    this.activeRasengan = {
      x: handPos.x,
      y: handPos.y,
      radius: 55,
      angle: 0,
      state: "charging", // "charging" -> "launched"
      chargeTime: 0,
      vx: 0,
      vy: 0
    };

    if (window.shinobiAudio) window.shinobiAudio.playRasenganCharge();

    setTimeout(() => {
      if (this.activeRasengan) {
        this.activeRasengan.state = "launched";
        this.activeRasengan.vy = -18; // Launches forward/upward into screen
        if (window.shinobiAudio) window.shinobiAudio.playRasenganRelease();
      }
    }, 600);
  }

  // 5. AR Chidori Lightning around User's Hand
  triggerChidori(handPos) {
    this.activeChidori = true;
    this.chidoriDuration = 1.8;
    this.chidoriPos = handPos;

    if (window.shinobiAudio) window.shinobiAudio.playChidori(1.8);

    setTimeout(() => {
      this.activeChidori = false;
    }, 1800);
  }

  // 6. AR Chakra Shield around User's Hand
  triggerChakraShield(handPos) {
    this.activeShield = true;
    this.shieldDuration = 3.5;
    this.shieldPos = handPos;

    if (window.shinobiAudio) window.shinobiAudio.playChakraShield();

    setTimeout(() => {
      this.activeShield = false;
    }, 3500);
  }

  // 7. AR Fireball Eruption from User's Hands
  triggerFireball(handPos) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const originX = handPos ? handPos.x : w * 0.5;
    const originY = handPos ? handPos.y : h * 0.55;

    this.activeFireball = {
      x: originX,
      y: originY,
      radius: 40,
      maxRadius: 180,
      vy: -14,
      age: 0,
      maxAge: 2.2
    };

    if (window.shinobiAudio) window.shinobiAudio.playFireball();
  }

  // 2D Smoke Puff Particle System
  spawnSmokePuff(x, y, scale = 1.0) {
    const count = Math.round(18 * scale);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.0 + Math.random() * 4.5) * scale;
      this.smokePuffs.push({
        x: x + (Math.random() - 0.5) * 40 * scale,
        y: y + (Math.random() - 0.5) * 40 * scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2 * scale,
        radius: (25 + Math.random() * 35) * scale,
        alpha: 0.9,
        maxLife: 0.7 + Math.random() * 0.4,
        life: 0
      });
    }
  }

  // Main Render Loop for AR Shinobi Mirror
  render(landmarksList = []) {
    if (!this.isActive || !this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Subtle Ninja Dojo Courtyard Backdrop Gradient
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.35, 100, w * 0.5, h * 0.5, w * 0.7);
    bgGrad.addColorStop(0, "rgba(10, 16, 28, 0.4)");
    bgGrad.addColorStop(0.7, "rgba(6, 8, 14, 0.85)");
    bgGrad.addColorStop(1, "rgba(4, 5, 8, 0.98)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Background Clones First (Back-to-Front Depth Sorting)
    if (this.clones.length > 0 && this.frameBuffer.length > 0) {
      // Sort by scale ascending so smaller/distant clones render behind
      const sortedClones = [...this.clones].sort((a, b) => a.scale - b.scale);

      sortedClones.forEach(c => {
        const frameIdx = Math.max(0, this.frameBuffer.length - 1 - c.delayFrames);
        const cloneFrame = this.frameBuffer[frameIdx];
        if (!cloneFrame) return;

        const cw = Math.round(w * 0.55 * c.scale);
        const ch = Math.round(h * 0.65 * c.scale);
        const cx = Math.round(c.xFrac * w - cw * 0.5);
        const cy = Math.round(c.yFrac * h - ch * 0.5);

        ctx.save();
        ctx.globalAlpha = c.alpha;

        // Shadow / Chakra Cyan Rim Glow
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 24 * c.scale;

        // Draw clone video frame with rounded ninja silhouette framing
        this.drawRoundedVideoFrame(ctx, cloneFrame, cx, cy, cw, ch, 20);

        // Cyan chakra tint overlay
        ctx.fillStyle = c.tintColor;
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillRect(cx, cy, cw, ch);
        ctx.restore();
      });
    }

    // 3. Draw Center Main User Feed (OR Wooden Substitution Log if substituted!)
    const userW = Math.round(w * 0.62);
    const userH = Math.round(h * 0.72);
    const userX = Math.round((w - userW) * 0.5);
    const userY = Math.round((h - userH) * 0.52);

    if (this.isSubstituted) {
      // Draw 3D Wooden Training Log in place of user
      this.drawSubstitutionLog(ctx, w * 0.5, h * 0.56, userW * 0.5, userH * 0.65);
      this.substitutionTime -= 0.033;
      if (this.substitutionTime <= 0) {
        this.isSubstituted = false;
        this.spawnSmokePuff(w * 0.5, h * 0.52, 1.8);
        if (window.shinobiAudio) window.shinobiAudio.playPoof(0.7);
      }
    } else if (this.video && this.video.readyState >= 2) {
      ctx.save();
      // Glowing chakra border frame around user
      ctx.shadowColor = "rgba(0, 240, 255, 0.4)";
      ctx.shadowBlur = 30;

      // Draw Main User live video
      this.drawRoundedVideoFrame(ctx, this.video, userX, userY, userW, userH, 24, true);
      ctx.restore();

      // Shinobi Headband (Hitai-ate) AR Overlay over User's Head
      if (this.showHeadband) {
        this.drawShinobiHeadband(ctx, w * 0.5, userY + 45, userW * 0.38);
      }
    }

    // 4. Map Hand Landmarks to Screen Coordinates for AR Jutsu Attachment
    let primaryHandScreenPos = null;
    let fingerTips = [];

    if (landmarksList && landmarksList.length > 0) {
      const lm = landmarksList[0];
      // Landmark 0 is wrist, Landmark 9 is middle MCP (palm center)
      const palmX = userX + (1.0 - lm[9].x) * userW; // Mirrored
      const palmY = userY + lm[9].y * userH;
      primaryHandScreenPos = { x: palmX, y: palmY };

      // Fingertips (index 8, middle 12)
      const tip8X = userX + (1.0 - lm[8].x) * userW;
      const tip8Y = userY + lm[8].y * userH;
      fingerTips.push({ x: tip8X, y: tip8Y });
    } else {
      // Fallback hand anchor to center-right
      primaryHandScreenPos = { x: w * 0.58, y: h * 0.62 };
      fingerTips.push({ x: w * 0.58, y: h * 0.55 });
    }

    // 5. Draw AR Rasengan in Hand
    if (this.activeRasengan) {
      if (this.activeRasengan.state === "charging" && primaryHandScreenPos) {
        this.activeRasengan.x = primaryHandScreenPos.x;
        this.activeRasengan.y = primaryHandScreenPos.y;
      } else if (this.activeRasengan.state === "launched") {
        this.activeRasengan.y += this.activeRasengan.vy;
        this.activeRasengan.radius += 1.8;
        if (this.activeRasengan.y < 50 || this.activeRasengan.radius > 160) {
          // Detonate
          this.spawnSmokePuff(this.activeRasengan.x, this.activeRasengan.y, 2.2);
          this.activeRasengan = null;
        }
      }
      if (this.activeRasengan) {
        this.drawRasenganOrb(ctx, this.activeRasengan.x, this.activeRasengan.y, this.activeRasengan.radius);
      }
    }

    // 6. Draw AR Chidori Lightning
    if (this.activeChidori && primaryHandScreenPos) {
      this.drawChidoriLightning(ctx, primaryHandScreenPos.x, primaryHandScreenPos.y, fingerTips);
    }

    // 7. Draw AR Chakra Shield Dome
    if (this.activeShield && primaryHandScreenPos) {
      this.drawChakraShieldDome(ctx, primaryHandScreenPos.x, primaryHandScreenPos.y - 40, 140);
    }

    // 8. Draw AR Fireball
    if (this.activeFireball) {
      this.activeFireball.y += this.activeFireball.vy;
      this.activeFireball.radius = Math.min(this.activeFireball.maxRadius, this.activeFireball.radius + 3.5);
      this.activeFireball.age += 0.033;

      this.drawFireballFlame(ctx, this.activeFireball.x, this.activeFireball.y, this.activeFireball.radius);

      if (this.activeFireball.age >= this.activeFireball.maxAge || this.activeFireball.y < -100) {
        this.spawnSmokePuff(this.activeFireball.x, 150, 2.5);
        this.activeFireball = null;
      }
    }

    // 9. Update & Draw Smoke Puffs
    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const p = this.smokePuffs[i];
      p.life += 0.033;
      p.x += p.vx;
      p.y += p.vy;
      p.radius += 0.8;
      p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 230, 245, ${p.alpha * 0.75})`;
      ctx.fill();
      ctx.restore();

      if (p.life >= p.maxLife) {
        this.smokePuffs.splice(i, 1);
      }
    }
  }

  // Draw rounded video frame
  drawRoundedVideoFrame(ctx, source, x, y, width, height, radius = 20, isMirror = false) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();

    if (isMirror) {
      ctx.translate(x + width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(source, 0, 0, width, height);
    } else {
      ctx.drawImage(source, x, y, width, height);
    }
    ctx.restore();

    // Subtle cyan edge border
    ctx.save();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, width, height, radius) : ctx.rect(x, y, width, height);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Draw Shinobi Headband (Hitai-ate) AR Overlay
  drawShinobiHeadband(ctx, centerX, topY, width) {
    const height = 44;
    const x = centerX - width * 0.5;

    ctx.save();
    // Dark blue cloth wrap
    ctx.fillStyle = "#0c1524";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, topY, width, height, 8) : ctx.rect(x, topY, width, height);
    ctx.fill();

    // Metal Plate in Center
    const plateW = width * 0.58;
    const plateH = height * 0.72;
    const plateX = centerX - plateW * 0.5;
    const plateY = topY + (height - plateH) * 0.5;

    const metalGrad = ctx.createLinearGradient(plateX, plateY, plateX, plateY + plateH);
    metalGrad.addColorStop(0, "#d8e2ec");
    metalGrad.addColorStop(0.5, "#9ab0c4");
    metalGrad.addColorStop(1, "#667a8c");

    ctx.fillStyle = metalGrad;
    ctx.shadowColor = "rgba(0, 240, 255, 0.4)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(plateX, plateY, plateW, plateH, 6) : ctx.rect(plateX, plateY, plateW, plateH);
    ctx.fill();

    // Engraved Leaf Village Shinobi Spiral Insignia
    ctx.strokeStyle = "#1b2838";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX - 4, plateY + plateH * 0.5, 9, 0, Math.PI * 1.6);
    ctx.stroke();
    // Triangle tip
    ctx.beginPath();
    ctx.moveTo(centerX + 6, plateY + plateH * 0.35);
    ctx.lineTo(centerX + 16, plateY + plateH * 0.5);
    ctx.lineTo(centerX + 6, plateY + plateH * 0.65);
    ctx.fillStyle = "#1b2838";
    ctx.fill();

    ctx.restore();
  }

  // Draw 3D Wooden Training Log for Substitution Jutsu
  drawSubstitutionLog(ctx, cx, cy, width, height) {
    ctx.save();
    // Wooden log trunk
    const woodGrad = ctx.createLinearGradient(cx - width * 0.5, cy, cx + width * 0.5, cy);
    woodGrad.addColorStop(0, "#5a3a1e");
    woodGrad.addColorStop(0.3, "#8a582d");
    woodGrad.addColorStop(0.7, "#6b4423");
    woodGrad.addColorStop(1, "#3e2714");

    ctx.fillStyle = woodGrad;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx - width * 0.45, cy - height * 0.5, width * 0.9, height, 16) : ctx.rect(cx - width * 0.45, cy - height * 0.5, width * 0.9, height);
    ctx.fill();

    // Wood rings on top cut
    ctx.fillStyle = "#d2b48c";
    ctx.beginPath();
    ctx.ellipse(cx, cy - height * 0.5, width * 0.42, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Stuck Kunai knife
    ctx.fillStyle = "#222a35";
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy - 20);
    ctx.lineTo(cx + 80, cy - 60);
    ctx.lineTo(cx + 70, cy - 10);
    ctx.fill();

    ctx.restore();
  }

  // Draw Swirling Rasengan Energy Sphere
  drawRasenganOrb(ctx, cx, cy, r) {
    ctx.save();
    // Outer chakra glow
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    glowGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    glowGrad.addColorStop(0.35, "rgba(0, 240, 255, 0.85)");
    glowGrad.addColorStop(0.7, "rgba(0, 136, 255, 0.45)");
    glowGrad.addColorStop(1, "rgba(0, 80, 200, 0)");

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Swirling vortex spiral rings
    const time = performance.now() * 0.015;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const rot = time + (i * Math.PI) / 2;
      ctx.ellipse(cx, cy, r * 0.85, r * 0.35, rot, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Chidori Electric Lightning
  drawChidoriLightning(ctx, handX, handY, fingerTips) {
    ctx.save();
    ctx.strokeStyle = "#00f0ff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;

    for (let bolt = 0; bolt < 6; bolt++) {
      let curX = handX;
      let curY = handY;
      const target = fingerTips[0] || { x: handX, y: handY - 120 };
      const destX = target.x + (Math.random() - 0.5) * 140;
      const destY = target.y + (Math.random() - 0.5) * 140;

      ctx.beginPath();
      ctx.moveTo(curX, curY);
      const segments = 6;
      for (let s = 1; s <= segments; s++) {
        const frac = s / segments;
        const nx = curX + (destX - curX) * frac + (Math.random() - 0.5) * 35;
        const ny = curY + (destY - curY) * frac + (Math.random() - 0.5) * 35;
        ctx.lineTo(nx, ny);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Chakra Shield Barrier Dome
  drawChakraShieldDome(ctx, cx, cy, radius) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
    ctx.fillStyle = "rgba(0, 180, 255, 0.18)";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 25;
    ctx.lineWidth = 3.5;

    // Hexagonal shield polygon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hx = cx + Math.cos(angle) * radius;
      const hy = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner concentric ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Draw Roaring Fireball
  drawFireballFlame(ctx, cx, cy, r) {
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    grad.addColorStop(0, "rgba(255, 255, 200, 1)");
    grad.addColorStop(0.3, "rgba(255, 140, 0, 0.85)");
    grad.addColorStop(0.7, "rgba(255, 40, 0, 0.6)");
    grad.addColorStop(1, "rgba(180, 10, 0, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

window.ShinobiARMirror = ShinobiARMirror;
