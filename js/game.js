/**
 * 3D Ninja Academy: Shadow Jutsu Simulator - Main Game Controller
 * Three.js Scene Setup, Camera Orbit, Game Loop, Ranks, Combos,
 * Tutorial, Target Challenge & Keyboard / On-Screen Fallback Controls.
 */

class NinjaAcademyGame {
  constructor() {
    // Player Stats
    this.maxHealth = 100;
    this.health = 100;
    this.maxChakra = 100;
    this.chakra = 100;
    
    // Scoring & Ranks
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboTimeout = 4.5;
    this.targetsDestroyed = 0;
    this.currentRank = "Academy Student";

    // Game Mode: "free_training", "tutorial", "challenge"
    this.gameMode = "free_training";
    this.challengeTimeLeft = 60;
    this.challengeActive = false;
    this.challengeInterval = null;

    // Movement state
    this.keys = {};
    this.playerSpeed = 9.0;
    
    // Camera controls state
    this.cameraDistance = 9.5;
    this.cameraHeight = 4.8;
    this.cameraYaw = 0;
    this.cameraPitch = 0.28;
    this.isDraggingMouse = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // View Mode: "ar_mirror" (YOUR FACE & REAL VIDEO CLONES) vs "3d_arena"
    this.viewMode = "ar_mirror";

    // Clock
    this.clock = new THREE.Clock();

    this.initThree();
    this.initWorld();
    this.initAbilities();
    this.initVision();
    this.initARMirror();
    this.initUI();
    this.initInputs();
    
    // Start main render loop
    this.animate();
  }

  initThree() {
    this.container = document.getElementById("game-canvas-container");
    this.canvas = document.getElementById("three-canvas");

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.022);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
    this.scene.parentCamera = this.camera;

