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
    this.load.image('barrier', 'assets/barrier.png');

    this.load.image('bg_menu', 'assets/bg_menu.png');
    this.load.image('bg_outside', 'assets/bg_1.png');
    this.load.image('bg_inside', 'assets/bg_2.png');

    // map made with Tiled in JSON format
    this.load.tilemapTiledJSON('map0', 'assets/maps/demo_level_0.json');

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
    this.load.spritesheet('tiles_tutorial', 'assets/maps/tiles_tutorial.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('player', 'assets/mage_placeholder.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('button', 'assets/button.png', {frameWidth: 128, frameHeight: 48});

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


    this.load.image('ui', 'assets/UI_placeholder.png');
  }

  create () {
    game.scene.add('MainMenu', new Scene_menu(), true)
    this.scene.remove('Loading')
  }

}
