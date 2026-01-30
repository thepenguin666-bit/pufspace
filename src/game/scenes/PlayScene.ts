import Phaser from "phaser";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../constants";

export class PlayScene extends Phaser.Scene {
    private bg!: Phaser.GameObjects.TileSprite;
    private bgHighlight!: Phaser.GameObjects.TileSprite;
    private ship!: Phaser.Physics.Arcade.Image;
    private lastShipY!: number;

    private bats!: Phaser.Physics.Arcade.Group;
    private ghosts!: Phaser.Physics.Arcade.Group;
    private health!: number;
    private healthText!: Phaser.GameObjects.Text;
    private gameOverText!: Phaser.GameObjects.Text;
    private restartButton!: Phaser.GameObjects.Text;
    private isGameOver: boolean = false;

    // Shooting & Score
    private projectiles!: Phaser.Physics.Arcade.Group;
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private fireKey!: Phaser.Input.Keyboard.Key;
    private lastFired: number = 0;
    private lastTrailSpawn: number = 0;

    constructor() {
        super("Play");
    }

    create() {
        // Reset state
        this.health = 3;
        this.score = 0;
        this.isGameOver = false;
        this.lastFired = 0;

        this.bg = this.add
            .tileSprite(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, "background")
            .setOrigin(0);

        // Highlight layer for "Cloud Flash" (same texture, ADD blend)
        this.bgHighlight = this.add
            .tileSprite(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, "background")
            .setOrigin(0)
            .setAlpha(0)
            .setDepth(0.5) // Just above BG
            .setBlendMode(Phaser.BlendModes.ADD);

        // Scale texture to fit width
        const bgTexture = this.textures.get("background");
        if (bgTexture && bgTexture.key !== "__MISSING") {
            const tex = bgTexture.getSourceImage();
            const scale = DESIGN_WIDTH / tex.width;
            this.bg.setTileScale(scale);
            this.bgHighlight.setTileScale(scale);
        }

        // Lightning Flash Effect (Full Screen)
        const flash = this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0xffffff)
            .setOrigin(0)
            .setAlpha(0)
            .setDepth(10) // Cover everything
            .setBlendMode(Phaser.BlendModes.ADD);

        // Flash sequence every 10 seconds
        this.time.addEvent({
            delay: 10000,
            loop: true,
            callback: () => {
                // Phase 1: Illuminate Clouds (0.5s duration)
                this.tweens.add({
                    targets: this.bgHighlight,
                    alpha: { from: 0, to: 0.8 },
                    duration: 50,
                    yoyo: true,
                    hold: 300,
                    onComplete: () => {
                        // Phase 2: Full Screen Flash (0.2s duration, lower opacity)
                        this.tweens.add({
                            targets: flash,
                            alpha: { from: 0, to: 0.5 },
                            duration: 50,
                            onComplete: () => {
                                this.tweens.add({
                                    targets: flash,
                                    alpha: 0,
                                    duration: 150
                                });
                            }
                        });
                    }
                });
            }
        });

