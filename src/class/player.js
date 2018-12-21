function PlayerState(){
  this.manaRegen = true;
  this.charging = false;
  this.mana = 100;
  this.charge = 0;
  this.facing = 'r';
  this.particleSourceX = + 14;
  this.particleSourceY = - 14;
  this.spell = 'teleport';

  this.startCharge = function(){
    this.charging = true;
    this.manaRegen = false;
  }

  this.endCharge = function(){
    this.charging = false;
    this.manaRegen = true;
    this.charge = 0;
  }

  this.updateMana = function() {
    if (this.mana < 100 && this.manaRegen) {
      this.mana += 2;
    }else if (this.charging && this.mana > 0) {
      var dm = Math.min(this.mana, 3);
      this.mana -= dm;
      this.charge += dm;
    }
    if (this.mana > 100) {
      this.mana = 100;
    }
  }

  this.spendMana = function(x) {
    this.mana -= x;
  }
}

class Player extends Phaser.Physics.Matter.Image{

    constructor(scene, x, y, texture){
        super(scene.matter.world, x, y, texture);
        this.scene = scene;
        this.state = new PlayerState();
        this.setCollisionCategory(collision_player);
        this.setCollidesWith([collision_block, collision_blockPhysical, collision_interactive]);
        this.currentInteractive = null;

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this;
        const mainBody = Bodies.rectangle(0, 0, w * 0.8, h, { chamfer: { radius: 3 } });
        this.sensors = {
          bottom: Bodies.rectangle(0, h * 0.5, w * 0.7, 4, { isSensor: true }),
          left: Bodies.rectangle(-w * 0.4, 0, 6, h * 0.2, { isSensor: true }),
          right: Bodies.rectangle(w * 0.4, 0, 6, h * 0.2, { isSensor: true })
        };
        const compoundBody = Body.create({
          parts: [mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
          frictionStatic: 0.1,
          frictionAir: 0.02,
          friction: 0.1
        });
        this
          .setExistingBody(compoundBody)
          .setScale(1)
          .setFixedRotation() // Sets inertia to infinity so the player can't rotate
          .setPosition(x, y)
          .setBounce(0.2);

        this.isTouching = { left: false, right: false, ground: false };
        scene.matter.world.on("beforeupdate", this.reset, this);

        scene.matterCollision.addOnCollideStart({
          objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
          callback: this.onSensorCollide,
          context: this
        });
        scene.matterCollision.addOnCollideActive({
          objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
          callback: this.onSensorCollide,
          context: this
        });
        scene.matterCollision.addOnCollideActive({
          objectA: this,
          callback: function(eventData) {
            const { bodyB, gameObjectB, pair} = eventData;
            if(gameObjectB instanceof Interactive) {
            //if(gameObjectB instanceof Interactive) {
              this.currentInteractive = gameObjectB;
            }
          },
          context: this
        });
    }

    onSensorCollide({ bodyA, bodyB, pair }) {
      if (bodyB.isSensor) return; // We only care about collisions with physical objects
      if (bodyA === this.sensors.left) {
        this.isTouching.left = true;
        if (pair.separation > 0.5) this.x += (pair.separation - 0.5);
      } else if (bodyA === this.sensors.right) {
        this.isTouching.right = true;
        if (pair.separation > 0.5) this.x -= (pair.separation - 0.5);
      } else if (bodyA === this.sensors.bottom) {
        this.isTouching.ground = true;
      }
    }

    reset() {
      this.isTouching.left = false;
      this.isTouching.right = false;
      this.isTouching.ground = false;
      this.currentInteractive = null;
    }

    generateParticles() {
      if(this.state.charging) {
        var angle = Math.random() * 2 * Math.PI;
        var p = new Projectile(this.world, this.x+this.state.particleSourceX, this.y+this.state.particleSourceY, 'projectile')
        p.setVelocityX(5*Math.cos(angle));
        p.setVelocityY(5*Math.sin(angle));
        p.maxAge = 25;
        return p;
      }
      return null;
    }

    jumpParticles(scene) {
      for (var i = 0; i < 30; i++) {
        var angle = Math.PI/30. * (i-15) + Math.PI + Math.atan2(this.body.velocity.y, this.body.velocity.x);
        var p = new Projectile(this.world, this.x, this.y+14, 'projectile')
        p.setVelocityX(5*Math.cos(angle));
        p.setVelocityY(5*Math.sin(angle));
        p.maxAge = 25;
        p.setCollisionCategory(collision_particle);
        particles[particles.length] = p;
        scene.add.existing(p);
      }

    }

    faceDirection(direction) {
      //console.log(direction);
      if(this.state.facing === direction) {
        //do nothing
      } else {
        this.setFlipX(!this.flipX);
        if(direction === 'r'){
          this.faceRight();
        } else {
          this.faceLeft();
        }
      }
    }

    faceRight() {
      this.state.facing = 'r';
      this.state.particleSourceX = + 14;
    }

    faceLeft() {
      this.state.facing = 'l';
      this.state.particleSourceX = - 14;
    }

    switchSpell() {
      if (this.state.spell === "teleport") {
        this.state.spell = "bubble";
      } else {
        this.state.spell = "teleport";
      }
    }

    interact() {
      if (this.currentInteractive.properties["interact"] === "book") {
        //var text = this.scene.add.bitmapText(this.x,this.y + 100, 'editundo', this.currentInteractive.formattedText);
        game.scene.add('BookScene', Scene_book, true, {text: this.currentInteractive.formattedText});
        game.scene.start('BookScene');
        this.scene.scene.pause();
      }
    }
}
