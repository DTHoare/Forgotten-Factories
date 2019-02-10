
/**
 * Projectiles are small particles that obey physics but do not interact with
 *    eachother. They have a limited lifespan.
 */
class Projectile extends Phaser.Physics.Matter.Sprite{

  constructor(scene, x, y, texture){
    super(scene.matter.world, x, y, texture);
    this.scene = scene
    this.age = 0;
    this.maxAge = 200;
    this.maxVelocity = 10.;
    this.setBody({
         type: 'circle',
         radius: 3
     });
    this.setCollisionCategory(collision_particle);
    this.setCollidesWith([collision_block]);
    this.setBounce(0.8);
    this.setTint(0x60fcff);
    this.scene.events.on("update", this.update, this)
    //this.scene.events.on("shutdown", this.destroy, this);
    //this.scene.events.on("destroy", this.destroy, this);

  }

  destroy() {
    this.destroyed = true
    this.scene.events.off("update", this.update, this)
    //this.scene.events.off("shutdown", this.destroy, this);
    //this.scene.events.off("destroy", this.destroy, this);
    super.destroy()
  }


  /**
   * update - increase object age, and adjust colour accordinly. Limit speed.
   */
  update() {
    if (this.age > this.maxAge && !this.destroyed) {
      this.destroy()
    }
    if (this.destroyed) {
      return;
    }
    this.age ++;
    this.setAlpha(1.- (this.age/ (this.maxAge-1)) );
    this.limitSpeed();
  }

  limitSpeed() {
    if(this.body.speed > this.maxVelocity) {
      var mult = this.maxVelocity / this.body.speed;
      this.setVelocityX(this.body.velocity.x * mult);
      this.setVelocityY(this.body.velocity.y * mult);
    }
  }


  /**
   * init - set initial velocity of particle
   *
   * @param  {type} charge mana used to cast spell
   * @param  {type} angle  angle to cast spell
   */
  init(charge, angle) {
    var speed = charge / 5.0;
    this.maxAge = charge * 1.3;
    this.setVelocityX(speed*Math.cos(angle));
    this.setVelocityY(speed*Math.sin(angle));
  }
}


/**
 * Extention of projectile used for teleport spell. Dies on collision
 */
class Projectile_Teleport extends Projectile{
  constructor(scene, x, y, texture){
    super(scene, x, y, texture);
    this.scene = scene
    this.maxAge = 140;
    this.maxVelocity = 20.;
    this.setBody({
         type: 'circle',
         radius: 16
     });
     this.setCollisionCategory([collision_ghost])
     this.setCollidesWith([collision_block,collision_blockPhysical,collision_particle]);
     this.setBounce(0.0);
     this.setTint(0x60fcff);
     this.fail = false;

     //manually handle collisions as two effects need to happen in order
     // First: check if colliding with a blockPhysical to set FAIL
     // Second: apply collision with block and see if teleport happens
     scene.matter.world.on("collisionstart", this.checkCollisions, this);

     scene.matter.world.on("beforeupdate", function() {this.fail = false;}, this);
  }

  update() {
    if(this.destroyed) {
      return;
    }
    if(this.body.velocity.x > 0) {
      this.setFlipX(false)
    } else {
      this.setFlipX(true)
    }
    if (this.age > this.maxAge) {
      this.teleport()
    }
    if (this.body.velocity.y > 0) {
      this.anims.play("teleport-fall", true);
    } else if (this.body.velocity.y < 0) {
      this.anims.play("teleport-jump", true);
    } else {
      this.anims.play("teleport-idle", true);
    }

    super.update()
  }

  teleport() {
    if(!this.fail) {
      this.scene.sound.play('pop', {volume:0.3})
      this.scene.sound.play('bounce')
      player.setX(this.x);
      player.setY(this.y);
      player.setVelocityX(this.body.velocity.x);
      player.setVelocityY(this.body.velocity.y);
      player.limitSpeed()
    }

    this.scene.focusPlayer();
    this.scene.focus = player;
    player.state.mana = 100
  }

