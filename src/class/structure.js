
/**
 * Structure are objects in the environment that are not tiles
 */
class Structure extends Phaser.Physics.Matter.Sprite{

  constructor(scene, x, y, texture, objectConfig){
    if (!objectConfig.gid) {
      var length = Math.sqrt( objectConfig.width**2 + objectConfig.height**2) /2.
      var angle = Math.atan(objectConfig.height/objectConfig.width)* 180./Math.PI
      x = x + (length )*Math.cos( (objectConfig.rotation+angle)*Math.PI/180.);
      y = y + (length )*Math.sin( (objectConfig.rotation+angle)*Math.PI/180.);
      super(scene.matter.world, x, y, texture);
    } else {
      var length = 16 * 1.414
      var angle = - 45
      x = x + (length )*Math.cos( (objectConfig.rotation+angle)*Math.PI/180.);
      y = y + (length )*Math.sin( (objectConfig.rotation+angle)*Math.PI/180.);
      super(scene.matter.world, x, y, texture, objectConfig.gid-1);
    }


    //super(scene.matter.world, x, y, texture);
    this.scene = scene;
    this.destroyed = false;

    this.activated = false;
    this.displayWidth = objectConfig["width"];
    this.displayHeight = objectConfig["height"];

    this.setBody({
      type: "rectangle",
      width: objectConfig["width"],
      height: objectConfig["height"]})

    this.setAngle(objectConfig.rotation);
    this.setIgnoreGravity(true)

    this.properties = {};
    if(objectConfig.properties) {
      for (var i = 0; i < objectConfig.properties.length; i++){
        var key = objectConfig.properties[i];
        this.properties[key["name"]] = key["value"];
      }
    }


    this.setCollisionCategory(collision_block);
    //this.setCollidesWith([collision_block, collision_player]);
    //
    scene.matterCollision.addOnCollideStart({
      objectA: [this],
      callback: function(eventData) {
        const { bodyB, gameObjectB, pair} = eventData;
        if (pair.gameObjectA === this) {
          pair.onlyB = true;
        } else {
          pair.onlyA = true;
        }

      },
      context: this
    });

    //this.scene.events.on("shutdown", this.destroy, this);
    //this.scene.events.on("destroy", this.destroy, this);
  }

  destroy() {
    this.destroyed = true;
    this.scene.matterCollision.removeOnCollideStart({objectA: [this]})
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);
    super.destroy()
  }
}

class Door extends Structure {
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture, objectConfig)

    this.setStatic(true);
    this.inMotion = 0;

    this.scene.events.on("lever", this.leverFunction, this);

    this.scene.events.on("preupdate", this.update, this);
  }

  leverFunction(key, moveX, moveY, lever) {
    if(this.destroyed) {
      return;
    }
    if (this.properties["leverKey"] === key) {

      //levers deactivate while motion completes
      if(this.inMotion) {
        this.scene.events.emit("cancelLever", lever, key);
        return 0;
      }
      this.activate(moveX, moveY, lever);
    }
  }

  /**
   * activate - move the door. slow property defines whether instant or not
   *     if slow is non-zero this gives the amount of time for motion to complete
   */
  activate(moveX, moveY, lever) {
    var slow = lever.properties["slow"];
    if(!slow) {
      if (lever.flipX) {
        this.y += 32 * moveY;
        this.x += 32 * moveX;
      } else {
        this.y -= 32 * moveY;
        this.x -= 32 * moveX;
      }
    }
    else if(slow) {
      this.inMotion = slow;
      if (lever.flipX) {
        this.yMotion = 32 * moveY / this.inMotion;
        this.xMotion = 32 * moveX / this.inMotion;
      } else {
        this.yMotion = - 32 * moveY / this.inMotion;
        this.xMotion =  -32 * moveX / this.inMotion;
      }
    }

  }

  /**
   * update - if slow motion needed, update the door
   *
   * @return {type}  return 1 if not in motion
   */
  update() {
    if(!this.inMotion || this.destroyed) {
      return 1;
    }

    this.y += this.yMotion;
    this.x += this.xMotion;
    this.inMotion -= 1;

  }

  destroy() {
    this.destroyed = true;
    this.scene.events.off("lever", this.leverFunction, this);
    this.scene.events.off("preupdate", this.update, this);
    super.destroy();
  }
}

