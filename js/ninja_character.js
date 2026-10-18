/**
 * 3D Ninja Academy: Shadow Jutsu Simulator - Procedural Shinobi Character & Clone Manager
 * Anime ninja model with headband cloth ribbon physics, procedural animation rig,
 * and multi-clone Shadow Army coordinator.
 */

class NinjaCharacter {
  constructor(scene, isClone = false, cloneIndex = 0) {
    this.scene = scene;
    this.isClone = isClone;
    this.cloneIndex = cloneIndex;
    
    this.group = new THREE.Group();
    this.position = this.group.position;
    this.rotation = this.group.rotation;
    
    // Animation state
    this.animState = "idle"; // "idle", "run", "seal", "rasengan", "chidori", "fireball"
    this.animTime = 0;
    this.targetPos = new THREE.Vector3();
    this.moveSpeed = 8.0;
    this.isMoving = false;
    
    // Rig parts
    this.parts = {};
    this.ribbonPoints = [];
    
    this.buildCharacter();
    this.scene.add(this.group);
  }

  buildCharacter() {
    const cloneTint = this.isClone ? 0x224466 : 0x111622;
    const vestTint = this.isClone ? 0x1a3344 : 0x1e2836;
    const skinColor = this.isClone ? 0xd0e0f0 : 0xffdfc4;
    const metalColor = 0xb0c4de;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: cloneTint,
      roughness: 0.8,
      metalness: 0.1
    });

    const vestMat = new THREE.MeshStandardMaterial({
      color: vestTint,
      roughness: 0.7,
      metalness: 0.2
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.6
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: metalColor,
      roughness: 0.3,
      metalness: 0.85
    });

    const eyeMat = new THREE.MeshBasicMaterial({
      color: this.isClone ? 0x00f0ff : 0x00ffff
    });

    // 1. Torso
    const torsoGeom = new THREE.CylinderGeometry(0.32, 0.26, 0.75, 8);
    const torso = new THREE.Mesh(torsoGeom, vestMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    this.group.add(torso);
    this.parts.torso = torso;

    // Waist pouch
    const pouchGeom = new THREE.BoxGeometry(0.2, 0.15, 0.1);
    const pouch = new THREE.Mesh(pouchGeom, new THREE.MeshStandardMaterial({ color: 0x4a3525 }));
    pouch.position.set(0, -0.3, -0.26);
    torso.add(pouch);

    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.55, 0);
    torso.add(headGroup);
    this.parts.head = headGroup;

    // Head base
    const headGeom = new THREE.SphereGeometry(0.24, 16, 16);
    const head = new THREE.Mesh(headGeom, skinMat);
    headGroup.add(head);

    // Ninja Mask (covers lower half of face)
    const maskGeom = new THREE.CylinderGeometry(0.245, 0.23, 0.22, 16, 1, false, 0, Math.PI);
    const mask = new THREE.Mesh(maskGeom, bodyMat);
    mask.position.set(0, -0.06, 0.02);
    mask.rotation.y = -Math.PI / 2;
    headGroup.add(mask);

    // Shinobi Headband (Hitai-ate)
    const bandGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 16);
    const band = new THREE.Mesh(bandGeom, bodyMat);
    band.position.y = 0.08;
    headGroup.add(band);

    // Metal Plate on Headband
    const plateGeom = new THREE.BoxGeometry(0.22, 0.08, 0.04);
    const plate = new THREE.Mesh(plateGeom, metalMat);
    plate.position.set(0, 0.08, 0.23);
    headGroup.add(plate);

    // Anime Glowing Eyes
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), eyeMat);
    leftEye.position.set(-0.08, 0.03, 0.23);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), eyeMat);
    rightEye.position.set(0.08, 0.03, 0.23);
    headGroup.add(rightEye);

    // Spiky Shinobi Hair
    const hairMat = new THREE.MeshStandardMaterial({
      color: this.isClone ? 0x223344 : 0xf0c040, // Blonde/golden spiky hair
      roughness: 0.6
    });
    for (let i = 0; i < 9; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 5), hairMat);
      const angle = (i / 9) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 0.14, 0.24, Math.sin(angle) * 0.14);
      spike.rotation.x = Math.sin(angle) * 0.4;
      spike.rotation.z = -Math.cos(angle) * 0.4;
      headGroup.add(spike);
    }

    // Trailing Headband Ribbons (Dynamic Cloth Tails)
    this.ribbon1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.45),
      bodyMat
    );
    this.ribbon1.position.set(-0.06, 0.06, -0.38);
    headGroup.add(this.ribbon1);

    this.ribbon2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.45),
      bodyMat
    );
    this.ribbon2.position.set(0.06, 0.04, -0.38);
    headGroup.add(this.ribbon2);

    // 3. Arms (Left & Right)
    this.parts.leftArm = this.buildArm(torso, -0.38, skinMat, bodyMat);
    this.parts.rightArm = this.buildArm(torso, 0.38, skinMat, bodyMat);

    // 4. Legs (Left & Right)
    this.parts.leftLeg = this.buildLeg(-0.16, bodyMat, skinMat);
    this.parts.rightLeg = this.buildLeg(0.16, bodyMat, skinMat);
    this.group.add(this.parts.leftLeg);
    this.group.add(this.parts.rightLeg);
  }

  buildArm(parent, xOffset, skinMat, bodyMat) {
    const shoulder = new THREE.Group();
    shoulder.position.set(xOffset, 0.25, 0);
    parent.add(shoulder);

    // Upper arm
    const upperGeom = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 8);
    const upper = new THREE.Mesh(upperGeom, bodyMat);
    upper.position.y = -0.16;
    shoulder.add(upper);

    // Forearm & Hand
    const elbow = new THREE.Group();
    elbow.position.y = -0.32;
    shoulder.add(elbow);

    const foreGeom = new THREE.CylinderGeometry(0.07, 0.06, 0.32, 8);
    const fore = new THREE.Mesh(foreGeom, bodyMat);
    fore.position.y = -0.14;
    elbow.add(fore);

    const handGeom = new THREE.BoxGeometry(0.08, 0.1, 0.08);
    const hand = new THREE.Mesh(handGeom, skinMat);
    hand.position.y = -0.32;
    elbow.add(hand);

    return { shoulder, elbow, hand };
  }

  buildLeg(xOffset, bodyMat, skinMat) {
    const hip = new THREE.Group();
    hip.position.set(xOffset, 0.8, 0);

    // Upper Leg (Thigh)
    const thighGeom = new THREE.CylinderGeometry(0.11, 0.09, 0.42, 8);
    const thigh = new THREE.Mesh(thighGeom, bodyMat);
    thigh.position.y = -0.21;
    hip.add(thigh);

    // Knee & Shin
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);

    const shinGeom = new THREE.CylinderGeometry(0.09, 0.08, 0.42, 8);
    const shin = new THREE.Mesh(shinGeom, bodyMat);
    shin.position.y = -0.2;
    knee.add(shin);

    // Ninja Sandal (Tabi boot)
    const footGeom = new THREE.BoxGeometry(0.11, 0.08, 0.22);
    const foot = new THREE.Mesh(footGeom, new THREE.MeshStandardMaterial({ color: 0x05070a }));
    foot.position.set(0, -0.4, 0.06);
    knee.add(foot);

    return { hip, knee, foot };
  }

  setAnimation(state) {
    if (this.animState === state) return;
    this.animState = state;
    this.animTime = 0;
  }

  update(dt) {
    this.animTime += dt;
    const t = this.animTime;

    // Trailing headband ribbon sway
    const windSpeed = this.isMoving ? 18 : 6;
    const ribbonAngle = Math.sin(t * windSpeed) * (this.isMoving ? 0.35 : 0.12);
    this.ribbon1.rotation.y = ribbonAngle - 0.1;
    this.ribbon2.rotation.y = -ribbonAngle + 0.1;

    // Movement interpolation
    if (this.isMoving) {
      const dir = new THREE.Vector3().subVectors(this.targetPos, this.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 0.1) {
        dir.normalize();
        this.position.addScaledVector(dir, this.moveSpeed * dt);
        // Rotate towards moving direction
        const targetRot = Math.atan2(dir.x, dir.z);
        this.rotation.y = THREE.MathUtils.lerp(this.rotation.y, targetRot, 0.15);
      } else {
        this.isMoving = false;
        if (this.animState === "run") this.setAnimation("idle");
      }
    }

    // Procedural Poses
    switch (this.animState) {
      case "idle":
        // Subtle breathing chest rise
        this.parts.torso.position.y = 1.15 + Math.sin(t * 2.5) * 0.02;
        this.parts.head.rotation.x = Math.sin(t * 1.5) * 0.04;
        
        // Relaxed arms
        this.parts.leftArm.shoulder.rotation.set(Math.sin(t * 2) * 0.05, 0, -0.15);
        this.parts.rightArm.shoulder.rotation.set(Math.sin(t * 2) * 0.05, 0, 0.15);
        this.parts.leftArm.elbow.rotation.set(0.2, 0, 0);
        this.parts.rightArm.elbow.rotation.set(0.2, 0, 0);

        this.parts.leftLeg.hip.rotation.set(0, 0, 0);
        this.parts.rightLeg.hip.rotation.set(0, 0, 0);
        break;

      case "run":
        // Ninja Sprint: Leaning forward, arms swept straight back
        this.parts.torso.rotation.x = 0.45;
        this.parts.torso.position.y = 1.05 + Math.abs(Math.sin(t * 12)) * 0.08;

        // Arms swept back
        this.parts.leftArm.shoulder.rotation.set(-1.4, 0, -0.2);
        this.parts.rightArm.shoulder.rotation.set(-1.4, 0, 0.2);
        this.parts.leftArm.elbow.rotation.set(-0.2, 0, 0);
        this.parts.rightArm.elbow.rotation.set(-0.2, 0, 0);

        // Fast stride leg cycles
        const legCycle = Math.sin(t * 14);
        this.parts.leftLeg.hip.rotation.x = legCycle * 0.8;
        this.parts.rightLeg.hip.rotation.x = -legCycle * 0.8;
        this.parts.leftLeg.knee.rotation.x = Math.max(0, -legCycle * 1.1);
        this.parts.rightLeg.knee.rotation.x = Math.max(0, legCycle * 1.1);
        break;

      case "seal":
        // Both hands pressed together at chest in prayer hand seal
        this.parts.torso.rotation.set(0, 0, 0);
        this.parts.leftArm.shoulder.rotation.set(0.8, 0.6, 0.5);
        this.parts.rightArm.shoulder.rotation.set(0.8, -0.6, -0.5);
        this.parts.leftArm.elbow.rotation.set(1.4, 0.2, 0);
        this.parts.rightArm.elbow.rotation.set(1.4, -0.2, 0);
        break;

      case "rasengan":
        // Right hand forward in cupped thrust
        this.parts.torso.rotation.y = -0.3;
        this.parts.rightArm.shoulder.rotation.set(1.5, -0.3, 0);
        this.parts.rightArm.elbow.rotation.set(0.4, 0, 0);
        this.parts.leftArm.shoulder.rotation.set(-0.6, 0, -0.4);
        break;

      case "chidori":
        // Low stance, right arm thrusting forward with crackling lightning
        this.parts.torso.position.y = 0.95;
        this.parts.torso.rotation.x = 0.5;
        this.parts.rightArm.shoulder.rotation.set(1.6, 0, 0);
        this.parts.rightArm.elbow.rotation.set(0.1, 0, 0);
        this.parts.leftArm.shoulder.rotation.set(-1.2, 0, -0.4);
        break;

      case "fireball":
        // Both hands pushed forward from mouth in tiger seal
        this.parts.torso.rotation.x = 0.2;
        this.parts.leftArm.shoulder.rotation.set(1.4, 0.4, 0);
        this.parts.rightArm.shoulder.rotation.set(1.4, -0.4, 0);
        this.parts.leftArm.elbow.rotation.set(0.8, 0, 0);
        this.parts.rightArm.elbow.rotation.set(0.8, 0, 0);
        break;
    }
  }

  moveTo(targetVec) {
    this.targetPos.copy(targetVec);
    this.isMoving = true;
    this.setAnimation("run");
  }
}

