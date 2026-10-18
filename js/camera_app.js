/**
 * 3D Ninja Academy: Shadow Jutsu Camera & Real Video Clones Engine
 * PURE CAMERA EXPERIENCE: Displays the USER'S LIVE WEBCAM FULLSCREEN.
 * Spawns REAL VIDEO SHADOW CLONES OF THE USER in smoke poofs with delayed playback,
 * and renders AR Jutsu (Rasengan, Chidori, Fireball, Substitution, Shield) directly on the user's hands!
 */

class ShadowJutsuCameraApp {
  constructor() {
    this.video = document.getElementById("main-webcam");
    this.canvas = document.getElementById("fx-canvas");
    this.ctx = this.canvas.getContext("2d");

    // Live Video Snapshot History Buffer (Stores past video frames for time-delayed clones)
    this.frameBuffer = [];
    this.maxBufferSize = 90; // ~3 seconds at 30fps
    this.bufferCanvas = document.createElement("canvas");
    this.bufferCtx = this.bufferCanvas.getContext("2d");

    // Active Jutsu States
    this.activeClones = []; // Array of clone render objects
    this.clonesType = "none"; // "none", "shadow_clones" (3 clones), "shadow_army" (12 clones)
    this.smokeParticles = [];
    this.isSubstituted = false;
    this.substituteTime = 0;

    // Hand-anchored AR Effects
    this.activeRasengan = null;
    this.activeChidori = false;
    this.activeShield = false;
    this.activeFireball = null;
    this.trackedHands = [];

    // Vision connection (WebSocket or MediaPipe)
    this.ws = null;
    this.candidateGesture = null;

    this.initCamera();
    this.initResize();
    this.initVision();
    this.initUI();
    this.initAudio();

    // Start rendering loops
    this.captureVideoHistory();
    this.renderLoop();
  }

