/**
 * 3D Ninja Academy: Shadow Jutsu Simulator - Procedural Web Audio API Sound Synthesizer
 * 100% Zero-Latency, Autonomous Sound Effects for all Shinobi Abilities & Ambience
 */

class ShinobiAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.volume = 0.8;
    this.initialized = false;
    
    // Ambient sound timer
    this.ambientInterval = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
      
      // Start subtle ambient wind / night atmosphere
      this.startAmbient();
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    this.setVolume(this.volume);
  }

  createNoiseBuffer(duration = 1.0) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 1. Shadow Clone / Smoke Poof
  playPoof(volumeMult = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Noise component (smoke hiss)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6 * volumeMult, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Punch sub-thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);

    oscGain.gain.setValueAtTime(0.7 * volumeMult, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(t);
    osc.start(t);
    noise.stop(t + 0.4);
    osc.stop(t + 0.3);
  }

  // 2. Rasengan (Swirling energy turbine hum + release blast)
  playRasenganCharge() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return null;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(420, t);
    osc2.frequency.setValueAtTime(840, t);

    // LFO frequency wobble for vortex rotation
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(18, t);
    lfoGain.gain.setValueAtTime(60, t);

    lfo.connect(osc1.frequency);
    lfo.connect(osc2.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(950, t);
    filter.Q.setValueAtTime(5.0, t);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.45, t + 0.8);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    lfo.start(t);

    return {
      stop: (delay = 0.1) => {
        const stopTime = this.ctx.currentTime + delay;
        gain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.05);
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        lfo.stop(stopTime);
      }
    };
  }

  playRasenganRelease() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // High turbine blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.7);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.8);

    // Deep vortex boom
    this.playExplosion(0.7);
  }

  // 3. Chidori (One Thousand Birds chirping lightning)
  playChidori(duration = 1.2) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Clustered high frequency chirps
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();

      osc.type = (i % 2 === 0) ? "sawtooth" : "square";
      const baseFreq = 2200 + i * 400 + (Math.random() * 200);
      osc.frequency.setValueAtTime(baseFreq, t);

      mod.type = "sawtooth";
      mod.frequency.setValueAtTime(45 + i * 20, t);
      modGain.gain.setValueAtTime(250, t);

      mod.connect(osc.frequency);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      mod.start(t);
      osc.stop(t + duration);
      mod.stop(t + duration);
    }
  }

  // 4. Fireball Jutsu (Volumetric roar + fiery explosion)
  playFireball() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Fire whoosh
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.linearRampToValueAtTime(800, t + 0.5);
    filter.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 1.4);

    // Delayed detonation sound
    setTimeout(() => {
      this.playExplosion(1.0);
    }, 450);
  }

  // 5. Flashbang (Gentle high tone + muffled audio effect)
  playFlashbang(intensity = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2600, t);

    // Safe low volume high tone
    gain.gain.setValueAtTime(0.15 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8 * intensity);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.9);

    // Initial sharp pop
    this.playPoof(0.4 * intensity);
  }

  // 6. Substitution Jutsu (Heavy log thud + branch snap)
  playSubstitution() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Heavy wooden block thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);

    // Poof of smoke
    this.playPoof(0.8);
  }

  // 7. Teleportation / Body Flicker (Shunshin sonic whip)
  playTeleport() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.22);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  // 8. Chakra Shield (Harmonic bell chime + crystal resonance)
  playChakraShield() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    [520, 780, 1040].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  }

  // 9. Explosive Jutsu (Sub-bass rumble + shockwave)
  playExplosion(volumeMult = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Low sub rumble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.55);

    oscGain.gain.setValueAtTime(0.9 * volumeMult, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // Shock noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65 * volumeMult, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.65);
    noise.stop(t + 0.65);
  }

  // 10. Ultimate Shadow Army (Epic rolling thunder + massive poofs)
  playShadowArmy() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    this.playTaikoDrum(1.2);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playPoof(0.7);
      }, i * 90);
    }
  }

  // Combat Dummy Hit
  playHitDummy() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Traditional Japanese Taiko Drum Hit
  playTaikoDrum(volumeMult = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.4);

    gain.gain.setValueAtTime(0.85 * volumeMult, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Rank Up Shinobi Koto Fanfare
  playRankUp() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    // Japanese pentatonic chord: A4, C5, D5, E5, A5
    const notes = [440, 523.25, 587.33, 659.25, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.85);
      }, i * 110);
    });
  }

  // Chakra Charge Tone
  playChakraCharge() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Subtle ambient night courtyard wind & bamboo chime
  startAmbient() {
    if (this.ambientInterval) clearInterval(this.ambientInterval);
    this.ambientInterval = setInterval(() => {
      if (this.ctx && !this.isMuted && Math.random() < 0.25) {
        // Distant wind chime pentatonic note
        const freqs = [587.33, 659.25, 783.99, 880, 1046.5];
        const f = freqs[Math.floor(Math.random() * freqs.length)];
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 1.9);
      }
    }, 4000);
  }
}

// Global singleton instance
window.shinobiAudio = new ShinobiAudioEngine();