/**
 * Shadow Clone Coordinator
 * Manages summoning, formation, synchronized poses, and dissolution of clones
 */
class ShadowCloneManager {
  constructor(scene, vfxEngine) {
    this.scene = scene;
    this.vfx = vfxEngine;
    this.clones = [];
    this.isArmyActive = false;
  }

  summonClones(player, count = 3) {
    this.dismissClones();

    const radius = 2.4;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const clone = new NinjaCharacter(this.scene, true, i);
      
      const spawnPos = new THREE.Vector3(
        player.position.x + Math.cos(angle) * radius,
        player.position.y,
        player.position.z + Math.sin(angle) * radius
      );
      clone.position.copy(spawnPos);
      clone.rotation.y = player.rotation.y;
      
      // Spawns in cloud of smoke
      this.vfx.spawnSmokePoof(spawnPos, 1.2, 22);
      this.clones.push(clone);
    }
  }

  summonArmy(player, count = 16) {
    this.dismissClones();
    this.isArmyActive = true;

    // Concentric ring formation around arena
    const rings = [
      { r: 2.8, c: 5 },
      { r: 5.2, c: 11 }
    ];

    let created = 0;
    rings.forEach(ring => {
      for (let i = 0; i < ring.c && created < count; i++) {
        const angle = (i / ring.c) * Math.PI * 2 + (Math.random() * 0.2);
        const clone = new NinjaCharacter(this.scene, true, created);
        
        const spawnPos = new THREE.Vector3(
          player.position.x + Math.cos(angle) * ring.r,
          player.position.y,
          player.position.z + Math.sin(angle) * ring.r
        );
        clone.position.copy(spawnPos);
        clone.rotation.y = angle + Math.PI; // Face outwards
        
        // Rolling staggered smoke puffs
        setTimeout(() => {
          this.vfx.spawnSmokePoof(spawnPos, 1.3, 20);
        }, created * 60);

        this.clones.push(clone);
        created++;
      }
    });

    // Auto-dissolve after spectacular display (8 seconds)
    setTimeout(() => {
      this.dismissClones();
    }, 8000);
  }

  dismissClones() {
    this.clones.forEach(c => {
      this.vfx.spawnSmokePoof(c.position, 1.0, 18);
      this.scene.remove(c.group);
    });
    this.clones = [];
    this.isArmyActive = false;
  }

  syncPose(animState) {
    this.clones.forEach((clone, idx) => {
      // Clones follow with slight stagger delay for realistic anime group synchronization
      setTimeout(() => {
        clone.setAnimation(animState);
      }, idx * 45);
    });
  }

  update(dt, player) {
    this.clones.forEach((clone, idx) => {
      clone.update(dt);
      
      // If army is not active, regular clones follow player with procedural offset
      if (!this.isArmyActive && player.isMoving) {
        const angle = (idx / Math.max(1, this.clones.length)) * Math.PI * 2;
        const target = new THREE.Vector3(
          player.position.x + Math.cos(angle) * 2.2,
          player.position.y,
          player.position.z + Math.sin(angle) * 2.2
        );
        clone.moveTo(target);
      }
    });
  }
}

window.NinjaCharacter = NinjaCharacter;
window.ShadowCloneManager = ShadowCloneManager;
