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
      super(scene.matter.world, x, y, texture, id);
      this.scene = scene;
      this.properties = {};
      this.setStatic(true);
      this.body.isSensor = true;

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
      this.formattedText = this.addLineBreaks(this.properties["text"], 28);
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
    const split = text.split(/( )/g);
    let lines = [];

    function nextLine() {
      let newLine = "";
      while (`${newLine} ${split[0]}`.length < maxLetters && split.length) {
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
  }


  /**
   * activate - emit event with the key of the lever
   */
  activate() {
    this.setFlipX(!this.flipX);
    var moveX = 0;
    var moveY = 0;
    if (this.properties["moveX"]) {moveX = this.properties["moveX"];}
    if (this.properties["moveY"]) {moveY = this.properties["moveY"];}
    var keys = this.properties["leverKey"].split(" ");
    for (var i = 0; i < keys.length; i++) {
      this.scene.events.emit("lever", keys[i], moveX, moveY, this.flipX);
    }


  }
}


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
        this.setCollisionCategory(collision_player);
        this.setCollidesWith([collision_block, collision_blockPhysical, collision_interactive]);
        this.currentInteractive = null;

        //get the matter body functions
        const { Body, Bodies } = Phaser.Physics.Matter.Matter;
        const { width: w, height: h } = this;

        //set up the player body and sensors
        const mainBody = Bodies.rectangle(0, 0, w * 0.85, h, { chamfer: { radius: 3 } });
        this.sensors = {
          bottom: Bodies.rectangle(0, h * 0.5, w * 0.7, 4, { isSensor: true }),
          left: Bodies.rectangle(-w * 0.43, 0, 6, h * 0.2, { isSensor: true }),
          right: Bodies.rectangle(w * 0.43, 0, 6, h * 0.2, { isSensor: true })
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
              }

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
        var p = new Projectile(this.world, this.x+this.state.particleSourceX, this.y+this.state.particleSourceY, 'projectile')
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
        var p = new Projectile(this.world, this.x, this.y+14, 'projectile')
        p.setVelocityX(5*Math.cos(angle));
        p.setVelocityY(5*Math.sin(angle));
        p.maxAge = 25;
        p.setCollisionCategory(collision_particle);
        particles[particles.length] = p;
        this.scene.add.existing(p);
      }

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
        this.state.spell = "bubble";
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
    this.maxAge = charge;
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
    this.maxAge = 100;
    this.maxVelocity = 20.;
    this.setBody({
         type: 'circle',
         radius: 16
     });
     this.setCollidesWith([collision_block]);
     this.setBounce(0.0);
     this.setTint(0x60fcff);

     scene.matterCollision.addOnCollideStart({
       objectA: [this],
       callback: function() {this.age = this.maxAge+1},
       context: this
     });
  }

}


/**
 * Extension of projectile used for aiming. Does not effect other objects
 */
