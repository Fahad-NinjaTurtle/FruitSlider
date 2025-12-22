import { GameConfig } from './GameConfig.js';

/**
 * Fruit Spawner Class
 * Handles all fruit spawning logic in a modular way
 */
export class FruitSpawner {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.spawnTimer = null;
    this.isActive = false;
    this.lastMultiFruitTime = 0; // Track last multi-fruit spawn time
  }

  /**
   * Start spawning fruits
   */
  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.spawnTimer = this.scene.time.addEvent({
      delay: this.config.spawn.delay,
      callback: () => {
        if (this.scene.gameOver) return;
        
        const now = this.scene.time.now;
        const multiFruitConfig = this.config.spawn.multiFruit;
        
        // Check if we should spawn multiple fruits
        const shouldSpawnMulti = multiFruitConfig.enabled &&
          Math.random() < multiFruitConfig.probability &&
          (now - this.lastMultiFruitTime) >= multiFruitConfig.timeBetweenMulti;
        
        if (shouldSpawnMulti) {
          // Spawn multiple fruits
          const numFruits = Phaser.Math.Between(
            multiFruitConfig.minFruits,
            multiFruitConfig.maxFruits
          );
          this.spawnMultipleFruits(numFruits, width, height);
          this.lastMultiFruitTime = now;
        } else {
          // Spawn single fruit
          const fruitType = Phaser.Math.RND.pick(this.config.spawn.fruitTypes);
          const randomSpawnX = Phaser.Math.Between(
            this.config.spawn.minSpawnX,
            width - this.config.spawn.maxSpawnXOffset
          );
          
          this.spawnFruit(fruitType, randomSpawnX, width, height);
        }
      },
      loop: true,
    });
  }

  /**
   * Stop spawning fruits
   */
  stop() {
    this.isActive = false;
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = null;
    }
  }

  /**
   * Spawn a single fruit
   */
  spawnFruit(gameObjectName, spawnX, width, height) {
    const spawnY = height;
    const fruit = this.scene.physics.add.sprite(spawnX, spawnY, gameObjectName);

    // Apply scale
    fruit.setScale(this.scene.fruitScale);
    fruit.setDepth(10);
    this.scene.fruits.add(fruit);

    // Calculate physics properties
    const physics = this.calculatePhysics(spawnX, width, height);
    
    fruit.setVelocity(physics.xVelocity, physics.upwardVelocity);
    fruit.setAngularVelocity(physics.angularVelocity);

    // Play throw sound for launched fruits (including bombs for now)
    if (this.scene.sound && this.scene.sound.play) {
      this.scene.sound.play("sfxThrowFruit", { volume: 0.5 });
    }
  }

  /**
   * Spawn multiple fruits at once (multi-fruit spawn)
   */
  spawnMultipleFruits(numFruits, width, height) {
    const multiFruitConfig = this.config.spawn.multiFruit;
    const centerX = width / 2;
    const totalSpread = (numFruits - 1) * multiFruitConfig.spawnSpread;
    const startX = centerX - (totalSpread / 2);
    
    // Don't spawn bombs in multi-fruit (only regular fruits)
    const regularFruits = this.config.spawn.fruitTypes.filter(type => type !== 'bomb');
    
    for (let i = 0; i < numFruits; i++) {
      const spawnX = startX + (i * multiFruitConfig.spawnSpread);
      
      // Make sure spawnX is within bounds
      const clampedX = Phaser.Math.Clamp(
        spawnX,
        this.config.spawn.minSpawnX,
        width - this.config.spawn.maxSpawnXOffset
      );
      
      // Pick random fruit type (excluding bombs)
      const fruitType = Phaser.Math.RND.pick(regularFruits);
      
      // Small delay between each fruit spawn for visual effect
      this.scene.time.delayedCall(i * 50, () => {
        if (!this.scene.gameOver) {
          this.spawnFruit(fruitType, clampedX, width, height);
        }
      });
    }
  }

  /**
   * Calculate physics properties for a fruit
   */
  calculatePhysics(spawnX, width, height) {
    const centerX = width / 2;
    const distanceToCenter = centerX - spawnX;
    const velocityScale = this.config.getVelocityScale(height);
    
    // Detect if mobile for velocity boost
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    // Reduced mobile multiplier to prevent fruits going above screen
    // Mobile screens are smaller, but we need to be careful with velocity
    const mobileVelocityMultiplier = isMobile ? 0.9 : 1.0; // Reduced from 1.1 to 0.9
    const adjustedVelocityScale = velocityScale * mobileVelocityMultiplier;

    // Upward velocity
    const minUpward = this.config.fruit.minUpwardVelocity * adjustedVelocityScale;
    const maxUpward = this.config.fruit.maxUpwardVelocity * adjustedVelocityScale;
    const upwardVelocity = Phaser.Math.Between(minUpward, maxUpward);

    // Horizontal velocity (toward center)
    const maxHorizontalSpeed = Math.abs(upwardVelocity) * 
      this.config.fruit.horizontalSpeedMultiplier;
    const normalizedDistance = Math.abs(distanceToCenter) / (width / 2);
    const horizontalSpeed = maxHorizontalSpeed * normalizedDistance;
    const xVelocity = distanceToCenter > 0 
      ? horizontalSpeed 
      : -horizontalSpeed;

    // Angular velocity
    const minAngular = this.config.fruit.minAngularVelocity * velocityScale;
    const maxAngular = this.config.fruit.maxAngularVelocity * velocityScale;
    const angularVelocity = Phaser.Math.Between(minAngular, maxAngular);

    return {
      xVelocity,
      upwardVelocity,
      angularVelocity,
    };
  }
}

