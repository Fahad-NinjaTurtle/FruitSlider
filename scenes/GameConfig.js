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

      // Multi-fruit spawn settings
      multiFruit: {
        enabled: true, // Enable multi-fruit spawns
        probability: 0.3, // 30% chance of multi-fruit spawn (0.0 to 1.0)
        minFruits: 2, // Minimum fruits in multi-fruit spawn
        maxFruits: 5, // Maximum fruits in multi-fruit spawn (changed from 4 to 5)
        spawnSpread: 150, // Horizontal spread between fruits (pixels)
        timeBetweenMulti: 5000, // Minimum time between multi-fruit spawns (ms)
      },
    };

    // Fruit physics configuration
    this.fruit = {
      // Velocity ranges (base values, will be scaled responsively)
      minUpwardVelocity: -300, // Further reduced to prevent going above screen
      maxUpwardVelocity: -450, // Further reduced to prevent going above screen
      horizontalSpeedMultiplier: 0.4, // Percentage of upward velocity

      // Angular velocity
      minAngularVelocity: -200,
      maxAngularVelocity: 200,

      // Scale configuration
      baseHeight: 1080, // Reference height for scaling
      mobileBaseScale: 0.5, // Good size for mobile
      desktopBaseScale: 0.4, // Reduced for desktop - fruits were too big
      minScale: 0.3, // Minimum scale
      maxScale: 0.5, // Reduced max scale - prevents fruits from being too large on big screens

      // Gravity for sliced halves
      slicedGravity: 1200,
      slicedAngularVelocityMin: 80,
      slicedAngularVelocityMax: 90,
      separationForce: 500,
    };

    // Game rules
    this.game = {
      maxMisses: 3,
      bestScoreKey: "fruitNinjaBestScore",
    };

    // Combo system configuration
    this.combo = {
      enabled: true, // Enable combo system
      timeWindow: 200, // Time window for combo (ms) - fruits sliced within 0.2 seconds count as combo
      minCombo: 2, // Minimum fruits for combo (2 = double, 3 = triple, etc.)
      bonusMultiplier: 0.5, // Bonus points multiplier (0.5 = 50% extra per fruit in combo)
      displayDuration: 1500, // How long to show combo text (ms)
      fontSize: 48, // Combo text font size
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
    // return Phaser.Math.Clamp(scaled, this.fruit.minScale, this.fruit.maxScale);
    const clamped = Phaser.Math.Clamp(
      scaled,
      this.fruit.minScale,
      this.fruit.maxScale
    );

    // QUANTIZE scale to avoid sub-pixel resampling
    return Math.round(clamped * 100) / 100;
  }

  /**
   * Get velocity scale factor based on screen height
   */
  getVelocityScale(height) {
    return height / this.fruit.baseHeight;
  }
}
