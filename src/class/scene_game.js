class Scene_game extends Phaser.Scene {

  constructor ()
  {
    super('GameScene');
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
    this.load.tilemapTiledJSON('map', 'assets/maps/demo_level2.json');
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

    //platform = this.matter.add.image(320,240, 'platformTile',null, { isStatic: true });
    //platform.setCollisionCategory(collision_block);

    // load the map
    const map = this.make.tilemap({key: 'map'});

    // tiles for the ground layer
    const groundTiles = map.addTilesetImage('Tiles','tiles');
    // create the ground layer
    const groundLayer = map.createDynamicLayer('world', groundTiles, 0, 0);
    groundLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(groundLayer);

    // groundLayer.setCollisionCategory(collision_block);
    groundLayer.forEachTile(tile => {
      if (tile.collides) {
        tile.physics.matterBody.setCollisionCategory(collision_block);
      }
    });

    const { x, y } = map.findObject("Spawn", obj => obj.name === "Spawn Point");
    player = this.add.existing( new Player(this, x, y, 'player') );
    player.setCollisionCategory(collision_player);
    player.setCollidesWith([collision_block]);

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

    var moveForce = 0.01;
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
