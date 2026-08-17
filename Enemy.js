class Enemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 200;
        this.maxHp = 200;

        this.state = 'IDLE'; // 'IDLE', 'ATTACK', 'STAGGERED', 'HURT'
        this.facingDirection = -1;

        // SISTEM JATAH SERANG & RNG STABLE
        this.hasAttackToken = true;
        this.chaseThreshold = 60;   // Jarak default menyerang
        this.retreatThreshold = 120; // Jarak default jaga jarak
        this.updateRNGThresholds(); // Set nilai RNG awal

        // Timer untuk memperbarui nilai RNG secara berkala (tiap 800ms)
        this.scene.time.addEvent({
            delay: 800,
            callback: this.updateRNGThresholds,
            callbackScope: this,
            loop: true
        });

        this.sprite = scene.add.rectangle(x, y, 30, 60, 0x880000);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setCollideWorldBounds(true);

        this.attackHitbox = scene.add.rectangle(0, 0, 45, 30, 0xffaa00, 0.6);
        scene.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body.setAllowGravity(false);
        this.deactivateAttackHitbox();

        this.hpBar = scene.add.rectangle(x, y - 40, 40, 6, 0x00ff00);
    }

    // Mengalkulasi jarak ideal baru secara berkala (Bukan setiap frame!)
    updateRNGThresholds() {
        this.chaseThreshold = 60 + Phaser.Math.Between(-10, 15);
        this.retreatThreshold = 120 + Phaser.Math.Between(-20, 25);
    }

    clearTimers() {
        this.scene.time.removeEvent(this.attackTimer);
        this.scene.time.removeEvent(this.staggerTimer);
        this.scene.time.removeEvent(this.hurtTimer);
    }
  
  
    getParried(attackerDirection) {
        this.clearTimers();
        this.deactivateAttackHitbox();
        this.state = 'STAGGERED';

        // 1. Berikan Knockback DULU
        const knockbackForce = 220;
        this.sprite.body.setVelocityX(attackerDirection * knockbackForce);
        this.sprite.body.setVelocityY(-60);

        this.sprite.setFillStyle(0xaa00aa); // Warna Ungu (Staggered)

        // Cabut token serang & perpanjang jedanya agar tidak langsung nyerang balik
        this.hasAttackToken = false;

        // 2. Kunci kecepatan (Stun) BARU dilakukan setelah knockback meluncur (150ms)
        this.staggerTimer = this.scene.time.delayedCall(150, () => {
            if (this.hp > 0 && this.state === 'STAGGERED') {
                this.sprite.body.setVelocityX(0); // Berhenti slide
                
                // Sisa durasi Stun (350ms)
                this.scene.time.delayedCall(350, () => {
                    if (this.hp > 0) {
                        this.sprite.setFillStyle(0x880000);
                        this.state = 'IDLE';

                        // Beri jeda 1 detik lagi sebelum musuh boleh menyerang lagi
                        this.scene.time.delayedCall(1000, () => {
                            this.hasAttackToken = true;
                        });
                    }
                });
            }
        });
    }


    takeDamage(baseDamage, knockbackForce, attackerDirection) {
        if (this.hp <= 0) return;

        const isBackstab = (attackerDirection === this.facingDirection);
        const finalDamage = isBackstab ? baseDamage * 2 : baseDamage;

        this.hp = Math.max(0, this.hp - finalDamage);
        this.hpBar.setSize(40 * (this.hp / this.maxHp), 6);

        const dmgTxt = this.scene.add.text(this.sprite.x, this.sprite.y - 30, 
            isBackstab ? `CRITICAL! -${finalDamage}` : `-${finalDamage}`, 
            { font: 'bold 14px Arial', fill: isBackstab ? '#ffff00' : '#ffffff' }
        ).setOrigin(0.5);

        this.scene.tweens.add({
            targets: dmgTxt, y: dmgTxt.y - 25, alpha: 0, duration: 500,
            onComplete: () => dmgTxt.destroy()
        });

        this.sprite.setFillStyle(isBackstab ? 0xffff00 : 0xffffff);

        if (this.state === 'STAGGERED') {
            this.scene.time.delayedCall(150, () => {
                if (this.state === 'STAGGERED' && this.hp > 0) this.sprite.setFillStyle(0xaa00aa);
            });
        } else {
            this.clearTimers();
            this.deactivateAttackHitbox();
            this.state = 'HURT';

            this.sprite.body.setVelocityX(attackerDirection * knockbackForce);
            this.sprite.body.setVelocityY(-100);

            this.hurtTimer = this.scene.time.delayedCall(200, () => {
                if (this.hp > 0) {
                    this.sprite.setFillStyle(0x880000);
                    this.sprite.body.setVelocityX(0);
                    this.state = 'IDLE';
                }
            });
        }

        if (this.hp <= 0) this.die();
    }

    executeAttack() {
        if (this.state !== 'IDLE' || !this.hasAttackToken || this.hp <= 0) return;

        this.state = 'ATTACK';
        this.sprite.body.setVelocityX(0);
        this.sprite.setFillStyle(0xffff00);

        this.attackTimer = this.scene.time.delayedCall(400, () => {
            if (this.state !== 'ATTACK') return;
            
            this.sprite.setFillStyle(0xff4400);
            this.activateAttackHitbox();

            this.attackTimer = this.scene.time.delayedCall(150, () => {
                this.deactivateAttackHitbox();
                if (this.state !== 'ATTACK') return;
                
                this.sprite.setFillStyle(0x880000);
                this.hasAttackToken = false;

                this.scene.time.delayedCall(1500, () => {
                    this.hasAttackToken = true;
                });

                this.attackTimer = this.scene.time.delayedCall(800, () => {
                    if (this.state === 'ATTACK') {
                        this.state = 'IDLE';
                    }
                });
            });
        });
    }

    activateAttackHitbox() {
        const offsetX = this.facingDirection === 1 ? 35 : -35;
        this.attackHitbox.setPosition(this.sprite.x + offsetX, this.sprite.y);
        this.attackHitbox.setVisible(true);
        this.attackHitbox.body.enable = true;
    }

    deactivateAttackHitbox() {
        this.attackHitbox.setVisible(false);
        this.attackHitbox.body.enable = false;
    }

    die() {
        this.clearTimers();
        this.deactivateAttackHitbox();
        this.hpBar.destroy();
        this.sprite.destroy();
    }

    update() {
        if (!this.sprite.active || this.hp <= 0) return;

        this.hpBar.setPosition(this.sprite.x, this.sprite.y - 40);

        if (this.attackHitbox.body.enable) {
            const offsetX = this.facingDirection === 1 ? 35 : -35;
            this.attackHitbox.setPosition(this.sprite.x + offsetX, this.sprite.y);
        }

        // KUNCI GERAKAN: Jangan set VelocityX(0) jika sedang STAGGERED (biarkan knockback meluncur!)
        if (this.state !== 'IDLE') {
            if (this.state === 'ATTACK') {
                this.sprite.body.setVelocityX(0);
            }
            return;
        }

        const player = this.scene.player;
        if (player.hp <= 0) return;

        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
        this.facingDirection = (player.sprite.x > this.sprite.x) ? 1 : -1;

        if (this.hasAttackToken) {
            if (distance > this.chaseThreshold) {
                this.sprite.body.setVelocityX(this.facingDirection * 110);
            } else {
                this.sprite.body.setVelocityX(0);
                this.executeAttack();
            }
        } else {
            if (distance < this.retreatThreshold) {
                this.sprite.body.setVelocityX(this.facingDirection * -90);
            } else {
                this.sprite.body.setVelocityX(0);
            }
        }
    }
}
