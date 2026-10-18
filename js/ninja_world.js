/**
 * 3D Ninja Academy: Shadow Jutsu Simulator - Courtyard & Dojo 3D World (Three.js)
 * Moonlit Night Courtyard, Multi-tier Pagoda Dojo, Torii Gate, Stone Lanterns,
 * Falling Sakura Petals, Drifting Fog, Shinobi Arena & Interactive Dummies.
 */

class NinjaWorld {
  constructor(scene, vfxEngine) {
    this.scene = scene;
    this.vfx = vfxEngine;
    
    this.dummies = [];
    this.sakuraPetals = [];
    this.fogPlanes = [];
    this.lanternLights = [];
    this.worldTime = 0;
    
    this.buildLighting();
    this.buildSkyAndMoon();
    this.buildGroundAndCourtyard();
    this.buildDojoPagoda();
    this.buildToriiGate();
    this.buildStoneLanterns();
    this.buildCentralArena();
    this.buildWeaponRacksAndFoliage();
    this.buildTrainingDummies();
    this.buildAtmosphericParticles();
  }

  buildLighting() {
    // Ambient soft midnight blue light
    const ambientLight = new THREE.AmbientLight(0x1a233a, 1.2);
    this.scene.add(ambientLight);

    // Moonlight Directional Light (casts soft shadows)
    this.moonLight = new THREE.DirectionalLight(0xaad0ff, 2.2);
    this.moonLight.position.set(25, 35, 20);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 80;
    const d = 25;
    this.moonLight.shadow.camera.left = -d;
    this.moonLight.shadow.camera.right = d;
    this.moonLight.shadow.camera.top = d;
    this.moonLight.shadow.camera.bottom = -d;
    this.moonLight.shadow.bias = -0.0005;
    this.scene.add(this.moonLight);

    // Courtyard Central Arena Cyan Fill Light
    const arenaLight = new THREE.PointLight(0x00f0ff, 1.5, 18);
    arenaLight.position.set(0, 3, 0);
    this.scene.add(arenaLight);
  }

  buildSkyAndMoon() {
    // Large glowing Celestial Moon
    const moonGroup = new THREE.Group();
    moonGroup.position.set(45, 55, 35);

    const moonGeom = new THREE.SphereGeometry(6.5, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xf5f8ff
    });
    const moon = new THREE.Mesh(moonGeom, moonMat);
    moonGroup.add(moon);

    // Glowing lunar halo outer ring
    const haloGeom = new THREE.PlaneGeometry(24, 24);
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hCtx = haloCanvas.getContext('2d');
    const grad = hCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(180, 220, 255, 0.6)');
    grad.addColorStop(0.5, 'rgba(120, 180, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 20, 50, 0)');
    hCtx.fillStyle = grad;
    hCtx.fillRect(0, 0, 128, 128);
    const haloTex = new THREE.CanvasTexture(haloCanvas);

    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.lookAt(0, 0, 0);
    moonGroup.add(halo);

    this.scene.add(moonGroup);

