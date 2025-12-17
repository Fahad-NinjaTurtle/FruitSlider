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
        
        const fruitType = Phaser.Math.RND.pick(this.config.spawn.fruitTypes);
        const randomSpawnX = Phaser.Math.Between(
          this.config.spawn.minSpawnX,
          width - this.config.spawn.maxSpawnXOffset
        );
        
        this.spawnFruit(fruitType, randomSpawnX, width, height);
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
   * Calculate physics properties for a fruit
   */
  calculatePhysics(spawnX, width, height) {
    const centerX = width / 2;
    const distanceToCenter = centerX - spawnX;
    const velocityScale = this.config.getVelocityScale(height);

    // Upward velocity
    const minUpward = this.config.fruit.minUpwardVelocity * velocityScale;
    const maxUpward = this.config.fruit.maxUpwardVelocity * velocityScale;
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

