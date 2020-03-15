class Checkpoint {

  constructor(scene, objectConfig){
    this.x = objectConfig.x + (objectConfig.width / 2)*Math.cos(objectConfig.rotation*Math.PI/180.);
    this.y = objectConfig.y + (objectConfig.height / 2)*Math.cos(objectConfig.rotation*Math.PI/180.);
    this.scene = scene;
    this.destroyed = false;

    this.body = this.scene.matter.add.rectangle(
      this.x,
      this.y,
      objectConfig.width,
      objectConfig.height,
      {
        isSensor: true,
        isStatic: true
      }
    )
    this.body.gameObject = this

    this.body.collisionFilter.category = collision_block ;

    this.scene.events.on("shutdown", this.destroy, this);
    this.scene.events.on("destroy", this.destroy, this);
  }

  destroy() {
    this.destroyed = true;
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);
  }
}


/**
 * Class for emitting lethal particles such as lava drops
 */
class Emitter {
  constructor(scene, objectConfig){
    this.x = objectConfig.x;
    this.y = objectConfig.y;
    this.scene = scene;
    this.destroyed = false;
    this.timer = 0
    this.objectConfig = objectConfig

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
    this.timer = parseFloat(this.properties["period"]) - parseFloat(this.properties["age"])
    this.scene.events.on("update", this.update, this);
    this.scene.events.on("shutdown", this.destroy, this);
    this.scene.events.on("destroy", this.destroy, this);
  }

  destroy() {
    this.destroyed = true;
    this.scene.events.off("update", this.update, this);
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);
  }

  update() {
    if (this.destroyed) {
      return;
    }

    if (this.timer === parseFloat(this.properties["period"])) {
      this.timer = 0;
      this.scene.add.existing(new Projectile_emitted(this.scene, this.x, this.y, "projectile_large", this.objectConfig))
    } else {
      this.timer ++;
    }
  }
}

/**
 * Interactive objects in the environment, player can acess
 */
class Interactive extends Phaser.Physics.Matter.Image{

  /**
   * constructor - creates image that is static and is a sensor
   *
   * @param  {type} scene   scene for object
   * @param  {type} x       spawn position x
   * @param  {type} y       spawn position y
   * @param  {type} texture spritesheet texture to use
   * @param  {type} id      tile id to use from texture
   */
  constructor(scene, x, y, texture, id, objectConfig){
      x = x + (objectConfig.width / 2.)*Math.cos( (objectConfig.rotation-45.)*Math.PI/180.)*1.414;
      y = y + (objectConfig.height / 2.)*Math.sin( (objectConfig.rotation-45.)*Math.PI/180.)*1.414;
      super(scene.matter.world, x, y, texture, id);
      this.setAngle(objectConfig.rotation);
      this.scene = scene;
      this.properties = {};
      this.setStatic(true);
      this.body.isSensor = true;
      this.setCollisionCategory(collision_interactive);
      this.setCollidesWith([collision_player]);
      this.identity = x.toString() + " " + y.toString()

      for (var i = 0; i < objectConfig.properties.length; i++){
        var key = objectConfig.properties[i];
        this.properties[key["name"]] = key["value"];
      }
  }
}


/**
 * Books are objects which can be read
 */
class Book extends Interactive{

  constructor(scene, x, y, texture, id, objectConfig){
      super(scene, x, y, texture, id, objectConfig);
      this.format();
  }

  /**
   * format - convert text property into this.formattedText
   *
   */
  format() {
    if(this.properties["text"]) {
      this.formattedText = this.addLineBreaks(this.properties["text"], 27);
    }
  }

  /**
   * addLineBreaks - description
   *
   * @param  {string} text       Plain text input
   * @param  {number} maxLetters maximum number of letters per line
   * @return {string}            text formatted into lines
   */
  addLineBreaks(text, maxLetters) {
    const split = text.split(/( |\n)/g);
    console.log(text)
    console.log(split)
    let lines = [];

    function nextLine() {
      let newLine = "";
      while (`${newLine} ${split[0]}`.length < maxLetters && split.length && !newLine.includes("\n")) {
        newLine += split.shift();
      }
      lines.push(newLine.trim());
      if (split.length) {
        nextLine();
      }
    }

    nextLine();

    return lines.join("\n");
  }
}

/**
 * Lever is an object with a state that controls something else
 */
class Lever extends Interactive{

  constructor(scene, x, y, texture, id, objectConfig){
      super(scene, x, y, texture, id, objectConfig);

      this.isCancelled = false;

      //check for whether lever cannot be pulled
      this.scene.events.on("cancelLever", function(lever, key) {
        var check;

        //listen for other levers? Useful for linked levers
        if (!this.properties["listen"]) {
          check = this === lever;
        } else {
          check = this.properties["leverKey"].split(" ").includes(key);
        }
        //cancel the lever
        if(check && this.isCancelled === false) {
          this.setFlipX(!this.flipX);
          this.isCancelled = true;
        }
      }, this)

      this.scene.events.on("update", function() {this.isCancelled=false;}, this);

      //if levers are linked, they must listen for each others events
      if(this.properties["listen"]) {
        this.scene.events.on("lever", function(key, mx, my, lever) {
          if (this === lever) {
            return 0;
          } else if (this.properties["leverKey"].split(" ").includes(key)) {
            this.setFlipX(!this.flipX);
          }
        }, this)
      }
  }


  /**
   * activate - emit event with the key of the lever
   */
  activate() {
    this.setFlipX(!this.flipX);
    if (this.properties["setGravity"]) {
      this.scene.matter.world.setGravity(0, parseFloat(this.properties["setGravity"]))
    }
    var moveX = "0";
    var moveY = "0";
    if (this.properties["moveX"]) {moveX = this.properties["moveX"];}
    if (this.properties["moveY"]) {moveY = this.properties["moveY"];}
    var keys = this.properties["leverKey"].split(" ");
    var mx = moveX.split(" ");
    var my = moveY.split(" ");
    for (var i = 0; i < keys.length; i++) {
      this.scene.events.emit("lever", keys[i], parseFloat(mx[i % mx.length]), parseFloat(my[i % my.length]), this);
    }


  }
}

class Goal extends Interactive{

  constructor(scene, x, y, texture, id, objectConfig){
      super(scene, x, y, texture, id, objectConfig);
  }


  /**
   * activate -
   */
  activate() {
    console.log("start level: " + this.properties["level"])
    this.scene.scene.restart({level: this.properties["level"]});
    //game.scene.add('levelEndScene', Scene_levelEnd, false, {level: this.scene.sys.settings.data.level, nextLevel: this.properties["level"]})
    //this.scene.scene.start('levelEndScene', {level: this.scene.sys.settings.data.level, nextLevel: this.properties["level"]});

  }
}

