export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }
  preload() {
    this.load.image("waterMelon", "sprites/waterMelon.png");
    this.load.image("apple", "sprites/apple.png");
    this.load.image("peach", "sprites/peach.png");
    this.load.image("pear", "sprites/pear.png");
    this.load.image("bomb", "sprites/bomb.png");
    this.load.image("background", "sprites/background.png");
    this.load.image("trail", "sprites/Trail.png");
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Store dimensions for responsive calculations
    this.gameWidth = width;
    this.gameHeight = height;
    this.centerX = width / 2;

    // Background - make sure it fills entire screen
    const bg = this.add.image(0, 0, "background").setOrigin(0, 0);
    bg.displayWidth = width;
    bg.displayHeight = height;

    // Responsive scale based on screen height
    // Base scale for 1080p, scales down for smaller screens
    const baseHeight = 1080;
    const scaleFactor = height / baseHeight;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Scale fruits proportionally to screen size
    // Mobile gets smaller base scale, then scales with screen
    const baseScale = isMobile ? 0.2 : 0.3;
    this.fruitScale = baseScale * scaleFactor;

    // Clamp scale to reasonable limits
    this.fruitScale = Phaser.Math.Clamp(this.fruitScale, 0.15, 0.35);

    this.fruits = this.physics.add.group();

    this.time.addEvent({
      delay: 1200,
      callback: () => {
        const fruitType = ["waterMelon", "apple", "peach", "pear", "bomb"];
        const randomFruit =
          fruitType[Phaser.Math.Between(0, fruitType.length - 1)];
        const randomSpawnX = Phaser.Math.Between(50, width - 50);
        this.spawnFruit(randomFruit, randomSpawnX, width, height);
      },
      loop: true,
    });
    this.swipePoints = [];
    this.isSwiping = false;

    this.input.on("pointerdown", (p) => {
      const now = this.time.now;
      this.swipePoints = [{ x: p.x, y: p.y, time: now }];
      this.isSwiping = true;
    });

    this.input.on("pointermove", (p) => {
      if (!this.isSwiping) return;

      const now = this.time.now;

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
      const now = this.time.now;
      const cutoff = now - 1;
      this.swipePoints = this.swipePoints.filter((pt) => pt.time > cutoff);
      this.isSwiping = false;
    });
    this.trailGraphics = this.add.graphics({
      lineStyle: { width: 4, color: 0xffffff, alpha: 0.8 },
    });
  }

  update() {
    // Update dimensions if window resized
    const currentWidth = this.cameras.main.width;
    const currentHeight = this.cameras.main.height;

    if (currentWidth !== this.gameWidth || currentHeight !== this.gameHeight) {
      this.gameWidth = currentWidth;
      this.gameHeight = currentHeight;
      this.centerX = currentWidth / 2;

      // Recalculate scale
      const baseHeight = 1080;
      const scaleFactor = currentHeight / baseHeight;
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      const baseScale = isMobile ? 0.2 : 0.3;
      this.fruitScale = Phaser.Math.Clamp(baseScale * scaleFactor, 0.15, 0.35);
    }

    this.fruits.getChildren().forEach((fruit) => {
      if (fruit && fruit.active && fruit.y > this.cameras.main.height) {
        console.log("fruit destroyed ", fruit.name);
        fruit.destroy();
      }
    });

    if (this.isSwiping && this.swipePoints.length > 1) {
      this.checkSwipeAgainstFruits();
    }
    this.drawSwipeTrail();
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
    const force = 500;
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

    top.body.setGravityY(1200);
    bottom.body.setGravityY(1200);
    console.log("Gravity:", 1200);

    const topAngularVel = Phaser.Math.Between(80, 90);
    const bottomAngularVel = -Phaser.Math.Between(80, 90);
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
      apple: 0xff4d4d,
      pear: 0xa4ff4d,
      peach: 0xffb84d,
      waterMelon: 0xff3355,
      bomb: 0x000000,
    };

    const color = colors[fruitKey] || 0xff5555;

    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(
        x + Phaser.Math.Between(-15, 15),
        y + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(3, 6),
        color
      );

      const spread = angle + Phaser.Math.FloatBetween(-0.5, 0.5);
      const speed = Phaser.Math.Between(80, 140);

      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(spread) * speed,
        y: particle.y + Math.sin(spread) * speed,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(300, 500),
        onComplete: () => particle.destroy(),
      });
    }
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

    // Draw outer glow (thicker, more transparent)
    this.trailGraphics.lineStyle(8, 0xffffff, 0.3);
    this.trailGraphics.beginPath();
    this.trailGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.trailGraphics.lineTo(points[i].x, points[i].y);
    }
    this.trailGraphics.strokePath();

    // Draw inner bright line
    this.trailGraphics.lineStyle(4, 0xffffff, 0.9);
    this.trailGraphics.beginPath();
    this.trailGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.trailGraphics.lineTo(points[i].x, points[i].y);
    }
    this.trailGraphics.strokePath();
  }

  spawnFruit(gameObjectName, spawnX, width, height) {
    // Calculate responsive spawn position (near bottom, but not too close)
    const spawnY = height; // 15% from bottom

    const fruit = this.physics.add.sprite(spawnX, spawnY, gameObjectName);

    // Use responsive scale
    fruit.setScale(this.fruitScale);
    this.fruits.add(fruit);

    // Calculate direction toward center
    const centerX = width / 2;
    const distanceToCenter = centerX - spawnX;

    // Responsive velocity based on screen height
    // Base velocities for 1080p height, scale proportionally
    const baseHeight = 1080;
    const velocityScale = height / baseHeight;

    // Scale velocities to screen size
    const minUpwardVelocity = -400 * velocityScale;
    const maxUpwardVelocity = -700 * velocityScale;
    const upwardVelocity = Phaser.Math.Between(
      minUpwardVelocity,
      maxUpwardVelocity
    );

    // Calculate horizontal velocity to move toward center
    // The further from center, the stronger the pull toward center
    const maxHorizontalSpeed = Math.abs(upwardVelocity) * 0.4; // 40% of upward speed
    const normalizedDistance = Math.abs(distanceToCenter) / (width / 2); // 0 to 1
    const horizontalSpeed = maxHorizontalSpeed * normalizedDistance;

    // Direction: positive = right, negative = left
    const xVelocity =
      distanceToCenter > 0
        ? horizontalSpeed // Moving right toward center
        : -horizontalSpeed; // Moving left toward center

    fruit.setVelocity(xVelocity, upwardVelocity);

    // Responsive angular velocity
    const angularVelocityScale = velocityScale;
    const minAngular = -200 * angularVelocityScale;
    const maxAngular = 200 * angularVelocityScale;
    fruit.setAngularVelocity(Phaser.Math.Between(minAngular, maxAngular));
  }
}
