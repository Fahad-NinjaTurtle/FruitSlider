export class SliceTestScene extends Phaser.Scene {
  constructor() {
    super("SliceTestScene");
  }
  preload() {
    this.load.image("background", "./sprites/background.png");
  }
  
  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const bg = this.add.image(width / 2, height / 2, "background");
    bg.displayWidth = width;
    bg.displayHeight = height;
  }
}
