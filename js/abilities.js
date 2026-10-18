/**
 * 3D Ninja Academy: Shadow Jutsu Simulator - Abilities & Jutsu Manager
 * Handles execution, chakra consumption, cooldowns, animations, audio, and combat calculations
 * for all 10 Fictional Ninja Jutsu.
 */

class ShinobiAbilityManager {
  constructor(game, scene, vfxEngine, world, player, cloneManager) {
    this.game = game;
    this.scene = scene;
    this.vfx = vfxEngine;
    this.world = world;
    this.player = player;
    this.cloneManager = cloneManager;

    // Ability Registry
    this.abilities = {
      shadow_clone: {
        id: "shadow_clone",
        name: "Shadow Clone",
        kanji: "影分身の術",
        icon: "👥",
        cost: 25,
        cooldown: 2.5,
        gesture: "Open Palm Raised",
        description: "Summons 3 synchronized shadow clones in billowing smoke clouds."
      },
      flashbang: {
        id: "flashbang",
        name: "Flashbang",
        kanji: "光玉の術",
        icon: "💥",
        cost: 15,
        cooldown: 3.0,
        gesture: "Two-Finger Seal",
        description: "Triggers a blinding white flash, smoke screen, and disorients targets."
      },
      explosive: {
        id: "explosive",
        name: "Explosive Jutsu",
        kanji: "起爆波の術",
        icon: "💣",
        cost: 30,
        cooldown: 2.0,
        gesture: "Fist to Open Hand",
        description: "Releases a shockwave blast knocking back and shattering targets."
      },
      rasengan: {
        id: "rasengan",
        name: "Rasengan",
        kanji: "螺旋丸",
        icon: "🌀",
        cost: 40,
        cooldown: 4.0,
        gesture: "Swirl / Claw Thrust",
        description: "Forms swirling sphere of dense chakra, launched as high-speed cyclone."
      },
      chidori: {
        id: "chidori",
        name: "Chidori",
        kanji: "千鳥",
        icon: "⚡",
        cost: 45,
        cooldown: 4.0,
        gesture: "Spear Hand Thrust",
        description: "Charges 1,000 birds of lightning around arm and dashes forward."
      },
      fireball: {
        id: "fireball",
        name: "Fireball Jutsu",
        kanji: "豪火球の術",
        icon: "🔥",
        cost: 50,
        cooldown: 3.5,
        gesture: "Two Hands Together",
        description: "Breathes a massive roaring sphere of flames with heat distortion."
      },
      substitution: {
        id: "substitution",
        name: "Substitution",
        kanji: "変わり身の術",
        icon: "🪵",
        cost: 20,
        cooldown: 5.0,
        gesture: "Crossed Wrists (X)",
        description: "Vanishes in smoke, replaced instantly by a wooden training log."
      },
      teleport: {
        id: "teleport",
        name: "Body Flicker",
        kanji: "瞬身の術",
        icon: "💨",
        cost: 20,
        cooldown: 2.0,
        gesture: "Fast Hand Swipe",
        description: "Near-instantaneous teleportation between marked arena platforms."
      },
      chakra_shield: {
        id: "chakra_shield",
        name: "Chakra Shield",
        kanji: "チャクラ障壁",
        icon: "🛡️",
        cost: 35,
        cooldown: 2.5,
        gesture: "Steady Palm Front",
        description: "Projects a translucent hexagonal blue energy dome deflecting attacks."
      },
      shadow_army: {
        id: "shadow_army",
        name: "Ultimate Shadow Army",
        kanji: "多重影分身の術",
        icon: "⛩️",
        cost: 80,
        cooldown: 12.0,
        gesture: "Both Hands High (Hold 1.2s)",
        description: "Ultimate Jutsu! Summons 16 shadow clones across the entire academy courtyard."
      }
    };

    // Cooldown tracking
    this.cooldownRemaining = {};
    for (let k in this.abilities) {
      this.cooldownRemaining[k] = 0;
    }

    // Active charge state
    this.chargingRasengan = false;
    this.rasenganChargingMesh = null;
    this.currentTeleportIndex = 0;
  }

