class Interactive extends Phaser.Physics.Matter.Image{

    constructor(scene, x, y, texture, id){
        super(scene.matter.world, x, y, texture, id);
        this.properties = {}
        this.setStatic(true);
        this.body.isSensor = true;

    }

    format() {
      if(this.properties["Text"]) {
        this.formattedText = this.addLineBreaks(this.properties["Text"], 28);
      }
    }

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

class Scene_book extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'BookScene', active: true });
        this.text = "test";
        this.helpText = "Q to close"
        this.textLeft;
        this.textRight;


    }

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

    preload ()
    {
      //this.load.bitmapFont('editundo', 'assets/font/editundo_0.png', 'assets/font/editundo.fnt');
      this.load.image('book', 'assets/book_placeholder.png');
    }

    create ()
    {
      this.text = this.sys.settings.data["text"];
      this.textToPages();
      this.add.image(480, 400, 'book');
      var booktextL = this.add.bitmapText(100, 180, 'editundo', this.textLeft);
      booktextL.setTint(0x000000);
      var booktextR = this.add.bitmapText(500, 180, 'editundo', this.textRight);
      booktextR.setTint(0x000000);

      var helpertext = this.add.bitmapText(700, 20, 'editundo', this.helpText);

      //  Grab a reference to the Game Scene
      var game = this.scene.get('GameScene');
      this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    }

    update () {

      if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
        game.scene.resume('GameScene');
        //this.scene.stop();
        game.scene.remove('BookScene');
      }

    }
}

class Scene_game extends Phaser.Scene {

  constructor ()
  {
    super('GameScene');
    this.books = [];
  }

  focusPlayer() {
    this.cameras.main.startFollow(player, true, 0.5, 0.5, 0, 150);
  }

  focusObject(obj) {
    this.cameras.main.startFollow(obj, true, 0.5, 0.5, 0, 150);
  }


  preload ()
  {
    this.load.scenePlugin('Slopes', 'js/phaser-slopes.min.js');
    //this.load.image('border', 'assets/border.png');
    this.load.image('player', 'assets/mage_placeholder.png');
    this.load.image('platformTile', 'assets/platform_placeholder.png');
    this.load.image('projectile', 'assets/projectile_placeholder.png');
    this.load.image('projectile_large', 'assets/projectile_large_placeholder.png');


    // map made with Tiled in JSON format
    this.load.tilemapTiledJSON('map', 'assets/maps/demo_level_tutorial.json');
    // tiles in spritesheet
    this.load.spritesheet('tiles', 'assets/maps/tiles_placeholder.png', {frameWidth: 32, frameHeight: 32});
  }

  create ()
  {
    //this.add.image(400, 300, 'border');

    //collisions
    collision_player = this.matter.world.nextCategory();
    collision_block = this.matter.world.nextCategory();
    collision_particle = this.matter.world.nextCategory();
    collision_ghost = this.matter.world.nextCategory();
    collision_blockPhysical = this.matter.world.nextCategory();

    //platform = this.matter.add.image(320,240, 'platformTile',null, { isStatic: true });
    //platform.setCollisionCategory(collision_block);

    // load the map
    var map = this.make.tilemap({key: 'map'});

    // tiles for the ground layer
    var tiles = map.addTilesetImage('Tiles','tiles');
    // create the ground layer
    var groundLayer = map.createDynamicLayer('world', tiles, 0, 0);
    groundLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(groundLayer);

    // groundLayer.setCollisionCategory(collision_block);
    groundLayer.forEachTile(tile => {
      if (tile.properties.collides && tile.properties.magicCollides) {
        tile.physics.matterBody.setCollisionCategory(collision_block);
      } else if (!tile.properties.collides && tile.properties.magicCollides) {

      } else if (tile.properties.collides && !tile.properties.magicCollides) {
        tile.physics.matterBody.setCollisionCategory(collision_blockPhysical);
      }
    });


    map.getObjectLayer("books").objects.forEach(book => {
      const { x, y, width, height } = book;
      // Tiled origin for its coordinate system is (0, 1), but we want coordinates relative to an
      // origin of (0.5, 0.5)
      var bookBody = this.add
        //.image(x + width / 2, y - height / 2, "tiles", 40)
        .existing(new Interactive(this, x + width / 2, y - height / 2, "tiles", 40));
        for (var i = 0; i < book.properties.length; i++){
          var key = book.properties[i];
          bookBody.properties[key["name"]] = key["value"];
          bookBody.format();
        }
      this.books[this.books.length] = bookBody;
    });


    const { x, y } = map.findObject("Spawn", obj => obj.name === "Spawn Point");
    player = this.add.existing( new Player(this, x, y, 'player') );

    // set bounds so the camera won't go outside the game world
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels, 128, true, true, true, true);
    // make the camera follow the player
    this.focusPlayer();
    this.focus = player;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.on('pointerup', function (pointer) {
      for (var i = playerProjectiles.length-1; i >= 0; i--) {
        playerProjectiles[i].update();
        if ( playerProjectiles[i] instanceof Projectile_Ghost) {
          playerProjectiles[i].destroy();
          playerProjectiles.splice(i,1);
        }
      }

      var angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
      if (player.state.spell === "teleport") {
        var projectile = this.add.existing( new Projectile_Teleport(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'player') );
        //this.cameras.main.startFollow(projectile, {roundPixels:true,lerpX:0.1, lerpY:0.1});
        this.focusObject(projectile);
        this.focus = projectile;
      } else {
        var projectile = this.add.existing( new Projectile_Bubble(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'projectile_large') );
      }
      projectile.init(player.state.charge, angle);
      playerProjectiles[playerProjectiles.length] = projectile;

      player.state.endCharge();
    }, this);

