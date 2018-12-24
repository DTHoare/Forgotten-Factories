
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

    var barLayer = map.createDynamicLayer('bars', tiles, 0, 0);
    barLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(barLayer);

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
    map.getObjectLayer("books").objects.forEach(book => {
      const { x, y, width, height } = book;
      // Tiled origin for its coordinate system is (0, 1), but we want coordinates relative to an
      // origin of (0.5, 0.5)
      var bookBody = this.add
        .existing(new Book(this, x, y, "tiles", 40, book));

      this.books[this.books.length] = bookBody;
    });

    map.getObjectLayer("levers").objects.forEach(lever => {
      const { x, y, width, height } = lever;
      var leverBody = this.add
        .existing(new Lever(this, x, y, "tiles", 41, lever));
    });

    map.getObjectLayer("doors").objects.forEach(door => {
      const { x, y, width, height } = door;
      var doorBody = this.add
        .existing(new Structure(this, x, y, "door", door));

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
     * run on the update event in order to insure projectile goes into the
     *     physics engine at the right time to prevent glitching through walls
     */
    this.events.on("update", function() {
      var pointer = game.input.activePointer
      if (pointer.justUp) {
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
      }
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

          this.trail[this.trail.length] = this.add.image(projectile.x, projectile.y, 'projectile_large');
          this.trail[this.trail.length-1].setTint(0x60fcff);
          this.trail[this.trail.length-1].setAlpha(1 - i/14.);

          projectile.body.force.y = projectile.body.mass * 2 * 0.001;

          Phaser.Physics.Matter.Matter.Body.update(projectile.body, 16.67, 1, 1);
          projectile.limitSpeed();
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

          if(!playerProjectiles[i].fail) {
            player.setX(playerProjectiles[i].x);
            player.setY(playerProjectiles[i].y);
            player.setVelocityX(playerProjectiles[i].body.velocity.x);
            player.setVelocityY(playerProjectiles[i].body.velocity.y);
          }

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