class Pickup extends Interactive{

  constructor(scene, x, y, texture, id, objectConfig){
      super(scene, x, y, texture, id, objectConfig);
  }


  /**
   * activate -
   */
  activate() {
    game.scene.add('levelEndScene', Scene_levelEnd, true)
    //this.scene.bgMusic.stop()
    this.scene.scene.remove('GameScene')
    game.scene.remove('UIScene');
    //this.scene.scene.start('levelEndScene', {level: this.scene.sys.settings.data.level, nextLevel: this.properties["level"]});

  }
}

class Scene_menu extends Phaser.Scene {

  constructor ()
  {
    super('MainMenu');
  }

  create() {
    this.add.image(480, 360, 'bg_menu');
    this.addButton(550, 200, "start", "start")
    this.addButton(550, 250, "level select", "level select")
    this.addButton(550, 300, "credits", "credits")

    if (mute) {
      var soundButton = this.addButton(800, 650, "Unmute", "Mute")
    } else {
      var soundButton = this.addButton(800, 650, "Mute", "Mute")
    }

    if (invincible) {
      var invincibleButton = this.addButton(800, 700, "Turn off invincible", "Invincible")
    } else {
      var invincibleButton = this.addButton(800, 700, "Turn on invincible", "Invincible")
    }

    this.input.on('gameobjectover', function (pointer, button)
    {
        button.setFrame(1);
    }, this);
    this.input.on('gameobjectout', function (pointer, button)
    {
        button.setFrame(0);
    }, this);

    this.input.on('gameobjectup', function (pointer, button)
    {
      if(button.getData('index') === 'start') {
        game.scene.add('Message', new Scene_message(), true)
        this.scene.remove('MainMenu')
      } else if (button.getData('index') === 'level select') {
        game.scene.add('LevelSelect', new Scene_levelSelect(), true)
        this.scene.stop('MainMenu')
      } else if (button.getData('index') === 'credits') {
        game.scene.add('Credits', new Scene_credits(), true)
        this.scene.stop('MainMenu')
      } else if(button.getData('index') === 'Mute') {
        if(mute) {
          mute = false
          soundButton.setText("Mute")
        } else {
          mute = true
          soundButton.setText("Unmute")
        }
      }
      else if(button.getData('index') === 'Invincible') {
        if(invincible) {
          invincible = false
          invincibleButton.setText("Turn on invincible")
        } else {
          invincible = true
          invincibleButton.setText("Turn off invincible")
        }
      }


    }, this);
  }

  addButton(x, y, text, scene) {
    var button = this.add.sprite(x, y, 'button', 0).setInteractive()
    button.setData('index', scene)
    var startText = this.add.bitmapText(x, y, 'editundo', text)
    button.displayWidth = startText.width*1.3
    startText.setOrigin(0.5,0.5)
    var buttonObj = {
      button: button,
      text: startText,
      setText(str) {
        this.text.setText(str);
        this.button.displayWidth = this.text.width*1.3;
      }
    }
    return buttonObj
  }

}


/**
 * The player is the playable character, contains state information and interaction
 * TODO: Rework to include controls as well?
 */
class Player extends Phaser.Physics.Matter.Sprite{

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
        super(scene.matter.world, x, y, texture, 0);
        this.scene = scene;
        this.texture = texture;

        const anims = scene.anims;
        anims.create({
          key: "player-idle",
          frames: anims.generateFrameNumbers(texture, { start: 0, end: 0 }),
          frameRate: 3,
          repeat: -1
        });
        anims.create({
          key: "player-run",
          frames: anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
          frameRate: 8,
          repeat: -1
        });
        anims.create({
          key: "player-fall",
          frames: anims.generateFrameNumbers(texture, { start: 4, end: 7 }),
          frameRate: 12,
          repeat: -1
        });
        anims.create({
          key: "player-jump",
          frames: anims.generateFrameNumbers(texture, { start: 8, end: 11 }),
          frameRate: 12,
          repeat: -1
        });

        this.step1 = this.scene.sound.add('step1', {loop:false})
        this.step2 = this.scene.sound.add('step2', {loop:false})
        this.bounce = this.scene.sound.add('bounce', {loop:false})
        this.chargingSound = this.scene.sound.add('charge', {loop:true})
        this.chargingSound.play()
        this.chargingSound.pause()

        this.state = new PlayerState();
        this.resetPosition = {x:x, y:y}
        this.maxVelocity = 20.
        //this.setCollisionCategory(collision_player);
        //this.setCollidesWith([collision_block, collision_blockPhysical, collision_interactive]);
        this.currentInteractive = null;

        //get the matter body functions
        const { Body, Bodies } = Phaser.Physics.Matter.Matter;
        const { width: w, height: h } = this;

