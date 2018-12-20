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