class Projectile_Ghost extends Projectile{
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

  }

  init(charge, angle) {
    var speed = charge / 4.0;
    this.setVelocityX(speed*Math.cos(angle));
    this.setVelocityY(speed*Math.sin(angle));
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
      var maxLines = 8;

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


/**
 * Extension of phaser.scene for running the game itself
 */
class Scene_game extends Phaser.Scene {

  constructor ()
  {
    super('GameScene');
    this.books = [];
    this.trail = [];
  }

  focusPlayer() {
    this.cameras.main.startFollow(player, true, 0.5, 0.5, 0, 150);
  }

  focusObject(obj) {
    this.cameras.main.startFollow(obj, true, 0.5, 0.5, 0, 150);
  }


  preload () {
    this.load.scenePlugin('Slopes', 'js/phaser-slopes.min.js');

    this.load.image('player', 'assets/mage_placeholder.png');
    this.load.image('platformTile', 'assets/platform_placeholder.png');
    this.load.image('projectile', 'assets/projectile_placeholder.png');
    this.load.image('projectile_large', 'assets/projectile_large_placeholder.png');
    this.load.image('door', 'assets/door_placeholder.png');

    // map made with Tiled in JSON format
    this.load.tilemapTiledJSON('map', 'assets/maps/demo_level_tutorial.json');
    // tiles in spritesheet
    this.load.spritesheet('tiles', 'assets/maps/tiles_placeholder.png', {frameWidth: 32, frameHeight: 32});
  }

  create () {
    //collisions
    collision_player = this.matter.world.nextCategory();
    collision_block = this.matter.world.nextCategory();
    collision_particle = this.matter.world.nextCategory();
    collision_ghost = this.matter.world.nextCategory();
    collision_blockPhysical = this.matter.world.nextCategory();

    // load the map
    var map = this.make.tilemap({key: 'map'});

    // tiles for the ground layer
    var tiles = map.addTilesetImage('Tiles','tiles');

    // create the ground layer
    var groundLayer = map.createDynamicLayer('world', tiles, 0, 0);
    groundLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(groundLayer);

    //set collision properties based on tiled properties
    groundLayer.forEachTile(tile => {
      if (tile.properties.collides && tile.properties.magicCollides) {
        tile.physics.matterBody.setCollisionCategory(collision_block);
      } else if (!tile.properties.collides && tile.properties.magicCollides) {

      } else if (tile.properties.collides && !tile.properties.magicCollides) {
        tile.physics.matterBody.setCollisionCategory(collision_blockPhysical);
      }
    });

    //setup the interactive books in the game world
    map.getObjectLayer("books").objects.forEach(book => {
      const { x, y, width, height } = book;
      // Tiled origin for its coordinate system is (0, 1), but we want coordinates relative to an
      // origin of (0.5, 0.5)
      var bookBody = this.add
        .existing(new Book(this, x + width / 2, y - height / 2, "tiles", 40, book));

      this.books[this.books.length] = bookBody;
    });

    map.getObjectLayer("levers").objects.forEach(lever => {
      const { x, y, width, height } = lever;
      var leverBody = this.add
        .existing(new Lever(this, x + width / 2, y - height / 2, "tiles", 41, lever));
    });

    map.getObjectLayer("doors").objects.forEach(door => {
      const { x, y, width, height } = door;
      var doorBody = this.add
        .existing(new Structure(this, x + width / 2, y + height / 2, "door", door));

    });

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


    /**
     * Event for when charging ends
     */
    this.input.on('pointerup', function (pointer) {

      //remove ghost particles
      for (var i = playerProjectiles.length-1; i >= 0; i--) {
        playerProjectiles[i].update();
        if ( playerProjectiles[i] instanceof Projectile_Ghost) {
          playerProjectiles[i].destroy();
          playerProjectiles.splice(i,1);
        }
      }

      //cast the current spell
      var angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
      if (player.state.spell === "teleport") {
        var projectile = this.add.existing( new Projectile_Teleport(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'player') );
        this.focusObject(projectile);
        this.focus = projectile;
      } else {
        var projectile = this.add.existing( new Projectile_Bubble(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'projectile_large') );
      }
      projectile.init(player.state.charge, angle);
      playerProjectiles[playerProjectiles.length] = projectile;

      player.state.endCharge();
    }, this);


    /**
     * On update event, check if mouse is held down, and if so, keep charging
     */
    this.events.on('update', function () {
      //update trail
      for (var i = this.trail.length-1; i >= 0; i--) {
        this.trail[i].destroy();
        this.trail.splice(i,1);
      }
      if (game.input.activePointer.isDown) {
        player.state.startCharge();

        //add new ghost projectile
        var pointer = game.input.activePointer;
        var angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
        var projectile = this.add.existing( new Projectile_Ghost(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'projectile_large') );
        projectile.init(player.state.charge, angle);
        projectile.maxAge = 50;
        //playerProjectiles[playerProjectiles.length] = projectile;

        //change player direction to face the cursor for aiming
        var direction;
        if ( (pointer.x + this.cameras.main.scrollX) > player.x) {
          direction = 'r';
        } else {
          direction = 'l';
        }
        player.faceDirection(direction);

        for (var i = 0; i < 15; i++) {
          projectile.body.force.y = projectile.body.mass * 2 * 0.001;

          Phaser.Physics.Matter.Matter.Body.update(projectile.body, 16.67, 1, 1);
          projectile.limitSpeed();

          this.trail[this.trail.length] = this.add.image(projectile.x, projectile.y, 'projectile_large');
          this.trail[this.trail.length-1].setTint(0x60fcff);
          this.trail[this.trail.length-1].setAlpha(1 - i/14.);
        }

        projectile.destroy();

      }
    }, this);


  }

  update () {
    player.state.updateMana();

    //update particles
    var p = player.generateParticles();
    if(p instanceof Projectile) {
      p.setCollisionCategory(collision_particle);
      particles[particles.length] = p;
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

    //instant finish all particles - causes teleport
    if( this.cursors.down.isDown || this.keyS.isDown) {
      if (this.focus instanceof Projectile) {
        this.focus.age = this.focus.maxAge + 1;
      }
    }

    //cancel all particles - does not cause teleport
    if( this.keySpace.isDown) {
      for (var i = playerProjectiles.length-1; i >= 0; i--) {
        playerProjectiles[i].destroy();
        playerProjectiles.splice(i,1);
      }
      this.focusPlayer();
      this.focus = player;
    }

    //jump on key press, not key down
    // this prevents instant double jumps
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keyW)) {
      if (player.isTouching.ground) {
        player.setVelocityY(-8);
      } else if (player.state.mana >= 80) {
        player.setVelocityY(-10);
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

    //update particles
    for (var i = playerProjectiles.length-1; i >= 0; i--) {
      playerProjectiles[i].update();

      //dead playerProjectiles:
      if ( playerProjectiles[i].age > playerProjectiles[i].maxAge) {

        // cast the teleport part of the teleport spell
        if (playerProjectiles[i] instanceof Projectile_Teleport) {
          player.setX(playerProjectiles[i].x);
          player.setY(playerProjectiles[i].y);
          player.setVelocityX(playerProjectiles[i].body.velocity.x);
          player.setVelocityY(playerProjectiles[i].body.velocity.y);

          this.focusPlayer();
          this.focus = player;
        }
        playerProjectiles[i].destroy();
        playerProjectiles.splice(i,1);
      }
    }

    //update particles
    for (var i = particles.length-1; i >= 0; i--) {
      particles[i].update();
      if ( particles[i].age > particles[i].maxAge) {
        particles[i].destroy();
        particles.splice(i,1);
      }
    }


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
      this.load.bitmapFont('editundo', 'assets/font/editundo_0.png', 'assets/font/editundo.fnt');
      this.load.image('ui', 'assets/UI_placeholder.png');
    }

    create () {
      this.add.image(480, 30, 'ui');
      var text = this.add.bitmapText(20,20, 'editundo', 'Mage Cage');
      text.setTint(0xcf4ed8);

      this.manaText = this.add.bitmapText(200,20, 'editundo', 'Mana: ' + player.state.mana);
      this.manaText.setTint(0xcf4ed8);

      this.spellText = this.add.bitmapText(340,20, 'editundo', 'Spell: ' + player.state.spell);
      this.spellText.setTint(0xcf4ed8);

      this.tooltip = this.add.bitmapText(700,20, 'editundo', '');

      //  Grab a reference to the Game Scene
      var gameScene = game.scene.getScene('GameScene');

      // Listen to events to change the tooltip
      gameScene.events.on('changeTooltip', function (text) {

          this.tooltip.setText(text);

      }, this);
    }


    /**
     * update - each tick spellText and mana are updated    
     *
     */
    update () {
      this.manaText.setText("Mana: " + player.state.mana);
      this.spellText.setText("Spell: " + player.state.spell);

    }
}


/**
 * Structure are objects in the environment that are not tiles
 */
class Structure extends Phaser.Physics.Matter.Image{

  constructor(scene, x, y, texture, objectConfig){
    super(scene.matter.world, x, y, texture);
    this.scene = scene;

    this.activated = false;
    this.displayWidth = objectConfig["width"];
    this.displayHeight = objectConfig["height"];

    this.setBody({
      type: "rectangle",
      width: objectConfig["width"],
      height: objectConfig["height"]})
    this.setStatic(true);

    this.properties = {};

    for (var i = 0; i < objectConfig.properties.length; i++){
      var key = objectConfig.properties[i];
      this.properties[key["name"]] = key["value"];
    }

    this.setCollisionCategory(collision_block);
    //this.setCollidesWith([collision_block, collision_player]);

    this.scene.events.on("lever", function(key, moveX, moveY, flip) {
      if (this.properties["leverKey"] === key) {
        this.activate(moveX, moveY, flip);
      }
    }, this);
  }

  activate(moveX, moveY, flip) {
    if (flip) {
      this.y += 32 * moveY;
      this.x += 32 * moveX;
    } else {
      this.y -= 32 * moveY;
      this.x -= 32 * moveX;
    }
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
          debug : true
      }
   },
   plugins: {
      scene: [{
          plugin: PhaserMatterCollisionPlugin, // The plugin class
          key: "matterCollision", // Where to store in Scene.Systems, e.g. scene.sys.matterCollision
          mapping: "matterCollision" // Where to store in the Scene, e.g. scene.matterCollision
        }]
    },
   scene: [ Scene_game, Scene_UI ]
};

var game = new Phaser.Game(config);

var player;
var playerProjectiles = [];
var particles = [];

var collision_player;
var collision_block;
var collision_particle;
var collision_ghost;
var collision_blockPhysical;
var collision_interactive;