        //set up the player body and sensors
        //this.mainBody = Bodies.rectangle(0, 0, w * 0.85, h, { chamfer: { radius: 3 } });
        this.mainBody = Bodies.rectangle(0, 0, w * 0.6, h, { chamfer: { radius: 3 } });
        this.sensors = {
          // bottom: Bodies.rectangle(0, h * 0.5, w * 0.7, 4, { isSensor: true }),
          // left: Bodies.rectangle(-w * 0.45, 0, 6, h * 0.2, { isSensor: true }),
          // right: Bodies.rectangle(w * 0.45, 0, 6, h * 0.2, { isSensor: true })
          bottom: Bodies.rectangle(0, h * 0.5, w * 0.6, 4, { isSensor: true }),
          left: Bodies.rectangle(-w * 0.32, 0, 5, h * 0.2, { isSensor: true }),
          right: Bodies.rectangle(w * 0.32, 0, 5, h * 0.2, { isSensor: true })
        };
        const compoundBody = Body.create({
          parts: [this.mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
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
        scene.events.on("preupdate", this.reset, this);

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
              else if (gameObjectB instanceof Pickup) {
                this.scene.events.emit('changeTooltip', "Q to pick up")
              }

            }
          },
          context: this
        });

        scene.matterCollision.addOnCollideStart({
          objectA: this.mainBody,
          callback: function(eventData) {
            const { bodyB, gameObjectB, pair} = eventData;
            if(gameObjectB instanceof Checkpoint) {
              this.resetPosition = {x:gameObjectB.x, y:gameObjectB.y}
            }

            if(gameObjectB.isLethal  && this.scene.focus === this && !invincible) {
              this.death(this.x, this.y);
            }
            if(this.body.speed > 6.) {
              this.bounce.play()
            }


          },
          context: this
        });

        this.on('animationupdate', function () {
          if(this.anims.currentAnim.key === 'player-run') {
            if (this.anims.currentFrame.index === 2) {
              this.step1.play();
            } else if (this.anims.currentFrame.index === 4) {
              this.step2.play();
            }
          }
        });

        this.scene.events.on("postupdate", this.update, this)
        this.scene.events.on("shutdown", this.destroy, this);
        this.scene.events.on("destroy", this.destroy, this);
    }

    destroy() {
      this.destroyed = true;
      this.scene.events.off("update", this.update, this)
      this.scene.events.off("shutdown", this.destroy, this);
      this.scene.events.off("destroy", this.destroy, this);
      this.scene.events.off("preupdate", this.reset, this);
      //this.scene.matter.world.off("beforeupdate", this.reset, this);

      this.scene.matterCollision.removeOnCollideStart({objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right]})
      this.scene.matterCollision.removeOnCollideActive({objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right]})
      this.scene.matterCollision.removeOnCollideStart({objectA: this})
      this.scene.matterCollision.removeOnCollideActive({objectA: this})
    }

    update() {
      this.anim();
    }

    anim() {
      if (this.isTouching.ground) {
        if (this.body.force.x !== 0) this.anims.play("player-run", true);
        else this.anims.play("player-idle", true);
      } else if (this.body.velocity.y > 0) {
        this.anims.play("player-fall", true);
      } else if (this.body.velocity.y < 0) {
        this.anims.play("player-jump", true);
      }

      else {
        this.anims.play("player-idle", true);
        //this.anims.stop();
        //this.setTexture(this.texture, 0);
      }
    }

    limitSpeed() {
      if(this.body.speed > this.maxVelocity) {
        var mult = this.maxVelocity / this.body.speed;
        this.setVelocityX(this.body.velocity.x * mult);
        this.setVelocityY(this.body.velocity.y * mult);
      }
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
        if(this.state.charging === false) {
          this.state.mana = 100
        }
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
        var p = new Particle_ghost(this.scene, this.x+this.state.particleSourceX*1.2, this.y+this.state.particleSourceY*0.8, 'projectile')
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

      params.height = 22
      params.width = Math.sqrt( (startX-endX)**2 + (startY-endY)**2 )
      params.width = Math.min(this.state.charge *1.0, params.width)
      params.rotation = Phaser.Math.Angle.Between(startX, startY, endX, endY) * 180. / Math.PI
      //params.gid = -1 //for processing in Barrier
      params.properties = []

      this.activeBarrier = this.scene.add.existing( new Barrier(this.scene, startX, startY, 'barrier', params) )
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
      this.state.particleSourceX = + 6;
    }

    faceLeft() {
      this.state.facing = 'l';
      this.state.particleSourceX = - 6;
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
  this.particleSourceX = + 6;
  this.particleSourceY = - 3;
  this.spell = 'teleport';

  this.startCharge = function(){
    this.charging = true;
    this.manaRegen = false;
    player.chargingSound.resume()
  }

  this.endCharge = function(){
    this.charging = false;
    this.manaRegen = true;
    this.charge = 0;
    //this.mana = 100;
    player.chargingSound.pause()
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
      if(otherBody.gameObject.isLethal && !invincible) {
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


/**
 * Scene used for displaying book text on user interaction
 */
class Scene_book extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'BookScene', active: true });
        this.text = "test";
        this.helpText = "Q to close"
        this.textLeft;
        this.textRight;
    }

    /**
     * textToPages - splits this.text into two pages of text stored in
     *     this.textLeft and this.textRight
     */
    textToPages() {
      const split = this.text.split(/\n|\r/g);
      let pages = [];
      var maxLines = 10;

      function nextLine() {
        let newPage = "";
        var i = 0;
        while (i < maxLines && split.length) {
          newPage += split.shift();
          newPage += "\n\n";
          //console.log(newPage);
          i ++;
        }
        pages.push(newPage);
        if (split.length) {
          nextLine();
        }
      }
      nextLine();
      this.textLeft = pages[0];
      this.textRight = pages[1];


    }

    preload () {
      this.load.image('book', 'assets/book_placeholder.png');
    }

    create () {
      //get text passed in through init
      this.text = this.sys.settings.data["text"];

      this.textToPages();
      this.add.image(480, 400, 'book');

      //make the first letter bigger - size is negative for some reason?
      var bookLetter = this.add.bitmapText(100, 170, 'editundo', this.textLeft.slice(0,1));
      bookLetter.setFontSize(-80);
      bookLetter.setTint(0x000000);

      var booktextL = this.add.bitmapText(100, 180, 'editundo', "   " + this.textLeft.slice(1,-1));
      booktextL.setTint(0x000000);
      var booktextR = this.add.bitmapText(500, 180, 'editundo', this.textRight);
      booktextR.setTint(0x000000);

      this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    }

    update () {
      //resume the game and close this scene
      if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
        game.scene.resume('GameScene');
        game.scene.getScene('GameScene').matter.world.resume();
        //this.scene.stop();
        game.scene.remove('BookScene');
      }

    }
}

class Scene_credits extends Phaser.Scene {

  constructor ()
  {
    super('Credits');
  }

  create () {
    this.add.bitmapText(100, 200, 'editundo', "Created by Daniel Hoare")
    this.add.bitmapText(50, 400, 'editundo', "'Almost New', 'Intended Force', 'Heroic Age' & 'Floating Cities'")
    this.add.bitmapText(50, 430, 'editundo', "       - Kevin MacLeod (incompetech.com)")
    this.add.bitmapText(50, 460, 'editundo', "Licensed under Creative Commons: By Attribution 3.0")
    this.add.bitmapText(100, 600, 'editundo', "Special thanks to Joellen for her patience")

    var text = this.add.bitmapText(300, 50, 'editundo', "Click to return")
    text.setTint(0xcf4ed8)

    this.input.on("pointerup", function() {
      this.scene.launch('MainMenu')
      this.scene.remove("Credits")
    }, this)

  }

}


/**
 * Extension of phaser.scene for running the game itself
 */
class Scene_game extends Phaser.Scene {

  constructor ()
  {
    super('GameScene');
    this.books = [];
    this.trail = [];
    this.bgMusic = null;
    this.cameraOffset = 150;
    this.aimOffsetX = 0;
    this.aimOffsetY = 0;
  }

  focusPlayer() {
    this.focus = player
    this.cameras.main.startFollow(player, true, 0.5, 0.5, this.aimOffsetX, this.cameraOffset + this.aimOffsetY);
  }

  focusObject(obj) {
    this.focus = obj
    this.cameras.main.startFollow(obj, true, 0.5, 0.5, this.aimOffsetX, this.cameraOffset + this.aimOffsetY);
  }

  init(data) {
    this.destroyed = false;
    this.level = data.level
    if (!data.level) {
      this.level = "0"
    }
    this.cameraOffset = 150;
    this.events.emit("postInit");
  }