class Mover extends Structure {
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture, objectConfig)
    this.up = true
    this.right = true

    this.xMax = this.x
    this.xMin = this.x
    this.yMax = this.y
    this.yMin = this.y
    this.xSpeedMax = 0
    this.xSpeedMin = 0
    this.ySpeedMax = 0
    this.ySpeedMin = 0

    if (this.properties["x"]) {
      this.xMax += parseFloat(this.properties["x"].split(" ")[0])*32
      this.xMin += parseFloat(this.properties["x"].split(" ")[1])*32
    }
    if (this.properties["y"]) {
      this.yMax += parseFloat(this.properties["y"].split(" ")[0])*32
      this.yMin += parseFloat(this.properties["y"].split(" ")[1])*32
    }

    if (this.properties["xSpeed"]) {
      this.xSpeedMax += parseFloat(this.properties["xSpeed"].split(" ")[0])
      this.xSpeedMin += parseFloat(this.properties["xSpeed"].split(" ")[1])
    }
    if (this.properties["ySpeed"]) {
      this.ySpeedMax += parseFloat(this.properties["ySpeed"].split(" ")[0])
      this.ySpeedMin += parseFloat( this.properties["ySpeed"].split(" ")[1])
    }

    this.scene.events.on("preupdate", this.update, this);


  }

  update() {
    if (this.destroyed) {
      return;
    }
    var moveForce = 0.01;
    if (this.up) {
      if(this.body.velocity.y > this.ySpeedMin){
        this.applyForce({x:0, y:-moveForce})
      }
      else {
        this.setVelocityY(this.ySpeedMin)
      }
    } else {
      if(this.body.velocity.y < this.ySpeedMin) {
        this.applyForce({x:0, y:moveForce})
      }
      else {
        this.setVelocityY(this.ySpeedMax)
      }
    }

    if (this.right) {
      if (this.body.velocity.x < this.xSpeedMax) {
        this.applyForce({x:moveForce, y:0})
      } else {
        this.setVelocityX(this.xSpeedMax)
      }

    } else {
      if (this.body.velocity.x > this.xSpeedMin) {
        this.applyForce({x:-moveForce, y:0})
      } else {
        this.setVelocityX(this.xSpeedMin)
      }
    }

    this.checkDirection()

  }

  checkDirection() {
    if (this.up && this.y <= this.yMin) {
      this.setVelocityY(0)
      this.up = !this.up
    } else if(!this.up && this.y >= this.yMax) {
      this.setVelocityY(0)
      this.up = !this.up
    }
    if (this.right && this.x >= this.xMax) {
      this.setVelocityX(0)
      this.right = !this.right
    } else if(!this.right && this.x <= this.xMin) {
      this.setVelocityX(0)
      this.right = !this.right
    }
  }

  destroy() {
    this.scene.events.off("preupdate", this.update, this);

    super.destroy()
  }
}


/**
 * class for barrier spell structure that physically blocks particles and the player
 */
class Barrier extends Structure {
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture, objectConfig)
    this.age = 0;
    this.maxAge = 150;
    this.setTint(0x60fcff);

    this.scene.events.on("preupdate", this.update, this);
  }

  update() {
    this.age += 1;
    this.alpha = (this.maxAge - this.age)/this.maxAge;
    if(this.age > this.maxAge) {
      this.destroy()
    }
  }

  destroy() {
    if(this.destroyed) {
      return;
    }
    this.scene.events.off("preupdate", this.update, this);
    super.destroy()
  }
}

class Breakable extends Structure {
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture, objectConfig)
    this.toDestroy;

    this.scene.matterCollision.addOnCollideStart({
      objectA: this,
      callback: function(eventData) {
        const { bodyB, gameObjectB, pair} = eventData;
        if(gameObjectB.isLethal) {
          this.toDestroy = gameObjectB
        }
      },
      context: this
    });

    this.scene.events.on("postupdate", this.breakTile, this);
  }

  breakTile() {
    if(this.toDestroy && !this.toDestroy.destroyed) {
      this.toDestroy.destroy();
      this.destroy();
    }

  }

  destroy() {
    this.scene.events.off("postupdate", this.breakTile, this);
    this.scene.matterCollision.removeOnCollideStart({objectA: this})
    this.scene.events.off("preupdate", this.update, this);
    super.destroy()
  }
}

class Laser extends Structure {
  constructor(scene, x, y, texture, objectConfig){
    super(scene, x, y, texture, objectConfig)
    this.isLethal = true
    //this.body.isSensor = true

    this.originalWidth = objectConfig.width
    this.period = 50;
    this.duration = 10;
    this.age = 0;
    if (this.properties["period"]) {
      this.period = parseInt(this.properties["period"])
    }
    if (this.properties["duration"]) {
      this.duration = parseFloat(this.properties["duration"])
    }
    if (this.properties["age"]) {
      this.age = parseFloat(this.properties["age"])
    }

    const anims = scene.anims;
    anims.create({
      key: "laser-fire",
      frames: anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
      frameRate: 12,
      repeat: -1
    });
    anims.create({
      key: "laser-aim",
      frames: anims.generateFrameNumbers(texture, { start: 4, end: 6 }),
      frameRate: 12,
      repeat: -1
    });
    anims.create({
      key: "laser-off",
      frames: anims.generateFrameNumbers(texture, { start: 7, end: 7 }),
      frameRate: 6,
      repeat: -1
    });

    this.scene.events.on("preupdate", this.update, this);
  }

  update() {
    this.age = (this.age + 1) % this.period
    if (this.age >= (this.period - this.duration)) {
      //laser firing
      this.isLethal = true
      this.setCollisionCategory(collision_block);
      this.anims.play("laser-fire", true);
    } else if (this.age >= (this.period - this.duration - 35)) {
      //laser aiming
      this.setCollisionCategory(collision_ghost);
      this.isLethal = false
      this.anims.play("laser-aim", true);
    } else {
      //laser off
      this.setCollisionCategory(collision_ghost);
      this.isLethal = false
      this.anims.play("laser-off", true);
    }
  }

  destroy() {
    this.scene.events.off("preupdate", this.update, this);
    super.destroy()
  }
}
