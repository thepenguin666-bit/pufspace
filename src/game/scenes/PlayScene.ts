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
    private isPaused: boolean = false;
    private pauseOverlay!: Phaser.GameObjects.Rectangle;
    private pauseText!: Phaser.GameObjects.Text;
    private enterKey!: Phaser.Input.Keyboard.Key;

    // Shooting & Score
    private projectiles!: Phaser.Physics.Arcade.Group;
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private fireKey!: Phaser.Input.Keyboard.Key;
    private lastFired: number = 0;
    private lastTrailSpawn: number = 0;
    private stamina: number = 50;
    private maxStamina: number = 50;
    private staminaBarFrame!: Phaser.GameObjects.Image;
    private staminaBarFill!: Phaser.GameObjects.Graphics;
    private boosts!: Phaser.Physics.Arcade.Group;
    private isBoostActive: boolean = false;
    private boostTimer: number = 0;
    private boostUIContainer!: Phaser.GameObjects.Container;
    private boostUIBarFill!: Phaser.GameObjects.Graphics;
    private maxBoostTime: number = 10000;

    // Triple Shot Power-up
    private tripleShots!: Phaser.Physics.Arcade.Group;
    private isTripleShotActive: boolean = false;
    private tripleShotTimer: number = 0;
    private tripleShotUIContainer!: Phaser.GameObjects.Container;
    private tripleShotUIBarFill!: Phaser.GameObjects.Graphics;
    private maxTripleShotTime: number = 15000;

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

        // Disable collision on vertical edges (top/bottom) so enemies can enter/exit
        this.physics.world.setBoundsCollision(true, true, false, false);

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
        this.bats = this.physics.add.group({
            bounceX: 0.5,
            bounceY: 0,
            collideWorldBounds: true
        });

        // Ghosts Group
        this.ghosts = this.physics.add.group({
            bounceX: 0.5,
            bounceY: 0,
            collideWorldBounds: false // Disable hard collision for soft turn
        });

        // Projectiles Group
        this.projectiles = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 30,
            runChildUpdate: false
        });

        // Boosts Group
        this.boosts = this.physics.add.group();

        // Triple Shots Group
        this.tripleShots = this.physics.add.group();

        // Input
        if (this.input.keyboard) {
            this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
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
                    // Straight down movement
                    bat.setVelocityY(Phaser.Math.Between(200, 400));
                    bat.setVelocityX(0);
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
            ghost.setData('health', 3);
            ghost.setData('speedY', Phaser.Math.Between(80, 150));
            ghost.setData('swaySpeed', Phaser.Math.Between(1, 3) * 0.001); // Lower frequency = wider turns
            ghost.setData('swayForce', Phaser.Math.Between(150, 250));     // Higher force = more horizontal distance
            ghost.setDepth(5);

            // Initial velocity
            ghost.setVelocityY(ghost.getData('speedY'));

            if (ghost.body) {
                (ghost.body as Phaser.Physics.Arcade.Body).setSize(ghost.width * 0.5, ghost.height * 0.6);
                // Allow them to slide/bounce horizontally but drag stops infinite sliding
                ghost.setDragX(30);
            }
            this.time.delayedCall(Phaser.Math.Between(2500, 5000), spawnGhost);
        };
        spawnGhost();

        // Spawn Boost every 15s
        this.time.addEvent({
            delay: 15000,
            loop: true,
            callback: () => {
                if (this.isGameOver) return;
                const x = Phaser.Math.Between(50, DESIGN_WIDTH - 50);
                const boost = this.boosts.create(x, -50, "boost") as Phaser.Physics.Arcade.Image;
                boost.setScale(0.3); // Increased from 0.15
                boost.setVelocityY(150);
                boost.setDepth(8);

                // Y-axis rotation effect using ScaleX tween
                this.tweens.add({
                    targets: boost,
                    scaleX: -0.3, // Re-adjusted scale for tween
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        });

        // Spawn Triple Shot every 25s
        this.time.addEvent({
            delay: 25000,
            loop: true,
            callback: () => {
                if (this.isGameOver) return;
                const x = Phaser.Math.Between(50, DESIGN_WIDTH - 50);
                const item = this.tripleShots.create(x, -50, "tripleshot") as Phaser.Physics.Arcade.Image;
                item.setScale(0.06);
                item.setVelocityY(150);
                item.setDepth(8);

                // Rotation effect (similar to boost)
                this.tweens.add({
                    targets: item,
                    scaleX: -0.06,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        });

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

        // UI: Stamina Bar
        const staminaScale = DESIGN_WIDTH / 5585;
        const staminaHeight = 293 * staminaScale;

        this.staminaBarFrame = this.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT - staminaHeight / 2, "stamina")
            .setScale(staminaScale)
            .setDepth(101);

        this.staminaBarFill = this.add.graphics().setDepth(102);

        // UI: Game Over
        this.gameOverText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 20, "GAME OVER", {
            fontSize: "32px",
            fontFamily: '"Press Start 2P"',
            color: "#ff0000",
            stroke: "#ffffff",
            strokeThickness: 4,
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

        // UI: Pause Overlay
        this.pauseOverlay = this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.6)
            .setOrigin(0)
            .setDepth(200)
            .setVisible(false);

        this.pauseText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, "PAUSED", {
            fontSize: "42px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(201).setVisible(false);

        // UI: Power-up Timer (Top Right)
        this.boostUIContainer = this.add.container(DESIGN_WIDTH - 120, 40).setDepth(150).setVisible(false);

        const uiIcon = this.add.image(-15, 0, "boost").setScale(0.1);
        const uiBarBG = this.add.rectangle(10, 0, 80, 10, 0x000000, 0.5).setOrigin(0, 0.5);
        this.boostUIBarFill = this.add.graphics();

        this.boostUIContainer.add([uiIcon, uiBarBG, this.boostUIBarFill]);

        // UI: Triple Shot Timer
        this.tripleShotUIContainer = this.add.container(DESIGN_WIDTH - 120, 80).setDepth(150).setVisible(false); // Default posY below boost
        const tsIcon = this.add.image(-15, 0, "tripleshot").setScale(0.033);
        const tsBarBG = this.add.rectangle(10, 0, 80, 10, 0x000000, 0.5).setOrigin(0, 0.5);
        this.tripleShotUIBarFill = this.add.graphics();
        this.tripleShotUIContainer.add([tsIcon, tsBarBG, this.tripleShotUIBarFill]);

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

        // Physics: Ship vs Boost
        this.physics.add.overlap(this.ship, this.boosts, (ship, boost) => {
            (boost as Phaser.Physics.Arcade.Image).destroy();
            this.activateBoost();
        });

        // Physics: Ship vs Triple Shot
        this.physics.add.overlap(this.ship, this.tripleShots, (ship, item) => {
            (item as Phaser.Physics.Arcade.Image).destroy();
            this.activateTripleShot();
        });

        // Physics: Enemy vs Enemy (Bats and Ghosts)
        this.physics.add.collider(this.bats, this.bats);
        this.physics.add.collider(this.ghosts, this.ghosts);
        this.physics.add.collider(this.bats, this.ghosts);

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

    activateBoost() {
        this.isBoostActive = true;
        this.boostTimer = this.maxBoostTime;
        this.ship.setTint(0xadff2f); // Yellowish-green (Lime) indicator
        this.boostUIContainer.setVisible(true);
    }

    activateTripleShot() {
        this.isTripleShotActive = true;
        this.tripleShotTimer = this.maxTripleShotTime;
        this.tripleShotUIContainer.setVisible(true);
    }

    update(time: number, dt: number) {
        // Toggle Pause
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            if (!this.isGameOver) {
                this.isPaused = !this.isPaused;
                if (this.isPaused) {
                    this.physics.pause();
                    this.pauseOverlay.setVisible(true);
                    this.pauseText.setVisible(true);
                } else {
                    this.physics.resume();
                    this.pauseOverlay.setVisible(false);
                    this.pauseText.setVisible(false);
                }
            }
        }

        if (this.isGameOver || this.isPaused) return;

        // Boost Timer
        if (this.isBoostActive) {
            this.boostTimer -= dt;

            // Update UI Bar
            this.boostUIBarFill.clear();
            const fillW = Math.max(0, (this.boostTimer / this.maxBoostTime) * 80);
            this.boostUIBarFill.fillStyle(0xadff2f, 1);
            this.boostUIBarFill.fillRect(10, -5, fillW, 10);

            if (this.boostTimer <= 0) {
                this.isBoostActive = false;
                this.ship.clearTint();
                this.boostUIContainer.setVisible(false);
            }
        }

        // Triple Shot Timer
        if (this.isTripleShotActive) {
            this.tripleShotTimer -= dt;

            // Update UI Bar
            this.tripleShotUIBarFill.clear();
            const fillW = Math.max(0, (this.tripleShotTimer / this.maxTripleShotTime) * 80);
            this.tripleShotUIBarFill.fillStyle(0x00ffff, 1); // Cyan for Triple Shot
            this.tripleShotUIBarFill.fillRect(10, -5, fillW, 10);

            // Stacking Logic: Move down if boost is active
            if (this.isBoostActive) {
                this.tripleShotUIContainer.setY(80); // Below Boost (40 + 40 gap)
            } else {
                this.tripleShotUIContainer.setY(40); // Take Boost's spot
            }

            if (this.tripleShotTimer <= 0) {
                this.isTripleShotActive = false;
                this.tripleShotUIContainer.setVisible(false);
            }
        }

        const deltaY = this.ship.y - this.lastShipY;
        this.lastShipY = this.ship.y;

        if (this.fireKey && this.fireKey.isDown) {
            if (time > this.lastFired && this.stamina >= 1) {
                const projectile = this.projectiles.create(this.ship.x, this.ship.y - this.ship.displayHeight / 2, 'projectile') as Phaser.Physics.Arcade.Image;
                if (projectile) {
                    projectile.setVelocityY(-900);
                    projectile.setScale(1.0);
                    if (projectile.body) {
                        (projectile.body as Phaser.Physics.Arcade.Body).setSize(projectile.width * 0.5, projectile.height * 0.8);
                    }
                    if (this.isBoostActive) {
                        projectile.setTint(0xadff2f);
                    }

                    // Triple Shot Logic
                    if (this.isTripleShotActive) {
                        // Left Projectile
                        const leftProj = this.projectiles.create(this.ship.x, this.ship.y - this.ship.displayHeight / 2, 'projectile') as Phaser.Physics.Arcade.Image;
                        if (leftProj) {
                            leftProj.setVelocity(-300, -900); // Angle left
                            leftProj.setRotation(-0.3);
                            if (this.isBoostActive) leftProj.setTint(0xadff2f);
                        }

                        // Right Projectile
                        const rightProj = this.projectiles.create(this.ship.x, this.ship.y - this.ship.displayHeight / 2, 'projectile') as Phaser.Physics.Arcade.Image;
                        if (rightProj) {
                            rightProj.setVelocity(300, -900); // Angle right
                            rightProj.setRotation(0.3);
                            if (this.isBoostActive) rightProj.setTint(0xadff2f);
                        }
                    }

                    const fireRate = this.isBoostActive ? 100 : 166.6;
                    this.lastFired = time + fireRate;
                    if (!this.isBoostActive) {
                        this.stamina = Math.max(0, this.stamina - 2);
                    }
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

        // Stamina Recovery: 5 units per second
        const staminaRecovery = (5 * dt) / 1000;
        if (this.isBoostActive) {
            this.stamina = this.maxStamina;
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + staminaRecovery);
        }

        // Draw Stamina Fill
        this.staminaBarFill.clear();
        const staminaScale = DESIGN_WIDTH / 5585;
        const fillMaxW = 5413 * staminaScale;
        const fillH = 217 * staminaScale;
        const fillX = (86 * staminaScale) + (DESIGN_WIDTH / 2 - (5585 * staminaScale) / 2); // Absolute X
        const fillY = (DESIGN_HEIGHT - 293 * staminaScale) + (38 * staminaScale);

        // Draw Background (Dark)
        this.staminaBarFill.fillStyle(0x000000, 0.5);
        this.staminaBarFill.fillRect(fillX, fillY, fillMaxW, fillH);

        const currentFillW = (this.stamina / this.maxStamina) * fillMaxW;

        if (currentFillW > 0) {
            this.staminaBarFill.fillStyle(0xFFF825, 1);
            this.staminaBarFill.fillRect(fillX, fillY, currentFillW, fillH);
        }

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
            if (child.active) {
                if (child.y > DESIGN_HEIGHT + 100) {
                    child.destroy();
                    continue;
                }

                if (child.body) {
                    // Enforce downward movement
                    if (child.body.velocity.y < 0) {
                        child.setVelocityY(Math.max(100, Math.abs(child.body.velocity.y)));
                    }
                    // Cap horizontal speed to prevent erratic bouncing
                    if (Math.abs(child.body.velocity.x) > 200) {
                        child.setVelocityX(200 * Math.sign(child.body.velocity.x));
                    }
                }
            }
        }

        const ghts = this.ghosts.getChildren();
        for (let i = ghts.length - 1; i >= 0; i--) {
            const child = ghts[i] as Phaser.Physics.Arcade.Sprite;
            if (child.active) {
                if (child.y > DESIGN_HEIGHT + 100) {
                    child.destroy();
                    continue;
                }

                // Acceleration-based movement (Natural Physics)
                const swaySpeed = child.getData('swaySpeed') || 0.003;
                const swayForce = child.getData('swayForce') || 50;

                // Set acceleration based on time (Swaying)
                const normalAccelX = Math.sin(time * swaySpeed) * swayForce;

                // Soft Boundary Logic
                const margin = 75;
                const turnForce = 450;

                if (child.x < margin) {
                    // Left Edge: Slow down if moving left, push right
                    if ((child.body?.velocity.x ?? 0) < 0) child.setDragX(300);
                    child.setAccelerationX(turnForce);
                } else if (child.x > DESIGN_WIDTH - margin) {
                    // Right Edge: Slow down if moving right, push left
                    if ((child.body?.velocity.x ?? 0) > 0) child.setDragX(300);
                    child.setAccelerationX(-turnForce);
                } else {
                    // Center: Normal sway
                    child.setDragX(30);
                    child.setAccelerationX(normalAccelX);
                }

                // Enforce downward movement safety net
                const maxSpeedY = child.getData('speedY') || 100;
                if (child.body) {
                    if (child.body.velocity.y < 50) { // If it slows down too much or goes up
                        child.setVelocityY(maxSpeedY);
                    }
                }

                // Rotation follows velocity
                const vx = child.body?.velocity.x || 0;
                const vy = child.body?.velocity.y || 100;
                const targetAngle = Math.atan2(vy, vx) - Math.PI / 2;

                // Smooth rotation
                const currentRot = child.rotation;
                const diff = Phaser.Math.Angle.Wrap(targetAngle - currentRot);
                child.rotation += diff * 0.1;
            }
        }

        // Boost Cleanup
        const bsts = this.boosts.getChildren();
        for (let i = bsts.length - 1; i >= 0; i--) {
            const child = bsts[i] as Phaser.Physics.Arcade.Image;
            if (child.active && child.y > DESIGN_HEIGHT + 50) child.destroy();
        }

        // Triple Shot Cleanup
        const tshots = this.tripleShots.getChildren();
        for (let i = tshots.length - 1; i >= 0; i--) {
            const child = tshots[i] as Phaser.Physics.Arcade.Image;
            if (child.active && child.y > DESIGN_HEIGHT + 50) child.destroy();
        }
    }
}