  preload () {
    this.load.scenePlugin('Slopes', 'js/phaser-slopes.min.js');

    const anims = this.anims;
    anims.create({
      key: "teleport-idle",
      frames: anims.generateFrameNumbers("teleport", { start: 0, end: 0 }),
      frameRate: 3,
      repeat: -1
    });
    anims.create({
      key: "teleport-run",
      frames: anims.generateFrameNumbers("teleport", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    anims.create({
      key: "teleport-fall",
      frames: anims.generateFrameNumbers("teleport", { start: 4, end: 7 }),
      frameRate: 12,
      repeat: -1
    });
    anims.create({
      key: "teleport-jump",
      frames: anims.generateFrameNumbers("teleport", { start: 8, end: 11 }),
      frameRate: 12,
      repeat: -1
    });
  }

  create () {

    var map;
    var tileSheet;
    var bg;
    var doorGraphic;

    this.checkSound()
    // load the map
    switch (this.level) {
      case "0":
        map = this.make.tilemap({key: 'map0'});
        tileSheet = "tiles_out"
        doorGraphic = "door_outdoors"
        bg = this.add.image(480, 360, 'bg_outside');
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('outdoorMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "1":
        map = this.make.tilemap({key: 'map1'});
        tileSheet = "tiles_out"
        doorGraphic = "door_outdoors"
        bg = this.add.image(480, 360, 'bg_outside');
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('outdoorMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "2":
        map = this.make.tilemap({key: 'map2'});
        tileSheet = "tiles_out"
        doorGraphic = "door_outdoors"
        bg = this.add.image(480, 360, 'bg_outside');
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('outdoorMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "3":
        map = this.make.tilemap({key: 'map3'});
        tileSheet = "tiles_factory"
        doorGraphic = "door_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        this.sound.stopAll()
        this.bgMusic = null;
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('indoorMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "4":
        map = this.make.tilemap({key: 'map4'});
        tileSheet = "tiles_factory"
        doorGraphic = "door_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('indoorMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "5":
        map = this.make.tilemap({key: 'map5'});
        tileSheet = "tiles_factory"
        doorGraphic = "door_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('indoorMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "6":
        map = this.make.tilemap({key: 'map6'});
        tileSheet = "tiles_factory"
        doorGraphic = "door_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('indoorMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "7":
        map = this.make.tilemap({key: 'map7'});
        tileSheet = "tiles_space"
        doorGraphic = "door_space"
        bg = this.add.image(480, 360, 'bg_space');
        this.matter.world.setGravity(0,0)
        this.sound.stopAll()
        this.bgMusic = null;
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('spaceMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "8":
        map = this.make.tilemap({key: 'map8'});
        tileSheet = "tiles_space"
        doorGraphic = "door_space"
        bg = this.add.image(480, 360, 'bg_space');
        this.matter.world.setGravity(0,0.7)
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('spaceMusic', {loop: true})
          this.bgMusic.play();
        }
        this.cameraOffset = -150
        break;
      case "9":
        map = this.make.tilemap({key: 'map9'});
        tileSheet = "tiles_factory"
        doorGraphic = "door_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        this.sound.stopAll()
        this.bgMusic = null;
        if(!this.bgMusic) {
          this.bgMusic = this.sound.add('indoorMusic', {loop: true})
          this.bgMusic.play();
        }
        break;
      case "end":
        map = this.make.tilemap({key: 'mapend'});
        tileSheet = "tiles_factory"
        doorGraphic = "door_factory"
        bg = this.add.image(480, 360, 'bg_end');
        this.bgMusic.stop()
        this.bgMusic = null;
        break;
    }
    bg.setScrollFactor(0)

    var tiles = map.addTilesetImage('Tiles',tileSheet);
    var tilesSign = map.addTilesetImage('TilesSign',"tiles_tutorial");

    var bgLayer = map.createDynamicLayer('bg', tiles, 0, 0);
    //groundLayer.setCollisionByProperty({ collides: true });
    if(bgLayer) {
      this.matter.world.convertTilemapLayer(bgLayer);
    }

    var signLayer = map.createDynamicLayer('tutorial', tilesSign, 0, 0);
    if(signLayer) {
      this.matter.world.convertTilemapLayer(signLayer);
    }

    var lethalLayer = map.createDynamicLayer('lethal', tiles, 0, 0);
    if (lethalLayer) {
      lethalLayer.setCollisionByProperty({ collides: true });
      this.matter.world.convertTilemapLayer(lethalLayer);

      lethalLayer.forEachTile(tile => {
        if (tile.properties.collides) {
          tile.physics.matterBody.setCollisionCategory(collision_block);
          tile.physics.matterBody.setCollidesWith([collision_player, collision_ghost])
          tile.physics.matterBody.body.gameObject = tile
          tile.isLethal = true;
        }

        //tile.tint = 0x0000d6
      });
    }

    var barLayer = map.createDynamicLayer('bars', tiles, 0, 0);
    barLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(barLayer);

    // create the ground layer
    var groundLayer = map.createDynamicLayer('world', tiles, 0, 0);
    groundLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(groundLayer);

    var sceneryLayer = map.createDynamicLayer('scenery', tiles, 0, 0);
    //sceneryLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(sceneryLayer);

    //set collision properties based on tiled properties
    groundLayer.forEachTile(tile => {
      if (tile.properties.collides && tile.properties.magicCollides) {
        tile.physics.matterBody.setCollisionCategory(collision_block);
      } else if (!tile.properties.collides && tile.properties.magicCollides) {

      } else if (tile.properties.collides && !tile.properties.magicCollides) {
        tile.physics.matterBody.setCollisionCategory(collision_blockPhysical);
      }
    });

    barLayer.forEachTile(tile => {
      if (tile.properties.collides && tile.properties.magicCollides) {
        tile.physics.matterBody.setCollisionCategory(collision_block);
      } else if (!tile.properties.collides && tile.properties.magicCollides) {

      } else if (tile.properties.collides && !tile.properties.magicCollides) {
        tile.physics.matterBody.setCollisionCategory(collision_blockPhysical);
      }
    });

    //setup the interactive books in the game world
    var bookLayer = map.getObjectLayer("books")
    if (bookLayer) {
      bookLayer.objects.forEach(book => {
        const { x, y, width, height } = book;
        // Tiled origin for its coordinate system is (0, 1), but we want coordinates relative to an
        // origin of (0.5, 0.5)
        var bookBody = this.add
          .existing(new Book(this, x, y, tileSheet, 40, book));
      });
    }

    var leverLayer = map.getObjectLayer("levers")
    if (leverLayer) {
      leverLayer.objects.forEach(lever => {
        const { x, y, width, height } = lever;
        var leverBody = this.add
          .existing(new Lever(this, x, y, tileSheet, 41, lever));
      });
    }

    var doorLayer = map.getObjectLayer("doors")
    if (doorLayer) {
      doorLayer.objects.forEach(door => {
        const { x, y, width, height } = door;
        var doorBody = this.add
          .existing(new Door(this, x, y, doorGraphic, door));
      });
    }

    var moverLayer = map.getObjectLayer("movers")
    if (moverLayer) {
      moverLayer.objects.forEach(mover => {
        const { x, y, width, height } = mover;
        var moverBody = this.add
          .existing(new Mover(this, x, y, doorGraphic, mover));
      });
    }

    var goalLayer = map.getObjectLayer("goals")
    if (goalLayer) {
      goalLayer.objects.forEach(goal => {
        const { x, y, width, height } = goal;
        var goalBody = this.add
          .existing(new Goal(this, x, y, tileSheet, 42, goal));
      });
    }

    var checkpointLayer = map.getObjectLayer("checkpoint")
    if (checkpointLayer) {
      checkpointLayer.objects.forEach(goal => {
        var goalBody = new Checkpoint(this, goal);
      });
    }

    var emitterLayer = map.getObjectLayer("emitters")
    if (emitterLayer) {
      emitterLayer.objects.forEach(emitter => {
        var emitterBody = new Emitter(this, emitter);
      });
    }

    var breakableLayer = map.getObjectLayer("breakable")
    if (breakableLayer) {
      breakableLayer.objects.forEach(breakable => {
        const { x, y, width, height } = breakable;
        var breakableBody = this.add.existing(new Breakable(this, x, y, tileSheet, breakable));
      });
    }

    var pickupLayer = map.getObjectLayer("pickup")
    if (pickupLayer) {
      pickupLayer.objects.forEach(pickup => {
        const { x, y, width, height } = pickup;
        var pickupBody = this.add.existing(new Pickup(this, x, y, tileSheet, 43, pickup));
      });
    }

    var laserLayer = map.getObjectLayer("lasers")
    if (laserLayer) {
      laserLayer.objects.forEach(laser => {
        const { x, y, width, height } = laser;
        var laserBody = this.add.existing(new Laser(this, x, y, 'laser', laser));
      });
    }

    var decorationLayer = map.getObjectLayer("decoration")
    if (decorationLayer) {
      decorationLayer.objects.forEach(decoration => {
        const { x, y, width, height } = decoration;
        var decorationBody = this.add.existing(new Structure(this, x, y, tileSheet, decoration));
      });
    }
    console.log(tiles)


    // add spawn point and player
    const { x, y } = map.findObject("Spawn", obj => obj.name === "Spawn Point");
    player = this.add.existing( new Player(this, x, y, 'player') );

    // set bounds so the camera won't go outside the game world
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels, 128, true, true, true, true);
    // make the camera follow the player
    this.focusPlayer();
    this.focus = player;

    //setup keys to be used
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    /**
     * On preupdate make target for bubble spell appear - so that it can collide before spell cast event
     */
    this.events.on("preupdate", this.bubbleTarget, this);

    /**
     * Event for when charging ends
     * run on the update event in order to insure projectile goes into the
     *     physics engine at the right time to prevent glitching through walls
     */
    this.events.on("update", this.castSpell, this);
    this.events.on("checkSound", this.checkSound, this);

    this.events.on("shutdown", this.destroy, this);
    this.events.on("destroy", this.destroy, this);

  }

  bubbleTarget() {
    if (this.destroyed) {
      return;
    }
    for (var i = this.trail.length-1; i >= 0; i--) {
      this.trail[i].destroy();
      this.trail.splice(i,1);
    }
    //it seems just up and is down fire seperately per loop
    if (game.input.activePointer.isDown || game.input.activePointer.justUp) {
      player.state.startCharge();

      //add new ghost projectile
      var pointer = game.input.activePointer;
      if (player.state.spell === "bubble") {
        var projectile = this.add.existing( new Projectile_Bubble_Ghost(this, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY, 'bubble',player.state.charge) );
        this.trail[this.trail.length] = projectile;
      }

      else if(player.state.spell === "barrier") {
        player.state.charge = 100
        player.state.mana = 0

        var projectile = player.createBarrier(pointer.downX, pointer.downY, pointer.x, pointer.y)
        projectile.body.isSensor = true;
        projectile.setAlpha(0.4)
        //this.trail[this.trail.length] = projectile;
      }
    }
  }

  castSpell() {
    if (this.destroyed) {
      return;
    }
    var pointer = game.input.activePointer
    if (pointer.justUp) {
      this.sound.play('fire', {volume:0.4})
      //remove ghost particles
      // for (var i = playerProjectiles.length-1; i >= 0; i--) {
      //   playerProjectiles[i].update();
      //   if ( playerProjectiles[i] instanceof Projectile_Ghost) {
      //     playerProjectiles[i].destroy();
      //     playerProjectiles.splice(i,1);
      //   }
      // }

      //cast the current spell
      var angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
      if (player.state.spell === "teleport") {
        var projectile = this.add.existing( new Projectile_Teleport(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'teleport') );
        projectile.init(player.state.charge, angle);
        this.focusObject(projectile);
      } else if (player.state.spell === "bubble" && !this.trail[0].touching){
        var projectile = this.add.existing( new Projectile_Bubble(this, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY, 'bubble',player.state.charge) );
      } else if (player.state.spell ==="barrier") {
        var projectile = player.createBarrier(pointer.downX, pointer.downY, pointer.x, pointer.y)
      } else {
        player.state.endCharge();
        return;
      }

      //playerProjectiles[playerProjectiles.length] = projectile;

      player.state.endCharge();
    }
  }

  checkSound() {
    if(mute) {
      this.sound.setMute(true)
    } else {
      this.sound.setMute(false)
    }
  }

  updateAimOffset() {
    var pointer = game.input.activePointer;
    this.aimOffsetX = -490 * (pointer.x-config.width/2.) / config.width/2.;
    this.aimOffsetY = -330 * (pointer.y-config.height/2.) / config.height/2.;
    this.focusObject(this.focus)
  }

  update () {
    if (this.destroyed) {
      return;
    }
    var pointer = game.input.activePointer;

    if (game.input.activePointer.isDown) {
      player.state.startCharge();

      //add new ghost projectile

      if (player.state.spell === "teleport") {
        var angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
        var projectile = this.add.existing( new Projectile_Ghost(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'projectile_large') );
        projectile.init(player.state.charge, angle);
        projectile.maxAge = 50;

        Phaser.Physics.Matter.Matter.Body.update(projectile.body, 16.67, 1, 1);
        for (var i = 0; i < 15; i++) {

          this.trail[this.trail.length] = this.add.image(projectile.x, projectile.y, 'projectile_large');
          this.trail[this.trail.length-1].setTint(0x60fcff);
          this.trail[this.trail.length-1].setAlpha(1 - i/14.);

          projectile.body.force.y = projectile.body.mass * this.matter.world.localWorld.gravity.y * 0.001;

          Phaser.Physics.Matter.Matter.Body.update(projectile.body, 16.67, 1, 1);
          projectile.limitSpeed();
        }
        //this fixes a not defined bug?
        projectile.destroy();

      }

      //change player direction to face the cursor for aiming
      var direction;
      if ( (pointer.x + this.cameras.main.scrollX) > player.x) {
        direction = 'r';
      } else {
        direction = 'l';
      }
      player.faceDirection(direction);


    }

    this.updateAimOffset();

    player.state.updateMana();

    //update particles
    var p = player.generateParticles();
    if(p instanceof Projectile) {
      //p.setCollisionCategory(collision_particle);
      //particles[particles.length] = p;
      this.add.existing(p);
    }

    //character movement
    var moveForce = 0.005;
    var airForce = 0.004;

    //move left
    if ((this.cursors.left.isDown || this.keyA.isDown) ){
      if (this.focus === player && !player.isTouching.left ){
        //player.setVelocityX(-6);
        if (player.isTouching.ground) {
          player.applyForce({x: -moveForce, y:0});
        } else {
          player.applyForce({x: -airForce, y:0});
        }
        if (player.body.velocity.x < - 2) player.setVelocityX(-2);

        player.faceDirection('l');
      } else if (this.focus instanceof Projectile) {
        var force = new Phaser.Math.Vector2(-0.001,0);
        this.focus.applyForce(force);
      }

    }

    //move right
    else if ( (this.cursors.right.isDown || this.keyD.isDown) ){
      if (this.focus === player && !player.isTouching.right){
        if (player.isTouching.ground) {
          player.applyForce({x: moveForce, y:0});
        } else {
          player.applyForce({x: airForce, y:0});
        }
        player.faceDirection('r');
      } else if (this.focus instanceof Projectile) {
        var force = new Phaser.Math.Vector2(0.001,0);
        this.focus.applyForce(force);
      }
      if (player.body.velocity.x > 2) player.setVelocityX(2);
    }

    //instant finish all particles - instant teleport
    // if( this.cursors.down.isDown || this.keyS.isDown) {
    //   if (this.focus instanceof Projectile) {
    //     this.focus.age = this.focus.maxAge + 1;
    //   }
    // }

    //jump on key press, not key down
    // this prevents instant double jumps
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keyW)) {
      if (player.isTouching.ground && this.focus == player) {
        player.setVelocityY(-8);
      } else if (player.state.mana >= 80 && this.focus == player) {
        this.sound.play('fire', {volume:0.3})
        player.setVelocityY(-10);
        player.state.spendMana(80);
        player.jumpParticles(this);
      }
    }

    //allow downward 'jumps' in midair
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keyS)) {
      if (player.isTouching.ground) {
        //do nothing
      } else if (player.state.mana >= 80 && this.focus == player) {
        this.sound.play('fire', {volume:0.3})
        player.setVelocityY(10);
        player.state.spendMana(80);
        player.jumpParticles(this);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE) && !player.state.charging) {
      player.switchSpell();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyQ) && player.currentInteractive) {
      player.interact();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      player.state.endCharge();
      game.scene.add('PauseScene', Scene_pause, true);
      game.scene.start('PauseScene');
      this.events.emit('changeTooltip', "Q or Esc to close");
      this.scene.pause();
      this.matter.world.pause();
    }

  }

  destroy() {
    this.destroyed = true;
    this.events.off("shutdown", this.destroy, this);
    this.events.off("destroy", this.destroy, this);
    this.events.off("preupdate", this.bubbleTarget, this);
    this.events.off("update", this.castSpell, this);
    this.events.off("checkSound", this.checkSound, this);

  }
}


/**
 * Level end screen
 */
class Scene_levelEnd extends Phaser.Scene {