  canCast(abilityId) {
    const ab = this.abilities[abilityId];
    if (!ab) return false;
    if (this.cooldownRemaining[abilityId] > 0) return false;
    if (this.game.chakra < ab.cost) return false;
    return true;
  }

  triggerAbility(abilityId) {
    if (!this.canCast(abilityId)) {
      // Cooldown cue or not enough chakra
      if (this.game.chakra < this.abilities[abilityId].cost) {
        this.game.showBanner("Insufficient Chakra! Press [C] to Charge", "#ff2a5f");
      }
      return false;
    }

    const ab = this.abilities[abilityId];
    this.game.consumeChakra(ab.cost);
    this.cooldownRemaining[abilityId] = ab.cooldown;

    // Trigger HUD visual on card
    this.game.pulseAbilityCard(abilityId);
    this.game.showBanner(`${ab.name} (${ab.kanji}) Activated!`, "#00f0ff");

    // Execute Jutsu mechanics
    switch (abilityId) {
      case "shadow_clone":
        this.castShadowClone();
        break;
      case "flashbang":
        this.castFlashbang();
        break;
      case "explosive":
        this.castExplosive();
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
      case "substitution":
        this.castSubstitution();
        break;
      case "teleport":
        this.castTeleport();
        break;
      case "chakra_shield":
        this.castChakraShield();
        break;
      case "shadow_army":
        this.castShadowArmy();
        break;
    }

    // Notify game for tutorial progression or scoring
    this.game.onAbilityCast(abilityId);
    return true;
  }

  // 1. Shadow Clone Jutsu
  castShadowClone() {
    this.player.setAnimation("seal");
    if (window.shinobiAudio) window.shinobiAudio.playPoof();
    
    // Trigger Real Video Clones of the User in AR Mirror!
    if (this.game.arMirror) {
      this.game.arMirror.summonShadowClones();
    }

    setTimeout(() => {
      this.cloneManager.summonClones(this.player, 3);
      this.cloneManager.syncPose("idle");
      this.player.setAnimation("idle");
    }, 200);
  }

  // 2. Flashbang Technique
  castFlashbang() {
    this.player.setAnimation("seal");
    if (window.shinobiAudio) window.shinobiAudio.playFlashbang(this.vfx.flashIntensity);
    this.vfx.triggerFlashbang();

    // Stun nearby training dummies with minor damage
    this.world.dummies.forEach(d => {
      const dist = d.group.position.distanceTo(this.player.position);
      if (dist < 10) {
        d.takeDamage(25);
        this.game.addScore(50, d.group.position, false);
      }
    });

    setTimeout(() => this.player.setAnimation("idle"), 400);
  }

  // 3. Explosive Jutsu
  castExplosive() {
    this.player.setAnimation("seal");
    if (window.shinobiAudio) window.shinobiAudio.playExplosion(1.0);

    const pos = this.player.position.clone();
    this.vfx.spawnShockwave(pos, 8.5, 0xffaa00, 0.65);
    this.vfx.spawnSmokePoof(pos, 1.4, 25);

    // Also trigger smoke puff on AR Mirror
    if (this.game.arMirror) {
      this.game.arMirror.spawnSmokePuff(window.innerWidth * 0.5, window.innerHeight * 0.55, 2.0);
    }

    // Hit all dummies in blast radius
    this.world.dummies.forEach(d => {
      const dist = d.group.position.distanceTo(pos);
      if (dist < 8.5) {
        const damage = Math.round(90 - dist * 5);
        const impulse = new THREE.Vector3().subVectors(d.group.position, pos).normalize();
        d.takeDamage(damage, impulse);
        this.game.addScore(damage * 2, d.group.position, true);
      }
    });

    setTimeout(() => this.player.setAnimation("idle"), 350);
  }

