class CombatManager {
    constructor(scene) {
        this.scene = scene;
        this.comboStep = 1;
        this.isAttacking = false;
        this.comboResetTimer = null;

        // Data Damage, Knockback, Hit-Stop, dan Shake
        this.attackData = {
            1: { startup: 80, active: 100, recovery: 150, lunge: 120, damage: 15, knockback: 150, hitstop: 40, shake: 0.003 },
            2: { startup: 60, active: 100, recovery: 150, lunge: 150, damage: 20, knockback: 200, hitstop: 50, shake: 0.005 },
            3: { startup: 120, active: 150, recovery: 250, lunge: 250, damage: 35, knockback: 350, hitstop: 90, shake: 0.012 }
        };

        // Hitbox System
        this.hitbox = scene.add.rectangle(0, 0, 40, 30, 0xff0000, 0.5);
        scene.physics.add.existing(this.hitbox);
        this.hitbox.body.setAllowGravity(false);
        this.deactivateHitbox();

        this.hasHitEnemy = false; 
    }

    executeBasicAttack() {
        const player = this.scene.player;
        const isOnGround = player.sprite.body.touching.down || player.sprite.body.blocked.down;

        if (!isOnGround || this.isAttacking) return;

        this.isAttacking = true;
        this.hasHitEnemy = false;
        const config = this.attackData[this.comboStep];
        this.scene.controls.btnAttack.setAlpha(0.5);

        if (this.comboResetTimer) this.comboResetTimer.remove();

        // Startup Phase
        this.scene.time.delayedCall(config.startup, () => {
            // Active Phase
            this.activateHitbox();
            player.sprite.body.setVelocityX(player.facingDirection * config.lunge);

            this.scene.time.delayedCall(config.active, () => {
                // Recovery Phase
                this.deactivateHitbox();
                player.sprite.body.setVelocityX(0);

                this.scene.time.delayedCall(config.recovery, () => {
                    this.isAttacking = false;
                    this.scene.controls.btnAttack.setAlpha(1.0);

                    if (this.comboStep < 3) {
                        this.comboStep++;
                        this.comboResetTimer = this.scene.time.delayedCall(400, () => { this.comboStep = 1; });
                    } else {
                        this.comboStep = 1;
                    }
                });
            });
        });
    }

    activateHitbox() {
        if (this.comboStep === 3) {
            this.hitbox.setSize(55, 18);
            this.hitbox.body.setSize(55, 18);
        } else {
            this.hitbox.setSize(38, 38);
            this.hitbox.body.setSize(38, 38);
        }
        this.updateHitboxPosition();
        this.hitbox.setVisible(true);
        this.hitbox.body.enable = true;
    }

    deactivateHitbox() {
        this.hitbox.setVisible(false);
        this.hitbox.body.enable = false;
    }

    updateHitboxPosition() {
        const player = this.scene.player;
        let offsetX = (this.comboStep === 3) ? (player.facingDirection === 1 ? 41 : -41) : (player.facingDirection === 1 ? 33 : -33);
        this.hitbox.setPosition(player.sprite.x + offsetX, player.sprite.y);
    }

    // Fungsi Kena Hit dengan Hit-Stop & Shake Kamera
    checkHit(enemy) {
        if (this.hitbox.body.enable && !this.hasHitEnemy) {
            this.hasHitEnemy = true;
            const config = this.attackData[this.comboStep];
            
            // 1. Serangan ke Musuh
            enemy.takeDamage(config.damage, config.knockback, this.scene.player.facingDirection);

            // 2. Camera Shake (Durasi ms, Kekuatan Intensitas)
            this.scene.cameras.main.shake(config.hitstop + 30, config.shake);

            // 3. Hit-Stop (Membekukan Physics Engine Sejenak)
            this.scene.physics.world.pause();
            
            this.scene.time.delayedCall(config.hitstop, () => {
                this.scene.physics.world.resume();
            });
        }
    }

    update() {
        if (this.hitbox.body.enable) {
            this.updateHitboxPosition();
        }
    }
}