    this.events.on('update', function () {
      if (game.input.activePointer.isDown) {
        player.state.startCharge();
        var pointer = game.input.activePointer;
        var angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
        var projectile = this.add.existing( new Projectile_Ghost(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'projectile_large') );
        projectile.init(player.state.charge, angle);
        projectile.maxAge = 50;
        playerProjectiles[playerProjectiles.length] = projectile;

        var direction;
        if ( (pointer.x + this.cameras.main.scrollX) > player.x) {
          direction = 'r';
        } else {
          direction = 'l';
        }
        player.faceDirection(direction);
      }
    }, this);


  }

  update ()
  {
    player.state.updateMana();
    var p = player.generateParticles();
    if(p instanceof Projectile) {
      p.setCollisionCategory(collision_particle);
      particles[particles.length] = p;
      this.add.existing(p);
    }

    var moveForce = 0.005;
    var airForce = 0.004;

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


      //player.anims.play('left', true);
    } else if ( (this.cursors.right.isDown || this.keyD.isDown) ){
      if (this.focus === player && !player.isTouching.right){
        //player.setVelocityX(6);
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

      //player.anims.play('right', true);
    }
    else
    {
      //player.setVelocityX(0);

      //player.anims.play('turn');
    }

    if( this.cursors.down.isDown || this.keyS.isDown) {
      if (this.focus instanceof Projectile) {
        this.focus.age = this.focus.maxAge + 1;
      }
    }

    if( this.keySpace.isDown) {
      for (var i = playerProjectiles.length-1; i >= 0; i--) {
        playerProjectiles[i].destroy();
        playerProjectiles.splice(i,1);
      }
      //this.cameras.main.startFollow(player);
      this.focusPlayer();
      this.focus = player;
    }

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

    for (var i = playerProjectiles.length-1; i >= 0; i--) {
      playerProjectiles[i].update();
      if ( playerProjectiles[i].age > playerProjectiles[i].maxAge) {
        //console.log("death!");
        if (playerProjectiles[i] instanceof Projectile_Teleport) {
          player.setX(playerProjectiles[i].x);
          player.setY(playerProjectiles[i].y);
          player.setVelocityX(playerProjectiles[i].body.velocity.x);
          player.setVelocityY(playerProjectiles[i].body.velocity.y);
          //this.cameras.main.startFollow(player, {roundPixels:true, offsetY:100});
          this.focusPlayer();
          this.focus = player;
        }
        playerProjectiles[i].destroy();
        playerProjectiles.splice(i,1);
      }
    }

    for (var i = particles.length-1; i >= 0; i--) {
      particles[i].update();
      if ( particles[i].age > particles[i].maxAge) {
        //console.log("death!");
        particles[i].destroy();
        particles.splice(i,1);
      }
    }


  }
}

class Scene_UI extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'UIScene', active: true });

        this.manaText;
        this.spellText;

    }

    preload ()
    {
      this.load.bitmapFont('editundo', 'assets/font/editundo_0.png', 'assets/font/editundo.fnt');
      this.load.image('ui', 'assets/UI_placeholder.png');
    }

    create ()
    {
      this.add.image(480, 30, 'ui');
      var text = this.add.bitmapText(20,20, 'editundo', 'Mage Cage');
      text.setTint(0xcf4ed8);
      this.manaText = this.add.bitmapText(200,20, 'editundo', 'Mana: ' + player.state.mana);
      this.manaText.setTint(0xcf4ed8);
      this.spellText = this.add.bitmapText(340,20, 'editundo', 'Spell: ' + player.state.spell);
      this.spellText.setTint(0xcf4ed8);

      //  Grab a reference to the Game Scene
      var ourGame = this.scene.get('GameScene');

      //  Listen for events from it
      // ourGame.events.on('addScore', function () {
      //
      //     manaText.setText("Mana: " + player.state.mana);
      //
      // }, this);
    }

    update () {
      this.manaText.setText("Mana: " + player.state.mana);
      this.spellText.setText("Spell: " + player.state.spell);

    }
}

/**
 *
 * This is a simple state template to use for getting a Phaser game up
 * and running quickly. Simply add your own game logic to the default
 * state object or delete it and make your own.
 *
 */
//import Player from '../class/player'
//import PhaserMatterCollisionPlugin from "phaser-matter-collision-plugin";

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
 //var map;
 //var groundLayer;
 //var groundTiles;
 var collision_player;
 var collision_block;
 var collision_particle;
 var collision_ghost;
 var collision_blockPhysical;
 var collision_interactive;
