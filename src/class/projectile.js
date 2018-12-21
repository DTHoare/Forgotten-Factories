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
  }

  update() {
    this.age ++;
    var colorValue = Math.round(255.*(1.- (this.age/this.maxAge)));
    var hex = Phaser.Display.Color.RGBToString(colorValue, colorValue, colorValue, 255, "0x");
    //console.log(hex);
    this.setTint(hex);
    this.limitSpeed();
  }

  limitSpeed() {
    if(this.body.speed > this.maxVelocity) {
      var mult = this.maxVelocity / this.body.speed;
      this.setVelocityX(this.body.velocity.x * mult);
      this.setVelocityY(this.body.velocity.y * mult);
    }
  }

  init(charge, angle) {
    var speed = charge / 4.0;
    this.maxAge = charge;
    this.setVelocityX(speed*Math.cos(angle));
    this.setVelocityY(speed*Math.sin(angle));
  }
}

class Projectile_Teleport extends Projectile{
  constructor(scene, x, y, texture){
    super(scene, x, y, texture);
    this.maxAge = 100;
    this.maxVelocity = 20.;
    this.setBody({
         type: 'circle',
         radius: 16
     });
     this.setCollidesWith([collision_block]);
     this.setBounce(0.0);

     scene.matterCollision.addOnCollideStart({
       objectA: [this],
       callback: function() {this.age = this.maxAge+1},
       context: this
     });
  }

}

class Projectile_Ghost extends Projectile{
  constructor(scene, x, y, texture){
    super(scene, x, y, texture);
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

     scene.matterCollision.addOnCollideStart({
       objectA: [this],
       //callback: function() {this.age = this.maxAge+1; objectA.isActive = false;},
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

  update() {
    this.age ++;
    var colorValue = Math.round(255.*(1.- ( (this.age-1)/this.maxAge)));
    var hex = Phaser.Display.Color.RGBToString(colorValue, colorValue, colorValue, 255, "0x");
    //console.log(hex);
    this.setTint(hex);
    this.limitSpeed();
  }
}

class Projectile_Bubble extends Projectile{
  constructor(scene, x, y, texture){
    super(scene, x, y, texture);
    this.age = 0;
    this.maxAge = 450;
    this.maxVelocity = 20.;
    this.setBody({
         type: 'rectangle',
         width: 76,
         height: 46
       }, {
         friction: 0.8,
         frictionAir: 0.08,
         frictionStatic: 0.8,
         mass: 100,
         chamfer: 28,
         inertia: 12000
     });
     this.setCollisionCategory(collision_block);
     //this.setCollidesWith([collision_block, collision_player, collision_particle]);
     this.setBounce(0.0);
     this.setIgnoreGravity(true);

     // scene.matter.world.on('afterupdate', function () {
     //   console.log(this);
     //   this.body.isSleeping = false;
     // },this);
  }

  init(charge, angle) {
    var speed = charge / 4.0;
    this.setVelocityX(speed*Math.cos(angle));
    this.setVelocityY(speed*Math.sin(angle));
  }
}
