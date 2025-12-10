import Phaser from "phaser";

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }
  create() {
    this.add.text(100, 100, "Hello to Phaser", {
      fontSize: "32px",
      color: "#ffffff",
    });
  }
}
