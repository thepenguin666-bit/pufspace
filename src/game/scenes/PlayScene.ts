import * as Phaser from "phaser";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../constants";
import { PurpleWavePipeline } from "../pipelines/PurpleWavePipeline";

export class PlayScene extends Phaser.Scene {
    private bg!: Phaser.GameObjects.TileSprite;
    private bgHighlight!: Phaser.GameObjects.TileSprite;
    private ship!: Phaser.Physics.Arcade.Image;
    private lastShipY!: number;

    private bats!: Phaser.Physics.Arcade.Group;
    private ghosts!: Phaser.Physics.Arcade.Group;
    private health!: number;

    // private healthText!: Phaser.GameObjects.Text; // Removed
    private hpBarFrame!: Phaser.GameObjects.Image;
    private hpBarFill!: Phaser.GameObjects.Graphics;
    private maxHealth: number = 5;

    private gameOverText!: Phaser.GameObjects.Text;
    private restartButton!: Phaser.GameObjects.Text;
    private isGameOver: boolean = false;
    private isTipActive: boolean = false;
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

    // Heal Power-up
    private heals!: Phaser.Physics.Arcade.Group;

    // Shield Power-up
    private shields!: Phaser.Physics.Arcade.Group;
    private isShieldActive: boolean = false;
    private shieldTimerEvent?: Phaser.Time.TimerEvent;
    private shieldEffect?: Phaser.GameObjects.Image; // Visual effect
    private shieldUIContainer!: Phaser.GameObjects.Container;
    private shieldUIBarFill!: Phaser.GameObjects.Graphics;
    private shieldTimer: number = 0;
    private maxShieldTime: number = 7000;
    // Cryptonic Sam Boss
    private boss!: Phaser.Physics.Arcade.Image;
    private bossHealth: number = 250;
    private bossMaxHealth: number = 250;
    private bossGroup!: Phaser.Physics.Arcade.Group;
    private bossState: "HIDDEN" | "ENTERING" | "FIGHTING" = "HIDDEN";
    private isBossEnraged: boolean = false;
    private bossBG!: Phaser.GameObjects.Image;
    private bossFG!: Phaser.GameObjects.Image;
    private bossLasers!: Phaser.Physics.Arcade.Group;
    private bossNameText!: Phaser.GameObjects.Text;

    // Dragon Enemy
    private dragons!: Phaser.Physics.Arcade.Group;
    private dragonLasers!: Phaser.Physics.Arcade.Group;
    private lastDragonSpawn: number = 0;
    private bossHealthBarBG!: Phaser.GameObjects.Rectangle;
    private bossHealthBarFill!: Phaser.GameObjects.Rectangle;
    private batVomitEvent?: Phaser.Time.TimerEvent;
    private bossFightStartTime: number = 0;
    private lastPipeAttackTime: number = 0;
    private lastLaserTime: number = 0;
    private lastBatTime: number = 0;
    private laserCooldown: number = 2000;
    private batCooldown: number = 4000;
    private pipeCooldown: number = 2500; // Faster rockets (was 5000)

    // Mobile Controls
    private joyBase!: Phaser.GameObjects.Arc;
    private joyThumb!: Phaser.GameObjects.Arc;
    private joyCursor: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
    private isMobileFiring: boolean = false;
    private fireBtn!: Phaser.GameObjects.Arc;
    private mobilePauseBtn!: Phaser.GameObjects.Text;
    private pauseRestartBtn!: Phaser.GameObjects.Text;

    // Audio
    private bgMusic!: Phaser.Sound.BaseSound;
    private bgMusic2!: Phaser.Sound.BaseSound;
    private shootSound!: Phaser.Sound.BaseSound;
    private bossEntrySound!: Phaser.Sound.BaseSound;
    private musicBtn!: Phaser.GameObjects.Text;
    private isGodMode: boolean = false; // Cheat Flag
    private isMusicPlaying: boolean = false;
    private bossScaleFactor: number = 1;

    // Background Transition
    private bossSpawnTimer?: Phaser.Time.TimerEvent;
    private bossDefeated: boolean = false;
    private bg2!: Phaser.GameObjects.TileSprite;
    private transitionBg!: Phaser.GameObjects.Image; // Kept for type safety though unused now
    private isTransitioning: boolean = false;
    private transitionPending: boolean = false;
    private isBg2Active: boolean = false;
    private lightningTimer!: Phaser.Time.TimerEvent;
    private rainParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

    startLevelTransition() {
        if (this.isTransitioning || this.transitionPending || this.isBg2Active) return;
        this.transitionPending = true;

        // 1. Stop Effects Immediately
        if (this.lightningTimer) this.lightningTimer.remove();
        if (this.bgHighlight) this.bgHighlight.setAlpha(0);
        if (this.rainParticles) this.rainParticles.stop();
    }

    private startSeamTransition() {
        this.isTransitioning = true;
        this.transitionPending = false;

        // 1. Init Second Background (bg2)
        const bg2t = this.textures.get("bg2");
        if (!bg2t || bg2t.key === "__MISSING") {
            // Fallback
            this.isTransitioning = false;
            this.isBg2Active = true;
            return;
        }

        const bg2w = bg2t.getSourceImage().width;
        const scale = DESIGN_WIDTH / bg2w;
        const bg2s = DESIGN_WIDTH / bg2w; // tile scale

        this.bg2 = this.add.tileSprite(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, "bg2")
            .setOrigin(0)
            .setTileScale(bg2s)
            .setDepth(-9) // Above bg (-10)
            .setAlpha(0); // Start invisible

        // 2. Crossfade: Fade OUT bg, Fade IN bg2
        this.tweens.add({
            targets: this.bg2,
            alpha: 1,
            duration: 2000,
            ease: 'Linear'
        });

        this.tweens.add({
            targets: this.bg,
            alpha: 0,
            duration: 2000,
            ease: 'Linear',
            onComplete: () => {
                // Transition Complete
                this.isTransitioning = false;
                this.isBg2Active = true;
                if (this.bg) this.bg.setVisible(false);
            }
        });

        // 3. Music Crossfade: Fade OUT bgMusic, Fade IN bgMusic2
        if (this.isMusicPlaying && this.bgMusic && this.bgMusic2) {
            // Resume bgMusic2 (was pre-unlocked and paused in create())
            if (this.bgMusic2.isPaused) {
                this.bgMusic2.resume();
            } else if (!this.bgMusic2.isPlaying) {
                this.bgMusic2.play();
            }
            (this.bgMusic2 as Phaser.Sound.WebAudioSound).setVolume(0);

            // Fade out first track
            this.tweens.add({
                targets: this.bgMusic,
                volume: 0,
                duration: 2000,
                ease: 'Linear',
                onComplete: () => {
                    if (this.bgMusic) this.bgMusic.stop();
                }
            });

            // Fade in second track
            this.tweens.add({
                targets: this.bgMusic2,
                volume: 0.3,
                duration: 2000,
                ease: 'Linear'
            });
        }

        /* Removed old logic: */




        // const bg2w
        // const bg2s
        // const bg2h

        /* DEAD BLOCK */

        // Note: For bg2 we use TileSprite usually centered or tiled. 
        // We set it as a strip here. DESIGN_HEIGHT matches screen. 
        // We want it to be "physically" there.
        // We actully want bg2 to be just a Texture for the transition? 
        // No, TileSprite is fine, just set y correctly. 
        // Actually, if we want it to Scroll later, TileSprite is best.
        // Position: 
        // 1to2 Top is at: -h * scale
        // bg2 Bottom should be at: 1to2 Top.
        // bg2 is DESIGN_HEIGHT tall (screen size).
        // So bg2 Top = (1to2.y) - bg2.height.
        /* DEAD LINE */
    }

    private isInvulnerable: boolean = false;

    constructor() {
        super("Play");
    }

    create(data?: { startAtLevel2?: boolean }) {
        // Reset state
        this.health = this.maxHealth;

        this.score = 0;
        this.isGameOver = false;
        this.lastFired = 0;
        this.bossState = "HIDDEN";
        this.isBossEnraged = false;
        // Correctly reset boss defeat state for full restart
        this.bossDefeated = false;
        this.bossSpawnTimer = undefined;
        this.bossDefeated = false;
        // Dragon Reset
        this.lastDragonSpawn = 0;
        // Groups will be re-created below, just ensure references don't block logic if checked early
        this.dragons = undefined as any;
        this.dragonLasers = undefined as any;

        // Full Reset for Restart
        this.isPaused = false;
        this.stamina = this.maxStamina;
        this.isBoostActive = false;
        this.isTripleShotActive = false;
        this.boostTimer = 0;
        this.tripleShotTimer = 0;

        // Reset Transition State
        this.isInvulnerable = false;
        this.isTransitioning = false;
        this.transitionPending = false;

        // CHECKPOINT LOGIC
        const startAtLevel2 = data?.startAtLevel2 || false;
        this.isBg2Active = startAtLevel2;

        // Reset BG references
        this.bg = undefined as any;
        this.bg2 = undefined as any;
        this.transitionBg = undefined as any;

        if (this.transitionBg) this.transitionBg.destroy();
        if (this.lightningTimer) this.lightningTimer.remove();

        if (this.ship) {
            this.ship.clearTint();
            this.ship.setAlpha(1);
        }
        if (this.batVomitEvent) {
            this.batVomitEvent.remove(false);
            this.batVomitEvent = undefined;
        }

        // Initialize BG1 (Always created fresh)
        this.bg = this.add
            .tileSprite(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, "background")
            .setOrigin(0)
            .setDepth(-10);
        this.bg.setVisible(!startAtLevel2);

        // Initialize BG2 if starting there
        if (startAtLevel2) {
            const bg2t = this.textures.get("bg2");
            if (bg2t && bg2t.key !== "__MISSING") {
                const bg2w = bg2t.getSourceImage().width;
                const bg2s = DESIGN_WIDTH / bg2w;
                this.bg2 = this.add.tileSprite(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, "bg2")
                    .setOrigin(0)
                    .setTileScale(bg2s)
                    .setDepth(-9)
                    .setAlpha(1); // Visible immediately
            }
        }

        // Disable collision on vertical edges (top/bottom) so enemies can enter/exit
        this.physics.world.setBoundsCollision(true, true, false, false);

        // Highlight layer for "Cloud Flash" (same texture, ADD blend)
        this.bgHighlight = this.add
            .tileSprite(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, "background")
            .setOrigin(0)
            .setAlpha(0)
            .setDepth(-5) // Just above BG
            .setBlendMode(Phaser.BlendModes.ADD);

        // Scale texture to fit width
        const bgTexture = this.textures.get("background");
        if (bgTexture && bgTexture.key !== "__MISSING") {
            const tex = bgTexture.getSourceImage();
            const scale = DESIGN_WIDTH / tex.width;
            if (this.bg) this.bg.setTileScale(scale);
            if (this.bgHighlight) this.bgHighlight.setTileScale(scale);
        }

        // Lightning Flash Effect (Full Screen)
        const flash = this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0xffffff)
            .setOrigin(0)
            .setAlpha(0)
            .setDepth(10) // Cover everything
            .setBlendMode(Phaser.BlendModes.ADD);

