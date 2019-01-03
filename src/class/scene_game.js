
/**
 * Extension of phaser.scene for running the game itself
 */
class Scene_game extends Phaser.Scene {

  constructor ()
  {
    super('GameScene');
    this.books = [];
    this.trail = [];
    // if (!this.sys.settings.data.level) {
    //   this.sys.settings.data.level = 1;
    // }
  }

  focusPlayer() {
    this.focus = player
    this.cameras.main.startFollow(player, true, 0.5, 0.5, 0, 150);
  }

  focusObject(obj) {
    this.focus = obj
    this.cameras.main.startFollow(obj, true, 0.5, 0.5, 0, 150);
  }

  init(data) {
    this.destroyed = false;
    this.level = data.level
    if (!data.level) {
      this.level = "1"
    }
  }

  preload () {
    this.load.scenePlugin('Slopes', 'js/phaser-slopes.min.js');

    //this.load.image('player', 'assets/mage_placeholder.png');
    //this.load.image('platformTile', 'assets/platform_placeholder.png');
    this.load.image('projectile', 'assets/projectile_placeholder.png');
    this.load.image('projectile_large', 'assets/projectile_large_placeholder.png');
    this.load.image('bubble', 'assets/bubble_placeholder.png');
    this.load.image('door', 'assets/door_placeholder.png');

    this.load.image('bg_outside', 'assets/bg_1.png');
    this.load.image('bg_inside', 'assets/bg_2.png');

    // map made with Tiled in JSON format
    this.load.tilemapTiledJSON('map1', 'assets/maps/demo_level_1.json');
    this.load.tilemapTiledJSON('map2', 'assets/maps/demo_level_2.json');
    this.load.tilemapTiledJSON('map3', 'assets/maps/demo_level_3.json');
    this.load.tilemapTiledJSON('map4', 'assets/maps/demo_level_4.json');
    this.load.tilemapTiledJSON('map5', 'assets/maps/demo_level_5.json');

    this.load.tilemapTiledJSON('map6', 'assets/maps/demo_level_end.json');

    // tiles in spritesheet
    this.load.spritesheet('tiles', 'assets/maps/tiles_placeholder.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('tiles_out', 'assets/maps/tiles_outdoors.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('tiles_factory', 'assets/maps/tiles_factory.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('player', 'assets/mage_placeholder.png', {frameWidth: 32, frameHeight: 32});
  }

  create () {
    //collisions
    collision_player = this.matter.world.nextCategory();
    collision_block = this.matter.world.nextCategory();
    collision_particle = this.matter.world.nextCategory();
    collision_ghost = this.matter.world.nextCategory();
    collision_blockPhysical = this.matter.world.nextCategory();
    collision_interactive = this.matter.world.nextCategory();

    var map;
    var tileSheet;
    var bg;
    // load the map
    switch (this.level) {
      case "1":
        map = this.make.tilemap({key: 'map1'});
        tileSheet = "tiles_out"
        bg = this.add.image(480, 360, 'bg_outside');
        break;
      case "2":
        map = this.make.tilemap({key: 'map2'});
        tileSheet = "tiles_out"
        bg = this.add.image(480, 360, 'bg_outside');
        break;
      case "3":
        map = this.make.tilemap({key: 'map3'});
        tileSheet = "tiles_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        break;
      case "4":
        map = this.make.tilemap({key: 'map4'});
        tileSheet = "tiles_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        break;
      case "5":
        map = this.make.tilemap({key: 'map5'});
        tileSheet = "tiles_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        break;
      case "6":
        map = this.make.tilemap({key: 'map6'});
        tileSheet = "tiles_factory"
        bg = this.add.image(480, 360, 'bg_inside');
        break;
    }
    bg.setScrollFactor(0)

    var tiles = map.addTilesetImage('Tiles',tileSheet);

    var bgLayer = map.createDynamicLayer('bg', tiles, 0, 0);
    //groundLayer.setCollisionByProperty({ collides: true });
    if(bgLayer) {
      this.matter.world.convertTilemapLayer(bgLayer);
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

        this.books[this.books.length] = bookBody;
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
          .existing(new Door(this, x, y, "door", door));
      });
    }

    var moverLayer = map.getObjectLayer("movers")
    if (moverLayer) {
      moverLayer.objects.forEach(mover => {
        const { x, y, width, height } = mover;
        var moverBody = this.add
          .existing(new Mover(this, x, y, "door", mover));
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
     * On preupdate make target for bubble spell appear - so that it can collide before spell cast event
     */
    this.events.on("preupdate", this.bubbleTarget, this);

    /**
     * Event for when charging ends
     * run on the update event in order to insure projectile goes into the
     *     physics engine at the right time to prevent glitching through walls
     */
    this.events.on("update", this.castSpell, this);

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
        var projectile = this.add.existing( new Projectile_Teleport(this, player.x+player.state.particleSourceX, player.y+player.state.particleSourceY, 'player') );
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

          projectile.body.force.y = projectile.body.mass * 2 * 0.001;

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

    //instant finish all particles - causes teleport
    if( this.cursors.down.isDown || this.keyS.isDown) {
      if (this.focus instanceof Projectile) {
        this.focus.age = this.focus.maxAge + 1;
      }
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


  }

  destroy() {
    this.destroyed = true;
    this.events.off("shutdown", this.destroy, this);
    this.events.off("destroy", this.destroy, this);
    this.events.off("preupdate", this.bubbleTarget, this);
    this.events.off("update", this.castSpell, this);
  }
}
