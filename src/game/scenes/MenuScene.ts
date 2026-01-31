import Phaser from "phaser";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../constants";

export class MenuScene extends Phaser.Scene {
    constructor() {
        super("Menu");
    }

    create() {
        // Background
        const bg = this.add.tileSprite(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, "background").setOrigin(0);
        const bgTexture = this.textures.get("background");
        if (bgTexture && bgTexture.key !== "__MISSING") {
            const tex = bgTexture.getSourceImage();
            const scale = DESIGN_WIDTH / tex.width;
            bg.setTileScale(scale);
        }

        // Overlay for better readability
        this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.4).setOrigin(0);

        // Title
        this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.2, "PUF SPACE", {
            fontSize: "42px",
            fontFamily: '"Press Start 2P"',
            color: "#FFF825",
            stroke: "#000",
            strokeThickness: 8,
            align: "center"
        }).setOrigin(0.5);

        // Controls Section
        const controlsY = DESIGN_HEIGHT * 0.45;
        this.add.text(DESIGN_WIDTH / 2, controlsY - 40, "CONTROLS", {
            fontSize: "18px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff"
        }).setOrigin(0.5);

        // Movement
        this.add.text(DESIGN_WIDTH / 2, controlsY, "MOVE: ⬅️➡️⬆️⬇️", {
            fontSize: "14px",
            fontFamily: '"Press Start 2P"',
            color: "#10E0EF"
        }).setOrigin(0.5);

        // Fire
        this.add.text(DESIGN_WIDTH / 2, controlsY + 35, "FIRE: 'A' KEY", {
            fontSize: "14px",
            fontFamily: '"Press Start 2P"',
            color: "#10E0EF"
        }).setOrigin(0.5);

        // Pause
        this.add.text(DESIGN_WIDTH / 2, controlsY + 70, "PAUSE: ENTER", {
            fontSize: "14px",
            fontFamily: '"Press Start 2P"',
            color: "#10E0EF"
        }).setOrigin(0.5);

        // Mobile Controls Info
        this.add.text(DESIGN_WIDTH / 2, controlsY + 100, "MOBILE: JOYSTICK + FIRE BTN", {
            fontSize: "12px",
            fontFamily: '"Press Start 2P"',
            color: "#FFA500"
        }).setOrigin(0.5);

        // Stamina Info
        this.add.text(DESIGN_WIDTH / 2, controlsY + 130, "WATCH YOUR STAMINA!", {
            fontSize: "10px",
            fontFamily: '"Press Start 2P"',
            color: "#ff0000"
        }).setOrigin(0.5);

        // Start Button
        const startButtonY = DESIGN_HEIGHT * 0.75;
        const startBtn = this.add.container(DESIGN_WIDTH / 2, startButtonY);

        const btnBg = this.add.rectangle(0, 0, 200, 50, 0xFFF825)
            .setInteractive({ useHandCursor: true });

        const btnText = this.add.text(0, 0, "START", {
            fontSize: "24px",
            fontFamily: '"Press Start 2P"',
            color: "#000000"
        }).setOrigin(0.5);

        startBtn.add([btnBg, btnText]);

        // Hover effects
        btnBg.on("pointerover", () => {
            btnBg.setFillStyle(0xffffff);
            btnText.setColor("#000000");
            startBtn.setScale(1.1);
        });

        btnBg.on("pointerout", () => {
            btnBg.setFillStyle(0xFFF825);
            btnText.setColor("#000000");
            startBtn.setScale(1);
        });

        btnBg.on("pointerdown", () => {
            this.scene.start("Play");
        });

        // Keyboard support for START
        this.input.keyboard?.once("keydown-ENTER", () => {
            this.scene.start("Play");
        });

        // Simple animation
        this.tweens.add({
            targets: startBtn,
            y: startButtonY + 10,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }
}
