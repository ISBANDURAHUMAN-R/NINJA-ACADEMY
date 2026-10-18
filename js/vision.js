/**
 * 3D Ninja Academy: Shadow Jutsu Simulator - Computer Vision & Gesture Recognition Client
 * Dual-Mode Engine: Connects to Python WebSocket Server (ws://localhost:8765)
 * OR runs client-side in-browser MediaPipe / WebRTC tracking seamlessly.
 */

class ShinobiVisionClient {
  constructor(game) {
    this.game = game;
    this.mode = "python_ws"; // "python_ws" or "browser_webrtc"
    this.ws = null;
    this.wsUrl = "ws://localhost:8765";
    this.isConnected = false;
    this.reconnectTimer = null;

    // DOM Elements
    this.videoEl = document.getElementById("webcam-video");
    this.canvasEl = document.getElementById("skeleton-canvas");
    this.ctx = this.canvasEl ? this.canvasEl.getContext("2d") : null;
    this.beaconEl = document.getElementById("vision-beacon");
    this.modePillEl = document.getElementById("vision-mode-pill");
    this.fpsCounterEl = document.getElementById("vision-fps");
    this.diagGestureEl = document.getElementById("diag-gesture");
    this.diagHandsEl = document.getElementById("diag-hands");
    this.confidenceBarEl = document.getElementById("confidence-fill");

    // In-browser webcam state
    this.localStream = null;
    this.browserMpHands = null;
    this.browserMpCamera = null;
    this.fpsCount = 0;
    this.fpsLastTime = performance.now();
    this.currentFps = 0;

    // Gesture temporal tracking state
    this.candidateGesture = null;
    this.candidateStartTime = 0;
    this.candidateConfidence = 0;
    this.prevLandmarks = [];
    this.fistTime = 0;
    this.rasenganCharge = 0;
    this.lastProcessTime = performance.now();

    // Hand connections for skeleton drawing (pairs of landmark indices)
    this.connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],// Ring
      [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [5, 9], [9, 13], [13, 17], [0, 17]    // Palm base
    ];

    // Hold duration thresholds before triggering
    this.holdThresholds = {
      shadow_clone: 0.35,
      flashbang: 0.25,
      explosive: 0.1,
      rasengan: 0.5,
      chidori: 0.3,
      fireball: 0.4,
      substitution: 0.3,
      teleport: 0.15,
      chakra_shield: 0.35,
      shadow_army: 1.2
    };

    // Store latest landmarks for AR Mirror hand anchoring
    this.latestLandmarks = [];