  // 1. Instant Camera Startup
  async initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user"
        },
        audio: false
      });

      this.video.srcObject = stream;
      await this.video.play();

      this.updateStatus("Camera Active. Ready for Hand Seals!");
      this.initBrowserMediaPipe();
    } catch (err) {
      console.error("[Camera] Error accessing webcam:", err);
      this.updateStatus("Camera Error: Please allow camera permissions", "#ff2a5f");
    }
  }

  initResize() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.bufferCanvas.width = 480;
      this.bufferCanvas.height = 360;
    };
    resize();
    window.addEventListener("resize", resize);
  }

  initAudio() {
    // Connect to global Web Audio engine
    if (window.shinobiAudio) {
      window.shinobiAudio.init();
    }
  }

  // Record live camera frames into a ring buffer for video clones
  captureVideoHistory() {
    if (this.video && this.video.readyState >= 2) {
      const bw = this.bufferCanvas.width;
      const bh = this.bufferCanvas.height;

      // Draw mirrored video frame into offscreen buffer
      this.bufferCtx.save();
      this.bufferCtx.translate(bw, 0);
      this.bufferCtx.scale(-1, 1);
      this.bufferCtx.drawImage(this.video, 0, 0, bw, bh);
      this.bufferCtx.restore();

      const snapshot = document.createElement("canvas");
      snapshot.width = bw;
      snapshot.height = bh;
      snapshot.getContext("2d").drawImage(this.bufferCanvas, 0, 0);

      this.frameBuffer.push(snapshot);
      if (this.frameBuffer.length > this.maxBufferSize) {
        this.frameBuffer.shift();
      }
    }

    requestAnimationFrame(() => this.captureVideoHistory());
  }

  // =========================================================================
  // JUTSU ABILITIES (REAL VIDEO CLONES & AR EFFECTS)
  // =========================================================================

  // 1. Shadow Clone Jutsu (Spawns 3 Real Video Clones of the User!)
  castShadowClones() {
    if (window.shinobiAudio) window.shinobiAudio.playPoof();
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.clonesType = "shadow_clones";
    this.activeClones = [
      {
        id: 1,
        x: w * 0.18,
        y: h * 0.52,
        scale: 0.82,
        delayFrames: 14, // ~0.45s delay
        tint: "rgba(0, 240, 255, 0.25)"
      },
      {
        id: 2,
        x: w * 0.82,
        y: h * 0.52,
        scale: 0.82,
        delayFrames: 28, // ~0.9s delay
        tint: "rgba(0, 240, 255, 0.25)"
      },
      {
        id: 3,
        x: w * 0.32,
        y: h * 0.38,
        scale: 0.68,
        delayFrames: 42, // ~1.4s delay
        tint: "rgba(0, 180, 255, 0.3)"
      }
    ];

    // Billowing smoke explosion for each clone
    this.activeClones.forEach((c, idx) => {
      setTimeout(() => {
        this.spawnSmokePuff(c.x, c.y, 1.5);
        if (window.shinobiAudio) window.shinobiAudio.playPoof(0.7);
      }, idx * 75);
    });

    this.showBanner("KAGE BUNSHIN NO JUTSU! (3 Clones Summoned)");
  }

  // 2. Ultimate Shadow Army (Spawns 12 Real Video Clones of the User!)
  castShadowArmy() {
    if (window.shinobiAudio) window.shinobiAudio.playShadowArmy();
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.clonesType = "shadow_army";
    this.activeClones = [];

    const armyPositions = [
      // Top row
      { x: w * 0.12, y: h * 0.25, s: 0.5, d: 55 },
      { x: w * 0.32, y: h * 0.22, s: 0.5, d: 48 },
      { x: w * 0.50, y: h * 0.20, s: 0.48, d: 60 },
      { x: w * 0.68, y: h * 0.22, s: 0.5, d: 42 },
      { x: w * 0.88, y: h * 0.25, s: 0.5, d: 38 },
      // Middle row
      { x: w * 0.16, y: h * 0.44, s: 0.68, d: 32 },
      { x: w * 0.35, y: h * 0.42, s: 0.70, d: 24 },
      { x: w * 0.65, y: h * 0.42, s: 0.70, d: 28 },
      { x: w * 0.84, y: h * 0.44, s: 0.68, d: 18 },
      // Front row
      { x: w * 0.22, y: h * 0.62, s: 0.85, d: 12 },
      { x: w * 0.78, y: h * 0.62, s: 0.85, d: 16 }
    ];

    armyPositions.forEach((pos, i) => {
      this.activeClones.push({
        id: i + 1,
        x: pos.x,
        y: pos.y,
        scale: pos.s,
        delayFrames: pos.d,
        tint: "rgba(0, 240, 255, 0.22)"
      });

      setTimeout(() => {
        this.spawnSmokePuff(pos.x, pos.y, pos.s * 1.6);
      }, i * 45);
    });

    this.showBanner("TAJU KAGE BUNSHIN NO JUTSU! (Shadow Army Active)");
  }

  // Dismiss all clones
  clearClones() {
    this.activeClones.forEach(c => {
      this.spawnSmokePuff(c.x, c.y, 1.2);
    });
    this.activeClones = [];
    this.clonesType = "none";
    if (window.shinobiAudio) window.shinobiAudio.playPoof(0.6);
    this.showBanner("Clones Dispersed");
  }

  // 3. Substitution Jutsu (Replaces user's video with a wooden log in smoke)
  castSubstitution() {
    if (window.shinobiAudio) window.shinobiAudio.playSubstitution();
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.isSubstituted = true;
    this.substituteTime = 3.2; // 3.2 seconds
    this.spawnSmokePuff(w * 0.5, h * 0.55, 2.4);

    this.showBanner("KAWARIMI NO JUTSU! (Substituted with Log)");
  }

  // 4. AR Rasengan in Hand
  castRasengan() {
    const hand = this.getHandScreenPos();
    this.activeRasengan = {
      x: hand.x,
      y: hand.y,
      radius: 60,
      state: "charging"
    };

    if (window.shinobiAudio) window.shinobiAudio.playRasenganCharge();
    this.showBanner("RASENGAN CHARGING!");

    setTimeout(() => {
      if (this.activeRasengan) {
        this.activeRasengan.state = "launched";
        this.activeRasengan.vy = -18;
        if (window.shinobiAudio) window.shinobiAudio.playRasenganRelease();
      }
    }, 600);
  }

  // 5. AR Chidori Lightning
  castChidori() {
    if (window.shinobiAudio) window.shinobiAudio.playChidori(1.8);
    this.activeChidori = true;
    this.showBanner("CHIDORI! (One Thousand Birds)");

    setTimeout(() => {
      this.activeChidori = false;
    }, 2000);
  }

  // 6. AR Fireball Jutsu
  castFireball() {
    if (window.shinobiAudio) window.shinobiAudio.playFireball();
    const hand = this.getHandScreenPos();

    this.activeFireball = {
      x: hand.x,
      y: hand.y,
      radius: 45,
      maxRadius: 220,
      vy: -15,
      age: 0
    };

    this.showBanner("KATON: GOKAKYU NO JUTSU! (Fireball)");
  }

  // 7. AR Chakra Shield
  castShield() {
    if (window.shinobiAudio) window.shinobiAudio.playChakraShield();
    this.activeShield = true;
    this.showBanner("CHAKRA BARRIER ACTIVATED!");

    setTimeout(() => {
      this.activeShield = false;
    }, 3500);
  }

  // 8. Flashbang
  castFlashbang() {
    if (window.shinobiAudio) window.shinobiAudio.playFlashbang();
    const overlay = document.getElementById("flash-screen");
    if (overlay) {
      overlay.style.opacity = "0.95";
      setTimeout(() => {
        overlay.style.transition = "opacity 0.6s ease-out";
        overlay.style.opacity = "0";
      }, 50);
    }
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.spawnSmokePuff(w * 0.5, h * 0.5, 2.0);
    this.showBanner("FLASHBANG DETONATED!");
  }

  // Spawn smoke explosion particles
  spawnSmokePuff(x, y, scale = 1.0) {
    const count = Math.round(20 * scale);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.5 + Math.random() * 5.0) * scale;
      this.smokeParticles.push({
        x: x + (Math.random() - 0.5) * 50 * scale,
        y: y + (Math.random() - 0.5) * 50 * scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5 * scale,
        radius: (30 + Math.random() * 40) * scale,
        alpha: 0.95,
        maxLife: 0.75 + Math.random() * 0.4,
        life: 0
      });
    }
  }

  getHandScreenPos() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (this.trackedHands && this.trackedHands.length > 0) {
      const lm = this.trackedHands[0];
      // Landmark 9 is middle knuckle (palm center)
      return {
        x: (1.0 - lm[9].x) * w, // Mirrored
        y: lm[9].y * h
      };
    }
    // Default center-right
    return { x: w * 0.65, y: h * 0.6 };
  }

  // =========================================================================
  // COMPUTER VISION & GESTURE DETECTION (WebSocket + Browser MediaPipe)
  // =========================================================================
  initVision() {
    // Try connecting to Python OpenCV/MediaPipe server
    try {
      this.ws = new WebSocket("ws://localhost:8765");
      this.ws.onopen = () => {
        this.updateStatus("AI Vision Server Connected (60 FPS)", "#00ff88");
      };
      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "frame") {
            if (data.landmarks && data.landmarks.length > 0) {
              this.trackedHands = data.landmarks;
            }
            if (data.candidate) {
              this.onGestureDetected(data.candidate);
            }
            if (data.triggered) {
              this.triggerJutsuByName(data.triggered);
            }
          }
        } catch (err) {}
      };
      this.ws.onerror = () => {
        this.updateStatus("Browser Gesture Tracking Online", "#00f0ff");
      };
    } catch (err) {
      this.updateStatus("Browser Gesture Tracking Online", "#00f0ff");
    }
  }

  initBrowserMediaPipe() {
    if (window.Hands && this.video) {
      try {
        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((res) => {
          if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
            this.trackedHands = res.multiHandLandmarks;
            this.classifyBrowserGestures(this.trackedHands);
          }
        });

        const sendFrame = async () => {
          if (this.video && this.video.readyState >= 2) {
            await hands.send({ image: this.video });
          }
          requestAnimationFrame(sendFrame);
        };
        requestAnimationFrame(sendFrame);
      } catch (e) {
        console.warn("[MediaPipe] Client MediaPipe fallback initialized:", e);
      }
    }
  }

  classifyBrowserGestures(hands) {
    if (!hands || hands.length === 0) return;
    const lm = hands[0];

    const d3 = (a, b) => Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2 + ((a.z || 0) - (b.z || 0))**2);
    const isExt = (tip, pip, mcp) => {
      const w = lm[0];
      return d3(w, lm[tip]) > d3(w, lm[pip]) * 1.15 && d3(w, lm[tip]) > d3(w, lm[mcp]) * 1.3;
    };

    const index = isExt(8, 6, 5);
    const middle = isExt(12, 10, 9);
    const ring = isExt(16, 14, 13);
    const pinky = isExt(20, 18, 17);
    const extCount = [index, middle, ring, pinky].filter(Boolean).length;

    // Both hands check
    if (hands.length >= 2) {
      const wDist = Math.abs(hands[0][0].x - hands[1][0].x);
      if (hands[0][0].y < 0.35 && hands[1][0].y < 0.35) {
        this.triggerDebounced("shadow_army");
        return;
      } else if (wDist < 0.16) {
        this.triggerDebounced("fireball");
        return;
      }
    }

    // Single hand check
    if (extCount >= 4) {
      if (lm[0].y < 0.38) {
        this.triggerDebounced("shadow_clone");
      } else {
        this.triggerDebounced("chakra_shield");
      }
    } else if (index && middle && !ring && !pinky) {
      this.triggerDebounced("flashbang");
    } else if (extCount <= 1) {
      this.lastFistTime = performance.now();
    }
  }

  triggerDebounced(jutsu) {
    const now = performance.now();
    if (this.lastTriggerTime && now - this.lastTriggerTime < 2800) return;
    this.lastTriggerTime = now;
    this.triggerJutsuByName(jutsu);
  }

  triggerJutsuByName(name) {
    switch (name) {
      case "shadow_clones":
      case "shadow_clone":
        this.castShadowClones();
        break;
      case "clear_clones":
      case "clear":
        this.clearClones();
        break;
      case "shadow_army":
        this.castShadowArmy();
        break;
      case "substitution":
        this.castSubstitution();
        break;
      case "rasengan":
        this.castRasengan();
        break;
      case "chidori":
        this.castChidori();
        break;
      case "fireball":
        this.castFireball();
        break;
      case "chakra_shield":
      case "shield":
        this.castShield();
        break;
      case "flashbang":
        this.castFlashbang();
        break;
    }
  }

  onGestureDetected(name) {
    const badge = document.getElementById("gesture-detected-badge");
    if (badge) {
      badge.textContent = `Pose: ${name.toUpperCase().replace("_", " ")}`;
      badge.classList.add("active");
      clearTimeout(this.badgeTimer);
      this.badgeTimer = setTimeout(() => badge.classList.remove("active"), 1200);
    }
  }

  // =========================================================================
  // MAIN RENDER LOOP (REAL VIDEO CLONES & AR FX CANVAS)
  // =========================================================================
  renderLoop() {
    requestAnimationFrame(() => this.renderLoop());

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Real Video Shadow Clones (Delayed Playback from Buffer!)
    if (this.activeClones.length > 0 && this.frameBuffer.length > 0) {
      // Sort clones back-to-front
      const sorted = [...this.activeClones].sort((a, b) => a.scale - b.scale);

      sorted.forEach(clone => {
        const frameIdx = Math.max(0, this.frameBuffer.length - 1 - clone.delayFrames);
        const snapshot = this.frameBuffer[frameIdx];
        if (!snapshot) return;

        const cw = Math.round(w * 0.52 * clone.scale);
        const ch = Math.round(h * 0.65 * clone.scale);
        const cx = Math.round(clone.x - cw * 0.5);
        const cy = Math.round(clone.y - ch * 0.5);

        ctx.save();
        ctx.globalAlpha = 0.90;

        // Shadow clone cyan chakra rim glow
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 28 * clone.scale;

        // Draw clone video snapshot with rounded border
        this.drawRoundedFrame(ctx, snapshot, cx, cy, cw, ch, 20);

        // Subtle cyan chakra overlay
        ctx.fillStyle = clone.tint;
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillRect(cx, cy, cw, ch);
        ctx.restore();
      });
    }

    // 2. Draw Substitution Wooden Log if active (User Vanished!)
    if (this.isSubstituted) {
      this.drawWoodenLog(ctx, w * 0.5, h * 0.58, w * 0.32, h * 0.48);
      this.substituteTime -= 0.033;
      if (this.substituteTime <= 0) {
        this.isSubstituted = false;
        this.spawnSmokePuff(w * 0.5, h * 0.55, 2.0);
        if (window.shinobiAudio) window.shinobiAudio.playPoof(0.7);
        this.showBanner("Substitution Ended - Returned!");
      }
    }

    // 3. Draw AR Rasengan in User's Hand
    if (this.activeRasengan) {
      const hand = this.getHandScreenPos();
      if (this.activeRasengan.state === "charging") {
        this.activeRasengan.x = hand.x;
        this.activeRasengan.y = hand.y;
      } else if (this.activeRasengan.state === "launched") {
        this.activeRasengan.y += this.activeRasengan.vy;
        this.activeRasengan.radius += 2.2;
        if (this.activeRasengan.y < 50 || this.activeRasengan.radius > 180) {
          this.spawnSmokePuff(this.activeRasengan.x, this.activeRasengan.y, 2.4);
          this.activeRasengan = null;
        }
      }
      if (this.activeRasengan) {
        this.drawRasenganOrb(ctx, this.activeRasengan.x, this.activeRasengan.y, this.activeRasengan.radius);
      }
    }

    // 4. Draw AR Chidori Lightning on Fingers
    if (this.activeChidori) {
      const hand = this.getHandScreenPos();
      this.drawChidoriLightning(ctx, hand.x, hand.y);
    }

    // 5. Draw AR Chakra Shield on Palm
    if (this.activeShield) {
      const hand = this.getHandScreenPos();
      this.drawChakraShield(ctx, hand.x, hand.y - 40, 160);
    }

    // 6. Draw AR Fireball
    if (this.activeFireball) {
      this.activeFireball.y += this.activeFireball.vy;
      this.activeFireball.radius = Math.min(this.activeFireball.maxRadius, this.activeFireball.radius + 4.0);
      this.drawFireball(ctx, this.activeFireball.x, this.activeFireball.y, this.activeFireball.radius);
      if (this.activeFireball.y < -100) {
        this.spawnSmokePuff(this.activeFireball.x, 150, 2.8);
        this.activeFireball = null;
      }
    }

    // 7. Draw Smoke Explosions
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life += 0.033;
      p.x += p.vx;
      p.y += p.vy;
      p.radius += 1.0;
      p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 240, 255, ${p.alpha * 0.82})`;
      ctx.fill();
      ctx.restore();

      if (p.life >= p.maxLife) {
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  drawRoundedFrame(ctx, source, x, y, width, height, radius = 20) {
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
    ctx.drawImage(source, x, y, width, height);
    ctx.restore();

    // Glowing cyan outline
    ctx.save();
    ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  drawWoodenLog(ctx, cx, cy, width, height) {
    ctx.save();
    const grad = ctx.createLinearGradient(cx - width * 0.5, cy, cx + width * 0.5, cy);
    grad.addColorStop(0, "#4a2e16");
    grad.addColorStop(0.3, "#7a4c25");
    grad.addColorStop(0.7, "#5c391b");
    grad.addColorStop(1, "#36210f");

    ctx.fillStyle = grad;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx - width * 0.45, cy - height * 0.5, width * 0.9, height, 16) : ctx.rect(cx - width * 0.45, cy - height * 0.5, width * 0.9, height);
    ctx.fill();

    // Wood rings on top cut
    ctx.fillStyle = "#d2b48c";
    ctx.beginPath();
    ctx.ellipse(cx, cy - height * 0.5, width * 0.42, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Kunai knife stuck in log
    ctx.fillStyle = "#1e2632";
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy - 20);
    ctx.lineTo(cx + 90, cy - 70);
    ctx.lineTo(cx + 80, cy - 10);
    ctx.fill();
    ctx.restore();
  }

  drawRasenganOrb(ctx, cx, cy, r) {
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    glow.addColorStop(0.4, "rgba(0, 240, 255, 0.88)");
    glow.addColorStop(0.8, "rgba(0, 136, 255, 0.5)");
    glow.addColorStop(1, "rgba(0, 80, 200, 0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Swirling vortex lines
    const time = performance.now() * 0.016;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.85, r * 0.35, time + (i * Math.PI) / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawChidoriLightning(ctx, handX, handY) {
    ctx.save();
    ctx.strokeStyle = "#00f0ff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3.5;

    for (let b = 0; b < 6; b++) {
      let curX = handX;
      let curY = handY;
      const destX = handX + (Math.random() - 0.5) * 180;
      const destY = handY - 80 + (Math.random() - 0.5) * 160;

      ctx.beginPath();
      ctx.moveTo(curX, curY);
      for (let s = 1; s <= 6; s++) {
        const frac = s / 6;
        const nx = curX + (destX - curX) * frac + (Math.random() - 0.5) * 40;
        const ny = curY + (destY - curY) * frac + (Math.random() - 0.5) * 40;
        ctx.lineTo(nx, ny);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawChakraShield(ctx, cx, cy, radius) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 240, 255, 0.88)";
    ctx.fillStyle = "rgba(0, 180, 255, 0.2)";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 25;
    ctx.lineWidth = 4;

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

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawFireball(ctx, cx, cy, r) {
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    grad.addColorStop(0, "rgba(255, 255, 220, 1)");
    grad.addColorStop(0.3, "rgba(255, 140, 0, 0.88)");
    grad.addColorStop(0.7, "rgba(255, 40, 0, 0.65)");
    grad.addColorStop(1, "rgba(180, 10, 0, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // UI Setup & Keyboard Shortcuts
  initUI() {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (window.shinobiAudio) window.shinobiAudio.ensureContext();

      switch (e.key) {
        case "1":
          this.castShadowClones();
          break;
        case "2":
          this.castFlashbang();
          break;
        case "3":
          this.castFireball();
          break;
        case "4":
          this.castRasengan();
          break;
        case "5":
          this.castChidori();
          break;
        case "6":
          this.castSubstitution();
          break;
        case "7":
          this.castShield();
          break;
        case "0":
          this.castShadowArmy();
          break;
        case "Escape":
        case "c":
        case "C":
          this.clearClones();
          break;
      }
    });
  }

  showBanner(text) {
    const banner = document.getElementById("action-banner");
    if (banner) {
      banner.textContent = text;
      banner.classList.add("visible");
      clearTimeout(this.bannerTimer);
      this.bannerTimer = setTimeout(() => banner.classList.remove("visible"), 2600);
    }
  }

  updateStatus(text, color = "#00f0ff") {
    const el = document.getElementById("status-text");
    if (el) {
      el.textContent = text;
      el.style.color = color;
    }
  }
}

window.ShadowJutsuCameraApp = ShadowJutsuCameraApp;
window.startClientCameraApp = function() {
  if (!window.app) {
    window.app = new ShadowJutsuCameraApp();
  }
  return window.app;
};