  checkCollisions(event) {
    var thisBody;
    var otherBody;
    event.pairs.forEach(pair => {
      //console.log(pair)
      if(pair.bodyA === this.body) {
        thisBody = pair.bodyA
        otherBody = pair.bodyB
      } else if(pair.bodyB === this.body) {
        thisBody = pair.bodyB
        otherBody = pair.bodyA
      } else {
        return;
      }
      if (otherBody.collisionFilter.category === collision_blockPhysical) {
        pair.isActive = false;
        this.fail = true;
      }
    });

    event.pairs.forEach(pair => {
      if(pair.bodyA === this.body) {
        thisBody = pair.bodyA
        otherBody = pair.bodyB
      } else if(pair.bodyB === this.body) {
        thisBody = pair.bodyB
        otherBody = pair.bodyA
      } else {
        return;
      }
      if(otherBody.collisionFilter.category === collision_block) {
        //console.log("collide")
        if(this.fail) {
          //console.log("spell fail")
        } else if (!(otherBody.gameObject instanceof Checkpoint)) {
          this.age = this.maxAge +1 ;
          //this.destroyed = true
          //this.body.isStatic = true
          this.teleport()
        }

      }
      if(otherBody.gameObject.isLethal) {
        player.death(this.x, this.y)
        this.destroy()
        this.fail = true;
        this.age = this.maxAge +1 ;
      }
      if(otherBody.gameObject instanceof Checkpoint) {
        player.resetPosition = {x:otherBody.gameObject.x, y:otherBody.gameObject.y}
      }
    });
  }

  destroy() {

    if (this.scene.matter.world) {
      this.scene.matter.world.off("collisionstart", this.checkCollisions, this);
      this.scene.matter.world.off("beforeupdate", function() {this.fail = false;}, this);
    }
    super.destroy();
  }

}


/**
 * Extension of projectile used for aiming. Does not effect other objects
 */

class Particle_ghost extends Projectile{
  constructor(scene, x, y, texture){
    super(scene, x, y, texture);
    this.scene = scene
    this.age = 0;
    this.maxAge = 50;
    this.maxVelocity = 20.;
     this.setCollisionCategory(collision_ghost);
     this.setCollidesWith([collision_block]);
     this.setMass(0.001);
     this.sound = this.scene.sound.add('tap', {loop:false, volume:0.1})

     //this collision event uses the modified matter engine
     //this class updates in collisions without updating the object it collides with
     scene.matterCollision.addOnCollideStart({
       objectA: [this],
       callback: function(eventData) {
         const { bodyB, gameObjectB, pair} = eventData;
         if (pair.gameObjectA === this) {
           pair.onlyA = true;
           if(this.body.speed > 4.) {
             this.sound.play()
           }

         } else {
           pair.onlyB = true;
           if(this.body.speed > 4.) {
             this.sound.play()
           }
         }

       },
       context: this
     });
   }

   destroy() {
     if(this.destroyed) {
       return;
     }
     this.sound.destroy()
     this.destroyed = true
     this.scene.matterCollision.removeOnCollideStart({objectA: [this]})
     super.destroy()
   }
}

class Projectile_Ghost extends Particle_ghost{
  constructor(scene, x, y, texture){
    super(scene, x, y, texture);
    this.scene = scene
    this.age = 30;
    this.maxAge = 5000;
    this.maxVelocity = 20.;
    this.setBody({
         type: 'circle',
         radius: 16},
         {restitution: 1,
     });
     this.setCollisionCategory(collision_ghost);
     this.setCollidesWith([collision_block]);
     this.setMass(0.001);
  }

}

/**
 * Extension of projectile that is used for the bubble spell. Has a long lasting,
 *     large and massive body that is unaffected by gravity.
 */
