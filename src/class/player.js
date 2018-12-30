
/**
 * The player is the playable character, contains state information and interaction
 * TODO: Rework to include controls as well?
 */
class Player extends Phaser.Physics.Matter.Image{

    /**
     * constructor - Create the player through the Matter Image constructor
     * The player body is updated with a physics body and 3 sensors for
     * advanced collision detection.
     * Collision event detections are also set.
     *
     * @param  {type} scene   scene the player belongs to
     * @param  {type} x       spawn position x
     * @param  {type} y       spawn position y
     * @param  {type} texture image texture from texture manager
     */
    constructor(scene, x, y, texture){
        super(scene.matter.world, x, y, texture);
        this.scene = scene;
        this.state = new PlayerState();
        this.resetPosition = {x:x, y:y}
        //this.setCollisionCategory(collision_player);
        //this.setCollidesWith([collision_block, collision_blockPhysical, collision_interactive]);
        this.currentInteractive = null;

        //get the matter body functions
        const { Body, Bodies } = Phaser.Physics.Matter.Matter;
        const { width: w, height: h } = this;

        //set up the player body and sensors
        const mainBody = Bodies.rectangle(0, 0, w * 0.85, h, { chamfer: { radius: 3 } });
        this.sensors = {
          bottom: Bodies.rectangle(0, h * 0.5, w * 0.7, 4, { isSensor: true }),
          left: Bodies.rectangle(-w * 0.45, 0, 6, h * 0.2, { isSensor: true }),
          right: Bodies.rectangle(w * 0.45, 0, 6, h * 0.2, { isSensor: true })
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
          .setBounce(0.2)

        this.setCollisionCategory(collision_player)
        this.setCollidesWith([collision_block, collision_blockPhysical, collision_interactive, collision_particle]);

        //reset collision information each tick
        this.isTouching = { left: false, right: false, ground: false };
        scene.matter.world.on("beforeupdate", this.reset, this);

        //collision events for the sensors to prevent wall interaction
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

        //collision event for interactive objects
        scene.matterCollision.addOnCollideActive({
          objectA: this,
          callback: function(eventData) {
            const { bodyB, gameObjectB, pair} = eventData;

            if(gameObjectB instanceof Interactive) {
            //if(gameObjectB instanceof Interactive) {
              this.currentInteractive = gameObjectB;
              if(gameObjectB instanceof Book) {
                this.scene.events.emit('changeTooltip', "Q to read");
              } else if (gameObjectB instanceof Lever) {
                this.scene.events.emit('changeTooltip', "Q to pull");
              } else if (gameObjectB instanceof Goal) {
                this.scene.events.emit('changeTooltip', "Q to finish level")
              }

            }
          },
          context: this
        });

        scene.matterCollision.addOnCollideStart({
          objectA: this,
          callback: function(eventData) {
            const { bodyB, gameObjectB, pair} = eventData;
            if(gameObjectB instanceof Checkpoint) {
              this.resetPosition = {x:gameObjectB.x, y:gameObjectB.y}
            }

            if(gameObjectB.isLethal  && this.scene.focus === this) {
              this.death(this.x, this.y);
            }

          },
          context: this
        });

        this.scene.events.on("shutdown", this.destroy, this);
        this.scene.events.on("destroy", this.destroy, this);
    }

    destroy() {
      this.destroyed = true;
      this.scene.events.off("shutdown", this.destroy, this);
      this.scene.events.off("destroy", this.destroy, this);
      //this.scene.matter.world.off("beforeupdate", this.reset, this);

      this.scene.matterCollision.removeOnCollideStart({objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right]})
      this.scene.matterCollision.removeOnCollideActive({objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right]})
      this.scene.matterCollision.removeOnCollideStart({objectA: this})
      this.scene.matterCollision.removeOnCollideActive({objectA: this})
    }

    death(x, y) {
      if (this.destroyed) {
        return;
      }
      this.scene.cameras.main.stopFollow();
      this.destroyed = true;
      this.scene.destroyed = true;
      this.state.endCharge()

      this.deathText = this.scene.add.bitmapText(x,y - 50, 'editundo', 'oops.');
      this.scene.add.bitmapText(x,y, 'editundo', '*').setTint('0xffffff').setAlpha(0.8)
      this.scene.matter.world.pause();

      this.deathTimer = this.scene.time.delayedCall(1000, this.respawn, {}, this);

    }

    respawn() {
      this.scene.focusPlayer()
      this.destroyed = false;
      this.scene.destroyed = false;
      this.deathText.destroy()
      this.setPosition(this.resetPosition.x, this.resetPosition.y);
      this.setVelocityX(0)
      this.setVelocityY(0)
      this.scene.matter.world.resume()
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
      this.scene.events.emit('changeTooltip', "");
    }


    /**
     * generateParticles - Create the charging effect particles
     *
     * @return {type}  null if not charging, Projectile if charging
     */
    generateParticles() {
      if(this.state.charging) {
        var angle = Math.random() * 2 * Math.PI;
        var p = new Particle_ghost(this.scene, this.x+this.state.particleSourceX, this.y+this.state.particleSourceY, 'projectile')
        p.setVelocityX(5*Math.cos(angle));
        p.setVelocityY(5*Math.sin(angle));
        p.maxAge = 25;
        return p;
      }
      return null;
    }


    /**
     * jumpParticles - generates jump effect particles and adds them to the scene
     *
     */
    jumpParticles() {
      for (var i = 0; i < 30; i++) {
        var angle = Math.PI/30. * (i-15) + Math.PI + Math.atan2(this.body.velocity.y, this.body.velocity.x);
        var p = new Particle_ghost(this.scene, this.x, this.y+14, 'projectile')
        p.setVelocityX(5*Math.cos(angle));
        p.setVelocityY(5*Math.sin(angle));
        p.maxAge = 25;
        //p.setCollisionCategory(collision_particle);
        particles[particles.length] = p;
        this.scene.add.existing(p);
      }

    }

    createBarrier(startX, startY, endX, endY) {
      if (this.activeBarrier && !this.activeBarrier.destroyed) {
        this.activeBarrier.destroy();
      }
      startX += this.scene.cameras.main.scrollX
      endX += this.scene.cameras.main.scrollX
      startY += this.scene.cameras.main.scrollY
      endY += this.scene.cameras.main.scrollY

      var params = function() {}

      params.height = 16
      params.width = Math.sqrt( (startX-endX)**2 + (startY-endY)**2 )
      params.width = Math.min(this.state.charge *1.0, params.width)
      params.rotation = Phaser.Math.Angle.Between(startX, startY, endX, endY) * 180. / Math.PI
      params.gid = -1 //for processing in Barrier
      params.properties = []

      this.activeBarrier = this.scene.add.existing( new Barrier(this.scene, startX, startY+(params.height/2.), 'door', params) )
      return this.activeBarrier;
    }


    /**
     * faceDirection - set the faceDirection
     *
     * @param  {type} direction "l" or "r"
     */
    faceDirection(direction) {
      if(this.state.facing === direction) {
        //do nothing
      } else {
        //change player faceDirection

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
      this.state.particleSourceX = + 11;
    }

    faceLeft() {
      this.state.facing = 'l';
      this.state.particleSourceX = - 11;
    }

    switchSpell() {
      if (this.state.spell === "teleport") {
        this.state.spell = "barrier";
      } else {
        this.state.spell = "teleport";
      }
    }


    /**
     * interact - causes the player to interact with the currentInteractive
     * Books are read
     */
    interact() {
      if (this.currentInteractive instanceof Book) {
        //var text = this.scene.add.bitmapText(this.x,this.y + 100, 'editundo', this.currentInteractive.formattedText);
        game.scene.add('BookScene', Scene_book, true, {text: this.currentInteractive.formattedText});
        game.scene.start('BookScene');
        this.scene.events.emit('changeTooltip', "Q to close");
        this.scene.scene.pause();
        this.scene.matter.world.pause();
      }
      else if (this.currentInteractive instanceof Lever) {
        //console.log("pull lever")
        this.currentInteractive.activate();
      }
      else {
        this.currentInteractive.activate();
      }
    }
}


/**
 * PlayerState - containor for information about the player used by the game
 * Maybe merge this into the main class?
 */
function PlayerState(){
  this.manaRegen = true;
  this.charging = false;
  this.mana = 100;
  this.charge = 0;
  this.facing = 'r';
  this.particleSourceX = + 11;
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
    this.mana = 100;
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
