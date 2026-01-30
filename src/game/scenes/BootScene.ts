import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        this.load.image("background", "/1.png?v4=" + Date.now());
        this.load.image("ship", "/mark 1.svg?v=" + Date.now());
        this.load.spritesheet("bat", "/bat.png", {
            frameWidth: 317,
            frameHeight: 319
        });
        this.load.image("projectile", "/projectile.png?v=" + Date.now());
    }

    create() {
        // Simple rain particle asset creation (small white drop)
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 2, 12);
        graphics.generateTexture("rain", 2, 12);

        this.scene.start("Play");
    }
}
