"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("../game/PhaserGame"), { ssr: false });

export default function Home() {
    return (
        <main>
            <PhaserGame />
        </main>
    );
}