    constructor () {
        super({ key: 'levelEndScene', active: true });

    }

    init (data) {
      this.level = data.level
      this.nextLevel = data.nextLevel
    }

    preload () {
      //this.load.bitmapFont('editundo', 'assets/font/editundo_0.png', 'assets/font/editundo.fnt');
      //this.load.image('ui', 'assets/UI_placeholder.png');
    }

    create () {
      this.winMusic = this.sound.play('winMusic')
      this.add.image(480, 360, 'bg_win');
      //this.add.bitmapText(220,180, 'editundo', 'Level ' + this.level + ' complete!');

      //this.add.bitmapText(420,80, 'editundo', 'Congratulations!');

      //this.add.bitmapText(480,150, 'editundo', 'This is truly a');
      //this.add.bitmapText(465,180, 'editundo', 'very important find.');

      //this.add.bitmapText(420,230, 'editundo', 'You have proved yourself a true explorer.');

      this.time.delayedCall(1000, this.addText, [405,80, 'editundo', 'Congratulations!', -70], this);
      this.time.delayedCall(3000, this.addText, [580,240, 'editundo', 'This is truly', -45], this);
      this.time.delayedCall(4500, this.addText, [470,340, 'editundo', 'a very important find.', -45], this);

      this.time.delayedCall(6500, this.addButton, [700,600, 'Main Menu', 'menu'], this);

      this.input.on('gameobjectover', function (pointer, button)
      {
          button.setFrame(1);
      }, this);
      this.input.on('gameobjectout', function (pointer, button)
      {
          button.setFrame(0);
      }, this);

      this.input.on('gameobjectup', function (pointer, button)
      {
        if(button.getData('index') === 'menu') {
          this.scene.add('MainMenu', new Scene_menu(), true)
          this.sound.stopAll()
          this.bgMusic = null;
          //game.scene.getScene('levelEndScene').bgMusic.stop()
          this.scene.remove('levelEndScene')
        }
      }, this);

    }