class Projectile_Bubble extends Projectile{
  constructor(scene, x, y, texture, charge){
    super(scene, x, y, texture);
    this.age = 0;
    this.maxAge = 650;
    this.maxVelocity = 20.;
    this.touching = false;
    this.displayWidth = charge * 0.8;
    this.displayHeight = charge * 0.5;
    this.setBody({
         type: 'rectangle',
         width: this.displayWidth,
         height: this.displayHeight
       }, {
         friction: 0.9,
         frictionAir: 0.2,
         frictionStatic: 0.9,
         mass: 140,
         chamfer: 28,
         inertia: 21000
     });

     this.setCollisionCategory(collision_block);
     this.setCollidesWith([collision_block, collision_player, collision_particle,collision_ghost,collision_blockPhysical]);
     this.setBounce(0.0);
     this.setIgnoreGravity(true);

  }

  init(charge, angle) {
    // var speed = charge / 4.0;
    // this.setVelocityX(speed*Math.cos(angle));
    // this.setVelocityY(speed*Math.sin(angle));
  }
}

class Projectile_Bubble_Ghost extends Projectile_Bubble{
  constructor(scene, x, y, texture, charge){
    super(scene, x, y, texture, charge);
    this.touching = false;
    this.body.isSensor = true;
    this.setCollidesWith([collision_block, collision_player, collision_particle, collision_blockPhysical]);

     scene.matterCollision.addOnCollideStart({
       objectA: [this],
       callback: function(eventData) {
         const { bodyB, gameObjectB, pair} = eventData;
         if ( (bodyB.collisionFilter.category & collision_ghost) === 0) {
           this.touching = true;
           this.touchTint();
        }
      },
       context: this
     });

     scene.matter.world.on("beforeupdate", function() {this.touching=false}, this);

  }

  touchTint() {
    if(this.touching) {
      this.setTint(0x960638);
    } else {
      this.setTint(0x60fcff);
    }
  }

  init(charge, angle) {
    // var speed = charge / 4.0;
    // this.setVelocityX(speed*Math.cos(angle));
    // this.setVelocityY(speed*Math.sin(angle));
  }

  update() {
    //override and do nothing
  }

}

class Projectile_emitted extends Projectile{
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture);
    this.isLethal = true;
    this.maxVelocity = 20;

    this.properties = {
      "angle": 0,
      "force": 0,
      "lifetime": 100,
      "period": 100,
      "size": 10,
      "age": 0
    };

    for (var i = 0; i < objectConfig.properties.length; i++){
      var key = objectConfig.properties[i];
      this.properties[key["name"]] = key["value"];
    }
    this.displayWidth = this.properties["size"]*2.
    this.displayHeight = this.properties["size"]*2.
    this.setBody({
         type: 'circle',
         radius: this.properties["size"]-3
    });


    this.setCollisionCategory(collision_particle);
    this.setCollidesWith([collision_block, collision_player, collision_ghost]);
    this.setBounce(0.2);
    this.setTint(0xfd0000)

    this.maxAge = parseFloat(this.properties["lifetime"])
    // this.applyForce({
    //   x: this.properties["force"]*Math.cos(this.properties["angle"]*Math.PI/180.),
    //   y: this.properties["force"]*Math.sin(this.properties["angle"]*Math.PI/180.)
    // })
    this.setVelocityX(this.properties["force"]*Math.cos(this.properties["angle"]*Math.PI/180.))
    this.setVelocityY(this.properties["force"]*Math.sin(this.properties["angle"]*Math.PI/180.))

  }

  destroy() {
    if(this.destroyed) {
      return;
    }
    super.destroy()
  }

  update() {
    if (this.age > this.maxAge && !this.destroyed) {
      this.destroy()
    }
    if (this.destroyed) {
      return;
    }
    this.age ++;
    this.setAlpha(1.4- (this.age/ (this.maxAge-1)) );
    this.limitSpeed();
  }
}
