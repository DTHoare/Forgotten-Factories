
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