    /**
     * update
     *
     */
    update () {



    }

    addText(x, y, font, text, size) {
      text = this.add.bitmapText(x,y,font,text);
      text.setFontSize(size);
    }

    addButton(x, y, text, scene) {
      var button = this.add.sprite(x, y, 'button', 0).setInteractive()
      button.setData('index', scene)
      var startText = this.add.bitmapText(x, y, 'editundo', text)
      button.displayWidth = startText.width*1.3
      startText.setOrigin(0.5,0.5)
      var buttonObj = {
        button: button,
        text: startText,
        setText(str) {
          this.text.setText(str);
          this.button.displayWidth = this.text.width*1.3;
        }
      }
      return buttonObj
    }
}

class Scene_levelSelect extends Phaser.Scene {

  constructor ()
  {
    super('LevelSelect');
  }

  create() {
    this.add.image(480, 360, 'bg_menu');
    this.addButton(250, 50, "return", "return")
    for(var i = 0; i <= 9; i++) {
      var nrow = 5
      var xi = i % nrow
      var yi = Math.floor(i/nrow)
      this.addButton(450+ 160*yi, 150+30*xi, "Level "+i, "level "+i)
    }


    this.input.on('gameobjectover', function (pointer, button)
    {
        button.setFrame(1);
    }, this);
    this.input.on('gameobjectout', function (pointer, button)
    {
        button.setFrame(0);
    }, this);

    this.input.on('gameobjectup', function (pointer, button)
    {
      if(button.getData('index') === 'return') {
        this.scene.launch('MainMenu')
        this.scene.remove('LevelSelect')
      } else if (button.getData('index').includes('level')) {
        game.scene.add('GameScene', new Scene_game(), true, {level: button.getData('index').split(" ")[1]})
        game.scene.add('UIScene', new Scene_UI(), true)
        this.scene.remove('LevelSelect')
        //launch and then remove scene to prevent crash on stopping a paused matter physics
        this.scene.launch('MainMenu')
        this.scene.remove('MainMenu')
      }


    }, this);
  }