    window.addEventListener("resize", () => this.onWindowResize());
  }

  initWorld() {
    this.vfx = new ShinobiVFXEngine(this.scene, this.camera);
    this.player = new NinjaCharacter(this.scene, false);
    this.player.position.set(0, 0, 0);

    this.cloneManager = new ShadowCloneManager(this.scene, this.vfx);
    this.world = new NinjaWorld(this.scene, this.vfx);
  }

  initAbilities() {
    this.abilityManager = new ShinobiAbilityManager(
      this,
      this.scene,
      this.vfx,
      this.world,
      this.player,
      this.cloneManager
    );
  }

  initVision() {
    this.vision = new ShinobiVisionClient(this);
  }

  initARMirror() {
    this.arMirror = new ShinobiARMirror(this);
  }

  setViewMode(mode) {
    this.viewMode = mode;
    const arContainer = document.getElementById("ar-mirror-container");
    const gameContainer = document.getElementById("game-canvas-container");
    const btnAr = document.getElementById("view-ar_mirror");
    const btn3D = document.getElementById("view-3d_arena");

    if (mode === "ar_mirror") {
      if (arContainer) arContainer.style.display = "block";
      if (gameContainer) gameContainer.style.opacity = "0.25";
      if (btnAr) btnAr.classList.add("active");
      if (btn3D) btn3D.classList.remove("active");
      if (this.arMirror) this.arMirror.isActive = true;
      this.showBanner("SWITCHED TO AR SHINOBI MIRROR (FACE & CLONES)", "#00f0ff");
    } else {
      if (arContainer) arContainer.style.display = "none";
      if (gameContainer) gameContainer.style.opacity = "1";
      if (btnAr) btnAr.classList.remove("active");
      if (btn3D) btn3D.classList.add("active");
      if (this.arMirror) this.arMirror.isActive = false;
      this.showBanner("SWITCHED TO 3D ARENA VIEW", "#ffd700");
    }
  }

  initUI() {
    // Populate ability dock cards
    const dock = document.getElementById("jutsu-dock");
    if (dock) {
      dock.innerHTML = "";
      const hotkeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
      let idx = 0;

      for (let id in this.abilityManager.abilities) {
        const ab = this.abilityManager.abilities[id];
        const card = document.createElement("div");
        card.className = "ability-card ready";
        card.id = `card-${id}`;
        card.setAttribute("data-id", id);

        card.innerHTML = `
          <span class="hotkey-tag">[${hotkeys[idx]}]</span>
          <span class="chakra-cost-tag">-${ab.cost}</span>
          <div class="ability-icon">${ab.icon}</div>
          <div class="ability-name">${ab.name}</div>
          <div class="cooldown-overlay" id="cd-${id}">0.0</div>
        `;

        card.addEventListener("click", () => {
          if (window.shinobiAudio) window.shinobiAudio.ensureContext();
          this.abilityManager.triggerAbility(id);
        });

        dock.appendChild(card);
        idx++;
      }
    }

    // Populate Jutsu Scroll Tutorial modal grid
    const scrollGrid = document.getElementById("jutsu-scroll-grid");
    if (scrollGrid) {
      scrollGrid.innerHTML = "";
      for (let id in this.abilityManager.abilities) {
        const ab = this.abilityManager.abilities[id];
        const sCard = document.createElement("div");
        sCard.className = "jutsu-scroll-card";
        sCard.innerHTML = `
          <div class="scroll-card-header">
            <span class="scroll-card-title">${ab.icon} ${ab.name} (${ab.kanji})</span>
            <span class="gesture-badge">${ab.gesture}</span>
          </div>
          <p class="scroll-card-desc">${ab.description}</p>
          <div class="scroll-card-footer">
            <span style="font-size: 10px; color: var(--chakra-cyan);">Chakra: ${ab.cost} | Cooldown: ${ab.cooldown}s</span>
            <button class="try-jutsu-btn" onclick="window.game.testJutsu('${id}')">Cast Jutsu</button>
          </div>
        `;
        scrollGrid.appendChild(sCard);
      }
    }

    // Settings Controls
    const flashSlider = document.getElementById("setting-flash-intensity");
    if (flashSlider) {
      flashSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        this.vfx.flashIntensity = val;
        const disp = document.getElementById("flash-val-display");
        if (disp) disp.textContent = `${Math.round(val * 100)}%`;
      });
    }

    const safeToggle = document.getElementById("setting-photo-safe");
    if (safeToggle) {
      safeToggle.addEventListener("change", (e) => {
        this.vfx.isPhotoSafe = e.target.checked;
        if (e.target.checked) {
          document.body.classList.add("photo-safe");
        } else {
          document.body.classList.remove("photo-safe");
        }
      });
    }

    const volSlider = document.getElementById("setting-volume");
    if (volSlider) {
      volSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        if (window.shinobiAudio) window.shinobiAudio.setVolume(val);
      });
    }
  }

  testJutsu(id) {
    if (window.shinobiAudio) window.shinobiAudio.ensureContext();
    this.closeAllModals();
    this.abilityManager.triggerAbility(id);
  }

  initInputs() {
    // Keyboard hotkeys
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      this.keys[e.key.toLowerCase()] = true;

      if (window.shinobiAudio) window.shinobiAudio.ensureContext();

      // Ability hotkeys: 1-9 and 0
      const hotkeyMap = {
        "1": "shadow_clone",
        "2": "flashbang",
        "3": "explosive",
        "4": "rasengan",
        "5": "chidori",
        "6": "fireball",
        "7": "substitution",
        "8": "teleport",
        "9": "chakra_shield",
        "0": "shadow_army"
      };

      if (hotkeyMap[e.key]) {
        this.abilityManager.triggerAbility(hotkeyMap[e.key]);
      }

      // Quick chakra meditation recharge
      if (e.key.toLowerCase() === "c") {
        this.rechargeChakra(20);
        if (window.shinobiAudio) window.shinobiAudio.playChakraCharge();
        this.vfx.spawnSmokePoof(this.player.position, 0.4, 8);
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Orbit camera mouse drag controls
    window.addEventListener("mousedown", (e) => {
      if (e.target.tagName !== "CANVAS" && !e.target.classList.contains("cinematic-vignette")) return;
      this.isDraggingMouse = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDraggingMouse) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.cameraYaw -= dx * 0.006;
      this.cameraPitch = Math.max(0.08, Math.min(1.2, this.cameraPitch + dy * 0.005));
    });

    window.addEventListener("mouseup", () => {
      this.isDraggingMouse = false;
    });

    // Zoom mouse wheel
    window.addEventListener("wheel", (e) => {
      this.cameraDistance = Math.max(4.5, Math.min(18.0, this.cameraDistance + e.deltaY * 0.01));
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // =========================================================================
  // Game Modes & Challenge State
  // =========================================================================
  setGameMode(mode) {
    this.gameMode = mode;
    document.querySelectorAll(".mode-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`mode-${mode}`);
    if (activeBtn) activeBtn.classList.add("active");

    const challengeBox = document.getElementById("challenge-hud-box");

    if (mode === "challenge") {
      if (challengeBox) challengeBox.classList.add("visible");
      this.startTargetChallenge();
    } else {
      if (challengeBox) challengeBox.classList.remove("visible");
      this.stopTargetChallenge();
      if (mode === "tutorial") {
        this.openModal("tutorial-modal");
      }
    }
  }

  startTargetChallenge() {
    this.challengeActive = true;
    this.challengeTimeLeft = 60;
    this.score = 0;
    this.combo = 0;
    this.targetsDestroyed = 0;
    this.updateHUD();

    if (window.shinobiAudio) {
      window.shinobiAudio.playTaikoDrum(1.3);
    }
    this.showBanner("TARGET ACADEMY CHALLENGE START!", "#ffd000");

    if (this.challengeInterval) clearInterval(this.challengeInterval);
    this.challengeInterval = setInterval(() => {
      this.challengeTimeLeft--;
      const timerEl = document.getElementById("challenge-timer");
      if (timerEl) timerEl.textContent = `${this.challengeTimeLeft}s`;

      if (this.challengeTimeLeft <= 0) {
        this.endTargetChallenge();
      }
    }, 1000);
  }

  stopTargetChallenge() {
    this.challengeActive = false;
    if (this.challengeInterval) clearInterval(this.challengeInterval);
  }

  endTargetChallenge() {
    this.stopTargetChallenge();
    if (window.shinobiAudio) window.shinobiAudio.playRankUp();

    // Display evaluation modal
    const evalModal = document.getElementById("evaluation-modal");
    if (evalModal) {
      document.getElementById("eval-score").textContent = this.score;
      document.getElementById("eval-targets").textContent = this.targetsDestroyed;
      document.getElementById("eval-rank").textContent = this.currentRank;
      this.openModal("evaluation-modal");
    }
  }

  onAbilityCast(abilityId) {
    if (this.gameMode === "tutorial") {
      this.showBanner(`Mastered ${abilityId.toUpperCase()}!`, "#00ff88");
    }
  }

  addScore(pts, worldPosition = null, isCrit = false) {
    this.combo++;
    this.comboTimer = this.comboTimeout;

    const mult = 1 + Math.floor(this.combo / 5) * 0.5;
    const finalPts = Math.round(pts * mult);
    this.score += finalPts;
    this.targetsDestroyed++;

    this.checkRankPromotion();
    this.updateHUD();

    // Spawn 2D floating damage text
    if (worldPosition) {
      this.spawnFloatingDamage(finalPts, worldPosition, isCrit);
    }
  }

  spawnFloatingDamage(damage, worldPos, isCrit = false) {
    const screenPos = worldPos.clone().project(this.camera);
    if (screenPos.z > 1) return; // Behind camera

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

    const div = document.createElement("div");
    div.className = `floating-damage-number ${isCrit ? "crit" : ""}`;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.textContent = isCrit ? `CRIT! ${damage}` : `${damage}`;
    document.body.appendChild(div);

    setTimeout(() => div.remove(), 1200);
  }

  checkRankPromotion() {
    const ranks = [
      { score: 0, title: "Academy Student" },
      { score: 600, title: "Genin (下忍)" },
      { score: 1800, title: "Chunin (中忍)" },
      { score: 3800, title: "Jonin (上忍)" },
      { score: 6500, title: "ANBU Black Ops (暗部)" },
      { score: 10000, title: "Shadow Master (影)" }
    ];

    let newRank = ranks[0].title;
    for (let i = ranks.length - 1; i >= 0; i--) {
      if (this.score >= ranks[i].score) {
        newRank = ranks[i].title;
        break;
      }
    }

    if (newRank !== this.currentRank) {
      this.currentRank = newRank;
      if (window.shinobiAudio) window.shinobiAudio.playRankUp();
      this.showBanner(`SHINOBI PROMOTION: ${newRank.toUpperCase()}!`, "#ffd700");
    }
  }

  consumeChakra(amount) {
    this.chakra = Math.max(0, this.chakra - amount);
    this.updateHUD();
  }

  rechargeChakra(amount) {
    this.chakra = Math.min(this.maxChakra, this.chakra + amount);
    this.updateHUD();
  }

  updateHUD() {
    // Health Bar
    const hpFill = document.getElementById("health-fill");
    if (hpFill) hpFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
    const hpText = document.getElementById("health-text");
    if (hpText) hpText.textContent = `${Math.round(this.health)} / ${this.maxHealth}`;

    // Chakra Bar
    const ckFill = document.getElementById("chakra-fill");
    if (ckFill) ckFill.style.width = `${(this.chakra / this.maxChakra) * 100}%`;
    const ckText = document.getElementById("chakra-text");
    if (ckText) ckText.textContent = `${Math.round(this.chakra)} / ${this.maxChakra}`;

    // Score & Rank
    const rankEl = document.getElementById("shinobi-rank-name");
    if (rankEl) rankEl.textContent = this.currentRank;

    const scoreEl = document.getElementById("challenge-score");
    if (scoreEl) scoreEl.textContent = this.score;

    // Combo
    const comboGroup = document.getElementById("combo-display-group");
    const comboCountEl = document.getElementById("combo-count");
    if (comboGroup && comboCountEl) {
      if (this.combo > 1) {
        comboGroup.classList.add("active");
        comboCountEl.textContent = `${this.combo}x`;
      } else {
        comboGroup.classList.remove("active");
      }
    }

    // Cooldown overlay on cards
    for (let id in this.abilityManager.cooldownRemaining) {
      const cd = this.abilityManager.cooldownRemaining[id];
      const cdEl = document.getElementById(`cd-${id}`);
      const cardEl = document.getElementById(`card-${id}`);
      if (cdEl && cardEl) {
        if (cd > 0) {
          cdEl.classList.add("cooling");
          cdEl.textContent = cd.toFixed(1);
          cardEl.classList.remove("ready");
        } else {
          cdEl.classList.remove("cooling");
          cardEl.classList.add("ready");
        }
      }
    }
  }

  pulseAbilityCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (card) {
      card.classList.add("active-cast");
      setTimeout(() => card.classList.remove("active-cast"), 400);
    }
  }

  showBanner(message, color = "#00f0ff") {
    const banner = document.getElementById("shinobi-banner");
    const text = document.getElementById("banner-text");
    if (banner && text) {
      text.textContent = message;
      banner.style.borderColor = color;
      banner.style.boxShadow = `0 10px 30px rgba(0,0,0,0.8), 0 0 25px ${color}`;
      banner.classList.add("active");

      clearTimeout(this.bannerTimer);
      this.bannerTimer = setTimeout(() => {
        banner.classList.remove("active");
      }, 2400);
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("open");
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("open");
  }

  closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("open"));
  }

  togglePiP() {
    const pip = document.getElementById("webcam-monitor-panel");
    if (pip) pip.classList.toggle("minimized");
  }

  // =========================================================================
  // Movement & Player Physics
  // =========================================================================
  handleMovement(dt) {
    let moveX = 0;
    let moveZ = 0;

    if (this.keys["w"] || this.keys["arrowup"]) moveZ -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) moveZ += 1;
    if (this.keys["a"] || this.keys["arrowleft"]) moveX -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= length;
      moveZ /= length;

      // Project direction relative to camera yaw
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      this.player.position.addScaledVector(moveDir, this.playerSpeed * dt);
      
      // Face movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.player.rotation.y = THREE.MathUtils.lerp(this.player.rotation.y, targetAngle, 0.2);

      this.player.setAnimation("run");
      this.player.isMoving = true;
    } else {
      this.player.isMoving = false;
      if (this.player.animState === "run") {
        this.player.setAnimation("idle");
      }
    }
  }

  updateCamera() {
    // Smooth third-person chase camera
    const cx = this.player.position.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const cy = this.player.position.y + Math.sin(this.cameraPitch) * this.cameraDistance + 1.2;
    const cz = this.player.position.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.player.position.x, this.player.position.y + 1.3, this.player.position.z);
  }

  // =========================================================================
  // Main Animation Loop
  // =========================================================================
  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Passive Chakra Regeneration (+6 per second)
    this.rechargeChakra(dt * 6);

    // Combo timer decrement
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.updateHUD();
      }
    }

    // Movement & character logic
    this.handleMovement(dt);
    this.player.update(dt);
    this.cloneManager.update(dt, this.player);

    // World & VFX
    this.world.update(dt);
    this.vfx.update(dt);
    this.abilityManager.update(dt);

    // Camera
    this.updateCamera();

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    // Render AR Shinobi Mirror (User's Face, Real Video Clones & AR Hand Jutsu)
    if (this.arMirror && this.arMirror.isActive) {
      const lms = this.vision ? this.vision.latestLandmarks : [];
      this.arMirror.render(lms);
    }
  }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
  window.game = new NinjaAcademyGame();
});
