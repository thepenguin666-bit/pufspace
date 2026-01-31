import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        console.log("Phaser BootScene: Preload started");

        // Setup Loading UI
        const centerX = 180;
        const centerY = 320;
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(70, centerY - 25, 220, 50);

        const loadingText = this.add.text(centerX, centerY - 50, 'Loading...', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const percentText = this.add.text(centerX, centerY, '0%', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Listeners
        this.load.on('progress', (value: number) => {
            percentText.setText(Math.round(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(80, centerY - 15, 200 * value, 30);
        });

        this.load.on('complete', () => {
            console.log("Phaser BootScene: Preload complete");
        });

        this.load.on('loaderror', (file: any) => {
            console.error("Phaser load error in file:", file.src);
        });

        // Assets - Using static version to encourage caching
        const version = "1.0.3";
        this.load.image("background", "/1.png?v=" + version);
        this.load.image("ship", "/mark 1.svg?v=" + version);
        this.load.spritesheet("bat", "/bat.png?v=" + version, {
            frameWidth: 317,
            frameHeight: 319
        });
        this.load.spritesheet("ghost", "/ghost.png?v=" + version, {
            frameWidth: 317,
            frameHeight: 319
        });
        this.load.image("projectile", "/projectile.png?v=" + version);
        this.load.image("stamina", "/stamina.svg?v=" + version);
        this.load.image("boost", "/boost.png?v=" + version);
        this.load.image("tripleshot", "/3shot.svg?v=" + version);
        this.load.image("heal", "/heal.svg?v=" + version);
        this.load.image("boss", "/sam boss.png?v=" + version);
        this.load.image("debris", "/projectile.png?v=" + version); // Re-use projectile as debris
        this.load.image("boss-bg", "/6.png?v=" + version);
        this.load.image("boss-fg", "/7.png?v=" + version);
        this.load.image("vomitboss", "/vomitboss.png?v=" + version);
        this.load.audio("music", "/music..mp3.mp3");
    }

    create() {
        console.log("Phaser BootScene: Create started");

        // Bat Animation
        this.anims.create({
            key: 'bat-fly',
            frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 3 }),
            frameRate: 15,
            repeat: -1,
            yoyo: true
        });

        // Ghost Animation
        this.anims.create({
            key: 'ghost-fly',
            frames: this.anims.generateFrameNumbers('ghost', { start: 0, end: 3 }),
            frameRate: 12,
            repeat: -1,
            yoyo: true
        });

        // Simple rain particle asset creation
        const graphics = this.add.graphics().setVisible(false);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 2, 12);
        graphics.generateTexture("rain", 2, 12);

        graphics.clear();
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(0, 0, 8, 8);
        graphics.generateTexture("debris", 8, 8);

        graphics.destroy(); // Clean up graphics object

        this.scene.start("Menu");
    }
}