  // 4. Rasengan
  castRasengan() {
    this.player.setAnimation("rasengan");
    
    // Audio charge + release
    const chargeSound = window.shinobiAudio ? window.shinobiAudio.playRasenganCharge() : null;

    // Trigger AR Rasengan on User's real hand
    if (this.game.arMirror) {
      this.game.arMirror.triggerRasengan({ x: window.innerWidth * 0.58, y: window.innerHeight * 0.6 });
    }

    // Attach small swirling orb to hand during charge
    if (!this.rasenganChargingMesh) {
      this.rasenganChargingMesh = this.vfx.createRasenganMesh();
      this.player.parts.rightArm.hand.add(this.rasenganChargingMesh);
      this.rasenganChargingMesh.position.set(0, -0.2, 0.15);
      this.rasenganChargingMesh.scale.set(0.65, 0.65, 0.65);
    }

    setTimeout(() => {
      if (chargeSound) chargeSound.stop();
      if (window.shinobiAudio) window.shinobiAudio.playRasenganRelease();

      if (this.rasenganChargingMesh) {
        this.player.parts.rightArm.hand.remove(this.rasenganChargingMesh);
        this.rasenganChargingMesh = null;
      }

      // Launch projectile forward
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
      const origin = new THREE.Vector3().copy(this.player.position).add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(forward, 1.2);
      
      this.vfx.launchRasengan(origin, forward);

      // Check collision along line of fire
      this.world.dummies.forEach(d => {
        const toDummy = new THREE.Vector3().subVectors(d.group.position, this.player.position);
        toDummy.y = 0;
        const dist = toDummy.length();
        const angle = forward.angleTo(toDummy);
        if (dist < 18 && angle < 0.45) {
          setTimeout(() => {
            d.takeDamage(160, forward);
            this.game.addScore(320, d.group.position, true);
          }, (dist / 28) * 1000);
        }
      });

      this.player.setAnimation("idle");
    }, 550);
  }

  // 5. Chidori (Lightning Spear Dash)
  castChidori() {
    this.player.setAnimation("chidori");
    if (window.shinobiAudio) window.shinobiAudio.playChidori(1.4);

    // Trigger AR Chidori lightning on User's real hand
    if (this.game.arMirror) {
      this.game.arMirror.triggerChidori({ x: window.innerWidth * 0.58, y: window.innerHeight * 0.6 });
    }

    // Emit flickering lightning arcs around right hand
    const arcInterval = setInterval(() => {
      const handPos = new THREE.Vector3();
      this.player.parts.rightArm.hand.getWorldPosition(handPos);
      const jitterPos = new THREE.Vector3(
        handPos.x + (Math.random() - 0.5) * 1.5,
        handPos.y + (Math.random() - 0.5) * 1.5,
        handPos.z + (Math.random() - 0.5) * 1.5
      );
      this.vfx.spawnLightningArc(handPos, jitterPos, 6, 0.3);
    }, 60);

    // Lightning Dash Attack
    setTimeout(() => {
      clearInterval(arcInterval);
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
      const dashDest = new THREE.Vector3().copy(this.player.position).addScaledVector(forward, 8.0);
      
      this.vfx.spawnSmokePoof(this.player.position, 0.8, 12);
      this.player.moveTo(dashDest);
      this.vfx.spawnShockwave(dashDest, 4.0, 0x00f0ff, 0.4);

      // Strike dummies along dash path
      this.world.dummies.forEach(d => {
        const toD = new THREE.Vector3().subVectors(d.group.position, this.player.position);
        toD.y = 0;
        if (toD.length() < 9.0 && forward.angleTo(toD) < 0.6) {
          d.takeDamage(180, forward);
          this.game.addScore(360, d.group.position, true);
        }
      });
    }, 450);
  }

