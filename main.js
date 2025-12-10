import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 800,
    backgroundColor: '#222',
    scene: MainScene
}

const game = Phaser.config(config);