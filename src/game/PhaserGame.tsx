"use client";
import { useEffect, useRef } from "react";
import { startGame } from "./main";

export default function PhaserGame() {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (!gameRef.current) {
            gameRef.current = startGame("game-container");
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return (
        <div
            id="game-container"
            style={{
                width: "100%",
                height: "100dvh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#000"
            }}
        />
    );
}
