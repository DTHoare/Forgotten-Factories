
/**
 * Projectiles are small particles that obey physics but do not interact with
 *    eachother. They have a limited lifespan.
 */
class Projectile extends Phaser.Physics.Matter.Image{

  constructor(scene, x, y, texture){
    if (scene instanceof Phaser.Scene) {
      scene = scene.matter.world;
    }
    super(scene, x, y, texture);
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
  }


  /**
   * update - increase object age, and adjust colour accordinly. Limit speed.
   */
  update() {
    this.age ++;
    var colorValue = Math.round(255.*(1.- (this.age/this.maxAge)));
    var hex = Phaser.Display.Color.RGBToString(colorValue, colorValue, colorValue, 255, "0x");
    //this.setTint(hex);
    this.setTint(0x60fcff);
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
    var speed = charge / 4.0;
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
     this.setCollidesWith([collision_block,collision_blockPhysical]);
     this.setBounce(0.0);
     this.setTint(0x60fcff);
     this.fail = false;

     this.scene.events.on("shutdown", this.destroy, this);
     this.scene.events.on("destroy", this.destroy, this);

     //manually handle collisions as two effects need to happen in order
     // First: check if colliding with a blockPhysical to set FAIL
     // Second: apply collision with block and see if teleport happens
     scene.matter.world.on("collisionstart", this.checkCollisions, this);

     scene.matter.world.on("beforeupdate", function() {this.fail = false;}, this);
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
        } else {
          this.age = this.maxAge +1 ;
        }

      }
    });
  }

  destroy() {

    // Event listeners
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);

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

     //this collision event uses the modified matter engine
     //this class updates in collisions without updating the object it collides with
     scene.matterCollision.addOnCollideStart({
       objectA: [this],
       callback: function(eventData) {
         const { bodyB, gameObjectB, pair} = eventData;
         if (pair.gameObjectA === this) {
           pair.onlyA = true;
         } else {
           pair.onlyB = true;
         }

       },
       context: this
     });
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

  update() {
    this.age ++;
    var colorValue = Math.round(255.*(1.- ( (this.age-1)/this.maxAge)));
    var hex = Phaser.Display.Color.RGBToString(colorValue, colorValue, colorValue, 255, "0x");
    this.setTint(hex);
    this.limitSpeed();
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