        // Flash sequence every 10 seconds (Only in Level 1)
        if (!startAtLevel2) {
            this.lightningTimer = this.time.addEvent({
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
        }

        // Rain particles (Only in Level 1)
        if (!startAtLevel2) {
            this.rainParticles = this.add.particles(0, 0, "rain", {
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
            }).setDepth(11);
        }

        this.ship = this.physics.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.7, "ship");
        // Robust Scaling Logic
        const targetWidth = 60;
        // Default to a reasonable size if texture isn't ready (512 is the assumed SVG size)
        const textureWidth = this.ship.width > 0 ? this.ship.width : 512;

        if (textureWidth > 0) {
            this.ship.setScale(targetWidth / textureWidth);
        } else {
            // Absolute fallback
            this.ship.setScale(0.2);
        }

        this.ship.setCollideWorldBounds(true);
        this.ship.setDepth(1000);
        if (this.ship.body) {
            (this.ship.body as Phaser.Physics.Arcade.Body).setSize(this.ship.width * 0.8, this.ship.height * 0.8);
        }

        this.lastShipY = this.ship.y;

        // Bats Group
        this.bats = this.physics.add.group({
            bounceX: 0.5,
            bounceY: 0,
            collideWorldBounds: true
        });
        this.bats.setDepth(10);

        // Ghosts Group
        this.ghosts = this.physics.add.group({
            bounceX: 0.5,
            bounceY: 0,
            collideWorldBounds: false // Disable hard collision for soft turn
        });
        this.ghosts.setDepth(10);

        // Projectiles Group
        this.projectiles = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 30,
            runChildUpdate: false
        });
        this.projectiles.setDepth(15);

        // Boosts Group
        this.boosts = this.physics.add.group();

        // Triple Shots Group
        this.tripleShots = this.physics.add.group();

        // Heals Group
        this.heals = this.physics.add.group();

        // Shields Group
        this.shields = this.physics.add.group();

        // Boss Group (For reliable collision)
        this.bossGroup = this.physics.add.group();

        // Boss Lasers Group
        this.bossLasers = this.physics.add.group();

        // Dragon Groups
        this.dragons = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            maxSize: 10,
            runChildUpdate: true
        });
        this.dragonLasers = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 50
        });

        // Input
        if (this.input.keyboard) {
            this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        }

        const spawnWave = () => {
            if (this.isGameOver || this.bossState !== "HIDDEN" || this.isBg2Active) return;
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
                    bat.setDepth(10);
                }
            }
            this.time.delayedCall(Phaser.Math.Between(1500, 3000), spawnWave);
        };
        spawnWave();

        const spawnGhost = () => {
            if (this.isGameOver || this.bossState !== "HIDDEN" || this.isBg2Active) return;
            const x = Phaser.Math.Between(50, DESIGN_WIDTH - 50);
            const y = Phaser.Math.Between(-150, -50);
            const ghost = this.ghosts.create(x, y, 'ghost') as Phaser.Physics.Arcade.Sprite;
            ghost.play('ghost-fly');
            ghost.setScale(0.4);
            ghost.setData('health', 3);
            ghost.setData('speedY', Phaser.Math.Between(80, 150));
            ghost.setData('swaySpeed', Phaser.Math.Between(1, 3) * 0.001); // Lower frequency = wider turns
            ghost.setData('swayForce', Phaser.Math.Between(150, 250));     // Higher force = more horizontal distance
            ghost.setDepth(10);

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

        // Dragon Animation
        this.anims.create({
            key: 'dragon-fly',
            frames: this.anims.generateFrameNumbers('dragon', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1,
            yoyo: true
        });

        // Spawn Dragon Logic (Polled in update, but we can set a timer too or use update)
        // I'll add it to update loop or a repeating timer that checks bg2 status
        this.time.addEvent({
            delay: 2000,
            loop: true,
            callback: () => {
                if (this.isBg2Active && !this.isGameOver && !this.bossState.startsWith("FIGHT")) {
                    this.spawnDragon();
                }
            }
        });

        // Spawn Power-ups (Dynamic Scaling)
        this.scheduleNextBoost();
        this.scheduleNextTripleShot();
        this.scheduleNextHeal();

        // Trigger Boss Battle (Test: After 15 seconds)
        // Store the timer so we can cancel it if boss spawns early
        if (!startAtLevel2) {
            this.bossSpawnTimer = this.time.delayedCall(15000, () => {
                // Only spawn if not defeated and not already visible
                if (!this.bossDefeated && this.bossState === "HIDDEN") {
                    this.spawnBoss();
                }
            });
        }

        // UI: Health
        // this.healthText = this.add.text(20, 20, "HP: 10", {
        //     fontSize: "11px",
        //     fontFamily: '"Press Start 2P"',
        //     color: "#ff0000",
        //     stroke: "#000000",
        //     strokeThickness: 2
        // }).setDepth(100);


        // UI: Score
        this.scoreText = this.add.text(20, 35, "SCORE: 0", {
            fontSize: "11px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 2
        }).setDepth(100);

        // UI: Stamina Bar
        const staminaScale = DESIGN_WIDTH / 5585;
        const staminaHeight = 293 * staminaScale;

        // Stack Logic: Playable Area -> HP -> Stamina -> Controls
        const playableBottom = DESIGN_HEIGHT - 150;

        // SHIFT UP 30px
        const layoutOffset = -30;

        // HP Bar Y (Center) = PlayableBottom + Half Height + Padding + Offset
        const hpY = playableBottom + (staminaHeight / 2) + 5 + layoutOffset;

        // Stamina Bar Y (Center) = HpY + Height + Padding
        const staminaY = hpY + staminaHeight + 5;

        this.staminaBarFrame = this.add.image(DESIGN_WIDTH / 2, staminaY, "stamina")
            .setScale(staminaScale)
            .setDepth(101);

        this.staminaBarFill = this.add.graphics().setDepth(102);

        // UI: HP Bar
        this.hpBarFrame = this.add.image(DESIGN_WIDTH / 2, hpY, "stamina")
            .setScale(staminaScale)
            .setDepth(101)
            .setTint(0xff0000); // Red tint

        this.hpBarFill = this.add.graphics().setDepth(102);
        this.updateHpBar();



        // Debug: Spawn Boss Button
        this.add.text(10, 100, "DEBUG: BOSS", {
            fontSize: '12px',
            backgroundColor: '#0000ff'
        })
            .setDepth(300)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (this.bossState === "HIDDEN") {
                    this.spawnBoss();
                }
            });

        // Debug: Cheat Button (God Mode)
        const cheatBtn = this.add.text(10, 140, "CHEAT: OFF", {
            fontSize: '12px',
            backgroundColor: '#ff0000'
        })
            .setDepth(300)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.isGodMode = !this.isGodMode;
                cheatBtn.setText(this.isGodMode ? "CHEAT: ON" : "CHEAT: OFF");
                cheatBtn.setBackgroundColor(this.isGodMode ? "#00ff00" : "#ff0000");
                this.ship.setTint(this.isGodMode ? 0x00ff00 : 0xffffff); // Visual Indicator
            });

        // Debug: Insta-Kill Boss (Set HP to 1)
        this.add.text(10, 180, "BOSS 1HP", {
            fontSize: '12px',
            backgroundColor: '#ff00ff'
        })
            .setDepth(300)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (this.boss && this.boss.active && this.bossState !== "HIDDEN") {
                    this.boss.setData('health', 1);
                    this.bossHealth = 1;
                    console.log("Boss HP set to 1");
                }
            });

        // UI: Game Over
        this.gameOverText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 20, "GAME OVER", {
            fontSize: "32px",
            fontFamily: '"Press Start 2P"',
            stroke: "#ffffff",
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(2001).setScrollFactor(0).setVisible(false); // Depth > Overlay (2000)

        // UI: Restart
        this.restartButton = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 50, "RESTART", {
            fontSize: "24px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 10, y: 5 },
            align: 'center'
        })
            .setOrigin(0.5).setDepth(2001).setScrollFactor(0).setVisible(false) // Depth > Overlay (2000)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.restart({ startAtLevel2: this.isBg2Active }));

        // UI: Pause Overlay
        this.pauseOverlay = this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.6)
            .setOrigin(0)
            .setDepth(2000)
            .setScrollFactor(0)
            .setVisible(false);

        this.pauseText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, "PAUSED", {
            fontSize: "42px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(2001).setScrollFactor(0).setVisible(false);

        // Mobile Pause Button (Bottom Center - Between Joystick and Fire)
        // Joystick/Fire are approx at Y = DESIGN_HEIGHT - 75. 
        // We place this slightly above or inline.
        const pauseY = DESIGN_HEIGHT - 95;
        this.mobilePauseBtn = this.add.text(DESIGN_WIDTH / 2, pauseY, "PAUSE", {
            fontSize: "14px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 8, y: 5 }
        })
            .setOrigin(0.5)
            .setDepth(200)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (this.isGameOver) return;
                this.togglePause();
            });

        // Pause Menu - RESTART Button
        this.pauseRestartBtn = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 60, "RESTART", {
            fontSize: "20px",
            fontFamily: '"Press Start 2P"',
            color: "#ff0000",
            backgroundColor: "#000000",
            padding: { x: 10, y: 5 }
        })
            .setOrigin(0.5)
            .setDepth(202) // Above Overlay (200) and Text (201)
            .setVisible(false)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.time.paused = false;
                this.physics.resume();
                this.isPaused = false;
                this.scene.restart({ startAtLevel2: this.isBg2Active });
            });

        // Audio Setup
        // Audio Setup
        if (this.cache.audio.exists("shoot")) {
            this.shootSound = this.sound.add("shoot", { volume: 0.5 });
        }
        if (this.cache.audio.exists("bossEntry")) {
            this.bossEntrySound = this.sound.add("bossEntry", { volume: 0.8 });
        }
        this.bgMusic = this.sound.add("music", { loop: true, volume: 0.3 });
        this.bgMusic2 = this.sound.add("music2", { loop: true, volume: 0.3 });

        // Music Persistence Logic
        const storedMusicState = this.registry.get('musicEnabled');
        if (storedMusicState === undefined) {
            // Default: OFF (Wait for user to turn on first time)
            this.isMusicPlaying = false;
            this.registry.set('musicEnabled', false);
        } else {
            this.isMusicPlaying = storedMusicState;
        }

        if (this.isMusicPlaying) {
            if (startAtLevel2) {
                this.bgMusic2.play();
                (this.bgMusic2 as Phaser.Sound.WebAudioSound).setVolume(0.3);
            } else {
                this.bgMusic.play();
                // Pre-unlock bgMusic2 for mobile: play silently then pause
                // This allows the crossfade to work later without user interaction
                (this.bgMusic2 as Phaser.Sound.WebAudioSound).setVolume(0);
                this.bgMusic2.play();
                this.bgMusic2.pause();
            }
        }

        // Cleanup on Shutdown (Ensures old tracks stop so new one starts fresh)
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.bgMusic) this.bgMusic.stop();
            if (this.bgMusic2) this.bgMusic2.stop();
        });

        // Music Toggle Button (Bottom Center, below Pause)
        const musicY = DESIGN_HEIGHT - 55;
        this.musicBtn = this.add.text(DESIGN_WIDTH / 2, musicY, this.isMusicPlaying ? "♫ ON" : "♫ OFF", {
            fontSize: "16px",
            fontFamily: '"Press Start 2P"',
            color: this.isMusicPlaying ? "#00ff00" : "#ff0000",
            backgroundColor: "#000000",
            padding: { x: 5, y: 5 }
        })
            .setOrigin(0.5)
            .setDepth(200)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (this.isMusicPlaying) {
                    this.bgMusic.stop();
                    this.musicBtn.setText("♫ OFF");
                    this.musicBtn.setColor("#ff0000");
                    this.isMusicPlaying = false;
                    this.registry.set('musicEnabled', false); // Save State
                } else {
                    this.bgMusic.play();
                    this.musicBtn.setText("♫ ON");
                    this.musicBtn.setColor("#00ff00");
                    this.isMusicPlaying = true;
                    this.registry.set('musicEnabled', true); // Save State
                }
            });

        this.shields = this.physics.add.group();
        this.scheduleNextShield();

        // UI: Boost Timer Bar (Top Right)
        this.boostUIContainer = this.add.container(DESIGN_WIDTH - 100, 40).setDepth(100).setVisible(false);
        const boostIcon = this.add.image(0, 0, "boost").setScale(0.15).setOrigin(0.5);
        const boostBarBG = this.add.rectangle(10, 0, 80, 10, 0x000000).setOrigin(0, 0.5);
        this.boostUIBarFill = this.add.graphics();
        this.boostUIContainer.add([boostBarBG, this.boostUIBarFill, boostIcon]);

        // UI: Triple Shot Timer Bar (Stacked)
        this.tripleShotUIContainer = this.add.container(DESIGN_WIDTH - 100, 80).setDepth(100).setVisible(false);
        const tripleIcon = this.add.image(0, 0, "tripleshot").setScale(0.02).setOrigin(0.5);
        const tripleBarBG = this.add.rectangle(10, 0, 80, 10, 0x000000).setOrigin(0, 0.5);
        this.tripleShotUIBarFill = this.add.graphics();
        this.tripleShotUIContainer.add([tripleBarBG, this.tripleShotUIBarFill, tripleIcon]);

        // UI: Shield Timer Bar (Stacked)
        this.shieldUIContainer = this.add.container(DESIGN_WIDTH - 100, 120).setDepth(100).setVisible(false);
        const shieldIcon = this.add.image(0, 0, "shield").setScale(0.08).setOrigin(0.5);
        const shieldBarBG = this.add.rectangle(10, 0, 80, 10, 0x000000).setOrigin(0, 0.5);
        this.shieldUIBarFill = this.add.graphics();
        this.shieldUIContainer.add([shieldBarBG, this.shieldUIBarFill, shieldIcon]);


        // Physics: Ship vs Bats/Ghosts
        this.physics.add.overlap(this.ship, this.bats, (obj1, obj2) => {
            this.handlePlayerHit(obj2 as any, true);
        });
        this.physics.add.overlap(this.ship, this.ghosts, (obj1, obj2) => {
            this.handlePlayerHit(obj2 as any, true);
        });

        // Physics: Projectiles vs Bats/Ghosts
        this.physics.add.overlap(this.projectiles, this.bats, (proj, bat) => {
            this.handleProjectileHitBat(proj as Phaser.Physics.Arcade.Image, bat as Phaser.Physics.Arcade.Sprite);
        });
        this.physics.add.overlap(this.projectiles, this.ghosts, (proj, ghost) => {
            this.handleProjectileHitBat(proj as Phaser.Physics.Arcade.Image, ghost as Phaser.Physics.Arcade.Sprite);
        });

        // Physics: Projectiles vs Dragons
        this.physics.add.overlap(this.projectiles, this.dragons, (proj, dragon) => {
            this.handleProjectileHitDragon(proj as Phaser.Physics.Arcade.Image, dragon as Phaser.Physics.Arcade.Sprite);
        });

        // Physics: Ship vs Dragons
        this.physics.add.overlap(this.ship, this.dragons, (ship, dragon) => {
            this.handlePlayerHit(dragon as any, true);
        });

        // Physics: Ship vs Dragon Lasers
        this.physics.add.overlap(this.ship, this.dragonLasers, (ship, laser) => {
            this.handlePlayerHit(laser as any, true);
            (laser as Phaser.Physics.Arcade.Image).destroy();
        });

        // Physics: Ship vs Boost
        this.physics.add.overlap(this.ship, this.boosts, (ship, boost) => {
            (boost as Phaser.Physics.Arcade.Image).destroy();
            this.checkAndShowTutorial(() => this.activateBoost());
        });

        // Physics: Ship vs Triple Shot
        this.physics.add.overlap(this.ship, this.tripleShots, (ship, item) => {
            (item as Phaser.Physics.Arcade.Image).destroy();
            this.checkAndShowTutorial(() => this.activateTripleShot());
        });

        // Physics: Ship vs Heal
        this.physics.add.overlap(this.ship, this.heals, (ship, item) => {
            (item as Phaser.Physics.Arcade.Image).destroy();
            this.checkAndShowTutorial(() => {
                this.health = Math.min(this.health + 5, this.maxHealth);
                this.updateHpBar();
            });
        });

        // Physics: Ship vs Shield
        this.physics.add.overlap(this.ship, this.shields, (ship, item) => {
            (item as Phaser.Physics.Arcade.Image).destroy();
            this.checkAndShowTutorial(() => this.activateShield());
        });


        // Physics: Enemy vs Enemy (Bats and Ghosts)
        this.physics.add.collider(this.bats, this.bats);
        this.physics.add.collider(this.ghosts, this.ghosts);
        this.physics.add.collider(this.bats, this.ghosts);

        // Physics: Ship vs Boss (Group check is safer)
        this.physics.add.overlap(this.projectiles, this.bossGroup, (proj, boss) => {
            this.handleBossHit(proj as Phaser.Physics.Arcade.Image);
        });

        const layout = () => {
            const safeZoneHeight = 150;
            const playableHeight = DESIGN_HEIGHT - safeZoneHeight;

            // BG covers full screen now, but logic keeps ship in playable area
            this.bg.setSize(DESIGN_WIDTH, DESIGN_HEIGHT);
            this.bgHighlight.setSize(DESIGN_WIDTH, DESIGN_HEIGHT);

            // Safe Zone Visual removed (Transparent)
            // Logic for "unplayable" area remains in update()
        };
        layout();
        this.input.keyboard?.on("keydown-ESC", () => this.scene.start("Menu"));

        // Debug: 'T' for Transition
        this.input.keyboard?.on("keydown-T", () => {
            console.log("Debug: Triggering Transition");
            this.startLevelTransition();
        });

        console.log("PlayScene: Create completed");

        // Initialize Mobile Controls
        this.input.addPointer(2); // Enable multi-touch
        this.createMobileControls();
    }

    createMobileControls() {
        // Recalculate positions based on Bars
        const staminaScale = DESIGN_WIDTH / 5585;
        const staminaHeight = 293 * staminaScale;
        const playableBottom = DESIGN_HEIGHT - 150;
        const layoutOffset = -30; // Shift UP 30px
        const hpY = playableBottom + (staminaHeight / 2) + 5 + layoutOffset;
        const staminaY = hpY + staminaHeight + 5;

        // Joystick Top = Stamina Bottom
        const staminaBottom = staminaY + (staminaHeight / 2);

        // Available Height = DESIGN_HEIGHT - staminaBottom
        // Center the controls in this space
        // Note: staminaBottom moved up by 30. Center moves up by 15.
        // To shift joystick up by full 30, we need extra -15 offset.
        // Formula: NewJoyY = ( (S-30) + D ) / 2 = (S+D)/2 - 15.
        // We want (S+D)/2 - 30. So subtract another 15 (layoutOffset / 2).
        const joyY = ((staminaBottom + DESIGN_HEIGHT) / 2) + (layoutOffset / 2);

        // Calculate max radius to fit (leave 5px padding)
        // Max Diameter = (DESIGN_HEIGHT - staminaBottom) - 10
        // Radius = Diameter / 2
        // If space is ~100px, Radius ~45. User asked to "shrink" and "fit perfectly".
        // Let's use Radius 38 (Diameter 76) for a comfortable fit.
        const joyRadius = 38;

        const joyX = 80;



        this.joyBase = this.add.circle(joyX, joyY, joyRadius)
            .setStrokeStyle(4, 0x10E0EF)
            .setDepth(500)
            .setScrollFactor(0)
            .setInteractive() as Phaser.GameObjects.Arc;

        this.joyThumb = this.add.circle(joyX, joyY, 20, 0x10E0EF)
            .setDepth(501)
            .setScrollFactor(0);

        this.input.setDraggable(this.joyBase);

        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: any, dragX: number, dragY: number) => {
            if (gameObject !== this.joyBase) return;

            const delta = new Phaser.Math.Vector2(dragX - joyX, dragY - joyY);
            // Limit thumb distance
            if (delta.length() > joyRadius) {
                delta.normalize().scale(joyRadius);
            }

            this.joyThumb.setPosition(joyX + delta.x, joyY + delta.y);

            // Normalize for movement (-1 to 1)
            this.joyCursor.set(delta.x / joyRadius, delta.y / joyRadius);
        });

        this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: any) => {
            if (gameObject !== this.joyBase) return;
            this.joyThumb.setPosition(joyX, joyY);
            this.joyCursor.set(0, 0);
        });

        // Fire Button (Bottom Right)
        // Align with Joystick Y
        const fireBtnRadius = 38; // Match Joystick
        // Keep same Y as JOYSTICK for symmetry
        const fireY = joyY;

        this.fireBtn = this.add.circle(DESIGN_WIDTH - 80, fireY, fireBtnRadius, 0xff0000, 0.5)

            .setStrokeStyle(4, 0xffffff)
            .setDepth(500)
            .setScrollFactor(0)
            .setInteractive() as Phaser.GameObjects.Arc;

        const fireText = this.add.text(DESIGN_WIDTH - 80, fireY, "FIRE", {

            fontSize: "12px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff"
        }).setOrigin(0.5).setDepth(501).setScrollFactor(0);

        this.fireBtn.on('pointerdown', () => {
            this.isMobileFiring = true;
            this.fireBtn.setFillStyle(0xffffff, 0.8);
        });

        this.fireBtn.on('pointerup', () => {
            this.isMobileFiring = false;
            this.fireBtn.setFillStyle(0xff0000, 0.5);
        });

        this.fireBtn.on('pointerout', () => {
            this.isMobileFiring = false;
            this.fireBtn.setFillStyle(0xff0000, 0.5);
        });
    }

    checkAndShowTutorial(onResume: () => void) {
        const seen = this.registry.get("tutorial_seen");

        if (seen) {
            onResume();
            return;
        }

        // Mark as seen globally
        this.registry.set("tutorial_seen", true);

        // Pause Game
        this.isTipActive = true;
        this.physics.pause();

        // Tutorial Data
        const pages = [
            { id: "boost", title: "Boost Effect!", desc: "Limitless stamina & fast shooting for 5s." },
            { id: "tripleshot", title: "Triple Shot!", desc: "Shoots 3 projectiles covering a wide angle." },
            { id: "heal", title: "Repair Kit!", desc: "Restores 100% health instantly." },
            { id: "shield", title: "Shield!", desc: "Grants invulnerability for 7s." }
        ];

        let currentPage = 0;

        // Create Overlay
        const overlay = this.add.container(0, 0).setDepth(2000).setScrollFactor(0);

        // Dark Background
        const bg = this.add.rectangle(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.9)
            .setInteractive();

        // Box - Taller
        const boxHeight = DESIGN_HEIGHT * 0.7;
        const box = this.add.rectangle(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH * 0.85, boxHeight, 0x1a1a2e)
            .setStrokeStyle(4, 0xFFF825);

        // Header: "TIPS"
        const headerText = this.add.text(DESIGN_WIDTH / 2, (DESIGN_HEIGHT / 2) - (boxHeight * 0.42), "TIPS", {
            fontSize: "24px",
            fontFamily: '"Press Start 2P"',
            color: "#FFF825",
            align: "center"
        }).setOrigin(0.5);

        // Sub-Header: "POWER UPS"
        const subHeaderText = this.add.text(DESIGN_WIDTH / 2, (DESIGN_HEIGHT / 2) - (boxHeight * 0.35), "POWER UPS", {
            fontSize: "16px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff",
            align: "center"
        }).setOrigin(0.5);

        // Icons Row
        const iconY = (DESIGN_HEIGHT / 2) - (boxHeight * 0.22);
        const iconContainer = this.add.container(0, 0);

        // Helper to refresh content
        const updateContent = () => {
            // Icon Row
            iconContainer.removeAll(true);
            const startX = (DESIGN_WIDTH / 2) - 90;
            const gap = 60;

            pages.forEach((page, index) => {
                const x = startX + (index * gap);

                // Highlight current page icon
                const scale = index === currentPage ? 0.24 : 0.15; // Tripled from 0.08/0.05
                const alpha = index === currentPage ? 1 : 0.5;
                const tint = index === currentPage ? 0xffffff : 0x888888;

                // Adjust scale for specific assets
                let finalScale = scale;

                // Boost: Increase by 2.5x per request (relative to previous shrink)
                // Previous was ~0.1. New target is ~0.25 (which is close to original base scale)
                if (page.id === 'boost') finalScale = ((index === currentPage ? 0.36 : 0.24) * 0.3) * 2.5;

                // TripleShot: existing logic
                if (page.id === 'tripleshot') finalScale = index === currentPage ? 0.09 : 0.06;

                // Heal: Triple size
                if (page.id === 'heal') finalScale = scale * 3;

                // Shield: Increase by 30% (1.3x)
                if (page.id === 'shield') finalScale = scale * 1.3;

                const icon = this.add.image(x, iconY, page.id)
                    .setScale(finalScale)
                    .setAlpha(alpha)
                    .setTint(tint)
                    .setOrigin(0.5);

                iconContainer.add(icon);
            });

            // Text Content
            titleText.setText(pages[currentPage].title);
            descText.setText(pages[currentPage].desc);
        };

        // Title Area
        const titleText = this.add.text(DESIGN_WIDTH / 2, (DESIGN_HEIGHT / 2) - (boxHeight * 0.05), "", {
            fontSize: "20px",
            fontFamily: '"Press Start 2P"',
            color: "#FFF825",
            align: "center"
        }).setOrigin(0.5);

        // Desc Area
        const descText = this.add.text(DESIGN_WIDTH / 2, (DESIGN_HEIGHT / 2) + (boxHeight * 0.1), "", {
            fontSize: "14px",
            fontFamily: '"Press Start 2P"',
            color: "#cccccc",
            align: "center",
            wordWrap: { width: DESIGN_WIDTH * 0.75 },
            lineSpacing: 8
        }).setOrigin(0.5);

        // Next Button (Right Arrow)
        const arrowBtn = this.add.text(DESIGN_WIDTH / 2 + 100, (DESIGN_HEIGHT / 2) + (boxHeight * 0.25), "➡️", {
            fontSize: "40px"
        }).setOrigin(0.5).setInteractive();

        arrowBtn.on('pointerdown', () => {
            currentPage = (currentPage + 1) % pages.length;
            updateContent();
        });

        // Skip/Resume Button (Fixed at Bottom)
        const skipBtn = this.add.container(DESIGN_WIDTH / 2, (DESIGN_HEIGHT / 2) + (boxHeight * 0.4));
        const skipBg = this.add.rectangle(0, 0, 260, 40, 0x333333).setInteractive(); // Darker grey
        const skipTxt = this.add.text(0, 0, "Skip Tips", {
            fontSize: "12px",
            fontFamily: '"Press Start 2P"',
            color: "#ffffff"
        }).setOrigin(0.5);
        skipBtn.add([skipBg, skipTxt]);

        skipBg.on('pointerdown', () => {
            this.registry.set("tutorial_seen", true); // Ensure set
            this.isTipActive = false;
            this.physics.resume();
            overlay.destroy();
            onResume();
        });

        overlay.add([bg, box, headerText, subHeaderText, iconContainer, titleText, descText, arrowBtn, skipBtn]);

        // Initialize
        updateContent();
    }

    handlePlayerHit(enemy: Phaser.GameObjects.GameObject, shouldDestroy: boolean = true) {
        if (this.isGameOver || this.isInvulnerable || this.isShieldActive || this.isGodMode) return;

        this.health--;
        this.updateHpBar();

        this.cameras.main.shake(100, 0.01);

        if (this.health <= 0) {
            this.triggerGameOver();
        } else {
            // Invulnerability period
            this.isInvulnerable = true;
            this.ship.setTint(0xff0000);
            this.ship.setAlpha(0.5);

            this.time.delayedCall(1000, () => {
                this.isInvulnerable = false;
                this.ship.clearTint();
                this.ship.setAlpha(1.0);
            });
        }

        if (shouldDestroy) {
            const e = enemy as any;
            if (e.destroy) {
                this.createExplosion(e.x || this.ship.x, e.y || this.ship.y);
                e.destroy();
            }
        }
    }

    handleProjectileHitBat(projectile: Phaser.Physics.Arcade.Image, bat: Phaser.Physics.Arcade.Sprite) {
        if (!projectile.active || !bat.active) return;

        // Prevent damage if enemy is off-screen (top)
        if (bat.y < 0) {
            projectile.destroy();
            return;
        }
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
        this.pauseOverlay.setVisible(true); // Reuse existing dark overlay
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
                this.togglePause();
            }
        }

        if (this.isGameOver || this.isPaused || this.isTipActive) return;

        // --- Background Scrolling Logic ---
        const scrollSpeed = 0.1 * dt; // Adjust speed as needed

        if (this.isBg2Active && this.bg2 && this.bg2.active) {
            // New Level Scroll
            this.bg2.tilePositionY -= scrollSpeed;
        } else if (this.isTransitioning) {
            // Physical Slide Down (Transition)
            this.bg.y += scrollSpeed;
            if (this.transitionBg) this.transitionBg.y += scrollSpeed;
            if (this.bg2) this.bg2.y += scrollSpeed;

            // Check if Transition Done
            if (this.bg2.y >= 0) {
                this.bg2.y = 0;
                this.isTransitioning = false;
                this.isBg2Active = true;

                // Cleanup
                if (this.bg) this.bg.setVisible(false); // Hide old
                if (this.transitionBg) this.transitionBg.destroy();
            }
        } else if (this.bg && this.bg.active) {
            // Normal Scroll (1.png)
            if (this.transitionPending) {
                this.bg.tilePositionY -= scrollSpeed;
                // Immediate Crossfade (as requested by User)
                this.startSeamTransition();
            } else {
                this.bg.tilePositionY -= scrollSpeed;
            }
        }

        if (this.bossState !== "HIDDEN") {
            this.updateBoss(time, dt);
        }

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

        // Update Shield Effect Position
        if (this.isShieldActive && this.shieldEffect && this.ship) {
            this.shieldEffect.setPosition(this.ship.x, this.ship.y);
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

        // Shield Timer & Stacking
        if (this.isShieldActive) {
            this.shieldTimer -= dt;

            // Update UI Bar
            this.shieldUIBarFill.clear();
            const fillW = Math.max(0, (this.shieldTimer / this.maxShieldTime) * 80);
            this.shieldUIBarFill.fillStyle(0xffff00, 1); // Yellow for Shield
            this.shieldUIBarFill.fillRect(10, -5, fillW, 10);

            // Stacking Logic:
            // 1. Boost (Always Top: 40)
            // 2. TripleShot (If Boost: 80, Else: 40)
            // 3. Shield (Depends on previous two)

            let shieldY = 40;
            if (this.isBoostActive) shieldY += 40;
            if (this.isTripleShotActive) shieldY += 40;

            this.shieldUIContainer.setY(shieldY);


            // Check Expiration
            if (this.shieldTimer <= 0) {
                this.isShieldActive = false;
                this.shieldUIContainer.setVisible(false);

                // Cleanup Visuals
                if (this.shieldEffect) {
                    this.shieldEffect.destroy();
                    this.shieldEffect = undefined;
                }
                if ((this.ship as any).preFX) (this.ship as any).preFX.clear();
                this.ship.clearTint();
            }
        }

        const deltaY = this.ship.y - this.lastShipY;
        this.lastShipY = this.ship.y;

        if ((this.fireKey && this.fireKey.isDown) || this.isMobileFiring) {
            if (time > this.lastFired && this.stamina >= 1) {
                // Play Sound if Music is ON and Sound exists
                if (this.isMusicPlaying && this.shootSound) {
                    this.shootSound.play();
                }

                const projectile = this.projectiles.create(this.ship.x, this.ship.y - this.ship.displayHeight / 2, 'projectile') as Phaser.Physics.Arcade.Image;
                if (projectile) {
                    projectile.setVelocityY(-900);
                    projectile.setDepth(15);
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
                            leftProj.setDepth(15);
                            if (this.isBoostActive) leftProj.setTint(0xadff2f);
                        }

                        // Right Projectile
                        const rightProj = this.projectiles.create(this.ship.x, this.ship.y - this.ship.displayHeight / 2, 'projectile') as Phaser.Physics.Arcade.Image;
                        if (rightProj) {
                            rightProj.setVelocity(300, -900); // Angle right
                            rightProj.setRotation(0.3);
                            rightProj.setDepth(15);
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
            if (child.active && child.y < 0) child.destroy(); // Destroy immediately at top
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
        const staminaHeight = 293 * staminaScale;

        // Inner dimensions (from standard stamina texture)
        const fillMaxW = 5413 * staminaScale;
        const fillH = 217 * staminaScale;

        // Center the frame, then apply inner offset
        // Texture Width: 5585, Inner Offset X: 86
        const frameX = DESIGN_WIDTH / 2;
        const fillX = (frameX - (5585 * staminaScale) / 2) + (86 * staminaScale);

        // Frame Y position (Same as create logic)
        const playableBottom = DESIGN_HEIGHT - 150;
        const layoutOffset = -30; // Shift UP 30px
        const hpY = playableBottom + (staminaHeight / 2) + 5 + layoutOffset;
        const staminaY = hpY + staminaHeight + 5;

        // Texture Height: 293, Inner Offset Y: 38
        const fillY = (staminaY - (staminaHeight / 2)) + (38 * staminaScale);


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

            // Input Handling (Analog / 360 Degree)
            let inputX = 0;
            let inputY = 0;

            if (cursors.left.isDown) inputX -= 1;
            if (cursors.right.isDown) inputX += 1;
            if (cursors.up.isDown) inputY -= 1;
            if (cursors.down.isDown) inputY += 1;

            // Use Joystick if Keyboard is idle
            if (inputX === 0 && inputY === 0) {
                if (this.joyCursor.length() > 0.1) {
                    inputX = this.joyCursor.x;
                    inputY = this.joyCursor.y;
                }
            }

            // Apply Velocity
            if (inputX !== 0 || inputY !== 0) {
                const vec = new Phaser.Math.Vector2(inputX, inputY);
                // Analog Control:
                // normalize() makes it length 1.
                // scale(speed) makes it speed length.
                // This preserves the exact angle from the joystick.
                vec.normalize().scale(speed);
                vel.copy(vec);
            }

            // Visual Banking (Rotation based on Side Movement)
            // Banks slightly left/right when moving horizontally
            // Max bank angle: 15 degrees (approx 0.26 rad)
            const targetRotation = (vel.x / speed) * 0.26;
            this.ship.setRotation(Phaser.Math.Linear(this.ship.rotation, targetRotation, 0.1));

            const shipHalfH = this.ship.displayHeight / 2;
            const playableHeight = DESIGN_HEIGHT - 150;
            const bottomLimit = playableHeight - shipHalfH;

            // Check Boss Fight Top Limit
            let topLimit = 0; // Default world bound
            if (this.bossState !== "HIDDEN" && this.boss && this.boss.active) {
                topLimit = (DESIGN_HEIGHT / 2) + shipHalfH - 150;
            }

            // Apply Limits
            if (vel.y < 0) { // Moving UP
                if (this.ship.y <= topLimit + 5) {
                    vel.y = 0;
                }
            } else if (vel.y > 0) { // Moving DOWN
                if (this.ship.y >= bottomLimit - 5) {
                    vel.y = 0;
                }
            }

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
            body.setVelocity(vel.x, vel.y);
            this.ship.setDepth(1000);
        }
        // Removed explicit setRotation(0) to allow banking
        // this.ship.setRotation(0);

        // GLOBAL SCREEN BOUNDARIES (Manual Clamp because WorldCollision excludes Top/Bottom for enemies)
        const shipHalfH = this.ship.displayHeight / 2;
        const playableHeight = DESIGN_HEIGHT - 150;

        // 1. Bottom Limit (Always active, respect Safe Zone)
        if (this.ship.y > playableHeight - shipHalfH) {
            this.ship.setY(playableHeight - shipHalfH);
            if (this.ship.body) {
                (this.ship.body as Phaser.Physics.Arcade.Body).setVelocityY(Math.min(0, (this.ship.body as Phaser.Physics.Arcade.Body).velocity.y));
            }
        }

        // 2. Top Limit (Active when NOT in boss fight - Boss fight has stricter limit above)
        if ((this.bossState === "HIDDEN" || !this.boss || !this.boss.active) && this.ship.y < shipHalfH) {
            this.ship.setY(shipHalfH);
            if (this.ship.body) {
                (this.ship.body as Phaser.Physics.Arcade.Body).setVelocityY(Math.max(0, (this.ship.body as Phaser.Physics.Arcade.Body).velocity.y));
            }
        } else if (this.bossState !== "HIDDEN") {
            // 3. Top Limit during Boss Fight
            // User requested to move it 150px UP from the previous 150px limit.
            // So basically allow it to go almost to the top.
            const bossFightTopLimit = 5; // Effectively top of screen
            if (this.ship.y < bossFightTopLimit + shipHalfH) {
                this.ship.setY(bossFightTopLimit + shipHalfH);
                if (this.ship.body) {
                    (this.ship.body as Phaser.Physics.Arcade.Body).setVelocityY(Math.max(0, (this.ship.body as Phaser.Physics.Arcade.Body).velocity.y));
                }
            }
        }

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

        // Heal Cleanup
        const heals = this.heals.getChildren();
        for (let i = heals.length - 1; i >= 0; i--) {
            const child = heals[i] as Phaser.Physics.Arcade.Image;
            if (child.active && child.y > DESIGN_HEIGHT + 50) child.destroy();
        }

        // Boss Lasers Cleanup & Logic
        const lasers = this.bossLasers.getChildren();
        for (let i = lasers.length - 1; i >= 0; i--) {
            const child = lasers[i] as Phaser.Physics.Arcade.Image;
            if (child.active) {
                // Cleanup off-screen
                if (child.y > DESIGN_HEIGHT + 100) {
                    child.destroy();
                    continue;
                }

                // Gravity Rotation Logic
                // Gravity Rotation Logic
                // Only for "omuzprojectile" (shoulder rockets) which have gravity enabled and need custom rotation
                if (child.texture.key === "omuzprojectile") {
                    const body = child.body as Phaser.Physics.Arcade.Body;
                    if (body) {
                        // Target angle based on velocity
                        const targetRotation = Math.atan2(body.velocity.y, body.velocity.x);
                        // Eased rotation: Interp current to target
                        // Use Angle.RotateTo or simple lerp
                        child.rotation = Phaser.Math.Angle.RotateTo(child.rotation, targetRotation, 0.1);
                    }
                }
            }
        }

        // Dragon Lasers Cleanup (Prevent Freeze)
        if (this.dragonLasers) {
            const dLasers = this.dragonLasers.getChildren();
            for (let i = dLasers.length - 1; i >= 0; i--) {
                const child = dLasers[i] as Phaser.Physics.Arcade.Image;
                if (child.active && child.y > DESIGN_HEIGHT + 100) {
                    child.destroy();
                }
            }
        }
        // Dragon Cleanup (Prevent Infinite Loops & Freeze)
        if (this.dragons) {
            const dragons = this.dragons.getChildren();
            for (let i = dragons.length - 1; i >= 0; i--) {
                const child = dragons[i] as Phaser.Physics.Arcade.Sprite;
                if (child.active && child.y > DESIGN_HEIGHT + 100) {
                    child.destroy();
                }
            }
        }
    }

    spawnBoss() {
        if (this.bossState !== "HIDDEN" || this.bossDefeated) return;
        this.bossState = "ENTERING";

        // Cancel auto-spawn if manually triggered
        if (this.bossSpawnTimer) {
            this.bossSpawnTimer.remove(false);
            this.bossSpawnTimer = undefined;
        }
        // Reset health to max when spawning
        this.bossHealth = this.bossMaxHealth;
        this.isBossEnraged = false;

        // Play Boss Entry Sound (if music enabled)
        if (this.isMusicPlaying && this.bossEntrySound) {
            this.bossEntrySound.play();
        }

        // Create Boss Sprite (Off-screen BOTTOM)
        this.boss = this.physics.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT + 150, "boss");
        this.bossGroup.add(this.boss); // Add to Group
        this.boss.setDepth(5);
        this.boss.setVisible(true);
        this.boss.setActive(true);
        this.boss.setImmovable(true);
        if (this.boss.body) {
            this.boss.body.onCollide = true;
        }

        // Playable Height (Screen - Safe Zone)
        const safeZoneHeight = 150;
        const playableHeight = DESIGN_HEIGHT - safeZoneHeight;

        // Global Scaling Ratio (New Height / Old Height)
        const globalRatio = playableHeight / DESIGN_HEIGHT;

        // Scale to fit width, THEN REDUCE PROPORTIONALLY
        // Old Logic was: (DESIGN_WIDTH / width) * (2/3)
        // New Logic: Apply globalRatio to that
        const targetWidth = DESIGN_WIDTH;
        let baseScale = (targetWidth / this.boss.width) * (2 / 3);
        this.bossScaleFactor = baseScale * globalRatio;

        this.boss.setScale(this.bossScaleFactor);
        this.boss.setOrigin(0.5, 0.5);

        // Auto-Size Hitbox (Reliable with Group)
        // Auto-Size Hitbox (Reliable with Group)
        if (this.boss.body) {
            const body = this.boss.body as Phaser.Physics.Arcade.Body;
            body.updateFromGameObject();
            body.setAllowGravity(false);
            // MANUALLY OFFSET HITBOX UPWARDS
            // Move hitbox UP by 150px (original) + 40px (visual shift) = 190px
            // This keeps the hitbox in the SAME world position while the sprite moves down.
            body.setOffset(0, -190);
        }

        this.boss.setData('health', this.bossMaxHealth);

        // Create Boss Background (6.png) - Static Layer
        // FIX: Use DESIGN_HEIGHT to ensure full coverage, not just playable area
        this.bossBG = this.add.image(DESIGN_WIDTH / 2, playableHeight + (playableHeight / 2), "boss-bg");
        this.bossBG.setDepth(1);
        this.bossBG.setTint(0xB2B2B2); // Reduce brightness by 30%
        this.bossBG.setDisplaySize((DESIGN_WIDTH * 1.2) * globalRatio * 1.5, DESIGN_HEIGHT * 1.5);

        // Create Boss Foreground (7.png) - Animated Tentacles
        this.bossFG = this.add.image(DESIGN_WIDTH / 2, playableHeight + (playableHeight / 2), "boss-fg");
        this.bossFG.setDepth(2); // Above BG, Below Boss (Boss is depth 5)
        this.bossFG.setDisplaySize((DESIGN_WIDTH * 1.2) * globalRatio * 1.5, DESIGN_HEIGHT * 1.5);

        // Register and apply PurpleWavePipeline to Foreground Only
        const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
        if (renderer.pipelines && !renderer.pipelines.has('PurpleWavePipeline')) {
            renderer.pipelines.addPostPipeline('PurpleWavePipeline', PurpleWavePipeline);
        }
        this.bossFG.setPostPipeline('PurpleWavePipeline');

        // Move up by 50px (Scaled) -> Then shift DOWN 50px as requested -> Now UP 80px as requested
        // Original DestY logic: ((this.boss.height * this.bossScaleFactor) / 2) + 30;
        // Previous Shift: + 80 (Net +50 relative to +30)
        // New Shift: + 80 - 80 = 0
        // LATEST REQUEST: Move down 40px visually.
        const destY = ((this.boss.height * this.bossScaleFactor) / 2) + 40;

        // Tween Boss Entry & Backgrounds Entry (Synchronized)
        // Backgrounds move to center of playable area
        this.tweens.add({
            targets: [this.bossBG],
            // Previous: Center + 50px
            // Reverted to: Center + 50
            y: (playableHeight / 2) + 50,
            duration: 4000,
            ease: "Power2"
        });

        // Boss moves to destY
        this.tweens.add({
            targets: [this.boss],
            y: destY,
            duration: 4000,
            ease: "Power2"
        });

        this.tweens.add({
            targets: this.bossFG,
            // Previous: Center + 75
            // Reverted to: Center + 75
            y: (playableHeight / 2) + 75,
            duration: 4000,
            ease: "Power2"
        });

        this.tweens.add({
            targets: this.bossBG,
            y: playableHeight / 2,
            duration: 4000,
            ease: "Power2",
            onComplete: () => {
                this.bossState = "FIGHTING";
                this.bossFightStartTime = this.time.now; // Track start time for smooth sway

                // Init Health Bar & Name - Anchor to Boss
                // Text over Head
                this.bossNameText = this.add.text(this.boss.x, this.boss.y - 120, "Cryptonic Sam", {
                    fontSize: "14px",
                    fontFamily: '"Press Start 2P"',
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 3
                }).setOrigin(0.5).setDepth(200);

                const barWidth = 200; // Fixed width relative to boss
                this.bossHealthBarBG = this.add.rectangle(this.boss.x, this.boss.y - 100, barWidth, 10, 0x000000).setDepth(200);
                this.bossHealthBarFill = this.add.rectangle(this.boss.x - barWidth / 2, this.boss.y - 100, barWidth, 10, 0xff0000).setDepth(201).setOrigin(0, 0.5);

                // Re-sync hitbox
                if (this.boss.body) {
                    const body = this.boss.body as Phaser.Physics.Arcade.Body;
                    body.updateFromGameObject();
                }

                // Start Attack Loop managed by updateBoss -> manageBossAttacks
            }
        });

        // ENABLE COLLISION: Ship vs Boss Lasers (Player Damage)
        this.physics.add.overlap(this.ship, this.bossLasers, (ship, laser) => {
            this.handlePlayerHit(laser as any, true);
        });

        // ENABLE COLLISION: Ship vs Boss Body (IMMUNE - No Damage)
        this.physics.add.overlap(this.ship, this.boss, (ship, boss) => {
            // Do nothing - Immunity as requested by USER
        });

        // ENABLE COLLISION: Projectiles vs Boss Lasers (Mutually Destroy)
        this.physics.add.overlap(this.projectiles, this.bossLasers, (proj, laser) => {
            this.createExplosion((proj as any).x, (proj as any).y);
            proj.destroy();
            laser.destroy();
        });
    }

    updateBoss(time: number, dt: number) {
        if (!this.boss || !this.boss.active) return;

        if (this.bossState === "FIGHTING") {
            // Horizontal Sway (Synchronized Boss & Background)
            // Use relative time so sin starts at 0 (center)
            const swayX = Math.sin((time - this.bossFightStartTime) * 0.0015) * 40;
            this.boss.x = DESIGN_WIDTH / 2 + swayX;
            if (this.bossBG) this.bossBG.x = DESIGN_WIDTH / 2 + swayX;
            if (this.bossFG) this.bossFG.x = DESIGN_WIDTH / 2 + swayX;

            const currentHealth = this.boss.getData('health') ?? 50;
            const healthPercent = Phaser.Math.Clamp(currentHealth / this.bossMaxHealth, 0, 1);
            const barWidth = 200; // Match init width

            if (this.bossHealthBarFill) {
                this.bossHealthBarFill.width = barWidth * healthPercent;

                // Update Positions to follow boss
                this.bossHealthBarFill.setPosition(this.boss.x - barWidth / 2, this.boss.y - 100);
                if (this.bossHealthBarBG) this.bossHealthBarBG.setPosition(this.boss.x, this.boss.y - 100);
                if (this.bossNameText) this.bossNameText.setPosition(this.boss.x, this.boss.y - 120);
            }

            this.manageBossAttacks(time);
        }
    }

    manageBossAttacks(time: number) {
        if (!this.boss || !this.boss.active || this.bossState !== "FIGHTING") return;

        // Pipe Attack (Health < 80%)
        const currentHealth = this.boss.getData('health') ?? this.bossMaxHealth;
        if (currentHealth < (this.bossMaxHealth * 0.8)) {
            if (time - this.lastPipeAttackTime > this.pipeCooldown) {
                this.firePipeAttack();
                this.lastPipeAttackTime = time;
            }
        }

        // Synchronized Attacks (Laser & Bat)
        // Laser is always ready eventually
        const isLaserReady = (time - this.lastLaserTime > this.laserCooldown);
        // Bat only if enraged
        const isBatReady = this.isBossEnraged && (time - this.lastBatTime > this.batCooldown);

        if (isLaserReady) {
            // Rule: Never fire laser if Boss is Vomiting (Texture is vomitboss)
            if (this.boss.texture.key === 'vomitboss') {
                return;
            }

            // Priority: Laser
            // Rule: Don't fire if Bat fired recently (< 1s ago)
            if (time - this.lastBatTime >= 1000) {
                this.bossAttackLasers();
                this.lastLaserTime = time;
                return; // Prioritize Laser, skip checking Bat this frame
            }
        }

        if (isBatReady) {
            // Rule: Don't fire if Laser fired recently (< 1s ago)
            if (time - this.lastLaserTime >= 1000) {
                this.spawnBossBatVomit();
                this.lastBatTime = time;
            }
        }
    }

    firePipeAttack() {
        const burstCount = 3;
        const burstDelay = 200; // ms between shots

        for (let i = 0; i < burstCount; i++) {
            this.time.delayedCall(i * burstDelay, () => {
                if (!this.boss || !this.boss.active) return;

                const scale = this.boss.scaleX;
                // Adjust for Bottom Pipes (Red-tipped pipes at bottom corners)
                const pipeOffsetX = 180 * scale; // Wider
                const pipeOffsetY = 120 * scale; // Much lower (from center)

                const startXLeft = (this.boss.x - pipeOffsetX) - 50; // Shift Left 50px
                const startXRight = (this.boss.x + pipeOffsetX) + 30; // Shift Right 30px
                const startY = this.boss.y + pipeOffsetY;

                // Create Left Pipe Projectile
                this.fireGravityLaser(startXLeft, startY, -100);

                // Create Right Pipe Projectile
                this.fireGravityLaser(startXRight, startY, 100);
            });
        }
    }

    fireGravityLaser(x: number, y: number, velocityX: number) {
        // Use new asset "omuzprojectile"
        const laser = this.bossLasers.create(x, y, "omuzprojectile") as Phaser.Physics.Arcade.Image;
        laser.setTint(0xffffff); // Remove red tint to show original colors
        laser.setScale(0.75); // Half size (was 1.5)
        laser.setDepth(20);

        // Initial Velocity: Up and Out
        // Reduce Horizontal Velocity for sharper turn (User Request)
        // Reduce Upward Velocity slightly so it doesn't fly too high before turning
        laser.setVelocity(velocityX * 0.6, -300);

        // Initial Rotation:
        // User said: "Imagine it faces Right. Turn it to face Up to start."
        // Moving Up (-300) and Out (velX) means angle is roughly -90.
        const rad = Math.atan2(-300, velocityX * 0.6);
        laser.setRotation(rad);

        // Rocket Trail Effect
        const emitter = this.add.particles(0, 0, "debris", {
            speed: 50,
            scale: { start: 0.3, end: 0 }, // Scaled down trail
            alpha: { start: 0.5, end: 0 },
            lifespan: 400,
            frequency: 50,
            tint: [0xffa500, 0x555555], // Orange to Grey (Fire/Smoke)
            blendMode: 'ADD'
        });
        emitter.startFollow(laser);
        emitter.setDepth(19); // Trail just below the rocket

        // Cleanup emitter when laser is destroyed
        laser.on('destroy', () => {
            emitter.stop();
            // Allow particles to fade out before destroying emitter
            this.time.delayedCall(500, () => emitter.destroy());
        });

        // Gravity to pull it down (U-Turn effect)
        // Increase Gravity significantly for sharper U-turn (User Request)
        if (laser.body) {
            (laser.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
            (laser.body as Phaser.Physics.Arcade.Body).setGravityY(700);
        }
    }

    bossAttackLasers() {
        // Fire 3 projectiles from eyes
        const scale = this.boss.scaleX;
        const eyeOffset = 100 * scale;
        const startY = this.boss.y;

        // 7-Way Spread: Side (20, 160), Gap-Fill (50, 130), Down-Spread (80, 90, 100)
        const angles = [20, 50, 80, 90, 100, 130, 160];

        // Left Eye
        angles.forEach(angle => {
            this.fireLaser(this.boss.x - eyeOffset, startY, angle);
        });

        // Right Eye
        angles.forEach(angle => {
            this.fireLaser(this.boss.x + eyeOffset, startY, angle);
        });
    }

    fireLaser(x: number, y: number, angleDeg: number) {
        const laser = this.bossLasers.create(x, y, "projectile") as Phaser.Physics.Arcade.Image;
        laser.setTint(0xff0000);
        laser.setScale(1.0, 2.2);

        const rad = Phaser.Math.DegToRad(angleDeg);
        const speed = 225; // Tuned: Middle ground between fast and slow
        laser.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
        laser.setRotation(rad + Math.PI / 2);
        laser.setDepth(12);
    }

    spawnBossBatVomit() {
        if (!this.boss || !this.boss.active || this.bossState !== "FIGHTING") return;

        // Swap Texture to Vomit Boss
        this.boss.setTexture("vomitboss");

        // Re-apply scale to fit width (same logic as spawnBoss)
        this.boss.setScale(this.bossScaleFactor);

        // Revert to normal boss after 2 seconds
        this.time.delayedCall(2000, () => {
            if (this.boss && this.boss.active) {
                this.boss.setTexture("boss");
                // Re-apply scale for original sprite
                this.boss.setScale(this.bossScaleFactor);
            }
        });

        // Spawn a stream of bats from the "mouth"
        const spawnCount = 20; // Total bats in the stream
        const delayBetweenBats = 100; // ms

        for (let i = 0; i < spawnCount; i++) {
            this.time.delayedCall(i * delayBetweenBats, () => {
                if (!this.boss || !this.boss.active) return;

                const mouthY = this.boss.y + (this.boss.height * this.boss.scaleY * 0.3); // Approximate mouth position
                const bat = this.bats.create(this.boss.x, mouthY, 'bat') as Phaser.Physics.Arcade.Sprite;

                bat.setScale(0.25);
                bat.setAngle(180); // Facing down
                bat.play('bat-fly');

                // Random spread downwards
                const spreadX = Phaser.Math.Between(-200, 200);
                const speedY = Phaser.Math.Between(300, 500);

                bat.setVelocity(spreadX, speedY);
                bat.setDepth(11); // Above boss bg but below lasers

                // Cleanup if they go off screen (already handled by world bounds or generic update loop, but safe to add)
                this.time.delayedCall(3000, () => {
                    if (bat && bat.active) bat.destroy();
                });
            });
        }
    }

    private lastBossHitTime: number = 0;

    handleBossHit(projectile: Phaser.Physics.Arcade.Image) {
        // Allow hits during FIGHTING or ENTERING
        if (!this.boss || !this.boss.active || (this.bossState !== "FIGHTING" && this.bossState !== "ENTERING")) return;

        // Safety Check: Ensure we aren't disabling the boss!
        if (projectile === this.boss || projectile.texture.key === 'boss') return;

        // Destroy Projectile immediately
        projectile.destroy();

        const now = this.time.now;
        if (now - this.lastBossHitTime < 50) return;
        this.lastBossHitTime = now;

        let currentHealth = this.boss.getData('health');
        if (currentHealth === undefined || currentHealth === null) currentHealth = 50;

        currentHealth -= 1; // Damage Value (Reduced to 1 as requested)
        if (currentHealth <= 200 && !this.isBossEnraged) {
            this.isBossEnraged = true;
            // Immediate spawn attempt handled by update loop naturally
            // OR force one now? Better to let manager handle it to ensure sync
            // But user might expect immediate reaction. 
            // Let's stick to manager for sync safety.
        }

        this.boss.setData('health', currentHealth);
        this.bossHealth = currentHealth;

        if (currentHealth <= 0) {
            this.killBoss();
        }

        this.createExplosion(projectile.x, projectile.y);
    }

    killBoss() {
        this.bossState = "HIDDEN";
        this.bossDefeated = true; // Mark as permanently defeated
        this.spawnHeal(); // [NEW] Spawn heal for recovery as requested
        const bx = this.boss.x;
        const by = this.boss.y;

        if (this.boss) {
            this.boss.setVisible(false);
            this.boss.setActive(false);
            this.createExplosion(bx, by);
        }

        // Start Background Transition
        this.startLevelTransition();

        if (this.bossBG) {
            const bgX = this.bossBG.x;
            const bgY = this.bossBG.y;

            // BG Explosion of bats
            const bgEmitter = this.add.particles(bgX, bgY, 'bat', {
                speed: { min: 200, max: 600 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.1, end: 0.1 }, // Constant scale (4x smaller)
                lifespan: 2000,
                quantity: 60,
                gravityY: 0, // Radial burst
                rotate: { min: 0, max: 360 },
                emitting: false
            });
            bgEmitter.setDepth(4); // Behind boss explosion (boss is depth 5, BG was -5 but particles should be visible)
            bgEmitter.explode(60, bgX, bgY);

            this.time.delayedCall(2500, () => bgEmitter.destroy());
            this.bossBG.destroy();
        }

        if (this.bossFG) {
            this.bossFG.destroy();
        }

        if (this.bossNameText) this.bossNameText.setVisible(false);
        if (this.bossHealthBarBG) this.bossHealthBarBG.setVisible(false);
        if (this.bossHealthBarFill) this.bossHealthBarFill.setVisible(false);

        for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 200, () => {
                this.createExplosion(
                    bx + Phaser.Math.Between(-100, 100),
                    by + Phaser.Math.Between(-100, 100)
                );
            });
        }

        // Massive Bat Explosion
        const emitter = this.add.particles(bx, by, 'bat', {
            speed: { min: 400, max: 800 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0.3 }, // Constant size
            lifespan: 1000, // Faster life
            quantity: 40,
            gravityY: 0, // Fly outwards
            rotate: { min: 0, max: 360 },
            emitting: false
        });

        emitter.explode(30, bx, by);

        // Auto-destroy emitter after duration
        this.time.delayedCall(1200, () => emitter.destroy());

        if (this.batVomitEvent) {
            this.batVomitEvent.remove(false);
            this.batVomitEvent = undefined;
        }

        this.boss.destroy();
        this.bossNameText.destroy();
        this.bossHealthBarBG.destroy();
        this.bossHealthBarFill.destroy();
        this.bossLasers.clear(true, true);

        this.score += 5000;
        this.scoreText.setText("SCORE: " + this.score);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.physics.pause();
            this.time.paused = true; // Stop all timers (Boss spawn, etc.)
            this.pauseOverlay.setVisible(true);
            this.pauseText.setVisible(true);
            this.pauseRestartBtn.setVisible(true);
            this.mobilePauseBtn.setText("RESUME");
        } else {
            this.physics.resume();
            this.time.paused = false; // Resume timers
            this.pauseOverlay.setVisible(false);
            this.pauseText.setVisible(false);
            this.pauseRestartBtn.setVisible(false);
            this.mobilePauseBtn.setText("PAUSE");
        }
    }

    private updateHpBar() {
        if (!this.hpBarFill) return;

        this.hpBarFill.clear();
        const staminaScale = DESIGN_WIDTH / 5585;
        const staminaHeight = 293 * staminaScale;

        // Use EXACT SAME inner dimensions as Stamina Bar for consistency
        const fillMaxW = 5413 * staminaScale;
        const fillH = 217 * staminaScale;

        const hpPercent = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        const fillWidth = fillMaxW * hpPercent;

        const hpY = this.hpBarFrame.y;

        // Calculate Top-Left of the Fill Rect logic
        // Center the frame, then apply inner offset
        const frameX = DESIGN_WIDTH / 2;
        const startX = (frameX - (5585 * staminaScale) / 2) + (86 * staminaScale);
        const startY = (hpY - (staminaHeight / 2)) + (38 * staminaScale);

        this.hpBarFill.fillStyle(0xff0000, 1);
        this.hpBarFill.fillRect(startX, startY, fillWidth, fillH);
    }

    // --- Dynamic Power-up Scheduling ---

    scheduleNextBoost() {
        if (this.isGameOver) return;

        // Dynamic Delay: 10s if Fighting Boss, else 15s
        const isFighting = (this.bossState === "FIGHTING");
        const delay = isFighting ? 10000 : 15000;

        this.time.delayedCall(delay, () => {
            if (this.isGameOver) return;
            this.spawnBoost();
            this.scheduleNextBoost(); // Recurse
        });
    }

    spawnBoost() {
        const x = this.getValidSpawnX();
        if (x === null) return;

        const boost = this.boosts.create(x, -50, "boost") as Phaser.Physics.Arcade.Image;
        boost.setScale(0.3);
        boost.setVelocityY(150);
        boost.setDepth(8);

        this.tweens.add({
            targets: boost,
            scaleX: -0.3,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    scheduleNextTripleShot() {
        if (this.isGameOver) return;

        // Dynamic Delay: 10s if Fighting Boss, else 25s
        const isFighting = (this.bossState === "FIGHTING");
        const delay = isFighting ? 10000 : 25000;

        this.time.delayedCall(delay, () => {
            if (this.isGameOver) return;
            this.spawnTripleShot();
            this.scheduleNextTripleShot(); // Recurse
        });
    }

    spawnTripleShot() {
        const x = this.getValidSpawnX();
        if (x === null) return;

        const item = this.tripleShots.create(x, -50, "tripleshot") as Phaser.Physics.Arcade.Image;
        item.setScale(0.06);
        item.setVelocityY(150);
        item.setDepth(8);

        this.tweens.add({
            targets: item,
            scaleX: -0.06,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    scheduleNextHeal() {
        if (this.isGameOver) return;

        // Dynamic Delay: 10s if Fighting Boss, else 60s
        const isFighting = (this.bossState === "FIGHTING");
        const delay = isFighting ? 10000 : 60000;

        this.time.delayedCall(delay, () => {
            if (this.isGameOver) return;
            this.spawnHeal();
            this.scheduleNextHeal(); // Recurse
        });
    }

    spawnHeal() {
        const x = this.getValidSpawnX();
        if (x === null) return;

        const item = this.heals.create(x, -50, "heal") as Phaser.Physics.Arcade.Image;
        item.setScale(0.45);
        item.setVelocityY(150);
        item.setDepth(8);
        item.clearTint(); // [NEW] Ensure no tint overrides the SVG colors

        this.tweens.add({
            targets: item,
            scaleX: -0.45,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    // Shield Power-up Logic -- Properties defined at top of class

    scheduleNextShield() {
        if (this.isGameOver) return;

        // Fixed Delay: Every 35 seconds
        const delay = 35000;

        this.time.delayedCall(delay, () => {
            if (this.isGameOver) return;
            this.spawnShield();
            this.scheduleNextShield(); // Recurse
        });
    }

    spawnShield() {
        const x = this.getValidSpawnX();
        if (x === null) return;

        const item = this.shields.create(x, -50, "shield") as Phaser.Physics.Arcade.Image;
        // 1.5x bigger (0.15 * 1.5 = 0.225)
        item.setScale(0.225);
        item.setVelocityY(150);
        item.setDepth(8);

        // Rotate and Fall (like Boost)
        this.tweens.add({
            targets: item,
            scaleX: -0.225, // Maintain aspect ratio flip
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    getValidSpawnX(padding: number = 80): number | null {
        const attempts = 15;
        for (let i = 0; i < attempts; i++) {
            const x = Phaser.Math.Between(50, DESIGN_WIDTH - 50);
            let safe = true;

            // Check against all powerup groups
            const groups = [this.boosts, this.tripleShots, this.heals, this.shields];
            for (const group of groups) {
                const children = group.getChildren() as Phaser.Physics.Arcade.Image[];
                for (const child of children) {
                    if (child.active) {
                        // Only care if they are near the top (spawning area) - < 150px
                        if (child.y < 150 && Math.abs(child.x - x) < padding) {
                            safe = false;
                            break;
                        }
                    }
                }
                if (!safe) break;
            }

            if (safe) return x;
        }
        return null; // Could not find a spot (Screen crowded)
    }

    activateShield() {
        // Reset Logic
        this.isShieldActive = true;
        this.shieldTimer = this.maxShieldTime; // Refill Timer
        this.shieldUIContainer.setVisible(true);

        // Remove old visual if exists
        if (this.shieldEffect) this.shieldEffect.destroy();

        // Visual: Create Shield Effect attached to Ship
        this.shieldEffect = this.add.image(this.ship.x, this.ship.y, "shield-fx");
        this.shieldEffect.setDepth(this.ship.depth + 1); // Above ship

        // Scale relative to ship (Mobile fix)
        // Previous fixed scale 0.25 was too big on mobile.
        // Ship is scaled to typical width ~120px. 
        // We want shield to be slightly larger than ship.
        this.shieldEffect.setScale(this.ship.scaleX * 0.8);

        // Yellow Glow Effect on Ship (Keep as secondary visual)
        if ((this.ship as any).preFX) {
            (this.ship as any).preFX.clear();
            (this.ship as any).preFX.addGlow(0xffff00, 4, 0, false, 0.1, 10);
        } else {
            this.ship.setTint(0xffff00);
        }
    }
    spawnDragon() {
        // Spawn at random X, top Y
        const x = Phaser.Math.Between(50, DESIGN_WIDTH - 50);
        const y = -100; // Start above screen
        const dragon = this.dragons.create(x, y, 'dragon') as Phaser.Physics.Arcade.Sprite;
        dragon.play('dragon-fly');
        dragon.setScale(0.4); // Adjust scale (1268/4 = 317w. 317*0.4 ~= 126px. Similar to Boss? No, smaller. Boss is Huge.)
        // Boss is 600px * scale? Ship is 60px. Bat is 317*0.2 = 60px.
        // Dragon should be bigger than bat but smaller than boss.
        // 0.4 scale -> 126px width. Good.
        dragon.setData('health', 6);
        dragon.setVelocityY(Phaser.Math.Between(120, 180)); // 1.5x Speed (120-180)
        // Bat is 200-400. Ghost is 80-150. Dragon is boss-like? 80-120 is slow.
        dragon.setDepth(10);

        if (dragon.body) {
            (dragon.body as Phaser.Physics.Arcade.Body).setSize(dragon.width * 0.6, dragon.height * 0.6);
        }

        // Attack Logic: Every 2 seconds
        // Create a recursive attack loop
        const attackLoop = () => {
            if (!dragon.active || !this.dragons.contains(dragon)) return;

            // Texture Swap: "Ateş topu ateşleme süresince dragon sprite image dragon fire görseliyle yer değiştirecek"
            // Stop animation, set texture
            dragon.stop(); // Stop 'dragon-fly'
            dragon.setTexture('dragon-fire');

            // Fire 4 shots in quick succession
            let shotsFired = 0;
            const burstDelay = 150; // ms between shots in the burst

            const fireNext = () => {
                if (!dragon.active) return;

                this.fireDragonLaser(dragon);
                shotsFired++;

                if (shotsFired < 4) {
                    this.time.delayedCall(burstDelay, fireNext);
                } else {
                    // All shots fired. 
                    // Maintain "firing" texture for a bit? user said "ateşleme durduğunda sprite sheet yeniden belirecek"
                    // After the last shot, wait a tiny bit then revert.
                    this.time.delayedCall(200, () => {
                        if (dragon.active) {
                            dragon.play('dragon-fly'); // Revert to sprite sheet animation
                        }
                    });
                    // Schedule next attack cycle (2 seconds FROM NOW? or 2s interval?)
                    // "Her iki saniyede bir" -> Interval.
                    // I'll schedule the next LOOP call.
                    this.time.delayedCall(2000, attackLoop);
                }
            };

            fireNext();
        };

        // Start first attack loop after 1 second (so it enters screen first)
        this.time.delayedCall(1000, attackLoop);
    }

    fireDragonLaser(dragon: Phaser.Physics.Arcade.Sprite) {
        if (!dragon.active) return;
        // "Blue fire ball" -> 'blue-fireball'
        const laser = this.dragonLasers.create(dragon.x, dragon.y + 40, 'blue-fireball') as Phaser.Physics.Arcade.Image;
        if (laser) {
            laser.setVelocityY(400); // Fast projectile
            laser.setScale(0.5); // User requested half size ("yarı yarıya düşür")
            laser.setDepth(14);
        }
    }

    handleProjectileHitDragon(proj: Phaser.Physics.Arcade.Image, dragon: Phaser.Physics.Arcade.Sprite) {
        if (!dragon.active || !proj.active) return;

        // Prevent damage if dragon is off-screen (top)
        if (dragon.y < 0) {
            proj.destroy(); // Destroy projectile but don't damage dragon
            return;
        }

        proj.destroy();
        this.createExplosion(proj.x, proj.y); // Use existing explosion visual

        const hp = dragon.getData('health') - 1;
        if (hp <= 0) {
            this.createExplosion(dragon.x, dragon.y);
            dragon.destroy();
            this.score += 50;
            this.scoreText.setText("SCORE: " + this.score);
        } else {
            dragon.setData('health', hp);
            dragon.setTint(0xff0000);
            this.time.delayedCall(100, () => {
                if (dragon.active) dragon.clearTint();
            });
        }
    }
}
