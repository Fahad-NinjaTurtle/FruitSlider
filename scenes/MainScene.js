import { GameConfig } from './GameConfig.js';
import { FruitSpawner } from './FruitSpawner.js';

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.config = new GameConfig();
    // Last time we played the trail whoosh sound (for cooldown)
    this.lastTrailWhooshTime = 0;
  }

  preload() {
    this.load.image("waterMelon", "sprites/waterMelon.png");
    this.load.image("apple", "sprites/apple.png");
    this.load.image("peach", "sprites/peach.png");
    this.load.image("pear", "sprites/pear.png");
    this.load.image("bomb", "sprites/bomb.png");
    this.load.image("background", "sprites/background.png");
    this.load.image("trail", "sprites/Trail.png");
    this.load.image("cross", "sprites/cross.png");

    // --- Audio ---
    this.load.audio("sfxGameStart", "sounds/Game-start.wav");
    this.load.audio("sfxGameOver", "sounds/Critical.wav");
    this.load.audio("sfxBombExplode", "sounds/Bomb-explode.wav");
    this.load.audio("sfxFruitSlice", "sounds/Splatter-Medium-2.wav");
    this.load.audio("sfxTrailWhoosh", "sounds/whoosh.wav");
    this.load.audio("sfxThrowFruit", "sounds/Throw-fruit.wav");
    this.load.audio("sfxMissFruit", "sounds/miss.wav");
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Apply LINEAR texture filtering to all textures to prevent pixelation on mobile
    // This enables smooth scaling on high-DPI displays
    const textureKeys = ["waterMelon", "apple", "peach", "pear", "bomb", "background", "trail", "cross"];
    textureKeys.forEach(key => {
      const texture = this.textures.get(key);
      if (texture) {
        texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });

    // Store dimensions for responsive calculations
    this.gameWidth = width;
    this.gameHeight = height;
    this.centerX = width / 2;

    // Background - make sure it fills entire screen
    this.bg = this.add.image(0, 0, "background").setOrigin(0, 0);
    this.bg.displayWidth = width;
    this.bg.displayHeight = height;
    this.bg.setDepth(0); // Background at lowest depth
    
    // Store reference to update when fullscreen changes
    this.updateBackgroundSize();

    // Responsive scale based on screen height
    // Base scale for 1080p, scales down for smaller screens
    const baseHeight = 1080;
    const scaleFactor = height / baseHeight;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Scale fruits proportionally to screen size using config
    this.fruitScale = this.config.getScaleFactor(height, isMobile);

    this.fruits = this.physics.add.group();
    
    // Group for juice splatters (stays on background, behind fruits)
    this.juiceSplatters = this.add.group();
    this.juiceSplatters.setDepth(1); // Behind fruits but above background

    // Initialize fruit spawner
    this.fruitSpawner = new FruitSpawner(this, this.config);
    this.gameStarted = false;
    
    // Check if we're restarting from game over - auto-start if needed
    // This ensures fruits spawn after retry
    if (this.gameStarted === undefined) {
      this.gameStarted = false;
    }
    this.swipePoints = [];
    this.isSwiping = false;
    this.trailFadeTimer = null;
    this.trailClearTimer = null; // Timer to clear trail if no movement

    // Game state
    this.score = 0;
    this.misses = 0;
    this.maxMisses = this.config.game.maxMisses;
    this.gameOver = false;
    
    // Combo system state
    this.comboCount = 0; // Current combo count
    this.lastSliceTime = 0; // Time of last fruit slice
    this.comboText = null; // Combo display text object
    this.comboTimer = null; // Timer to reset combo
    
    // Load best score from localStorage
    this.bestScore = parseInt(
      localStorage.getItem(this.config.game.bestScoreKey) || '0', 
      10
    );

    // UI Elements - Style matching the image
    // Calculate responsive positions based on screen size
    const uiScale = Math.min(
      width / this.config.ui.baseWidth, 
      height / this.config.ui.baseHeight
    );
    
    // Top-left UI group
    const topLeftX = 40;
    const topLeftY = 40;
    
    // Yellow score box - no watermelon icon
    const scoreBoxWidth = this.config.ui.scoreBoxWidth;
    const scoreBoxHeight = this.config.ui.scoreBoxHeight;
    const scoreBoxX = topLeftX + 50; // Positioned at left edge
    const scoreBoxY = topLeftY;
    
    this.scoreBox = this.add.graphics();
    this.scoreBox.fillStyle(0xffd700, 1); // Bright yellow
    this.scoreBox.fillRoundedRect(scoreBoxX - scoreBoxWidth/2, scoreBoxY - scoreBoxHeight/2, scoreBoxWidth, scoreBoxHeight, 8);
    this.scoreBox.lineStyle(2, 0x000000, 1); // Black border
    this.scoreBox.strokeRoundedRect(scoreBoxX - scoreBoxWidth/2, scoreBoxY - scoreBoxHeight/2, scoreBoxWidth, scoreBoxHeight, 8);
    this.scoreBox.setDepth(100);
    
    // Score text (inside yellow box) - larger and bold
    this.scoreText = this.add.text(scoreBoxX, scoreBoxY, '0', {
      fontSize: '32px',
      fill: '#000000',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(101);
    
    // BEST score text (below yellow box, aligned with left edge of box)
    this.bestScoreText = this.add.text(scoreBoxX - scoreBoxWidth/2, scoreBoxY + scoreBoxHeight/2 + 8, `BEST: ${this.bestScore}`, {
      fontSize: '20px',
      fill: '#ff8c00',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(101);
    
    // Miss counter - Cross icons from sprite (top right)
    this.missIcons = [];
    const missIconSpacing = this.config.ui.missIconSpacing;
    const missIconStartX = width - 200; // Adjusted position for larger icons
    const missIconY = topLeftY;
    const missIconSize = this.config.ui.missIconSize;
    
    for (let i = 0; i < this.maxMisses; i++) {
      const crossIcon = this.add.image(
        missIconStartX + i * missIconSpacing, 
        missIconY, 
        'cross'
      );
      crossIcon.setDisplaySize(missIconSize, missIconSize);
      crossIcon.setDepth(100);
      this.missIcons.push(crossIcon);
    }

    this.input.on("pointerdown", (p) => {
      // Don't process swipes if game is over
      if (this.gameOver) return;
      
      const now = this.time.now;
      this.swipePoints = [{ x: p.x, y: p.y, time: now }];
      this.isSwiping = true;
      
      // Clear any existing trail immediately
      this.trailGraphics.clear();
      
      // Cancel any existing fade timer
      if (this.trailFadeTimer) {
        this.trailFadeTimer.remove();
        this.trailFadeTimer = null;
      }
      
      // Cancel any existing clear timer
      if (this.trailClearTimer) {
        this.trailClearTimer.remove();
        this.trailClearTimer = null;
      }
      
      // Set timer to clear trail if no movement
      this.trailClearTimer = this.time.delayedCall(
        this.config.effects.trail.clearDelay, 
        () => {
        if (this.swipePoints.length <= 1) {
          // No movement detected, clear trail
          this.trailGraphics.clear();
          this.swipePoints = [];
          this.isSwiping = false;
        }
        this.trailClearTimer = null;
      });
    });

    this.input.on("pointermove", (p) => {
      if (!this.isSwiping || this.gameOver) return;

      // Cancel the clear timer since we're moving
      if (this.trailClearTimer) {
        this.trailClearTimer.remove();
        this.trailClearTimer = null;
      }

      const now = this.time.now;

      // Calculate swipe speed between last point and this point
      if (this.swipePoints.length > 0) {
        const lastPoint = this.swipePoints[this.swipePoints.length - 1];
        const dx = p.x - lastPoint.x;
        const dy = p.y - lastPoint.y;
        const dt = Math.max(now - lastPoint.time, 1); // avoid divide by zero
        const distance = Math.sqrt(dx * dx + dy * dy); // pixels
        const speed = distance / dt; // pixels per ms

        // If moving fast enough and cooldown passed, play whoosh
        const SPEED_THRESHOLD = 3; // tweak: higher = need faster swipe
        const COOLDOWN = 180; // ms between whooshes
        if (
          speed > SPEED_THRESHOLD &&
          now - this.lastTrailWhooshTime > COOLDOWN
        ) {
          this.sound.play("sfxTrailWhoosh", { volume: 0.6 });
          this.lastTrailWhooshTime = now;
        }
      }

      this.swipePoints.push({
        x: p.x,
        y: p.y,
        time: now,
      });

      // Remove points older than 500ms
      const cutoff = now - 50;
      this.swipePoints = this.swipePoints.filter((pt) => pt.time > cutoff);
    });

    this.input.on("pointerup", () => {
      // Don't process if game is over (let buttons handle clicks)
      if (this.gameOver) return;
      
      // Cancel clear timer
      if (this.trailClearTimer) {
        this.trailClearTimer.remove();
        this.trailClearTimer = null;
      }

      const now = this.time.now;
      const cutoff = now - 1;
      this.swipePoints = this.swipePoints.filter((pt) => pt.time > cutoff);
      this.isSwiping = false;
      
      // Fade out trail
      if (this.trailFadeTimer) {
        this.trailFadeTimer.remove();
      }
      this.trailFadeTimer = this.time.delayedCall(
        this.config.effects.trail.fadeDelay, 
        () => {
          this.tweens.add({
            targets: this.trailGraphics,
            alpha: 0,
            duration: this.config.effects.trail.fadeDuration,
          onComplete: () => {
            this.trailGraphics.clear();
            this.trailGraphics.alpha = 1;
            this.swipePoints = [];
          }
        });
        this.trailFadeTimer = null;
      });
    });
    this.trailGraphics = this.add.graphics({
      lineStyle: { width: 4, color: 0xffffff, alpha: 0.8 },
    });
    
    // Listen for fullscreen changes to update background
    this.scale.on('resize', this.updateBackgroundSize, this);
    
    // Make startGame method accessible globally
    window.startGame = () => this.startGame();
    
    // Check if this is a scene restart (retry) - auto-start game
    // Store a flag in scene data to detect restart
    if (!this.scene.settings.data) {
      this.scene.settings.data = {};
    }
    
    // If retry was clicked, auto-start the game
    if (this.scene.settings.data.autoStart) {
      this.time.delayedCall(200, () => {
        this.startGame();
      });
      // Reset flag
      this.scene.settings.data.autoStart = false;
    }
  }

  // Method to start the game (called from start button)
  startGame() {
    if (this.gameStarted) return; // Already started
    
    this.gameStarted = true;
    this.gameOver = false;
    this.score = 0;
    this.misses = 0;
    
    // Hide game over panel if visible
    const gameOverPanel = document.getElementById('gameOverPanel');
    if (gameOverPanel) {
      gameOverPanel.classList.add('hidden');
    }
    
    // Reset combo system
    this.comboCount = 0;
    this.lastSliceTime = 0;
    if (this.comboTimer) {
      this.comboTimer.remove();
      this.comboTimer = null;
    }
    if (this.comboText) {
      this.comboText.destroy();
      this.comboText = null;
    }
    
    // Reload best score
    this.bestScore = parseInt(
      localStorage.getItem(this.config.game.bestScoreKey) || '0', 
      10
    );

    this.updateUI();

    // Play game start sound
    this.sound.play("sfxGameStart", { volume: 0.8 });
    
    // Start fruit spawning using spawner
    this.fruitSpawner.start();
    
    console.log('🎮 Game started - fruits will now spawn');
  }

  // Update UI text
  updateUI() {
    if (this.scoreText) {
      this.scoreText.setText(`${this.score}`);
    }
    if (this.bestScoreText) {
      this.bestScoreText.setText(`BEST: ${this.bestScore}`);
    }
    
    // Update miss icons (show remaining lives - hide icons from left when misses occur)
    if (this.missIcons) {
      for (let i = 0; i < this.maxMisses; i++) {
        if (this.missIcons[i]) {
          // Show icon if it's not yet missed (remove from left side)
          // If misses = 0, show all (i >= 0)
          // If misses = 1, show last 2 (i >= 1) - hide leftmost
          // If misses = 2, show last 1 (i >= 2) - hide leftmost 2
          // If misses = 3, show none (i >= 3) - hide all
          this.missIcons[i].setVisible(i >= this.misses);
        }
      }
    }
  }

  // Create bomb explosion - full screen white flash (temporary blindness effect)
  createBombExplosion(x, y) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create full screen white flash
    const whiteFlash = this.add.graphics();
    whiteFlash.fillStyle(0xffffff, 1); // Pure white
    whiteFlash.fillRect(0, 0, width, height);
    whiteFlash.setDepth(250); // Above everything
    
    // Flash appears instantly, then fades out
    this.tweens.add({
      targets: whiteFlash,
      alpha: 0,
      duration: this.config.effects.bomb.flashDuration,
      ease: 'Power2',
      onComplete: () => {
        whiteFlash.destroy();
      }
    });
  }

  // Show combo text when combo is achieved
  showComboText(comboCount, bonusScore) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Remove previous combo text if exists
    if (this.comboText) {
      this.comboText.destroy();
    }
    
    // Create combo text
    const comboLabel = comboCount >= this.config.combo.minCombo 
      ? `${comboCount}x COMBO!` 
      : '';
    
    if (comboLabel) {
      this.comboText = this.add.text(
        width / 2,
        height * 0.3, // Top third of screen
        comboLabel,
        {
          fontSize: `${this.config.combo.fontSize}px`,
          fill: '#ffd700', // Gold color
          stroke: '#000000',
          strokeThickness: 6,
          fontFamily: 'Arial',
          fontStyle: 'bold',
          align: 'center'
        }
      ).setOrigin(0.5).setDepth(200);
      
      // Add bonus score text below combo
      const bonusText = this.add.text(
        width / 2,
        height * 0.3 + this.config.combo.fontSize + 10,
        `+${bonusScore} Bonus!`,
        {
          fontSize: `${this.config.combo.fontSize * 0.6}px`,
          fill: '#ffff00', // Yellow
          stroke: '#000000',
          strokeThickness: 4,
          fontFamily: 'Arial',
          fontStyle: 'bold',
          align: 'center'
        }
      ).setOrigin(0.5).setDepth(200);
      
      // Animation - scale up and fade out
      this.comboText.setAlpha(0);
      this.comboText.setScale(0.5);
      bonusText.setAlpha(0);
      bonusText.setScale(0.5);
      
      // Fade in and scale up
      this.tweens.add({
        targets: [this.comboText, bonusText],
        alpha: 1,
        scale: 1.2,
        duration: 200,
        ease: 'Back.easeOut'
      });
      
      // Then fade out and scale down
      this.tweens.add({
        targets: [this.comboText, bonusText],
        alpha: 0,
        scale: 0.8,
        duration: 300,
        delay: this.config.combo.displayDuration - 500,
        ease: 'Power2',
        onComplete: () => {
          if (this.comboText) {
            this.comboText.destroy();
            this.comboText = null;
          }
          bonusText.destroy();
        }
      });
    }
  }

  // Show game over text (called after bomb explosion)
  showGameOverText() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // GAME OVER text (large, red, bold)
    const gameOverText = this.add.text(
      width / 2,
      height / 2,
      'GAME OVER',
      {
        fontSize: '80px',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 8,
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(251);
    
    // Fade in animation
    gameOverText.setAlpha(0);
    this.tweens.add({
      targets: gameOverText,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
    
    // Store reference for cleanup
    this.gameOverTextObj = gameOverText;
  }

  // End game function with parchment-style panel
  endGame(reason) {
    // Prevent multiple game over panels/sounds
    if (this.gameOver) {
      console.log('⚠️ endGame called but game already over');
      return; // Already ended
    }
    
    console.log('🎮 endGame called:', reason);
    this.gameOver = true;

    // Play game over sound once when the game ends
    this.sound.play("sfxGameOver", { volume: 0.9 });
    
    // Use UI scale if available, otherwise default to 1
    const uiScale = this.uiScale || 1;
    
    // Clear swipe trail immediately
    this.isSwiping = false;
    this.swipePoints = [];

    if (this.trailFadeTimer) {
      this.trailFadeTimer.remove();
      this.trailFadeTimer = null;
    }

    if (this.trailClearTimer) {
      this.trailClearTimer.remove();
      this.trailClearTimer = null;
    }

    if (this.trailGraphics) {
      this.trailGraphics.clear();
      this.trailGraphics.alpha = 0;
    }
    
    // Clean up combo system
    if (this.comboTimer) {
      this.comboTimer.remove();
      this.comboTimer = null;
    }
    if (this.comboText) {
      this.comboText.destroy();
      this.comboText = null;
    }
    
    // Update best score
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(
        this.config.game.bestScoreKey, 
        this.bestScore.toString()
      );
    }
    
    // Stop fruit spawning
    this.fruitSpawner.stop();
    
    // Remove game over text if it exists (from bomb explosion) - do it immediately
    if (this.gameOverTextObj) {
      this.gameOverTextObj.destroy();
      this.gameOverTextObj = null;
    }
    
    console.log('📋 Showing HTML game over panel...');
    
    // Show HTML-based game over panel
    const gameOverPanel = document.getElementById('gameOverPanel');
    const finalScoreElement = document.getElementById('finalScore');
    
    console.log('Game over panel element:', gameOverPanel);
    console.log('Final score element:', finalScoreElement);
    
    if (gameOverPanel && finalScoreElement) {
      // Update score
      finalScoreElement.textContent = this.score;
      
      // Check if we're in fullscreen mode
      const fullscreenElement = document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement || 
                                document.msFullscreenElement;
      
      // If in fullscreen, append panel to fullscreen element
      if (fullscreenElement && fullscreenElement !== gameOverPanel.parentElement) {
        fullscreenElement.appendChild(gameOverPanel);
        console.log('Panel appended to fullscreen element');
      }
      
      // Show panel - remove hidden class and ensure it's visible
      gameOverPanel.classList.remove('hidden');
      gameOverPanel.style.display = 'flex';
      gameOverPanel.style.visibility = 'visible';
      gameOverPanel.style.opacity = '1';
      gameOverPanel.style.position = 'fixed';
      gameOverPanel.style.zIndex = '99999';
      gameOverPanel.style.top = '0';
      gameOverPanel.style.left = '0';
      gameOverPanel.style.width = '100vw';
      gameOverPanel.style.height = '100vh';
      
      console.log('Panel should be visible now', {
        fullscreen: !!fullscreenElement,
        parent: gameOverPanel.parentElement
      });
      
      // Setup button handlers (only once)
      if (!this.gameOverButtonsSetup) {
        const retryBtn = document.getElementById('retryBtn');
        const quitBtn = document.getElementById('quitBtn');
        
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            // Hide panel
            gameOverPanel.classList.add('hidden');
            
            // Set flag to auto-start after restart
            if (!this.scene.settings.data) {
              this.scene.settings.data = {};
            }
            this.scene.settings.data.autoStart = true;
            this.scene.restart();
          });
        }
        
        if (quitBtn) {
          quitBtn.addEventListener('click', () => {
            // Exit fullscreen if active
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
              document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
              document.msExitFullscreen();
            }
            // Reload page to go back to start screen
            window.location.reload();
          });
        }
        
        this.gameOverButtonsSetup = true;
      }
    }

    console.log(`🎮 Game Over: ${reason} | Final Score: ${this.score} | Best: ${this.bestScore}`);
  }

  // Update background size when screen dimensions change
  updateBackgroundSize() {
    if (!this.bg) return;
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    this.bg.displayWidth = width;
    this.bg.displayHeight = height;
    
    console.log('🖼️ Background updated:', { width, height });
  }

  /**
   * Update game state (logic only, no rendering)
   */
  updateGameState() {
    // Update dimensions if window resized
    const currentWidth = this.cameras.main.width;
    const currentHeight = this.cameras.main.height;

    if (currentWidth !== this.gameWidth || currentHeight !== this.gameHeight) {
      this.gameWidth = currentWidth;
      this.gameHeight = currentHeight;
      this.centerX = currentWidth / 2;

      // Recalculate scale using config
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      this.fruitScale = this.config.getScaleFactor(currentHeight, isMobile);
      
      // Update background size when dimensions change (e.g., fullscreen)
      this.updateBackgroundSize();
    }

    // Check for fruits going off-screen
    this.checkFruitsOffScreen();

    // Process swipe collisions if game is active
    if (!this.gameOver && this.isSwiping && this.swipePoints.length > 1) {
      this.checkSwipeAgainstFruits();
    }
  }

  /**
   * Render visual updates
   */
  render() {
    // Draw swipe trail
    if (!this.gameOver) {
      this.drawSwipeTrail();
    }
  }

  /**
   * Main update loop - separates state updates from rendering
   */
  update() {
    this.updateGameState();
    this.render();
  }

  /**
   * Check for fruits that have gone off-screen
   */
  checkFruitsOffScreen() {
    this.fruits.getChildren().forEach((fruit) => {
      if (fruit && fruit.active && fruit.y > this.cameras.main.height) {
        console.log("fruit destroyed ", fruit.texture.key);
        
        // Check if it's a bomb (bombs don't count as misses)
        if (fruit.texture.key !== 'bomb' && !this.gameOver) {
          // Play miss sound for each missed fruit
          this.sound.play("sfxMissFruit", { volume: 0.7 });

          this.misses++;
          this.updateUI();
          
          // Check if we hit max misses - endGame will prevent multiple calls
          if (this.misses >= this.config.game.maxMisses) {
            this.endGame('You missed 3 fruits!');
          }
        }
        
        fruit.destroy();
      }
    });
  }
  checkSwipeAgainstFruits() {
    const points = this.swipePoints;

    if (points.length < 2) {
      console.log("⚠️ Not enough swipe points for collision check");
      return;
    }

    // console.log(`\n🔍 Checking ${this.fruits.getChildren().length} fruits against ${points.length} swipe points`);

    this.fruits.getChildren().forEach((fruit, fruitIndex) => {
      if (!fruit.active) {
        console.log(
          `  Fruit ${fruitIndex} (${fruit.texture.key}): inactive, skipping`
        );
        return;
      }

      const r = fruit.displayWidth * 0.45; // radius
      const cx = fruit.x;
      const cy = fruit.y;
      const hitRadius = fruit.displayWidth * 0.35; // smaller radius → deeper swipe required

      // console.log(`\n  🍎 Checking Fruit ${fruitIndex}: ${fruit.texture.key}`);
      // console.log(`     Position: (${cx.toFixed(1)}, ${cy.toFixed(1)})`);
      // console.log(`     Display Size: ${fruit.displayWidth.toFixed(1)} x ${fruit.displayHeight.toFixed(1)}`);
      // console.log(`     Detection Radius: ${hitRadius.toFixed(1)}`);

      // Check each swipe segment
      let hitFound = false;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const segmentDistance = Phaser.Math.Distance.Between(
          p1.x,
          p1.y,
          p2.x,
          p2.y
        );
        const distanceToFruit = Phaser.Math.Distance.Between(
          cx,
          cy,
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2
        );

        const intersects = this.lineCircleIntersect(
          p1.x,
          p1.y,
          p2.x,
          p2.y,
          cx,
          cy,
          hitRadius
        );

        if (intersects) {
          console.log(`     ✅ SEGMENT ${i} HIT!`);
          console.log(
            `        Segment: (${p1.x.toFixed(1)}, ${p1.y.toFixed(
              1
            )}) → (${p2.x.toFixed(1)}, ${p2.y.toFixed(1)})`
          );
          console.log(`        Segment Length: ${segmentDistance.toFixed(1)}`);
          console.log(
            `        Distance to Fruit Center: ${distanceToFruit.toFixed(1)}`
          );
          console.log(`        Hit Radius: ${hitRadius.toFixed(1)}`);
          console.log(
            `\n🎯 FULL SWIPE HIT → SLICING ${fruit.texture.key.toUpperCase()}!`
          );
          this.sliceFruit(fruit);
          hitFound = true;
          break;
        } else {
          // console.log(`     ❌ Segment ${i}: No hit (dist: ${distanceToFruit.toFixed(1)}, radius: ${hitRadius.toFixed(1)})`);
        }
      }

      if (!hitFound) {
        // console.log(`     ℹ️ No collision detected for ${fruit.texture.key}`);
      }
    });
  }

  sliceFruit(fruit) {
    console.log("=== SLICE FRUIT CALLED ===");
    console.log("Fruit Type:", fruit.texture.key);
    console.log("Fruit Position:", { x: fruit.x, y: fruit.y });
    console.log("Fruit Scale:", fruit.scaleX);
    console.log(
      "Fruit Rotation:",
      fruit.rotation,
      "radians (",
      Phaser.Math.RadToDeg(fruit.rotation),
      "degrees)"
    );
    console.log("Fruit Size:", { width: fruit.width, height: fruit.height });

    const key = fruit.texture.key;
    
    // Check if bomb was sliced - create explosion effect then game over!
    if (key === 'bomb') {
      // Immediately mark game over so no more fruits can be sliced in the same swipe/update
      // this.gameOver = true;

      const bombX = fruit.x;
      const bombY = fruit.y;
      fruit.destroy();

      // Play bomb explosion sound
      this.sound.play("sfxBombExplode", { volume: 0.9 });
      
      // Create bomb explosion - full screen white flash
      this.createBombExplosion(bombX, bombY);
      
      // Sequence: White flash -> Game Over text -> Panel
      // Show "GAME OVER" text after white flash starts fading
      this.time.delayedCall(this.config.effects.bomb.gameOverTextDelay, () => {
        this.showGameOverText();
      });
      
      // Show panel after game over text
      this.time.delayedCall(this.config.effects.bomb.panelDelay, () => {
        this.endGame('You sliced a bomb!');
      });
      
      return;
    }
    
    // Combo system - check if this slice is part of a combo
    const now = this.time.now;
    const timeSinceLastSlice = now - this.lastSliceTime;
    const comboConfig = this.config.combo;
    
    if (comboConfig.enabled && timeSinceLastSlice <= comboConfig.timeWindow) {
      // Continue combo
      this.comboCount++;
      
      // Calculate bonus score (base score + combo bonus)
      const baseScore = 1;
      const comboBonus = Math.floor(baseScore * comboConfig.bonusMultiplier * this.comboCount);
      const totalScore = baseScore + comboBonus;
      
      this.score += totalScore;
      
      // Show combo text
      this.showComboText(this.comboCount + 1, totalScore); // +1 because comboCount starts at 0
      
      // Reset combo timer
      if (this.comboTimer) {
        this.comboTimer.remove();
      }
      this.comboTimer = this.time.delayedCall(comboConfig.timeWindow, () => {
        this.comboCount = 0;
        this.comboTimer = null;
      });
    } else {
      // Start new combo or single slice
      this.comboCount = 1;
      this.score++;
      
      // Reset combo timer
      if (this.comboTimer) {
        this.comboTimer.remove();
      }
      this.comboTimer = this.time.delayedCall(comboConfig.timeWindow, () => {
        this.comboCount = 0;
        this.comboTimer = null;
      });
    }
    
    this.lastSliceTime = now;
    this.updateUI();

    // Play fruit slice splatter sound
    this.sound.play("sfxFruitSlice", { volume: 0.7 });
    const x = fruit.x;
    const y = fruit.y;
    const scale = fruit.scaleX;

    // Calculate slice angle from swipe
    let sliceAngle = 0;
    console.log("Swipe Points Count:", this.swipePoints.length);

    if (this.swipePoints.length >= 2) {
      const start = this.swipePoints[0];
      const end = this.swipePoints[this.swipePoints.length - 1];
      sliceAngle = Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y);

      console.log("Swipe Start:", { x: start.x, y: start.y });
      console.log("Swipe End:", { x: end.x, y: end.y });
      console.log(
        "Slice Angle:",
        sliceAngle,
        "radians (",
        Phaser.Math.RadToDeg(sliceAngle),
        "degrees)"
      );
      console.log(
        "Swipe Distance:",
        Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y)
      );
    } else {
      console.warn("⚠️ Not enough swipe points! Using default angle 0");
    }

    // Get texture reference
    const tex = fruit.texture;
    const texW = tex.source[0].width;
    const texH = tex.source[0].height;
    console.log("Texture Dimensions:", { width: texW, height: texH });

    // ---------- CREATE TOP HALF ----------
    console.log("--- Creating Top Half ---");
    const top = this.add.image(x, y, key);
    top.setScale(scale);
    top.setCrop(0, 0, texW, texH / 2);
    top.setOrigin(0.5, 1); // cut-line origin
    top.setRotation(fruit.rotation);
    top.setDepth(10); // Above juice splatters
    console.log("Top Half:", {
      position: { x: top.x, y: top.y },
      scale: top.scaleX,
      rotation: top.rotation,
      crop: { x: 0, y: 0, width: texW, height: texH / 2 },
    });
    this.physics.world.enable(top);

    // ---------- CREATE BOTTOM HALF ----------
    console.log("--- Creating Bottom Half ---");
    const bottom = this.add.image(x, y, key);
    bottom.setScale(scale);
    bottom.setCrop(0, texH / 2, texW, texH / 2);
    bottom.setRotation(fruit.rotation);
    bottom.setOrigin(0.5, 0);
    bottom.setDepth(10); // Above juice splatters
    console.log("Bottom Half:", {
      position: { x: bottom.x, y: bottom.y },
      scale: bottom.scaleX,
      rotation: bottom.rotation,
      crop: { x: 0, y: texH / 2, width: texW, height: texH / 2 },
    });
    this.physics.world.enable(bottom);

    // Remove original fruit
    console.log("Destroying original fruit");
    fruit.destroy();

    // ---------- PHYSICS FORCE OUTWARD ----------
    // Calculate separation direction based on which side of swipe line each half is on
    const force = this.config.fruit.separationForce;
    const perpAngle = sliceAngle + Math.PI / 2;
    
    // Calculate swipe line direction vector (normalized)
    let swipeDirX = 0;
    let swipeDirY = 0;
    if (this.swipePoints.length >= 2) {
      const start = this.swipePoints[0];
      const end = this.swipePoints[this.swipePoints.length - 1];
      const swipeLength = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
      if (swipeLength > 0) {
        swipeDirX = (end.x - start.x) / swipeLength;
        swipeDirY = (end.y - start.y) / swipeLength;
      }
    }
    
    // Calculate perpendicular to swipe line (normalized)
    const perpDirX = -swipeDirY; // Perpendicular: rotate 90 degrees
    const perpDirY = swipeDirX;
    
    // Calculate center points of each half in world space (accounting for rotation)
    // Top half center is at (0, -texH/4) in local texture space, bottom half at (0, texH/4)
    // But we need to account for the crop and origin offset
    const halfHeight = (texH / 2) * scale;
    const cosRot = Math.cos(fruit.rotation);
    const sinRot = Math.sin(fruit.rotation);
    
    // Top half: origin is at (0.5, 1.0) which is bottom-center of the cropped top half
    // So the visual center is offset upward by halfHeight/2 in local space
    // In local space: (0, -halfHeight/2) relative to origin
    const topHalfLocalOffsetY = -halfHeight / 2;
    
    // Bottom half: origin is at (0.5, 0.0) which is top-center of the cropped bottom half
    // So the visual center is offset downward by halfHeight/2 in local space
    // In local space: (0, halfHeight/2) relative to origin
    const bottomHalfLocalOffsetY = halfHeight / 2;
    
    // Transform local offsets to world space using rotation
    // Rotate the offset vector by fruit rotation
    const topHalfWorldX = x + (-sinRot * topHalfLocalOffsetY);
    const topHalfWorldY = y + (cosRot * topHalfLocalOffsetY);
    
    const bottomHalfWorldX = x + (-sinRot * bottomHalfLocalOffsetY);
    const bottomHalfWorldY = y + (cosRot * bottomHalfLocalOffsetY);
    
    // Determine which side of the swipe line each half is on
    // Using cross product: if cross > 0, point is on left side of line
    let swipeStartX = x;
    let swipeStartY = y;
    if (this.swipePoints.length >= 2) {
      swipeStartX = this.swipePoints[0].x;
      swipeStartY = this.swipePoints[0].y;
    }
    
    // Vector from swipe start to top half center
    const toTopX = topHalfWorldX - swipeStartX;
    const toTopY = topHalfWorldY - swipeStartY;
    const crossTop = swipeDirX * toTopY - swipeDirY * toTopX;
    
    // Vector from swipe start to bottom half center
    const toBottomX = bottomHalfWorldX - swipeStartX;
    const toBottomY = bottomHalfWorldY - swipeStartY;
    const crossBottom = swipeDirX * toBottomY - swipeDirY * toBottomX;
    
    // Apply force: halves go in opposite directions perpendicular to swipe line
    // The half on the "positive" side goes in positive perpendicular direction
    const separationSign = crossTop > 0 ? 1 : -1;
    
    const topVelX = perpDirX * force * separationSign;
    const topVelY = perpDirY * force * separationSign;
    const bottomVelX = perpDirX * force * -separationSign;
    const bottomVelY = perpDirY * force * -separationSign;

    console.log("--- Physics Setup ---");
    console.log("Separation Force:", force);
    console.log("Swipe Direction:", { x: swipeDirX, y: swipeDirY });
    console.log("Perpendicular Direction:", { x: perpDirX, y: perpDirY });
    console.log("Top Half World Position:", { x: topHalfWorldX, y: topHalfWorldY });
    console.log("Bottom Half World Position:", { x: bottomHalfWorldX, y: bottomHalfWorldY });
    console.log("Cross Products:", { top: crossTop, bottom: crossBottom });
    console.log("Separation Sign:", separationSign);
    console.log("Top Half Velocity:", { x: topVelX, y: topVelY });
    console.log("Bottom Half Velocity:", { x: bottomVelX, y: bottomVelY });

    top.body.setVelocity(topVelX, topVelY);
    bottom.body.setVelocity(bottomVelX, bottomVelY);

    const slicedGravity = this.config.fruit.slicedGravity;
    top.body.setGravityY(slicedGravity);
    bottom.body.setGravityY(slicedGravity);
    console.log("Gravity:", slicedGravity);

    const topAngularVel = Phaser.Math.Between(
      this.config.fruit.slicedAngularVelocityMin,
      this.config.fruit.slicedAngularVelocityMax
    );
    const bottomAngularVel = -Phaser.Math.Between(
      this.config.fruit.slicedAngularVelocityMin,
      this.config.fruit.slicedAngularVelocityMax
    );
    top.body.setAngularVelocity(topAngularVel);
    bottom.body.setAngularVelocity(bottomAngularVel);
    console.log("Angular Velocity:", {
      top: topAngularVel,
      bottom: bottomAngularVel,
    });

    // ---------- SLICE VISUAL EFFECT ----------
    console.log("--- Creating Visual Effects ---");
    this.createSliceFlash(x, y, sliceAngle);
    this.createJuiceSplash(x, y, sliceAngle, key);
    console.log("Visual effects created at:", { x, y, angle: sliceAngle });

    // Fade out pieces
    console.log("--- Starting Fade Out Animation ---");
    this.tweens.add({
      targets: [top, bottom],
      alpha: 0,
      duration: 900,
      delay: 150,
      onComplete: () => {
        console.log("Halves destroyed after fade");
        top.destroy();
        bottom.destroy();
      },
    });

    console.log("=== SLICE FRUIT COMPLETE ===");
  }
  createSliceFlash(x, y, angle) {
    const line = this.add.graphics();
    line.lineStyle(4, 0xffffff, 1);

    const len = 100;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    line.lineBetween(
      x - cos * len,
      y - sin * len,
      x + cos * len,
      y + sin * len
    );

    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 200,
      onComplete: () => line.destroy(),
    });
  }
  createJuiceSplash(x, y, angle, fruitKey) {
    const colors = {
        apple: 0xff2b2b,
        pear: 0x6fff3a,
        peach: 0xff8c3a,
        waterMelon: 0xff2b6e,
        bomb: 0x444444,
    };

    const color = colors[fruitKey] || 0xff2b2b;
    const allSplatters = [];

    // Helper function to create smooth, organic blob shape (rounded and organic)
    const createSmoothBlob = (centerX, centerY, baseRadius, colorVal, alpha) => {
      const blob = this.add.graphics();
      blob.setDepth(1);
      blob.fillStyle(colorVal, alpha);
      
      // Use fewer points for smoother, rounder shape
      const numPoints = Phaser.Math.Between(16, 24);
      blob.beginPath();
      
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        
        // Create smooth, subtle radius variations (no sharp spikes)
        // Most points stay close to base radius, with gentle variations
        const variation = Phaser.Math.FloatBetween(0.85, 1.15); // Subtle variation
        const radius = baseRadius * variation;
        
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        
        if (i === 0) blob.moveTo(px, py);
        else blob.lineTo(px, py);
      }
      
      blob.closePath();
      blob.fillPath();
      return blob;
    };

    // Helper function to create tear-drop/comet shape for drips
    const createTearDrop = (startX, startY, angle, length, width, colorVal, alpha) => {
      const drip = this.add.graphics();
      drip.setDepth(1);
      drip.fillStyle(colorVal, alpha);
      
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;
      
      // Create tear-drop shape using multiple points for smooth curve
      // Wide at start, narrow at end
      const points = 12;
      drip.beginPath();
      
      // Start point (wide end)
      const perpAngle = angle + Math.PI / 2;
      const startLeftX = startX + Math.cos(perpAngle) * width * 0.5;
      const startLeftY = startY + Math.sin(perpAngle) * width * 0.5;
      drip.moveTo(startLeftX, startLeftY);
      
      // Create left side curve (from wide to narrow)
      for (let i = 0; i <= points; i++) {
        const t = i / points; // 0 to 1
        const currentLength = length * t;
        const currentWidth = width * (1 - t * 0.7); // Narrow as we go
        
        const leftX = startX + Math.cos(angle) * currentLength + Math.cos(perpAngle) * currentWidth * 0.5;
        const leftY = startY + Math.sin(angle) * currentLength + Math.sin(perpAngle) * currentWidth * 0.5;
        drip.lineTo(leftX, leftY);
      }
      
      // End point (narrow tip)
      drip.lineTo(endX, endY);
      
      // Create right side curve (back from narrow to wide)
      for (let i = points; i >= 0; i--) {
        const t = i / points; // 1 to 0
        const currentLength = length * t;
        const currentWidth = width * (1 - t * 0.7);
        
        const rightX = startX + Math.cos(angle) * currentLength + Math.cos(perpAngle) * -currentWidth * 0.5;
        const rightY = startY + Math.sin(angle) * currentLength + Math.sin(perpAngle) * -currentWidth * 0.5;
        drip.lineTo(rightX, rightY);
      }
      
      drip.closePath();
      drip.fillPath();
      
      return drip;
    };
    
    // Main splatter - create multiple layers for depth and glow effect
    const mainSize = Phaser.Math.Between(35, 55);
    
    // Outer glow layer (larger, more transparent) - smooth and rounded
    const glowLayer = createSmoothBlob(x, y, mainSize * 1.3, color, 0.15);
    allSplatters.push(glowLayer);
    
    // Middle layer - smooth and rounded
    const middleLayer = createSmoothBlob(x, y, mainSize * 1.1, color, 0.4);
    allSplatters.push(middleLayer);
    
    // Main dense layer (most opaque) - smooth and rounded
    const mainLayer = createSmoothBlob(x, y, mainSize, color, 0.75);
    allSplatters.push(mainLayer);
    
    // Add smaller splatter blobs with varying sizes and opacities (smooth and rounded)
    const numSmallBlobs = Phaser.Math.Between(8, 15);
    for (let i = 0; i < numSmallBlobs; i++) {
      const offsetX = x + Phaser.Math.Between(-50, 50);
      const offsetY = y + Phaser.Math.Between(-50, 50);
      const smallSize = Phaser.Math.Between(4, 15);
      const smallAlpha = Phaser.Math.FloatBetween(0.3, 0.7);
      
      const smallBlob = createSmoothBlob(offsetX, offsetY, smallSize, color, smallAlpha);
      allSplatters.push(smallBlob);
    }
    
    // Create smooth, rounded drips/tendrils radiating outward (subtle and organic)
    const numDrips = Phaser.Math.Between(5, 10);
    for (let i = 0; i < numDrips; i++) {
      // Random angle for drip direction
      const dripAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      
      // Start position slightly offset from center
      const startOffset = Phaser.Math.Between(8, 25);
      const startX = x + Math.cos(dripAngle) * startOffset;
      const startY = y + Math.sin(dripAngle) * startOffset;
      
      // Drip length and width (shorter, smoother drips)
      const dripLength = Phaser.Math.Between(15, 40);
      const dripWidth = Phaser.Math.Between(3, 8);
      const dripAlpha = Phaser.Math.FloatBetween(0.5, 0.8);
      
      const drip = createTearDrop(startX, startY, dripAngle, dripLength, dripWidth, color, dripAlpha);
      allSplatters.push(drip);
    }
    
    // Add smooth circular droplets scattered around (more numerous, smaller)
    const numDroplets = Phaser.Math.Between(12, 25);
    for (let i = 0; i < numDroplets; i++) {
      const droplet = this.add.graphics();
      droplet.setDepth(1);
      
      const dist = Phaser.Math.Between(25, 80);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const px = x + Math.cos(a) * dist;
      const py = y + Math.sin(a) * dist;
      const radius = Phaser.Math.Between(1.5, 6);
      const dropletAlpha = Phaser.Math.FloatBetween(0.4, 0.8);
      
      droplet.fillStyle(color, dropletAlpha);
      droplet.fillCircle(px, py, radius);
      
      allSplatters.push(droplet);
    }
    
    // Add spray droplets along the slice direction
    const sprayCount = Phaser.Math.Between(8, 15);
    for (let i = 0; i < sprayCount; i++) {
      const spray = this.add.graphics();
      spray.setDepth(1);
      
      const dist = Phaser.Math.Between(40, 130);
      const spread = Phaser.Math.FloatBetween(-0.5, 0.5);
      const a = angle + spread;
      const radius = Phaser.Math.Between(2, 6);
      const sprayAlpha = Phaser.Math.FloatBetween(0.6, 0.95);
      
      spray.fillStyle(color, sprayAlpha);
      spray.fillCircle(
        x + Math.cos(a) * dist,
        y + Math.sin(a) * dist,
        radius
      );
      
      allSplatters.push(spray);
    }

    // Animation — fade out after configured delay
    allSplatters.forEach((splatter) => {
      const fadeDelay = Phaser.Math.Between(
        this.config.effects.juice.fadeDelayMin,
        this.config.effects.juice.fadeDelayMax
      );
      this.time.delayedCall(fadeDelay, () => {
        this.tweens.add({
          targets: splatter,
          alpha: 0,
          duration: this.config.effects.juice.fadeDuration,
          onComplete: () => splatter.destroy()
        });
      });
    });

    // Add to global group
    allSplatters.forEach(s => this.juiceSplatters.add(s));
  }


  lineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
    // Step 1: Line segment vector
    let dx = x2 - x1;
    let dy = y2 - y1;

    // Step 2: If the swipe has zero movement, skip (prevents NaN)
    if (dx === 0 && dy === 0) return false;

    // Step 3: Vector from circle center to line start
    let fx = x1 - cx;
    let fy = y1 - cy;

    // Quadratic formula coefficients
    let a = dx * dx + dy * dy;
    let b = 2 * (fx * dx + fy * dy);
    let c = fx * fx + fy * fy - r * r;

    // Discriminant
    let discriminant = b * b - 4 * a * c;

    // No intersection
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);

    let t1 = (-b - discriminant) / (2 * a);
    let t2 = (-b + discriminant) / (2 * a);

    // Intersection occurs if t is between 0 and 1 (line segment)
    if (t1 >= 0 && t1 <= 1) return true;
    if (t2 >= 0 && t2 <= 1) return true;

    return false;
  }
  drawSwipeTrail() {
    const points = this.swipePoints;
    this.trailGraphics.clear();

    if (points.length < 2) return;

    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    
    // Blade dimensions - wider at front (end), sharp at back (start)
    const baseWidth = this.config.effects.trail.baseWidth;
    const tipWidth = this.config.effects.trail.tipWidth;
    
    // Create blade shape - sharp white blade
    this.trailGraphics.fillStyle(0xffffff, 0.95); // Pure white, slightly transparent
    this.trailGraphics.lineStyle(1, 0xeeeeee, 0.9); // Light edge
    
    // Draw blade as a filled shape (wider at front, sharp at back)
    this.trailGraphics.beginPath();
    
    // Left edge (from back/tip to front/base, expanding)
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const currentWidth = tipWidth * (1 - t) + baseWidth * t; // Expand from tip to base (opposite)
      
      const p = points[i];
      let pNext = points[Math.min(i + 1, points.length - 1)];
      
      // Calculate perpendicular angle for this segment
      const segmentAngle = Phaser.Math.Angle.Between(p.x, p.y, pNext.x, pNext.y);
      const perp = segmentAngle + Math.PI / 2;
      
      // Calculate offset for blade edge
      const offsetX = Math.cos(perp) * currentWidth * 0.5;
      const offsetY = Math.sin(perp) * currentWidth * 0.5;
      
      if (i === 0) {
        this.trailGraphics.moveTo(p.x + offsetX, p.y + offsetY);
      } else {
        this.trailGraphics.lineTo(p.x + offsetX, p.y + offsetY);
      }
    }
    
    // Base point (wide front)
    this.trailGraphics.lineTo(endPoint.x, endPoint.y);
    
    // Right edge (from front/base back to tip, narrowing)
    for (let i = points.length - 1; i >= 0; i--) {
      const t = i / (points.length - 1);
      const currentWidth = tipWidth * (1 - t) + baseWidth * t; // Narrow from base to tip (opposite)
      
      const p = points[i];
      let pPrev = points[Math.max(i - 1, 0)];
      
      // Calculate perpendicular angle for this segment
      const segmentAngle = Phaser.Math.Angle.Between(pPrev.x, pPrev.y, p.x, p.y);
      const perp = segmentAngle + Math.PI / 2;
      
      // Calculate offset for blade edge (opposite side)
      const offsetX = Math.cos(perp) * -currentWidth * 0.5;
      const offsetY = Math.sin(perp) * -currentWidth * 0.5;
      
      this.trailGraphics.lineTo(p.x + offsetX, p.y + offsetY);
    }
    
    this.trailGraphics.closePath();
    this.trailGraphics.fillPath();
    this.trailGraphics.strokePath();
    
    // Add bright center line for extra sharpness and definition
    this.trailGraphics.lineStyle(2, 0xffffff, 1);
    this.trailGraphics.beginPath();
    this.trailGraphics.moveTo(startPoint.x, startPoint.y);
    for (let i = 1; i < points.length; i++) {
      this.trailGraphics.lineTo(points[i].x, points[i].y);
    }
    this.trailGraphics.strokePath();
    
    // Add subtle outer glow for depth
    this.trailGraphics.lineStyle(10, 0xffffff, 0.15);
    this.trailGraphics.beginPath();
    this.trailGraphics.moveTo(startPoint.x, startPoint.y);
    for (let i = 1; i < points.length; i++) {
      this.trailGraphics.lineTo(points[i].x, points[i].y);
    }
    this.trailGraphics.strokePath();
  }

  // Spawn fruit is now handled by FruitSpawner class
  // This method is kept for backward compatibility but delegates to spawner
  spawnFruit(gameObjectName, spawnX, width, height) {
    this.fruitSpawner.spawnFruit(gameObjectName, spawnX, width, height);
  }
}
