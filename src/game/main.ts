import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PlayScene } from "./scenes/PlayScene";
import { MenuScene } from "./scenes/MenuScene";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "./constants";

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
    scene: [BootScene, MenuScene, PlayScene],
};

export const startGame = (parent: string) => {
    return new Phaser.Game({ ...config, parent });
};
