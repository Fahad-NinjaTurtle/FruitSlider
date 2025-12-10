
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
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const bg = this.add.image(width / 2, height / 2, "background");
    bg.displayWidth = width;
    bg.displayHeight = height;

    this.fruits = this.physics.add.group();

    this.time.addEvent({
      delay: 1200,
      callback: () => {
        const fruitType = ["waterMelon", "apple", "peach", "pear", "bomb"];
        const randomFruit = fruitType[Phaser.Math.Between(0, fruitType.length - 1)];
        const randomSpawnX = Phaser.Math.Between(0, width);
        this.spawnFruit(randomFruit, randomSpawnX, height, 0.3);
      },
      loop: true,
    })

    
  }

  update() {
    this.fruits.getChildren().forEach(fruit => {
      if (
        fruit &&
        fruit.active &&
        fruit.y > this.cameras.main.height
      ) {
        console.log("fruit destroyed ", fruit.name);
        fruit.destroy();
      }
    })
  }

  spawnFruit(
    gameObjectName,
    width,
    height,
    scale,
    randomXmin = -200,
    randomXmax = 200,
    randomYmin = -400,
    randomYmax = -700,
    andgularVelocityMin = -200,
    andgularVelocityMax = 200
  ) {
    const fruit = this.physics.add.sprite(
      width / 2,
      height - 100,
      gameObjectName
    );
    fruit.setScale(scale);
    this.fruits.add(fruit);

    const randomX = Phaser.Math.Between(randomXmin, randomXmax);
    const upwardVelocity = Phaser.Math.Between(randomYmin, randomYmax);

    fruit.setVelocity(randomX, upwardVelocity);

    fruit.setAngularVelocity(
      Phaser.Math.Between(andgularVelocityMin, andgularVelocityMax)
    );
  }
}
