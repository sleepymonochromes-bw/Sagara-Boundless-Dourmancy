class Controls {
    constructor(scene) {
        this.scene = scene;
        this.isMovingLeft = false;
        this.isMovingRight = false;
        this.isGuardDown = false;

        // Visual UI Buttons
        this.btnLeft = scene.add.rectangle(80, 400, 80, 60, 0x555555).setInteractive().setScrollFactor(0);
        scene.add.text(65, 390, 'LEFT', { font: '16px Arial', fill: '#ffffff' }).setScrollFactor(0);

        this.btnRight = scene.add.rectangle(180, 400, 80, 60, 0x555555).setInteractive().setScrollFactor(0);
        scene.add.text(160, 390, 'RIGHT', { font: '16px Arial', fill: '#ffffff' }).setScrollFactor(0);

        this.btnJump = scene.add.rectangle(520, 400, 80, 60, 0xaa5500).setInteractive().setScrollFactor(0);
        scene.add.text(498, 390, 'JUMP', { font: '16px Arial', fill: '#ffffff' }).setScrollFactor(0);

        this.btnGuard = scene.add.rectangle(620, 400, 80, 60, 0x0088cc).setInteractive().setScrollFactor(0);
        scene.add.text(592, 390, 'PARRY', { font: '16px Arial', fill: '#ffffff' }).setScrollFactor(0);

        this.btnAttack = scene.add.rectangle(720, 400, 80, 60, 0xcc0000).setInteractive().setScrollFactor(0);
        scene.add.text(692, 390, 'ATTACK', { font: '16px Arial', fill: '#ffffff' }).setScrollFactor(0);

        // Keyboard Keys
        this.keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keySpace = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyJ = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.keyK = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);

        this.setupListeners();
    }

    setupListeners() {
        const processDpadInputs = () => {
            let leftActive = false;
            let rightActive = false;

            this.scene.input.manager.pointers.forEach(pointer => {
                if (pointer.isDown) {
                    const objects = this.scene.input.hitTestPointer(pointer);
                    if (objects.includes(this.btnLeft)) leftActive = true;
                    if (objects.includes(this.btnRight)) rightActive = true;
                }
            });

            this.isMovingLeft = leftActive;
            this.isMovingRight = rightActive;
            this.btnLeft.setAlpha(this.isMovingLeft ? 0.5 : 1.0);
            this.btnRight.setAlpha(this.isMovingRight ? 0.5 : 1.0);
        };

        this.scene.input.on('pointerdown', processDpadInputs);
        this.scene.input.on('pointerup', processDpadInputs);
        this.scene.input.on('pointermove', processDpadInputs);

        // Action Buttons Events (Setiap tombol mengeksekusi aksinya sendiri)
        this.btnJump.on('pointerdown', () => this.scene.player.executeJump());
        this.btnAttack.on('pointerdown', () => this.scene.combatManager.executeBasicAttack());
        
        // Touch Parry / Guard Button
        this.btnGuard.on('pointerdown', () => {
            this.isGuardDown = true;
            this.scene.player.startGuard();
        });
        this.btnGuard.on('pointerup', () => {
            this.isGuardDown = false;
            this.scene.player.stopGuard();
        });
    }

    get moveLeft() { return this.isMovingLeft || this.keyA.isDown; }
    get moveRight() { return this.isMovingRight || this.keyD.isDown; }
    get isParryPressed() { return this.isGuardDown || this.keyK.isDown; }
}
