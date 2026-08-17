class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    create() {
        this.input.addPointer(2);

        // Floor Environment
        const floor = this.add.rectangle(400, 400, 800, 40, 0x00ff00);
        this.physics.add.existing(floor, true);

        // Initialize Player & Enemy
        this.player = new Player(this, 150, 355);
        this.dummy = new Enemy(this, 550, 350);

        // Physical Collisions (Lantai + Karakter Saling Menghalangi)
        this.physics.add.collider(this.player.sprite, floor);
        this.physics.add.collider(this.dummy.sprite, floor);
        this.physics.add.collider(this.player.sprite, this.dummy.sprite); // TIDAK BISA TEMBUS MUSUH

        // Initialize Managers
        this.combatManager = new CombatManager(this);
        this.controls = new Controls(this);

        // Overlap 1: Hitbox Player -> Mengenai Musuh
        this.physics.add.overlap(this.combatManager.hitbox, this.dummy.sprite, () => {
            this.combatManager.checkHit(this.dummy);
        });

        // Overlap 2: Hitbox Musuh -> Mengenai Player
        this.physics.add.overlap(this.dummy.attackHitbox, this.player.sprite, () => {
            if (this.dummy.attackHitbox.body.enable) {
                this.dummy.deactivateAttackHitbox();
                
                const result = this.player.takeDamage(20, this.dummy.facingDirection);
                
                if (result === 'PARRY') {
                    this.dummy.getParried(this.player.facingDirection);
                }
            }
        });
    }

    update() {
        this.player.update();
        this.combatManager.update();
        this.dummy.update();
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 450,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1500 }, debug: true } },
    scene: [MainScene]
};

const game = new Phaser.Game(config);