  addButton(x, y, text, scene) {
    var button = this.add.sprite(x, y, 'button', 0).setInteractive()
    button.setData('index', scene)
    var startText = this.add.bitmapText(x, y, 'editundo', text)
    button.displayWidth = startText.width*1.3
    startText.setOrigin(0.5,0.5)
  }

  destroy() {
    this.destroyed = true;
    this.events.off("shutdown", this.destroy, this);
    this.events.off("destroy", this.destroy, this);

    this.input.off('gameobjectover', function (pointer, button){})
    this.input.off('gameobjectout', function (pointer, button){})
    this.input.off('gameobjectup', function (pointer, button){})
  }

}

class Scene_loading extends Phaser.Scene {

  constructor ()
  {
    super('Loading');
  }

  preload () {
    this.load.bitmapFont('editundo', 'assets/font/editundo_0.png', 'assets/font/editundo.fnt');
    this.add.text(300,300, 'Loading...');
    //this.load.scenePlugin('Slopes', 'js/phaser-slopes.min.js');

    //this.load.image('player', 'assets/mage_placeholder.png');
    //this.load.image('platformTile', 'assets/platform_placeholder.png');
    this.load.image('projectile', 'assets/projectile_placeholder.png');
    this.load.image('projectile_large', 'assets/projectile_large_placeholder.png');
    this.load.image('bubble', 'assets/bubble_placeholder.png');
    this.load.image('door_outdoors', 'assets/door_outdoors.png');
    this.load.image('door_factory', 'assets/door_factory.png');
    this.load.image('door_space', 'assets/door_space.png');
    this.load.image('barrier', 'assets/barrier.png');

    this.load.image('bg_menu', 'assets/bg_menu.png');
    this.load.image('bg_outside', 'assets/bg_1.png');
    this.load.image('bg_inside', 'assets/bg_2.png');
    this.load.image('bg_space', 'assets/bg_space.png');
    this.load.image('bg_end', 'assets/bg_end.png');
    this.load.image('bg_win', 'assets/bg_win.png');

    // map made with Tiled in JSON format
    this.load.tilemapTiledJSON('map0', 'assets/maps/demo_level_0.json');

    this.load.tilemapTiledJSON('map1', 'assets/maps/demo_level_1.json');
    this.load.tilemapTiledJSON('map2', 'assets/maps/demo_level_2.json');
    this.load.tilemapTiledJSON('map3', 'assets/maps/demo_level_3.json');
    this.load.tilemapTiledJSON('map4', 'assets/maps/demo_level_4.json');
    this.load.tilemapTiledJSON('map5', 'assets/maps/demo_level_5.json');
    this.load.tilemapTiledJSON('map6', 'assets/maps/demo_level_6.json');
    this.load.tilemapTiledJSON('map7', 'assets/maps/demo_level_7.json');
    this.load.tilemapTiledJSON('map8', 'assets/maps/demo_level_8.json');
    this.load.tilemapTiledJSON('map9', 'assets/maps/demo_level_9.json');

    this.load.tilemapTiledJSON('mapend', 'assets/maps/demo_level_end.json');

    // tiles in spritesheet
    this.load.spritesheet('tiles', 'assets/maps/tiles_placeholder.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('tiles_out', 'assets/maps/tiles_outdoors.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('tiles_factory', 'assets/maps/tiles_factory.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('tiles_space', 'assets/maps/tiles_space.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('tiles_tutorial', 'assets/maps/tiles_tutorial.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('player', 'assets/mage_placeholder.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('teleport', 'assets/teleport_placeholder.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('button', 'assets/button.png', {frameWidth: 128, frameHeight: 48});
    this.load.spritesheet('laser', 'assets/laser.png', {frameWidth: 16, frameHeight: 160});

    this.load.audio('step1', 'assets/sound/stepLeft3.mp3')
    this.load.audio('step2', 'assets/sound/stepRight3.mp3')
    this.load.audio('land', 'assets/sound/landing.mp3')
    this.load.audio('bounce', 'assets/sound/landing2.mp3')

    this.load.audio('pop', 'assets/sound/pop.mp3')
    this.load.audio('charge', 'assets/sound/charging.mp3')
    this.load.audio('fire', 'assets/sound/whoosh.mp3')
    this.load.audio('tap', 'assets/sound/tap.mp3')

    this.load.audio('outdoorMusic', 'assets/sound/Almost New.mp3')
    this.load.audio('indoorMusic', 'assets/sound/Intended Force.mp3')
    this.load.audio('spaceMusic', 'assets/sound/Floating Cities.mp3')
    this.load.audio('winMusic', 'assets/sound/Heroic Age.mp3')


    this.load.image('ui', 'assets/UI_placeholder.png');
  }

  create () {
    //make animations
    game.scene.add('MainMenu', new Scene_menu(), true)
    this.scene.remove('Loading')
  }

}

class Scene_message extends Phaser.Scene {

  constructor ()
  {
    super('Message');
  }

  create () {
    this.add.bitmapText(200, 150, 'editundo', "You must prove yourself.")
    this.add.bitmapText(200, 250, 'editundo', "Explore the world.")
    this.add.bitmapText(200, 350, 'editundo', "Return with something of value.")

    var text = this.add.bitmapText(300, 550, 'editundo', "Click to Continue")
    text.setTint(0xcf4ed8)

    this.input.on("pointerup", function() {
      game.scene.add('GameScene', new Scene_game(), true)
      game.scene.add('UIScene', new Scene_UI(), true)
      this.scene.remove("Message")
    }, this)

  }

}


/**
 * Scene used for displaying book text on user interaction
 */
class Scene_pause extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'PauseScene', active: true });
        this.text = "test";
        this.helpText = "Q to close"
        this.textLeft;
        this.textRight;
    }

