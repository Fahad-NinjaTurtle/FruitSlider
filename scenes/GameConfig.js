/**
 * Game Configuration
 * Centralized configuration for all game properties
 */
export class GameConfig {
  constructor() {
    // Fruit spawning configuration
    this.spawn = {
      delay: 1200, // Milliseconds between spawns
      minSpawnX: 50,
      maxSpawnXOffset: 50, // Offset from screen edges
      fruitTypes: ["waterMelon", "apple", "peach", "pear", "bomb"],
    };

    // Fruit physics configuration
    this.fruit = {
      // Velocity ranges (base values, will be scaled responsively)
      minUpwardVelocity: -400,
      maxUpwardVelocity: -700,
      horizontalSpeedMultiplier: 0.4, // Percentage of upward velocity
      
      // Angular velocity
      minAngularVelocity: -200,
      maxAngularVelocity: 200,
      
      // Scale configuration
      baseHeight: 1080, // Reference height for scaling
      mobileBaseScale: 0.2,
      desktopBaseScale: 0.3,
      minScale: 0.15,
      maxScale: 0.35,
      
      // Gravity for sliced halves
      slicedGravity: 1200,
      slicedAngularVelocityMin: 80,
      slicedAngularVelocityMax: 90,
      separationForce: 500,
    };

    // Game rules
    this.game = {
      maxMisses: 3,
      bestScoreKey: 'fruitNinjaBestScore',
    };

    // UI configuration
    this.ui = {
      baseWidth: 1920,
      baseHeight: 1080,
      scoreBoxWidth: 100,
      scoreBoxHeight: 45,
      missIconSize: 72,
      missIconSpacing: 80,
    };

    // Visual effects configuration
    this.effects = {
      trail: {
        baseWidth: 15,
        tipWidth: 1,
        fadeDelay: 1000,
        fadeDuration: 200,
        clearDelay: 200,
      },
      juice: {
        fadeDelayMin: 1000,
        fadeDelayMax: 2000,
        fadeDuration: 300,
      },
      bomb: {
        flashDuration: 1500,
        gameOverTextDelay: 100,
        panelDelay: 1200,
      },
    };
  }

  /**
   * Get responsive scale factor based on screen height
   */
  getScaleFactor(height, isMobile) {
    const scaleFactor = height / this.fruit.baseHeight;
    const baseScale = isMobile 
      ? this.fruit.mobileBaseScale 
      : this.fruit.desktopBaseScale;
    const scaled = baseScale * scaleFactor;
    return Phaser.Math.Clamp(scaled, this.fruit.minScale, this.fruit.maxScale);
  }

  /**
   * Get velocity scale factor based on screen height
   */
  getVelocityScale(height) {
    return height / this.fruit.baseHeight;
  }
}

