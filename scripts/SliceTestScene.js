export class SliceTestScene extends Phaser.Scene {
  constructor() {
    super("SliceTestScene");
  }
  
  preload() {
    this.load.image("background", "./sprites/background.png");
    this.load.image("apple", "./sprites/apple.png");
  }
  
  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const bg = this.add.image(0, 0, "background").setOrigin(0, 0);
    bg.displayWidth = width;
    bg.displayHeight = height;

    // Create apple sprite
    this.apple = this.add.image(width / 2, height / 2, "apple");
    this.apple.setScale(0.5);
    this.apple.setInteractive();
    
    // Store apple dimensions
    this.appleWidth = this.apple.width * this.apple.scaleX;
    this.appleHeight = this.apple.height * this.apple.scaleY;
    
    // Swipe tracking
    this.swipePath = [];
    this.isSwiping = false;
    this.appleSliced = false;
    
    // Trail graphics
    this.trailGraphics = this.add.graphics();
    
    // Halves group
    this.halves = this.add.group();
    
    // Juice splatter marks group (persistent on background)
    this.juiceSplatters = this.add.group();

    // Pointer events
    this.input.on('pointerdown', (pointer) => {
      if (!this.appleSliced) {
        this.isSwiping = true;
        this.swipePath = [];
        this.addSwipePoint(pointer.x, pointer.y);
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isSwiping && pointer.isDown && !this.appleSliced) {
        this.addSwipePoint(pointer.x, pointer.y);
        this.checkAppleCollision();
        this.drawTrail();
      }
    });

    this.input.on('pointerup', () => {
      this.isSwiping = false;
      this.swipePath = [];
      this.trailGraphics.clear();
    });
  }

  addSwipePoint(x, y) {
    this.swipePath.push({ x, y });
    if (this.swipePath.length > 10) {
      this.swipePath.shift();
    }
  }

  drawTrail() {
    if (this.swipePath.length < 2) return;
    this.trailGraphics.clear();
    this.trailGraphics.lineStyle(5, 0xffffff, 0.8);
    
    for (let i = 1; i < this.swipePath.length; i++) {
      const prev = this.swipePath[i - 1];
      const curr = this.swipePath[i];
      this.trailGraphics.lineBetween(prev.x, prev.y, curr.x, curr.y);
    }
  }

  checkAppleCollision() {
    if (this.swipePath.length < 2) return;
    
    const lastPoint = this.swipePath[this.swipePath.length - 1];
    const distance = Phaser.Math.Distance.Between(
      lastPoint.x, lastPoint.y, this.apple.x, this.apple.y
    );
    
    // Check if pointer is within apple bounds
    if (distance < this.appleWidth / 2) {
      this.sliceApple();
    }
  }

  sliceApple() {
    if (this.appleSliced) return;
    this.appleSliced = true;
    
    const appleX = this.apple.x;
    const appleY = this.apple.y;
    const appleScale = this.apple.scaleX;
    
    // Calculate slice angle from swipe direction
    let sliceAngle = 0;
    if (this.swipePath.length >= 2) {
      const start = this.swipePath[0];
      const end = this.swipePath[this.swipePath.length - 1];
      sliceAngle = Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y);
    }
    
    // Get apple texture dimensions
    const texture = this.apple.texture;
    const textureWidth = texture.source[0].width;
    const textureHeight = texture.source[0].height;
    const scaledWidth = textureWidth * appleScale;
    const scaledHeight = textureHeight * appleScale;
    
    // Create top half
    const topHalf = this.add.image(appleX, appleY, "apple");
    topHalf.setScale(appleScale);
    
    // Crop top half - shows top portion, rotation matches slice angle
    topHalf.setCrop(0, 0, textureWidth, textureHeight / 2);
    topHalf.setOrigin(0.5, 1); // Origin at bottom (cut line)
    // topHalf.setRotation(sliceAngle);
    
    // Create bottom half
    const bottomHalf = this.add.image(appleX, appleY, "apple");
    bottomHalf.setScale(appleScale);
    
    // Crop shows bottom half, rotation matches slice angle
    bottomHalf.setCrop(0, textureHeight / 2, textureWidth, textureHeight / 2);
    bottomHalf.setOrigin(0.5, 0); // Origin at top (cut line)
    // bottomHalf.setRotation(sliceAngle);
    
    // Add physics to halves
    this.physics.add.existing(topHalf);
    this.physics.add.existing(bottomHalf);
    
    // Set bounce for realistic impact
    topHalf.body.setBounce(0.2);
    bottomHalf.body.setBounce(0.2);
    
    // Apply strong gravity to halves (stronger than world gravity)
    topHalf.body.setGravityY(this.physics.world.gravity.y * 1.5); // 1.5x stronger gravity
    bottomHalf.body.setGravityY(this.physics.world.gravity.y * 1.5);
    
    // Strong single stroke - pieces push outward perpendicular to the cut
    // The slice direction is the swipe direction, pieces push outward from that line
    const separationForce = 600; // Strong outward push from the cut
    const perpendicularAngle = sliceAngle + Math.PI / 2; // Perpendicular to slice direction
    
    // Top half: pushed outward in one direction (like knife pushed it up/out)
    const topVelX = Math.cos(perpendicularAngle) * separationForce;
    const topVelY = Math.sin(perpendicularAngle) * separationForce;
    
    // Bottom half: pushed outward in opposite direction (like knife pushed it down/out)
    const bottomVelX = -Math.cos(perpendicularAngle) * separationForce;
    const bottomVelY = -Math.sin(perpendicularAngle) * separationForce;
    
    topHalf.body.setVelocity(topVelX, topVelY);
    bottomHalf.body.setVelocity(bottomVelX, bottomVelY);
    
    // Natural rotation from the cutting force
    // Top half rotates based on which side of cut it's on
    const topRotation = Math.cos(perpendicularAngle) > 0 
      ? Phaser.Math.Between(50, 120)   // Rotate one way
      : Phaser.Math.Between(-120, -50); // Rotate other way
    
    // Bottom half rotates opposite
    const bottomRotation = -topRotation;
    
    topHalf.body.setAngularVelocity(topRotation);
    bottomHalf.body.setAngularVelocity(bottomRotation);
    
    // Hide original apple
    this.apple.setVisible(false);
    
    // Visual slice effect - flash/particles at slice point
    this.createSliceEffect(appleX, appleY, sliceAngle);
    
    // Create juice splatter marks on the background
    this.createJuiceSplatter(appleX, appleY, sliceAngle);
    
    // Less drag so gravity pulls them down faster
    topHalf.body.setDrag(30);
    bottomHalf.body.setDrag(30);
    
    // Add to halves group
    this.halves.add(topHalf);
    this.halves.add(bottomHalf);
    
    // Clean up after animation (longer for Fruit Ninja feel)
    this.time.delayedCall(5000, () => {
      if (topHalf && topHalf.active) {
        topHalf.destroy();
      }
      if (bottomHalf && bottomHalf.active) {
        bottomHalf.destroy();
      }
    });
  }
  
  createSliceEffect(x, y, angle) {
    // Create slice line effect
    const sliceLine = this.add.graphics();
    sliceLine.lineStyle(3, 0xffffff, 1);
    
    const lineLength = 100;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    sliceLine.lineBetween(
      x - cos * lineLength,
      y - sin * lineLength,
      x + cos * lineLength,
      y + sin * lineLength
    );
    
    // Fade out the line
    this.tweens.add({
      targets: sliceLine,
      alpha: 0,
      duration: 200,
      onComplete: () => sliceLine.destroy()
    });
    
    // Create particles/juice effect
    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(
        x + Phaser.Math.Between(-20, 20),
        y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(2, 4),
        0xff6b6b
      );
      
      const particleAngle = angle + Phaser.Math.Between(-Math.PI / 4, Math.PI / 4);
      const particleSpeed = Phaser.Math.Between(50, 150);
      
      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(particleAngle) * particleSpeed,
        y: particle.y + Math.sin(particleAngle) * particleSpeed,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(300, 500),
        onComplete: () => particle.destroy()
      });
    }
  }
  
  createJuiceSplatter(x, y, angle) {
    // Create organic juice splatter marks along the slice line
    // Dark red color like blood/juice on wood
    const juiceColor = 0x8B0000; // Dark red
    const juiceColorLight = 0xA52A2A; // Slightly lighter red
    
    const lineLength = 80;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Create multiple splatter marks along the slice line
    const numSplatters = Phaser.Math.Between(3, 6);
    
    for (let i = 0; i < numSplatters; i++) {
      // Position along the slice line
      const t = (i / (numSplatters - 1)) * 2 - 1; // -1 to 1
      const splatterX = x + cos * lineLength * t + Phaser.Math.Between(-15, 15);
      const splatterY = y + sin * lineLength * t + Phaser.Math.Between(-15, 15);
      
      // Create main splatter blob
      const splatter = this.add.graphics();
      splatter.fillStyle(juiceColor, 0.8);
      
      // Create organic blob shape
      const size = Phaser.Math.Between(8, 20);
      const points = Phaser.Math.Between(5, 8);
      
      // Draw irregular blob
      splatter.beginPath();
      for (let p = 0; p < points; p++) {
        const angle = (p / points) * Math.PI * 2;
        const radius = size + Phaser.Math.Between(-size * 0.3, size * 0.3);
        const px = splatterX + Math.cos(angle) * radius;
        const py = splatterY + Math.sin(angle) * radius;
        
        if (p === 0) {
          splatter.moveTo(px, py);
        } else {
          splatter.lineTo(px, py);
        }
      }
      splatter.closePath();
      splatter.fillPath();
      
      // Add smaller drips around the main blob
      const numDrips = Phaser.Math.Between(2, 4);
      for (let d = 0; d < numDrips; d++) {
        const dripAngle = Phaser.Math.Between(0, Math.PI * 2);
        const dripDistance = Phaser.Math.Between(size * 0.5, size * 1.5);
        const dripX = splatterX + Math.cos(dripAngle) * dripDistance;
        const dripY = splatterY + Math.sin(dripAngle) * dripDistance;
        const dripSize = Phaser.Math.Between(3, 8);
        
        splatter.fillStyle(juiceColorLight, 0.6);
        splatter.fillCircle(dripX, dripY, dripSize);
      }
      
      // Add some elongated drips (like blood running)
      const numRuns = Phaser.Math.Between(1, 3);
      for (let r = 0; r < numRuns; r++) {
        const runAngle = Phaser.Math.Between(0, Math.PI * 2);
        const runLength = Phaser.Math.Between(5, 15);
        const runX = splatterX + Math.cos(runAngle) * (size + 5);
        const runY = splatterY + Math.sin(runAngle) * (size + 5);
        
        splatter.fillStyle(juiceColor, 0.7);
        // Draw elongated drip as a series of connected circles
        for (let l = 0; l < runLength; l += 2) {
          const dripX = runX + Math.cos(runAngle) * l;
          const dripY = runY + Math.sin(runAngle) * l;
          const dripSize = Phaser.Math.Between(2, 4) * (1 - l / runLength);
          splatter.fillCircle(dripX, dripY, dripSize);
        }
      }
      
      // Set depth to appear on top of background but below fruits
      splatter.setDepth(1);
      
      // Add to splatters group (persistent)
      this.juiceSplatters.add(splatter);
    }
  }
  
  update() {
    // Clean up halves that go off screen
    this.halves.children.entries.forEach(half => {
      if (half && half.active) {
        const bounds = half.getBounds();
        if (bounds.y > this.cameras.main.height + 100 || 
            bounds.y < -100 ||
            bounds.x > this.cameras.main.width + 100 ||
            bounds.x < -100) {
          half.destroy();
        }
      }
    });
  }
}