    preload () {
      this.load.image('book', 'assets/book_placeholder.png');
    }

    create () {
      this.add.image(480, 400, 'book');

      var bookLetter = this.add.bitmapText(100, 170, 'editundo', "PAUSED");
      bookLetter.setFontSize(-80);
      bookLetter.setTint(0x000000);

      var text = this.add.bitmapText(100, 270, 'editundo', "Options");
      text.setTint(0x000000);

      this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);



      // Buttons on menu
      //

      this.addButton(690, 350, "Resume", "Resume")
      this.addButton(690, 380, "Main Menu", "Main Menu")
      if (mute) {
        var soundButton = this.addButton(150, 350, "Unmute", "Mute")
      } else {
        var soundButton = this.addButton(150, 350, "Mute", "Mute")
      }

      if (invincible) {
        var invincibleButton = this.addButton(250, 450, "Turn off invincible", "Invincible")
      } else {
        var invincibleButton = this.addButton(250, 450, "Turn on invincible", "Invincible")
      }

      this.input.on('gameobjectover', function (pointer, button)
      {
          button.setFrame(1);
      }, this);
      this.input.on('gameobjectout', function (pointer, button)
      {
          button.setFrame(0);
      }, this);

      this.input.on('gameobjectup', function (pointer, button)
      {
        if(button.getData('index') === 'Resume') {
          pointer.justUp = false;
          game.scene.resume('GameScene');
          game.scene.getScene('GameScene').matter.world.resume();
          //this.scene.stop();
          game.scene.remove('PauseScene');
        } else if (button.getData('index') === 'Main Menu') {
          game.scene.add('MainMenu', new Scene_menu(), true)
          this.scene.remove('PauseScene')
          //launch and then remove scene to prevent crash on stopping a paused matter physics
          this.scene.launch('GameScene')
          if(game.scene.getScene('GameScene').bgMusic) {
            game.scene.getScene('GameScene').bgMusic.stop()
            game.scene.getScene('GameScene').bgMusic = null;
          }
          this.scene.remove('GameScene')
          game.scene.remove('UIScene');
        } else if(button.getData('index') === 'Mute') {
          if(mute) {
            mute = false
            soundButton.setText("Mute")
          } else {
            mute = true
            soundButton.setText("Unmute")
          }
          game.scene.getScene('GameScene').events.emit("checkSound")
        }
        else if(button.getData('index') === 'Invincible') {
          if(invincible) {
            invincible = false
            invincibleButton.setText("Turn on invincible")
          } else {
            invincible = true
            invincibleButton.setText("Turn off invincible")
          }
        }


      }, this);

    }

    update () {
      //resume the game and close this scene
      if (Phaser.Input.Keyboard.JustDown(this.keyQ) || Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        game.scene.resume('GameScene');
        game.scene.getScene('GameScene').matter.world.resume();
        //this.scene.stop();
        game.scene.remove('PauseScene');
      }

    }

    addButton(x, y, text, scene) {
      var button = this.add.sprite(x, y, 'button', 0).setInteractive()
      button.setData('index', scene)
      var startText = this.add.bitmapText(x, y, 'editundo', text)
      button.displayWidth = startText.width*1.3
      startText.setOrigin(0.5,0.5)
      startText.setTint(0x000000);
      var buttonObj = {
        button: button,
        text: startText,
        setText(str) {
          this.text.setText(str);
          this.button.displayWidth = this.text.width*1.3;
        }
      }
      return buttonObj
    }

    destroy() {
      this.destroyed = true;
      this.events.off("shutdown", this.destroy, this);
      this.events.off("destroy", this.destroy, this);

      this.input.off('gameobjectover', function (pointer, button){})
      this.input.off('gameobjectout', function (pointer, button){})
      this.input.off('gameobjectup', function (pointer, button){})
    }
}


/**
 * The HUD/UI for the game. Has spell, mana and tooltip information
 */
class Scene_UI extends Phaser.Scene {

    constructor () {
        super({ key: 'UIScene', active: true });

        this.manaText;
        this.spellText;
        this.tooltip;

    }

    preload () {
    }

    create () {
      this.add.image(480, 30, 'ui');

      this.manaText = this.add.bitmapText(200,20, 'editundo', 'Mana: ');
      this.manaText.setTint(0xcf4ed8);

      this.spellText = this.add.bitmapText(340,20, 'editundo', 'Spell: ');
      this.spellText.setTint(0xcf4ed8);

      this.tooltip = this.add.bitmapText(700,20, 'editundo', '');

      //  Grab a reference to the Game Scene
      this.gameScene = game.scene.getScene('GameScene');

      this.levelText = this.add.bitmapText(20,20, 'editundo', 'Level: ' + this.gameScene.level);
      this.levelText.setTint(0xcf4ed8);

      // Listen to events to change the tooltip
      this.gameScene.events.on('changeTooltip', function (text) {

          this.tooltip.setText(text);

      }, this);

      this.gameScene.events.on('postInit', function () {

          this.levelText.setText('Level: ' + this.gameScene.level);

      }, this);

    }


    /**
     * update - each tick spellText and mana are updated
     *
     */
    update () {
      if(player) {
        this.manaText.setText("Mana: " + player.state.mana);
        this.spellText.setText("Spell: " + player.state.spell);
      }


      //for some reason this fixes the text rendering bug in debug mode...
      // but introduces new bug in books?
      //let render = this.gameScene.add.graphics();
      //let bounds = this.spellText.getTextBounds();
      //
      //render.lineStyle(3, 0xffff37);
      //render.strokeRectShape(bounds["global"]);

    }
}


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


var config = {
   type: Phaser.AUTO,
   width: 32*30,
   height: 32*30*3/4,
   pixelArt: true,
   physics: {
      default: 'matter',
      matter: {
          gravity: {
              x: 0,
              y: 2
          },
          debug : false
      }
   },
   plugins: {
      scene: [{
          plugin: PhaserMatterCollisionPlugin, // The plugin class
          key: "matterCollision", // Where to store in Scene.Systems, e.g. scene.sys.matterCollision
          mapping: "matterCollision" // Where to store in the Scene, e.g. scene.matterCollision
        }]
    },
   scene: []//[ Scene_game, Scene_UI],

};

var game = new Phaser.Game(config);
game.scene.add('Loading', new Scene_loading(), true)

var mute = false
var invincible = false
var player;
var playerProjectiles = [];
var particles = [];

var collision_player = 2;
var collision_block = 4;
var collision_particle = 8;
var collision_ghost = 16;
var collision_blockPhysical = 32;
var collision_interactive = 64;
