import { MainScene } from "./scenes/MainScene.js";
import { SliceTestScene } from "./scripts/SliceTestScene.js";

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth    ,
    height: window.innerHeight,
    backgroundColor: '#222',
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: MainScene
};

const game = new Phaser.Game(config);