  // 6. Fireball Jutsu
  castFireball() {
    this.player.setAnimation("fireball");
    if (window.shinobiAudio) window.shinobiAudio.playFireball();

    // Trigger AR Fireball on User's real hand
    if (this.game.arMirror) {
      this.game.arMirror.triggerFireball({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.6 });
    }

    setTimeout(() => {
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
      const mouthPos = new THREE.Vector3().copy(this.player.position).add(new THREE.Vector3(0, 1.5, 0)).addScaledVector(forward, 1.2);
      
      this.vfx.launchFireball(mouthPos, forward);

      // Hit targets
      this.world.dummies.forEach(d => {
        const toD = new THREE.Vector3().subVectors(d.group.position, this.player.position);
        toD.y = 0;
        const dist = toD.length();
        if (dist < 20 && forward.angleTo(toD) < 0.5) {
          setTimeout(() => {
            d.takeDamage(150, forward);
            this.game.addScore(300, d.group.position, true);
          }, (dist / 20) * 1000);
        }
      });

      this.player.setAnimation("idle");
    }, 400);
  }

  // 7. Substitution Jutsu
  castSubstitution() {
    if (window.shinobiAudio) window.shinobiAudio.playSubstitution();

    // Trigger AR Substitution (User video replaced by wooden log!)
    if (this.game.arMirror) {
      this.game.arMirror.triggerSubstitution();
    }

    const oldPos = this.player.position.clone();
    
    // Spawn training log at current location
    this.vfx.spawnSubstitutionLog(oldPos);

    // Teleport player 4 units backwards or sideways
    const backward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
    const newPos = new THREE.Vector3().copy(oldPos).addScaledVector(backward, 4.0);
    this.player.position.copy(newPos);
    this.vfx.spawnSmokePoof(newPos, 1.0, 16);
  }

  // 8. Teleportation / Body Flicker (Shunshin)
  castTeleport() {
    if (window.shinobiAudio) window.shinobiAudio.playTeleport();

    this.vfx.spawnSmokePoof(this.player.position, 0.8, 14);

    if (this.game.arMirror) {
      this.game.arMirror.spawnSmokePuff(window.innerWidth * 0.5, window.innerHeight * 0.5, 1.8);
    }

    // Pick next platform pillar in arena
    const platforms = this.world.teleportPlatforms;
    if (platforms && platforms.length > 0) {
      this.currentTeleportIndex = (this.currentTeleportIndex + 1) % platforms.length;
      const target = platforms[this.currentTeleportIndex];
      this.player.position.copy(target);
      this.vfx.spawnSmokePoof(target, 0.9, 18);
      this.vfx.triggerScreenShake(0.2);
    }
  }

  // 9. Chakra Shield
  castChakraShield() {
    this.player.setAnimation("seal");
    if (window.shinobiAudio) window.shinobiAudio.playChakraShield();
    this.vfx.activateChakraShield(this.player);

    // Trigger AR Chakra Shield on User's hand
    if (this.game.arMirror) {
      this.game.arMirror.triggerChakraShield({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.55 });
    }

    setTimeout(() => this.player.setAnimation("idle"), 400);
  }

  // 10. Ultimate Shadow Army
  castShadowArmy() {
    this.player.setAnimation("seal");
    if (window.shinobiAudio) window.shinobiAudio.playShadowArmy();

    this.vfx.triggerScreenShake(0.5);
    this.vfx.spawnShockwave(this.player.position, 12.0, 0x00f0ff, 1.2);

    // Summon 12-16 Real Video Clones of the User in AR Mirror!
    if (this.game.arMirror) {
      this.game.arMirror.summonShadowArmy();
    }

    this.cloneManager.summonArmy(this.player, 16);

    // Massive damage to all targets in courtyard
    this.world.dummies.forEach(d => {
      d.takeDamage(280);
      this.game.addScore(500, d.group.position, true);
    });

    setTimeout(() => this.player.setAnimation("idle"), 600);
  }

  update(dt) {
    // Tick cooldowns
    for (let k in this.cooldownRemaining) {
      if (this.cooldownRemaining[k] > 0) {
        this.cooldownRemaining[k] = Math.max(0, this.cooldownRemaining[k] - dt);
      }
    }
  }
}

window.ShinobiAbilityManager = ShinobiAbilityManager;
