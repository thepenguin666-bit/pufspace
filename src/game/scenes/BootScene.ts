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

        // Assets
        this.load.image("background", "/1.png?v5=" + Date.now());
        this.load.image("ship", "/mark 1.svg?v2=" + Date.now());
        this.load.spritesheet("bat", "/bat.png", {
            frameWidth: 317,
            frameHeight: 319
        });
        this.load.image("projectile", "/projectile.png?v2=" + Date.now());
    }

    create() {
        console.log("Phaser BootScene: Create started");

        // Simple rain particle asset creation
        const graphics = this.add.graphics().setVisible(false);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 2, 12);
        graphics.generateTexture("rain", 2, 12);
        graphics.destroy(); // Clean up graphics object

        this.scene.start("Play");
    }
}