    // Starfield particles
    const starGeom = new THREE.BufferGeometry();
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 200;
      starPositions[i + 1] = 20 + Math.random() * 80;
      starPositions[i + 2] = (Math.random() - 0.5) * 200;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.85
    });
    const stars = new THREE.Points(starGeom, starMat);
    this.scene.add(stars);
  }

  buildGroundAndCourtyard() {
    // Main Courtyard Ground (Gravel & Stone)
    const groundGeom = new THREE.PlaneGeometry(60, 60, 32, 32);
    groundGeom.rotateX(-Math.PI / 2);
    
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.85,
      metalness: 0.15
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Stone pathway tiles leading to dojo and arena
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x242d3d,
      roughness: 0.75
    });

    for (let z = -18; z <= 18; z += 1.8) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.4), pathMat);
      tile.position.set(0, 0.04, z);
      tile.receiveShadow = true;
      this.scene.add(tile);
    }

    // Courtyard Perimeter Stone Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x181f2b, roughness: 0.9 });
    const wallH = 3.5;
    const wallL = 50;

    // North wall (behind dojo)
    const nWall = new THREE.Mesh(new THREE.BoxGeometry(wallL, wallH, 0.8), wallMat);
    nWall.position.set(0, wallH / 2, -24);
    nWall.castShadow = true;
    nWall.receiveShadow = true;
    this.scene.add(nWall);

    // East & West walls
    const eWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, wallH, wallL), wallMat);
    eWall.position.set(24, wallH / 2, 0);
    eWall.receiveShadow = true;
    this.scene.add(eWall);

    const wWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, wallH, wallL), wallMat);
    wWall.position.set(-24, wallH / 2, 0);
    wWall.receiveShadow = true;
    this.scene.add(wWall);
  }

  buildDojoPagoda() {
    const dojoGroup = new THREE.Group();
    dojoGroup.position.set(0, 0, -18);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.75 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e2738, roughness: 0.6 });
    const shojiMat = new THREE.MeshBasicMaterial({ color: 0xffe8aa }); // Warm glowing windows

    // 1. Raised Stone Foundation
    const baseGeom = new THREE.BoxGeometry(16, 1.2, 10);
    const base = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({ color: 0x222a38, roughness: 0.8 }));
    base.position.y = 0.6;
    base.castShadow = true;
    base.receiveShadow = true;
    dojoGroup.add(base);

    // Front steps
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(5 - i * 0.4, 0.2, 0.6), base.material);
      step.position.set(0, 0.1 + i * 0.2, 5.2 + i * 0.4);
      dojoGroup.add(step);
    }

    // 2. First Tier Walls
    const wallGeom = new THREE.BoxGeometry(14, 3.6, 8.5);
    const walls = new THREE.Mesh(wallGeom, woodMat);
    walls.position.y = 1.2 + 1.8;
    walls.castShadow = true;
    dojoGroup.add(walls);

    // Glowing Shoji Windows
    const shoji1 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.0), shojiMat);
    shoji1.position.set(-3.5, 2.8, 4.26);
    dojoGroup.add(shoji1);

    const shoji2 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.0), shojiMat);
    shoji2.position.set(3.5, 2.8, 4.26);
    dojoGroup.add(shoji2);

    // Warm Interior Window Glow Light
    const windowLight = new THREE.PointLight(0xffa500, 2.5, 10);
    windowLight.position.set(0, 3.2, 4.0);
    dojoGroup.add(windowLight);

    // 3. First Tier Pagoda Curved Roof Eaves
    const roof1 = this.createPagodaRoof(18, 12, 1.5, roofMat);
    roof1.position.y = 4.8;
    dojoGroup.add(roof1);

    // 4. Second Tier Tower
    const towerGeom = new THREE.BoxGeometry(9, 3.0, 6.0);
    const tower = new THREE.Mesh(towerGeom, woodMat);
    tower.position.y = 6.2;
    tower.castShadow = true;
    dojoGroup.add(tower);

    // Upper Roof
    const roof2 = this.createPagodaRoof(12, 9, 1.8, roofMat);
    roof2.position.y = 7.8;
    dojoGroup.add(roof2);

    // Academy Entrance Banner with Kanji / Shinobi Crest
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 256;
    bannerCanvas.height = 128;
    const bCtx = bannerCanvas.getContext('2d');
    bCtx.fillStyle = '#8b0000'; // Dark crimson banner
    bCtx.fillRect(0, 0, 256, 128);
    bCtx.fillStyle = '#ffdf70';
    bCtx.font = 'bold 36px serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('木ノ葉 忍道', 128, 55); // "Konoha Shinobi Way"
    bCtx.font = '22px sans-serif';
    bCtx.fillText('SHADOW ACADEMY', 128, 95);
    const bannerTex = new THREE.CanvasTexture(bannerCanvas);

    const bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.6),
      new THREE.MeshBasicMaterial({ map: bannerTex })
    );
    bannerMesh.position.set(0, 3.6, 4.3);
    dojoGroup.add(bannerMesh);

    this.scene.add(dojoGroup);
  }

  createPagodaRoof(width, depth, height, mat) {
    const group = new THREE.Group();
    const geom = new THREE.ConeGeometry(width * 0.65, height, 4);
    geom.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(geom, mat);
    roof.scale.set(1.0, 1.0, depth / width);
    roof.castShadow = true;
    group.add(roof);
    return group;
  }

  buildToriiGate() {
    const torii = new THREE.Group();
    torii.position.set(0, 0, 19);

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xbf1922,
      roughness: 0.5,
      metalness: 0.1
    });

    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.7
    });

    // Two Main Pillars
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7.5, 12), redMat);
    p1.position.set(-3.6, 3.75, 0);
    p1.castShadow = true;
    torii.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7.5, 12), redMat);
    p2.position.set(3.6, 3.75, 0);
    p2.castShadow = true;
    torii.add(p2);

    // Base stone blocks
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), blackMat);
    b1.position.set(-3.6, 0.25, 0);
    torii.add(b1);

    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), blackMat);
    b2.position.set(3.6, 0.25, 0);
    torii.add(b2);

    // Crossbar Lower (Nuki)
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.35, 0.4), redMat);
    nuki.position.set(0, 5.8, 0);
    nuki.castShadow = true;
    torii.add(nuki);

    // Crossbar Upper (Kasagi / Shimaki)
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.55, 0.65), redMat);
    kasagi.position.set(0, 7.2, 0);
    kasagi.castShadow = true;
    torii.add(kasagi);

    // Top black ridge
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.15, 0.7), blackMat);
    ridge.position.set(0, 7.5, 0);
    torii.add(ridge);

    this.scene.add(torii);
  }

  buildStoneLanterns() {
    const lanternPositions = [
      { x: -5, z: 12 }, { x: 5, z: 12 },
      { x: -5, z: 2 },  { x: 5, z: 2 },
      { x: -5, z: -8 }, { x: 5, z: -8 }
    ];

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a4454, roughness: 0.85 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });

    lanternPositions.forEach((pos, idx) => {
      const lantern = new THREE.Group();
      lantern.position.set(pos.x, 0, pos.z);

      // Base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.4, 6), stoneMat);
      base.position.y = 0.2;
      lantern.add(base);

      // Post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.2, 6), stoneMat);
      post.position.y = 0.9;
      lantern.add(post);

      // Middle fire chamber (hibukuro)
      const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), stoneMat);
      chamber.position.y = 1.6;
      lantern.add(chamber);

      // Flame core
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), flameMat);
      flame.position.y = 1.6;
      lantern.add(flame);

      // Roof cap
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.35, 6), stoneMat);
      cap.position.y = 2.0;
      lantern.add(cap);

      // Warm fire light
      const fireLight = new THREE.PointLight(0xff8811, 1.4, 7);
      fireLight.position.y = 1.6;
      lantern.add(fireLight);

      this.lanternLights.push({ light: fireLight, baseIntensity: 1.4, phase: idx });
      this.scene.add(lantern);
    });
  }

  buildCentralArena() {
    const arena = new THREE.Group();
    arena.position.set(0, 0, 0);

    // Elevated Circular Stone Dais
    const daisGeom = new THREE.CylinderGeometry(6.5, 7.0, 0.2, 32);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x1f2838,
      roughness: 0.8,
      metalness: 0.2
    });
    const dais = new THREE.Mesh(daisGeom, daisMat);
    dais.position.y = 0.1;
    dais.receiveShadow = true;
    arena.add(dais);

    // Outer Chakra Ring (Glowing blue runic seal circle)
    const ringGeom = new THREE.RingGeometry(5.4, 5.7, 48);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = 0.21;
    arena.add(ring);

    // Inner Tri-Seal Ring
    const innerRingGeom = new THREE.RingGeometry(2.4, 2.55, 32);
    innerRingGeom.rotateX(-Math.PI / 2);
    const innerRing = new THREE.Mesh(innerRingGeom, ringMat);
    innerRing.position.y = 0.211;
    arena.add(innerRing);

    // 4 Cardinal Platform Pillars for Teleportation / Body Flicker
    this.teleportPlatforms = [];
    const pillarPositions = [
      new THREE.Vector3(-4.5, 0, -4.5),
      new THREE.Vector3(4.5, 0, -4.5),
      new THREE.Vector3(4.5, 0, 4.5),
      new THREE.Vector3(-4.5, 0, 4.5)
    ];

    pillarPositions.forEach((pos, idx) => {
      const pGeom = new THREE.CylinderGeometry(0.8, 0.9, 0.35, 12);
      const pMesh = new THREE.Mesh(pGeom, daisMat);
      pMesh.position.copy(pos);
      pMesh.position.y = 0.17;
      pMesh.receiveShadow = true;
      arena.add(pMesh);

      // Glowing glyph ring on pillar top
      const gRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 16).rotateX(-Math.PI / 2), ringMat);
      gRing.position.copy(pos);
      gRing.position.y = 0.36;
      arena.add(gRing);

      this.teleportPlatforms.push(new THREE.Vector3(pos.x, 0, pos.z));
    });

    this.scene.add(arena);
  }

  buildWeaponRacksAndFoliage() {
    // Bamboo groves along east & west walls
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x2e5e3b, roughness: 0.6 });
    for (let i = 0; i < 28; i++) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6 + Math.random() * 3, 6), bambooMat);
      const side = (i % 2 === 0) ? 1 : -1;
      stalk.position.set(side * (21 + Math.random() * 2), 3, (Math.random() - 0.5) * 40);
      stalk.rotation.z = (Math.random() - 0.5) * 0.15;
      stalk.castShadow = true;
      this.scene.add(stalk);
    }

    // Shinobi Weapon Rack (Kunai, scrolls)
    const rack = new THREE.Group();
    rack.position.set(-10, 0, -12);

    const rackFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.8, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 })
    );
    rackFrame.position.y = 0.9;
    rack.add(rackFrame);

    // Decorative scrolls on rack
    for (let s = 0; s < 3; s++) {
      const scroll = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: s === 1 ? 0x990000 : 0xe0d0b0 })
      );
      scroll.position.set(0, 0.5 + s * 0.4, 0.22);
      scroll.rotation.z = Math.PI / 2;
      rack.add(scroll);
    }
    this.scene.add(rack);
  }

  buildTrainingDummies() {
    // 4 Wooden Training Dummies positioned around the courtyard
    const dummyCoords = [
      new THREE.Vector3(-7.5, 0, -2.5),
      new THREE.Vector3(7.5, 0, -2.5),
      new THREE.Vector3(-7.5, 0, 6.0),
      new THREE.Vector3(7.5, 0, 6.0)
    ];

    dummyCoords.forEach((coord, i) => {
      const dummy = new TrainingDummy(this.scene, coord, this.vfx, i);
      this.dummies.push(dummy);
    });
  }

  buildAtmosphericParticles() {
    // 1. Drifting Ground Fog Particles
    const fogGeom = new THREE.PlaneGeometry(12, 12);
    fogGeom.rotateX(-Math.PI / 2);
    const fogTex = this.vfx.smokeTexture;
    const fogMat = new THREE.MeshBasicMaterial({
      map: fogTex,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < 8; i++) {
      const fog = new THREE.Mesh(fogGeom, fogMat.clone());
      fog.position.set(
        (Math.random() - 0.5) * 36,
        0.4 + Math.random() * 0.6,
        (Math.random() - 0.5) * 36
      );
      this.scene.add(fog);
      this.fogPlanes.push({
        mesh: fog,
        driftX: (Math.random() - 0.5) * 0.4,
        driftZ: (Math.random() - 0.5) * 0.4
      });
    }

    // 2. Falling Cherry Blossom (Sakura) Petals
    const petalCanvas = document.createElement('canvas');
    petalCanvas.width = 32;
    petalCanvas.height = 32;
    const pCtx = petalCanvas.getContext('2d');
    pCtx.fillStyle = '#ffb7c5'; // Sakura pink
    pCtx.beginPath();
    pCtx.ellipse(16, 16, 12, 6, Math.PI / 4, 0, Math.PI * 2);
    pCtx.fill();
    const petalTex = new THREE.CanvasTexture(petalCanvas);

    const petalMat = new THREE.SpriteMaterial({
      map: petalTex,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < 60; i++) {
      const petal = new THREE.Sprite(petalMat);
      petal.position.set(
        (Math.random() - 0.5) * 44,
        2 + Math.random() * 12,
        (Math.random() - 0.5) * 44
      );
      petal.scale.set(0.35, 0.35, 1);
      this.scene.add(petal);
      this.sakuraPetals.push({
        sprite: petal,
        speedY: 0.6 + Math.random() * 0.8,
        swaySpeed: 1.5 + Math.random() * 2,
        swayAmp: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt) {
    this.worldTime += dt;
    const t = this.worldTime;

    // 1. Lantern flicker
    this.lanternLights.forEach(item => {
      const flicker = Math.sin(t * 8 + item.phase) * 0.2 + (Math.random() - 0.5) * 0.1;
      item.light.intensity = item.baseIntensity + flicker;
    });

    // 2. Fog drift
    this.fogPlanes.forEach(fog => {
      fog.mesh.position.x += fog.driftX * dt;
      fog.mesh.position.z += fog.driftZ * dt;
      if (fog.mesh.position.x > 20) fog.mesh.position.x = -20;
      if (fog.mesh.position.x < -20) fog.mesh.position.x = 20;
      if (fog.mesh.position.z > 20) fog.mesh.position.z = -20;
      if (fog.mesh.position.z < -20) fog.mesh.position.z = 20;
    });

    // 3. Falling Sakura Petals
    this.sakuraPetals.forEach(p => {
      p.sprite.position.y -= p.speedY * dt;
      p.sprite.position.x += Math.sin(t * p.swaySpeed + p.phase) * p.swayAmp * dt;
      p.sprite.position.z += Math.cos(t * p.swaySpeed + p.phase) * (p.swayAmp * 0.5) * dt;

      if (p.sprite.position.y < 0.1) {
        p.sprite.position.y = 12 + Math.random() * 2;
        p.sprite.position.x = (Math.random() - 0.5) * 44;
        p.sprite.position.z = (Math.random() - 0.5) * 44;
      }
    });

    // 4. Update training dummies (wobble physics, health bars)
    this.dummies.forEach(d => d.update(dt));
  }
}

/**
 * Interactive Training Dummy Class
 * Wobble spring physics, damage absorption, health bar, splinter burst, and respawning.
 */
class TrainingDummy {
  constructor(scene, position, vfxEngine, id = 0) {
    this.scene = scene;
    this.vfx = vfxEngine;
    this.id = id;
    this.initialPos = position.clone();
    
    this.maxHealth = 250;
    this.health = this.maxHealth;
    this.isDead = false;
    this.respawnTimer = 0;
    
    // Spring physics for hit reaction wobble
    this.wobbleAngleX = 0;
    this.wobbleAngleZ = 0;
    this.wobbleVelX = 0;
    this.wobbleVelZ = 0;
    
    this.group = new THREE.Group();
    this.group.position.copy(position);
    
    this.buildMesh();
    this.buildHealthBar();
    this.scene.add(this.group);
  }

  buildMesh() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c532e, roughness: 0.85 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc8ad7f, roughness: 0.9 });
    const targetMat = new THREE.MeshBasicMaterial({ color: 0xcc2222 }); // Red target rings

    // 1. Spring Iron Base
    const baseGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.25, 12);
    const base = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({ color: 0x1b2029, metalness: 0.8 }));
    base.position.y = 0.125;
    this.group.add(base);

    // Spring coil
    const springGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
    const spring = new THREE.Mesh(springGeom, new THREE.MeshStandardMaterial({ color: 0x444f60, metalness: 0.9 }));
    spring.position.y = 0.45;
    this.group.add(spring);

    // 2. Wobble Body Pivot (spring joint)
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.65;
    this.group.add(this.pivot);

    // Main post
    const postGeom = new THREE.CylinderGeometry(0.24, 0.24, 1.8, 12);
    const post = new THREE.Mesh(postGeom, woodMat);
    post.position.y = 0.9;
    post.castShadow = true;
    this.pivot.add(post);

    // Rope / straw wrap around torso
    const wrapGeom = new THREE.CylinderGeometry(0.27, 0.27, 0.8, 12);
    const wrap = new THREE.Mesh(wrapGeom, ropeMat);
    wrap.position.y = 0.85;
    this.pivot.add(wrap);

    // Target Bullseye ring on chest
    const target = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.16, 16), targetMat);
    target.position.set(0, 0.85, 0.28);
    this.pivot.add(target);

    // Crossbar arms
    const armGeom = new THREE.CylinderGeometry(0.09, 0.09, 1.6, 8);
    armGeom.rotateZ(Math.PI / 2);
    const arms = new THREE.Mesh(armGeom, woodMat);
    arms.position.y = 1.25;
    arms.castShadow = true;
    this.pivot.add(arms);

    // Head target
    const headGeom = new THREE.SphereGeometry(0.25, 12, 12);
    const head = new THREE.Mesh(headGeom, ropeMat);
    head.position.y = 1.95;
    head.castShadow = true;
    this.pivot.add(head);

    // Headband cloth on dummy
    const hBand = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 12), new THREE.MeshBasicMaterial({ color: 0x111622 }));
    hBand.position.y = 1.98;
    this.pivot.add(hBand);
  }

  buildHealthBar() {
    // 3D Floating Health Bar above dummy
    const barGroup = new THREE.Group();
    barGroup.position.set(0, 2.9, 0);

    const bgGeom = new THREE.PlaneGeometry(1.2, 0.14);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x07080c, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeom, bgMat);
    barGroup.add(bg);

    const fgGeom = new THREE.PlaneGeometry(1.16, 0.1);
    const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
    this.hpMesh = new THREE.Mesh(fgGeom, fgMat);
    this.hpMesh.position.z = 0.01;
    barGroup.add(this.hpMesh);

    this.healthBarGroup = barGroup;
    this.group.add(barGroup);
  }

  takeDamage(amount, hitVector = null) {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);
    
    // Play impact sound
    if (window.shinobiAudio) {
      window.shinobiAudio.playHitDummy();
    }

    // Apply impulse to spring wobble
    if (hitVector) {
      this.wobbleVelX += hitVector.z * 1.8;
      this.wobbleVelZ -= hitVector.x * 1.8;
    } else {
      this.wobbleVelX += (Math.random() - 0.5) * 1.5;
      this.wobbleVelZ += (Math.random() - 0.5) * 1.5;
    }

    // Splinter debris particles
    this.vfx.spawnSmokePoof(new THREE.Vector3().copy(this.group.position).add(new THREE.Vector3(0, 1.4, 0)), 0.45, 8);

    // Update health bar mesh scale
    const pct = this.health / this.maxHealth;
    this.hpMesh.scale.x = Math.max(0.001, pct);
    this.hpMesh.position.x = -(1.16 * (1.0 - pct)) / 2;

    if (pct < 0.3) {
      this.hpMesh.material.color.setHex(0xff2a5f);
    } else if (pct < 0.6) {
      this.hpMesh.material.color.setHex(0xffaa00);
    } else {
      this.hpMesh.material.color.setHex(0x00ff88);
    }

    if (this.health <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.isDead = true;
    this.respawnTimer = 3.5; // Respawns after 3.5 seconds
    this.pivot.visible = false;
    this.healthBarGroup.visible = false;

    // Destruction smoke burst
    this.vfx.spawnSmokePoof(new THREE.Vector3().copy(this.group.position).add(new THREE.Vector3(0, 1.0, 0)), 1.4, 25);
    this.vfx.spawnShockwave(this.group.position, 3.5, 0xffa500, 0.4);
  }

  respawn() {
    this.isDead = false;
    this.health = this.maxHealth;
    this.pivot.visible = true;
    this.healthBarGroup.visible = true;
    this.hpMesh.scale.x = 1.0;
    this.hpMesh.position.x = 0;
    this.hpMesh.material.color.setHex(0x00ff88);

    // Respawn smoke poof
    this.vfx.spawnSmokePoof(new THREE.Vector3().copy(this.group.position).add(new THREE.Vector3(0, 1.0, 0)), 1.2, 20);
    if (window.shinobiAudio) {
      window.shinobiAudio.playPoof(0.7);
    }
  }

  update(dt) {
    if (this.isDead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    // Spring harmonic damping for wobble
    const springK = 35.0; // Spring stiffness
    const damping = 4.5;  // Damping coefficient

    const accX = -springK * this.wobbleAngleX - damping * this.wobbleVelX;
    const accZ = -springK * this.wobbleAngleZ - damping * this.wobbleVelZ;

    this.wobbleVelX += accX * dt;
    this.wobbleVelZ += accZ * dt;

    this.wobbleAngleX += this.wobbleVelX * dt;
    this.wobbleAngleZ += this.wobbleVelZ * dt;

    this.pivot.rotation.x = this.wobbleAngleX;
    this.pivot.rotation.z = this.wobbleAngleZ;

    // Health bar always faces camera
    if (this.scene && this.healthBarGroup) {
      // Look at camera in Y axis
      this.healthBarGroup.quaternion.copy(this.scene.parentCamera ? this.scene.parentCamera.quaternion : this.group.quaternion);
    }
  }
}

window.NinjaWorld = NinjaWorld;
window.TrainingDummy = TrainingDummy;
