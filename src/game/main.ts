import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PlayScene } from "./scenes/PlayScene";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "./constants";

// We'll create a simple MenuScene shell since we don't have the original code
class MenuScene extends Phaser.Scene {
    constructor() {
        super("Menu");
    }
    create() {
        this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, "MAIN MENU", { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
        this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 50, "Press SPACE to Start", { fontSize: "16px", color: "#fff" }).setOrigin(0.5);
        this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Play"));
    }
}

export const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false,
        },
    },
    parent: "game-container",
    backgroundColor: "#111",
    scene: [BootScene, PlayScene, MenuScene],
};

export const startGame = (parent: string) => {
    return new Phaser.Game({ ...config, parent });
};
