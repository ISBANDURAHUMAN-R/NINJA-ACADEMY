/**
 * 3D Ninja Academy: Shadow Jutsu Simulator - Visual Effects Engine (Three.js)
 * Billowing Smoke, Procedural Lightning Arcs, Fireball, Rasengan Vortex,
 * Chakra Forcefields, Shockwaves, Particle Trails & Camera Shake
 */

class ShinobiVFXEngine {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    
    // Active VFX collections
    this.particles = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.lightningArcs = [];
    this.activeShield = null;
    this.activeRasengan = null;
    
    // Screen shake state
    this.shakeIntensity = 0;
    this.shakeDecay = 0.92;
    this.cameraOriginalPos = new THREE.Vector3();
    
    // Accessibility & visual intensity settings
    this.flashIntensity = 1.0;
    this.isPhotoSafe = false;
    
    this.initTextureGenerators();
  }

  initTextureGenerators() {
    // Generate procedural smoke particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(230, 235, 245, 1)');
    grad.addColorStop(0.35, 'rgba(180, 195, 215, 0.6)');
    grad.addColorStop(0.7, 'rgba(100, 115, 135, 0.2)');
    grad.addColorStop(1, 'rgba(40, 50, 70, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();
    this.smokeTexture = new THREE.CanvasTexture(canvas);

    // Fire particle texture
    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = 128;
    fireCanvas.height = 128;
    const fCtx = fireCanvas.getContext('2d');
    const fGrad = fCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    fGrad.addColorStop(0, 'rgba(255, 255, 220, 1)');
    fGrad.addColorStop(0.3, 'rgba(255, 140, 20, 0.8)');
    fGrad.addColorStop(0.7, 'rgba(255, 40, 10, 0.3)');
    fGrad.addColorStop(1, 'rgba(120, 10, 0, 0)');
    fCtx.fillStyle = fGrad;
    fCtx.beginPath();
    fCtx.arc(64, 64, 64, 0, Math.PI * 2);
    fCtx.fill();
    this.fireTexture = new THREE.CanvasTexture(fireCanvas);

    // Chakra spark texture
    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 64;
    sparkCanvas.height = 64;
    const sCtx = sparkCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.8)');
    sGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.beginPath();
    sCtx.arc(32, 32, 32, 0, Math.PI * 2);
    sCtx.fill();
    this.sparkTexture = new THREE.CanvasTexture(sparkCanvas);
  }

  // 1. Billowing Smoke Poof (Used for Clones, Substitution, Respawns)
  spawnSmokePoof(position, scale = 1.0, count = 22) {
    const group = new THREE.Group();
    group.position.copy(position);

    const smokeMat = new THREE.SpriteMaterial({
      map: this.smokeTexture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const sprites = [];
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(smokeMat.clone());
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8 * scale,
        (Math.random() * 1.2) * scale,
        (Math.random() - 0.5) * 0.8 * scale
      );
      sprite.position.copy(offset);
      
      const s = (1.2 + Math.random() * 1.6) * scale;
      sprite.scale.set(s, s, 1);
      
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2.2 * scale,
        (0.8 + Math.random() * 2.2) * scale,
        (Math.random() - 0.5) * 2.2 * scale
      );
      
      group.add(sprite);
      sprites.push({
        sprite,
        vel,
        rotSpeed: (Math.random() - 0.5) * 3,
        baseScale: s
      });
    }

    this.scene.add(group);
    
    this.particles.push({
      group,
      sprites,
      age: 0,
      maxAge: 0.9,
      type: "smoke"
    });
  }

  // 2. Shockwave Ground Ring & Screen Shake
  spawnShockwave(position, maxRadius = 8, color = 0x00f0ff, duration = 0.6) {
    const geom = new THREE.RingGeometry(0.2, 0.6, 32);
    geom.rotateX(-Math.PI / 2);
    
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.05; // Just above ground
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      mat,
      maxRadius,
      age: 0,
      duration,
      initialY: mesh.position.y
    });

    this.triggerScreenShake(0.35);
  }

  // 3. Screen Shake Trigger
  triggerScreenShake(intensity = 0.3) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  // 4. Flashbang Screen Flash
  triggerFlashbang() {
    const overlay = document.getElementById("flashbang-overlay");
    if (!overlay) return;
    
    const alpha = this.isPhotoSafe ? 0.45 : Math.min(1.0, 0.9 * this.flashIntensity);
    overlay.style.opacity = alpha;
    
    setTimeout(() => {
      overlay.style.transition = `opacity ${0.6 * this.flashIntensity}s ease-out`;
      overlay.style.opacity = '0';
    }, 50);

    // Spawn white smoke cloud
    if (this.camera) {
      const p = new THREE.Vector3();
      this.camera.getWorldPosition(p);
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.spawnSmokePoof(p.add(dir.multiplyScalar(3)), 1.5, 30);
    }
  }

  // 5. Rasengan Creation & Projectile
  createRasenganMesh() {
    const group = new THREE.Group();

    // Core sphere
    const coreGeom = new THREE.SphereGeometry(0.28, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    group.add(core);

    // Swirling outer sphere
    const outerGeom = new THREE.SphereGeometry(0.42, 24, 24);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const outer = new THREE.Mesh(outerGeom, outerMat);
    group.add(outer);

    // Swirling orbital ring 1
    const ring1Geom = new THREE.TorusGeometry(0.48, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const ring1 = new THREE.Mesh(ring1Geom, ringMat);
    ring1.rotation.x = Math.PI / 3;
    group.add(ring1);

    // Orbital ring 2
    const ring2 = new THREE.Mesh(ring1Geom, ringMat);
    ring2.rotation.y = Math.PI / 4;
    group.add(ring2);

    // Point Light for dramatic blue chakra radiance
    const light = new THREE.PointLight(0x00f0ff, 2.5, 6);
    group.add(light);

    group.userData = { core, outer, ring1, ring2, light };
    return group;
  }

  launchRasengan(origin, direction, targetDummy = null) {
    const mesh = this.createRasenganMesh();
    mesh.position.copy(origin);
    this.scene.add(mesh);

    const speed = 28; // Fast ninja projectile
    const vel = direction.clone().normalize().multiplyScalar(speed);

    this.projectiles.push({
      mesh,
      vel,
      type: "rasengan",
      age: 0,
      maxAge: 2.5,
      targetDummy,
      radius: 0.6
    });
  }

  // 6. Fireball Jutsu Projectile
  launchFireball(origin, direction) {
    const group = new THREE.Group();

    // Central flaming sphere
    const sphereGeom = new THREE.SphereGeometry(0.7, 20, 20);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    group.add(sphere);

    // Volumetric flame glow outer
    const outerGeom = new THREE.SphereGeometry(1.0, 16, 16);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const outer = new THREE.Mesh(outerGeom, outerMat);
    group.add(outer);

    // Orange point light
    const light = new THREE.PointLight(0xff6600, 4.0, 12);
    group.add(light);

    group.position.copy(origin);
    this.scene.add(group);

    const speed = 20;
    const vel = direction.clone().normalize().multiplyScalar(speed);

    this.projectiles.push({
      mesh: group,
      vel,
      type: "fireball",
      age: 0,
      maxAge: 3.0,
      radius: 1.2
    });
  }

  // 7. Procedural Lightning Arcs (Chidori)
  spawnLightningArc(startPos, endPos, segments = 8, jitter = 0.25) {
    const points = [];
    points.push(startPos.clone());
    
    const delta = new THREE.Vector3().subVectors(endPos, startPos);
    for (let i = 1; i < segments; i++) {
      const frac = i / segments;
      const pt = new THREE.Vector3().copy(startPos).addScaledVector(delta, frac);
      pt.x += (Math.random() - 0.5) * jitter;
      pt.y += (Math.random() - 0.5) * jitter;
      pt.z += (Math.random() - 0.5) * jitter;
      points.push(pt);
    }
    points.push(endPos.clone());

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x99ffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geom, mat);
    this.scene.add(line);

    this.lightningArcs.push({
      line,
      mat,
      age: 0,
      maxAge: 0.12 // Quick flickering lightning arc
    });
  }

  // 8. Chakra Shield Forcefield Dome
  activateChakraShield(character) {
    if (this.activeShield) {
      this.activeShield.age = 0; // Refresh duration
      return;
    }

    const geom = new THREE.IcosahedronGeometry(2.2, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(character.position);
    mesh.position.y += 1.2;

    // Glowing core glow dome
    const coreGeom = new THREE.SphereGeometry(2.0, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    mesh.add(coreMesh);

    this.scene.add(mesh);

    this.activeShield = {
      mesh,
      mat,
      character,
      age: 0,
      duration: 3.5
    };
  }

  // 9. Substitution Jutsu Wooden Log
  spawnSubstitutionLog(position) {
    const group = new THREE.Group();

    // Wooden log cylinder
    const geom = new THREE.CylinderGeometry(0.35, 0.38, 1.4, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.85,
      metalness: 0.1
    });
    const log = new THREE.Mesh(geom, mat);
    log.position.y = 0.7;
    log.castShadow = true;
    group.add(log);

    // Bark cap top
    const capGeom = new THREE.CircleGeometry(0.35, 12);
    capGeom.rotateX(-Math.PI / 2);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xd2b48c,
      roughness: 0.9
    });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.position.y = 1.401;
    group.add(cap);

    // Stuck kunai in the log
    const kunai = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.02, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
    );
    kunai.position.set(0.25, 0.8, 0);
    kunai.rotation.z = Math.PI / 6;
    group.add(kunai);

    group.position.copy(position);
    this.scene.add(group);

    // Initial smoke poof
    this.spawnSmokePoof(position, 1.2);

    // Log remains for 4 seconds then dissolves in smoke
    setTimeout(() => {
      this.spawnSmokePoof(group.position, 0.9);
      this.scene.remove(group);
    }, 3800);
  }

  // Main VFX Update Loop
  update(dt) {
    // 1. Update smoke particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      const progress = p.age / p.maxAge;
      
      if (progress >= 1.0) {
        this.scene.remove(p.group);
        this.particles.splice(i, 1);
        continue;
      }

      p.sprites.forEach(s => {
        s.sprite.position.addScaledVector(s.vel, dt);
        s.vel.multiplyScalar(0.96); // Air resistance
        s.sprite.material.rotation += s.rotSpeed * dt;
        s.sprite.material.opacity = (1.0 - progress) * 0.9;
        const currentScale = s.baseScale * (1.0 + progress * 0.8);
        s.sprite.scale.set(currentScale, currentScale, 1);
      });
    }

    // 2. Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      const progress = sw.age / sw.duration;

      if (progress >= 1.0) {
        this.scene.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
        continue;
      }

      const currentScale = 1.0 + progress * sw.maxRadius;
      sw.mesh.scale.set(currentScale, currentScale, currentScale);
      sw.mat.opacity = (1.0 - progress) * 0.85;
    }

    // 3. Update lightning arcs
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      const arc = this.lightningArcs[i];
      arc.age += dt;
      if (arc.age >= arc.maxAge) {
        this.scene.remove(arc.line);
        this.lightningArcs.splice(i, 1);
      } else {
        arc.mat.opacity = 1.0 - (arc.age / arc.maxAge);
      }
    }

    // 4. Update projectiles (Rasengan, Fireball)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.age += dt;

      if (proj.age >= proj.maxAge) {
        this.explodeProjectile(proj);
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      proj.mesh.position.addScaledVector(proj.vel, dt);

      // Spin rasengan or animate fireball
      if (proj.type === "rasengan" && proj.mesh.userData) {
        proj.mesh.userData.outer.rotation.y += dt * 15;
        proj.mesh.userData.outer.rotation.x += dt * 8;
        proj.mesh.userData.ring1.rotation.z += dt * 20;
        proj.mesh.userData.ring2.rotation.x -= dt * 18;
      } else if (proj.type === "fireball") {
        proj.mesh.rotation.y += dt * 6;
        proj.mesh.rotation.z += dt * 4;
      }
    }

    // 5. Update Chakra Shield
    if (this.activeShield) {
      this.activeShield.age += dt;
      if (this.activeShield.age >= this.activeShield.duration) {
        this.scene.remove(this.activeShield.mesh);
        this.activeShield = null;
      } else {
        this.activeShield.mesh.position.copy(this.activeShield.character.position);
        this.activeShield.mesh.position.y += 1.2;
        this.activeShield.mesh.rotation.y += dt * 1.5;
        this.activeShield.mesh.rotation.x += dt * 0.8;
        const fade = 1.0 - (this.activeShield.age / this.activeShield.duration);
        this.activeShield.mat.opacity = Math.min(0.7, fade * 1.5);
      }
    }

    // 6. Camera Screen Shake
    if (this.shakeIntensity > 0.01 && this.camera) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    }
  }

  explodeProjectile(proj) {
    if (proj.type === "rasengan") {
      this.spawnShockwave(proj.mesh.position, 6, 0x00f0ff, 0.7);
      this.spawnSmokePoof(proj.mesh.position, 1.4, 25);
    } else if (proj.type === "fireball") {
      this.spawnShockwave(proj.mesh.position, 8, 0xff5500, 0.8);
      this.spawnSmokePoof(proj.mesh.position, 1.8, 30);
    }
  }
}

window.ShinobiVFXEngine = ShinobiVFXEngine;
