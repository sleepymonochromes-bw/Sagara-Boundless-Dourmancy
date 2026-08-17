class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.facingDirection = 1;
        this.canJump = true;
        this.jumpCooldownTimer = 5000;

        // Player Stats
        this.hp = 100;
        this.maxHp = 100;
        this.isHurt = false;

        // Parry & Guard States
        this.isGuarding = false;
        this.isParryWindow = false;
        this.parryTimer = null;

        this.sprite = scene.add.rectangle(x, y, 27, 54, 0x0088ff);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setCollideWorldBounds(true);

        // UI HP Bar Player
        this.hpBarBg = scene.add.rectangle(20, 20, 204, 16, 0x333333).setOrigin(0, 0).setScrollFactor(0);
        this.hpBar = scene.add.rectangle(22, 22, 200, 12, 0x00ff00).setOrigin(0, 0).setScrollFactor(0);
        scene.add.text(20, 40, 'PLAYER HP', { font: '12px Arial', fill: '#ffffff' }).setScrollFactor(0);
    }

    startGuard() {
        if (this.isHurt || this.hp <= 0 || this.scene.combatManager.isAttacking) return;

        this.isGuarding = true;
        this.isParryWindow = true;
        this.sprite.setFillStyle(0x00ffff);

        if (this.parryTimer) this.parryTimer.remove();
        this.parryTimer = this.scene.time.delayedCall(250, () => {
            this.isParryWindow = false;
            if (this.isGuarding) {
                this.sprite.setFillStyle(0x004488);
            }
        });
    }

    stopGuard() {
        this.isGuarding = false;
        this.isParryWindow = false;
        if (!this.isHurt && this.hp > 0) {
            this.sprite.setFillStyle(0x0088ff);
        }
    }

    takeDamage(damage, attackerDirection) {
        if (this.isHurt || this.hp <= 0) return false;

        if (this.isParryWindow) {
            this.triggerParrySuccess();
            return 'PARRY';
        }

        if (this.isGuarding) {
            damage = Math.floor(damage * 0.3);
            this.sprite.body.setVelocityX(attackerDirection * 80);
        } else {
            this.sprite.body.setVelocityX(attackerDirection * 200);
            this.sprite.body.setVelocityY(-100);
        }

        this.hp -= damage;
        if (this.hp < 0) this.hp = 0;

        const hpPercent = this.hp / this.maxHp;
        this.hpBar.setSize(200 * hpPercent, 12);

        this.isHurt = true;
        this.sprite.setFillStyle(0xff0000);
        this.scene.cameras.main.shake(150, 0.005);

        this.scene.time.delayedCall(250, () => {
            this.isHurt = false;
            if (this.isGuarding) this.sprite.setFillStyle(0x004488);
            else this.sprite.setFillStyle(0x0088ff);
        });

        if (this.hp <= 0) this.die();
        return 'HIT';
    }

    triggerParrySuccess() {
        // Efek Shake & Visual Flash (Tanpa mem-pause fisika agar game tidak freeze)
        this.scene.cameras.main.shake(150, 0.01);

        const flash = this.scene.add.rectangle(400, 225, 800, 450, 0xffffff, 0.5).setDepth(999);
        this.scene.time.delayedCall(80, () => flash.destroy());

        const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 50, 'PERFECT PARRY!', { 
            font: 'bold 18px Arial', 
            fill: '#00ffff' 
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: txt,
            y: txt.y - 30,
            alpha: 0,
            duration: 600,
            onComplete: () => txt.destroy()
        });
    }


    die() {
        if (this.isDead) return;
        this.isDead = true;

        // 1. KUNCI TOTAL PERGERAKAN (Mencegah Slide)
        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.setAcceleration(0, 0);
        this.sprite.body.enable = false; // Matikan fisika agar tidak terdorong/sliding
        
        if (this.deactivateAttackHitbox) this.deactivateAttackHitbox();
        if (this.clearTimers) this.clearTimers();

        // 2. EFEK MENGGELAP (5 Detik Fading ke Hitam)
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 5000,
            onStart: () => {
                // Mengubah warna player menjadi makin gelap
                this.sprite.setTint(0x222222); 
            },
            onComplete: () => {
                // 3. TAMPILKAN GAME OVER TEKS
                this.scene.add.text(
                    this.scene.cameras.main.centerX,
                    this.scene.cameras.main.centerY,
                    'GAME OVER',
                    { 
                        font: 'bold 48px Arial', 
                        fill: '#ff0000',
                        align: 'center'
                    }
                ).setOrigin(0.5);
            }
        });
    }


    executeJump() {
        const isOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;

        if (isOnGround && this.canJump && !this.scene.combatManager.isAttacking && !this.isHurt && !this.isGuarding) {
            this.sprite.body.setVelocityY(-600);
            this.canJump = false;
            this.scene.controls.btnJump.setAlpha(0.4);

            this.scene.time.delayedCall(this.jumpCooldownTimer, () => {
                this.canJump = true;
                this.scene.controls.btnJump.setAlpha(1.0);
            });
        }
    }

    update() {
        // PERINGATAN: Wajib ditaruh di paling atas update()
        // Mencegah input player menggerakkan karakter saat mati
        if (this.isDead || !this.sprite.active) {
            if (this.sprite.body) this.sprite.body.setVelocityX(0);
            return;
        }
          
        if (this.hp <= 0) return;

        const controls = this.scene.controls;

        if (Phaser.Input.Keyboard.JustDown(controls.keyK)) this.startGuard();
        if (Phaser.Input.Keyboard.JustUp(controls.keyK)) this.stopGuard();

        if (controls.moveLeft) this.facingDirection = -1;
        else if (controls.moveRight) this.facingDirection = 1;

        if (!this.scene.combatManager.isAttacking && !this.isHurt && !this.isGuarding) {
            // KECEPATAN JALAN DISESUAIKAN JADI 140 / -140
            if (controls.moveLeft) this.sprite.body.setVelocityX(-140);
            else if (controls.moveRight) this.sprite.body.setVelocityX(140);
            else this.sprite.body.setVelocityX(0);
        } else if (this.isGuarding) {
            this.sprite.body.setVelocityX(0);
        }

        if (Phaser.Input.Keyboard.JustDown(controls.keySpace)) this.executeJump();
        if (Phaser.Input.Keyboard.JustDown(controls.keyJ)) this.scene.combatManager.executeBasicAttack();
    }
}