    this.init();
  }

  init() {
    this.tryConnectWebSocket();
    // Also prepare in-browser webcam in parallel so PiP always shows live video
    this.startBrowserWebcam();
  }

  // =========================================================================
  // MODE 1: Python WebSocket Connection
  // =========================================================================
  tryConnectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.mode = "python_ws";
        this.updateStatusUI(true, "PYTHON WS (AI)");
        console.log("[Vision] Connected to Python Gesture Server!");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "frame") {
            this.handleServerFrame(data);
          }
        } catch (e) {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateStatusUI(false, "BROWSER VISION");
        // Schedule auto-reconnect
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.tryConnectWebSocket(), 3500);
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.updateStatusUI(false, "BROWSER VISION");
      };
    } catch (e) {
      this.isConnected = false;
      this.updateStatusUI(false, "BROWSER VISION");
    }
  }

  handleServerFrame(data) {
    if (this.fpsCounterEl) {
      this.fpsCounterEl.textContent = `${Math.round(data.fps || 30)} FPS`;
    }
    if (this.diagHandsEl) {
      this.diagHandsEl.textContent = `${data.hands_count} Hand(s)`;
    }

    // Draw skeleton if landmarks received
    if (data.landmarks && data.landmarks.length > 0) {
      this.latestLandmarks = data.landmarks;
      this.drawSkeleton(data.landmarks);
    } else {
      this.latestLandmarks = [];
      this.clearSkeleton();
    }

    // Candidate gesture and hold progress
    if (data.candidate) {
      const conf = 0.85;
      this.updateCandidateUI(data.candidate, conf, data.hold_progress || 0);
    } else {
      this.clearCandidateUI();
    }

    // Ability triggered from Python engine
    if (data.triggered) {
      this.game.abilityManager.triggerAbility(data.triggered);
    }
  }

  // =========================================================================
  // MODE 2: In-Browser Webcam & MediaPipe Hands Fallback
  // =========================================================================
  async startBrowserWebcam() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("[Vision] Webcam API not supported in this browser.");
        return;
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      });

      if (this.videoEl) {
        this.videoEl.srcObject = this.localStream;
        await this.videoEl.play();
      }

      // Initialize browser MediaPipe Hands if available via CDN
      this.initBrowserMediaPipe();
    } catch (err) {
      console.warn("[Vision] Could not access webcam directly:", err);
      if (this.modePillEl) {
        this.modePillEl.textContent = "KEYBOARD / TOUCH MODE";
      }
    }
  }

  initBrowserMediaPipe() {
    // Check if MediaPipe Hands global is loaded
    if (window.Hands) {
      try {
        this.browserMpHands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.browserMpHands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.browserMpHands.onResults((results) => {
          // Only process client-side if Python server is not connected
          if (!this.isConnected) {
            this.processBrowserResults(results);
          }
        });

        // Use Camera utils or requestAnimationFrame loop
        if (window.Camera && this.videoEl) {
          this.browserMpCamera = new window.Camera(this.videoEl, {
            onFrame: async () => {
              if (!this.isConnected && this.browserMpHands) {
                await this.browserMpHands.send({ image: this.videoEl });
              }
            },
            width: 640,
            height: 480
          });
          this.browserMpCamera.start();
        } else {
          // Fallback animation frame loop
          this.startVideoFrameLoop();
        }
      } catch (e) {
        console.warn("[Vision] Browser MediaPipe initialization error:", e);
      }
    } else {
      // In case CDN is slow or offline, frame loop is ready
      this.startVideoFrameLoop();
    }
  }

  startVideoFrameLoop() {
    const loop = () => {
      this.calculateFps();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  processBrowserResults(results) {
    this.calculateFps();

    const hands = results.multiHandLandmarks || [];
    this.latestLandmarks = hands;
    if (this.diagHandsEl) {
      this.diagHandsEl.textContent = `${hands.length} Hand(s)`;
    }

    if (hands.length > 0) {
      this.drawSkeleton(hands);
      this.classifyBrowserGestures(hands);
    } else {
      this.clearSkeleton();
      this.clearCandidateUI();
    }
  }

  // Pure JavaScript Client-Side Gesture Classifier (mirrors Python server logic)
  classifyBrowserGestures(handsList) {
    const now = performance.now() / 1000;
    const dt = Math.max(0.001, now - this.lastProcessTime);
    this.lastProcessTime = now;

    let detectedGesture = null;
    let confidence = 0.0;

    // Helper distance functions
    const d3 = (a, b) => Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2 + ((a.z || 0) - (b.z || 0))**2);
    const d2 = (a, b) => Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);

    const isExt = (lm, tip, pip, mcp) => {
      const w = lm[0];
      return d3(w, lm[tip]) > d3(w, lm[pip]) * 1.15 && d3(w, lm[tip]) > d3(w, lm[mcp]) * 1.3;
    };

    const analyzeHand = (lm) => {
      const thumb = d3(lm[0], lm[4]) > d3(lm[0], lm[3]) * 1.15;
      const index = isExt(lm, 8, 6, 5);
      const middle = isExt(lm, 12, 10, 9);
      const ring = isExt(lm, 16, 14, 13);
      const pinky = isExt(lm, 20, 18, 17);

      const extCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;
      const isOpen = extCount >= 4 && index && middle && pinky;
      const isFist = extCount <= 1 && !index && !middle && !ring && !pinky;
      const isTwoFinger = index && middle && !ring && !pinky;
      const isClaw = !isOpen && !isFist && d3(lm[4], lm[8]) < 0.18;

      return { lm, thumb, index, middle, ring, pinky, extCount, isOpen, isFist, isTwoFinger, isClaw, wrist: lm[0] };
    };

    // Two-hand checks
    if (handsList.length >= 2) {
      const h1 = analyzeHand(handsList[0]);
      const h2 = analyzeHand(handsList[1]);
      const wDist = d2(h1.wrist, h2.wrist);

      // 1. Ultimate Shadow Army: Both hands raised high (y < 0.38) with open palms
      if (h1.isOpen && h2.isOpen && h1.wrist.y < 0.38 && h2.wrist.y < 0.38) {
        detectedGesture = "shadow_army";
        confidence = 0.95;
      }
      // 2. Fireball or Substitution
      else if (wDist < 0.18) {
        if (Math.abs(h1.wrist.x - h2.wrist.x) < 0.08 && Math.abs(h1.wrist.y - h2.wrist.y) < 0.08) {
          detectedGesture = "substitution";
          confidence = 0.92;
        } else {
          detectedGesture = "fireball";
          confidence = 0.90;
        }
      }
    }

    // Single-hand checks
    if (!detectedGesture && handsList.length >= 1) {
      const h = analyzeHand(handsList[0]);

      // Fist tracking for Explosive Jutsu
      if (h.isFist) {
        this.fistTime = now;
      }

      if (h.isOpen && (now - this.fistTime < 0.75)) {
        detectedGesture = "explosive";
        confidence = 0.95;
        this.fistTime = 0;
      } else if (h.isTwoFinger) {
        detectedGesture = "flashbang";
        confidence = 0.88;
      } else if (h.isClaw) {
        this.rasenganCharge += dt * 1.5;
        if (this.rasenganCharge > 0.5) {
          detectedGesture = "rasengan";
          confidence = 0.92;
        }
      } else if (h.isOpen) {
        if (h.wrist.y <= 0.35) {
          detectedGesture = "shadow_clone";
          confidence = 0.90;
        } else {
          detectedGesture = "chakra_shield";
          confidence = 0.86;
        }
      }
    }

    // Hold Duration Verification
    if (detectedGesture) {
      if (this.candidateGesture === detectedGesture) {
        const holdTime = now - this.candidateStartTime;
        const reqHold = this.holdThresholds[detectedGesture] || 0.3;
        const progress = Math.min(1.0, holdTime / reqHold);
        this.updateCandidateUI(detectedGesture, confidence, progress);

        if (holdTime >= reqHold) {
          this.game.abilityManager.triggerAbility(detectedGesture);
          this.candidateGesture = null;
          this.candidateStartTime = 0;
          this.rasenganCharge = 0;
        }
      } else {
        this.candidateGesture = detectedGesture;
        this.candidateStartTime = now;
        this.candidateConfidence = confidence;
        this.updateCandidateUI(detectedGesture, confidence, 0.1);
      }
    } else {
      this.clearCandidateUI();
    }
  }

  // =========================================================================
  // Canvas Skeleton & UI Diagnostics
  // =========================================================================
  drawSkeleton(handsData) {
    if (!this.ctx || !this.canvasEl) return;
    const w = this.canvasEl.width = this.canvasEl.clientWidth || 320;
    const h = this.canvasEl.height = this.canvasEl.clientHeight || 240;

    this.ctx.clearRect(0, 0, w, h);

    handsData.forEach((hand) => {
      // Draw bone connections
      this.ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = "#00f0ff";
      this.ctx.shadowBlur = 8;

      this.connections.forEach(([i1, i2]) => {
        const p1 = hand[i1];
        const p2 = hand[i2];
        if (p1 && p2) {
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x * w, p1.y * h);
          this.ctx.lineTo(p2.x * w, p2.y * h);
          this.ctx.stroke();
        }
      });

      // Draw landmark nodes
      hand.forEach((pt, idx) => {
        this.ctx.beginPath();
        const r = (idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20) ? 4.5 : 3.0;
        this.ctx.arc(pt.x * w, pt.y * h, r, 0, Math.PI * 2);
        this.ctx.fillStyle = (idx === 0) ? "#ff2a5f" : "#ffffff";
        this.ctx.fill();
      });
    });
  }

  clearSkeleton() {
    if (this.ctx && this.canvasEl) {
      this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    }
  }

  updateCandidateUI(gestureId, confidence, holdProgress) {
    const ab = this.game.abilityManager ? this.game.abilityManager.abilities[gestureId] : null;
    const name = ab ? ab.name : gestureId.replace("_", " ").toUpperCase();

    if (this.diagGestureEl) {
      this.diagGestureEl.textContent = name;
    }
    if (this.confidenceBarEl) {
      this.confidenceBarEl.style.width = `${Math.round(confidence * 100)}%`;
    }

    // Update center HUD detected gesture pill
    const pill = document.getElementById("detected-gesture-pill");
    const nameEl = document.getElementById("detected-gesture-name");
    const iconEl = document.getElementById("detected-gesture-icon");
    const ringCircle = document.getElementById("hold-ring-fill");

    if (pill && nameEl && iconEl) {
      pill.classList.add("active");
      nameEl.textContent = name;
      iconEl.textContent = ab ? ab.icon : "✋";

      if (ringCircle) {
        // Circumference is ~75.4 (2 * pi * 12)
        const offset = 75.4 * (1.0 - holdProgress);
        ringCircle.style.strokeDashoffset = offset;
      }
    }
  }

  clearCandidateUI() {
    this.candidateGesture = null;
    if (this.diagGestureEl) this.diagGestureEl.textContent = "None";
    if (this.confidenceBarEl) this.confidenceBarEl.style.width = "0%";

    const pill = document.getElementById("detected-gesture-pill");
    const ringCircle = document.getElementById("hold-ring-fill");
    if (pill) pill.classList.remove("active");
    if (ringCircle) ringCircle.style.strokeDashoffset = 75.4;
  }

  updateStatusUI(connected, modeText) {
    if (this.beaconEl) {
      if (connected) {
        this.beaconEl.classList.add("connected");
      } else {
        this.beaconEl.classList.remove("connected");
      }
    }
    if (this.modePillEl) {
      this.modePillEl.textContent = modeText;
    }
  }

  calculateFps() {
    this.fpsCount++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      this.currentFps = Math.round((this.fpsCount * 1000) / (now - this.fpsLastTime));
      this.fpsCount = 0;
      this.fpsLastTime = now;
      if (this.fpsCounterEl) {
        this.fpsCounterEl.textContent = `${this.currentFps} FPS`;
      }
    }
  }
}

window.ShinobiVisionClient = ShinobiVisionClient;