        // Rain particles
        const particles = this.add.particles(0, 0, "rain", {
            x: { min: -100, max: DESIGN_WIDTH + 300 },
            y: { min: -100, max: -50 },
            lifespan: 2200,
            speedX: -300,
            speedY: 700,
            angle: 335,
            alpha: { start: 0.25, end: 0, ease: 'Quad.In' },
            scale: { min: 0.375, max: 0.6 },
            quantity: 12,
            frequency: 15,
            blendMode: 'ADD',
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-100, -50, DESIGN_WIDTH + 400, 50) as any
            }
        });

        this.ship = this.physics.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.7, "ship");
        const targetWidth = 120;
        if (this.ship.width > 0) {
            this.ship.setScale(targetWidth / this.ship.width);
        } else {
            this.ship.setScale(0.1);
        }

        this.ship.setCollideWorldBounds(true);
        if (this.ship.body) {
            (this.ship.body as Phaser.Physics.Arcade.Body).setSize(this.ship.width * 0.4, this.ship.height * 0.4);
        }

        this.lastShipY = this.ship.y;

        // Bats Group
        this.bats = this.physics.add.group();

        // Ghosts Group
        this.ghosts = this.physics.add.group();

        // Projectiles Group
        this.projectiles = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 30,
            runChildUpdate: false
        });

        // Input
        if (this.input.keyboard) {
            this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        }

        // Spawn Swarm
        const spawnWave = () => {
            if (this.isGameOver) return;
            const count = Phaser.Math.Between(2, 5);
            const spawnedX: number[] = [];
            const minGap = 80;

            for (let i = 0; i < count; i++) {
                let x = 0;
                let valid = false;
                let attempts = 0;
                while (!valid && attempts < 10) {
                    x = Phaser.Math.Between(40, DESIGN_WIDTH - 40);
                    valid = true;
                    for (const existingX of spawnedX) {
                        if (Math.abs(x - existingX) < minGap) {
                            valid = false;
                            break;
                        }
                    }
                    attempts++;
                }

                if (valid) {
                    spawnedX.push(x);
                    const y = Phaser.Math.Between(-250, -50);
                    const bat = this.bats.create(x, y, 'bat') as Phaser.Physics.Arcade.Sprite;
                    bat.play('bat-fly');
                    bat.setScale(0.2);
                    bat.setAngle(180);
                    bat.setData('health', 2);
                    bat.setVelocityY(Phaser.Math.Between(200, 400));
                    if (bat.body) {
                        (bat.body as Phaser.Physics.Arcade.Body).setSize(bat.width * 0.6, bat.height * 0.6);
                    }
                }
            }
            this.time.delayedCall(Phaser.Math.Between(1500, 3000), spawnWave);
        };
        spawnWave();

        // Spawn Ghost
        const spawnGhost = () => {
            if (this.isGameOver) return;
            const x = Phaser.Math.Between(50, DESIGN_WIDTH - 50);
            const y = Phaser.Math.Between(-150, -50);
            const ghost = this.ghosts.create(x, y, 'ghost') as Phaser.Physics.Arcade.Sprite;
            ghost.play('ghost-fly');
            ghost.setScale(0.4);
            ghost.setData('health', 3); // Updated to 3 HP
            ghost.setData('centerX', x);
            ghost.setData('phase', Math.random() * Math.PI * 2);
            ghost.setData('amplitude', Phaser.Math.Between(50, 100)); // Slightly wider curves
            ghost.setData('frequency', Phaser.Math.Between(1.5, 2.5) / 1000); // Slower frequency for grace
            ghost.setData('speedY', Phaser.Math.Between(80, 150)); // More stable vertical speed
            ghost.setData('currentRotation', Math.PI); // Initial orientation
            ghost.setDepth(5);

            if (ghost.body) {
                (ghost.body as Phaser.Physics.Arcade.Body).setSize(ghost.width * 0.5, ghost.height * 0.6);
            }
            this.time.delayedCall(Phaser.Math.Between(2500, 5000), spawnGhost);
        };
        spawnGhost();

        // UI: Health
        this.healthText = this.add.text(20, 20, "HP: 3", {
            fontSize: "32px",
            fontFamily: '"Press Start 2P"',
            color: "#ff0000",
            stroke: "#000000",
            strokeThickness: 4
        }).setDepth(100);

        // UI: Score
        this.scoreText = this.add.text(20, 60, "SCORE: 0", {
            fontSize: "20px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 3
        }).setDepth(100);

        // UI: Game Over
        this.gameOverText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 20, "GAME OVER", {
            fontSize: "48px",
            fontFamily: '"Press Start 2P"',
            color: "#ff0000",
            stroke: "#ffffff",
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100).setVisible(false);

        // UI: Restart
        this.restartButton = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 50, "RESTART", {
            fontSize: "24px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 10, y: 5 },
            align: 'center'
        })
            .setOrigin(0.5).setDepth(100).setVisible(false)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.restart());

        // Physics: Ship vs Bats/Ghosts
        this.physics.add.overlap(this.ship, this.bats, (obj1, obj2) => {
            this.handlePlayerHit(obj2 as Phaser.Physics.Arcade.Sprite);
        });
        this.physics.add.overlap(this.ship, this.ghosts, (obj1, obj2) => {
            this.handlePlayerHit(obj2 as Phaser.Physics.Arcade.Sprite);
        });

        // Physics: Projectiles vs Bats/Ghosts
        this.physics.add.overlap(this.projectiles, this.bats, (proj, bat) => {
            this.handleProjectileHitBat(proj as Phaser.Physics.Arcade.Image, bat as Phaser.Physics.Arcade.Sprite);
        });
        this.physics.add.overlap(this.projectiles, this.ghosts, (proj, ghost) => {
            this.handleProjectileHitBat(proj as Phaser.Physics.Arcade.Image, ghost as Phaser.Physics.Arcade.Sprite);
        });

        const layout = () => {
            this.bg.setSize(DESIGN_WIDTH, DESIGN_HEIGHT);
            this.bgHighlight.setSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        };
        layout();
        this.input.keyboard?.on("keydown-ESC", () => this.scene.start("Menu"));
    }

    handlePlayerHit(bat: Phaser.Physics.Arcade.Sprite) {
        if (this.isGameOver) return;
        this.createExplosion(bat.x, bat.y);
        bat.destroy();
        this.health--;
        this.healthText.setText("HP: " + this.health);
        this.cameras.main.shake(100, 0.01);
        if (this.health <= 0) this.triggerGameOver();
    }

    handleProjectileHitBat(projectile: Phaser.Physics.Arcade.Image, bat: Phaser.Physics.Arcade.Sprite) {
        if (!projectile.active || !bat.active) return;
        projectile.destroy();
        const currentHealth = bat.getData('health') || 1;
        const newHealth = currentHealth - 1;
        bat.setData('health', newHealth);
        bat.setTint(0xff0000);
        this.time.delayedCall(100, () => { if (bat.active) bat.clearTint(); });
        if (newHealth <= 0) {
            this.createExplosion(bat.x, bat.y);
            bat.destroy();
            this.score += 200;
            this.scoreText.setText("SCORE: " + this.score);
        }
    }

    createExplosion(x: number, y: number) {
        const emitter = this.add.particles(x, y, 'debris', {
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 300,
            quantity: 15,
            stopAfter: 15,
            emitting: true
        });
        emitter.setDepth(20);
        // Auto-destroy emitter after duration
        this.time.delayedCall(400, () => emitter.destroy());
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.physics.pause();
        this.ship.setTint(0xff0000);
        this.gameOverText.setVisible(true);
        this.restartButton.setVisible(true);
    }

    update(time: number, dt: number) {
        if (this.isGameOver) return;
        const deltaY = this.ship.y - this.lastShipY;
        this.lastShipY = this.ship.y;

        if (this.fireKey && this.fireKey.isDown) {
            if (time > this.lastFired) {
                const projectile = this.projectiles.create(this.ship.x, this.ship.y - this.ship.displayHeight / 2, 'projectile') as Phaser.Physics.Arcade.Image;
                if (projectile) {
                    projectile.setVelocityY(-900);
                    projectile.setScale(1.0);
                    if (projectile.body) {
                        (projectile.body as Phaser.Physics.Arcade.Body).setSize(projectile.width * 0.5, projectile.height * 0.8);
                    }
                    this.lastFired = time + 166.6;
                }
            }
        }

        const projs = this.projectiles.getChildren();
        for (let i = projs.length - 1; i >= 0; i--) {
            const child = projs[i] as Phaser.Physics.Arcade.Image;
            if (child.active && child.y < -50) child.destroy();
        }

        const baseSpeed = 1.35 * dt;
        this.bg.tilePositionY += deltaY - baseSpeed;
        this.bgHighlight.tilePositionY = this.bg.tilePositionY;

        const cursors = this.input.keyboard?.createCursorKeys();
        if (cursors) {
            const body = this.ship.body as Phaser.Physics.Arcade.Body;
            const speed = 420;
            const vel = new Phaser.Math.Vector2(0, 0);

            if (cursors.left.isDown) vel.x = -speed;
            else if (cursors.right.isDown) vel.x = speed;

            if (cursors.up.isDown) vel.y = -speed;
            else if (cursors.down.isDown) vel.y = speed;

            if (vel.length() > 0) {
                vel.normalize().scale(speed);

                // Wind/Trail Effect
                if (time > this.lastTrailSpawn + 20) { // Slightly more frequent
                    const trail = this.add.image(this.ship.x, this.ship.y, "ship")
                        .setScale(this.ship.scaleX, this.ship.scaleY)
                        .setAlpha(0.24)
                        .setDepth(9); // Ensure it's above BG (0) and highlight (0.5)

                    // Stretch in opposite direction of movement
                    const targetX = this.ship.x - vel.x * 0.1;
                    const targetY = this.ship.y - vel.y * 0.1;
                    const targetScaleX = vel.x !== 0 ? this.ship.scaleX * 1.5 : this.ship.scaleX;
                    const targetScaleY = vel.y !== 0 ? this.ship.scaleY * 1.5 : this.ship.scaleY;

                    this.tweens.add({
                        targets: trail,
                        alpha: 0,
                        x: targetX,
                        y: targetY,
                        scaleX: targetScaleX,
                        scaleY: targetScaleY,
                        duration: 200,
                        onComplete: () => trail.destroy()
                    });
                    this.lastTrailSpawn = time;
                }
            }
            body.setVelocity(vel.x, vel.y);
            this.ship.setDepth(10); // Ensure ship is always on top of trails
        }
        this.ship.setRotation(0);

        const bts = this.bats.getChildren();
        for (let i = bts.length - 1; i >= 0; i--) {
            const child = bts[i] as Phaser.Physics.Arcade.Sprite;
            if (child.active && child.y > DESIGN_HEIGHT + 100) child.destroy();
        }

        const ghts = this.ghosts.getChildren();
        for (let i = ghts.length - 1; i >= 0; i--) {
            const child = ghts[i] as Phaser.Physics.Arcade.Sprite;
            if (child.active) {
                if (child.y > DESIGN_HEIGHT + 100) {
                    child.destroy();
                    continue;
                }

                // Sinusoidal Movement
                const centerX = child.getData('centerX');
                const phase = child.getData('phase');
                const amplitude = child.getData('amplitude');
                const frequency = child.getData('frequency');
                const speedY = child.getData('speedY');
                let currentRot = child.getData('currentRotation');

                const newPhase = phase + frequency * dt;
                child.setData('phase', newPhase);

                const nextX = centerX + Math.sin(newPhase) * amplitude;
                const nextY = child.y + (speedY * dt) / 1000;

                // Calculate target rotation to face movement
                const dx = nextX - child.x;
                const dy = nextY - child.y;
                const targetAngle = Math.atan2(dy, dx) - Math.PI / 2;

                // Ease the rotation for a smooth "drift" feel
                const diff = Phaser.Math.Angle.Wrap(targetAngle - currentRot);
                const lerpFactor = 0.05 * (dt / 16.6);
                currentRot += diff * lerpFactor;

                child.setRotation(currentRot);
                child.setData('currentRotation', currentRot);

                child.setPosition(nextX, nextY);
            }
        }
    }
}
