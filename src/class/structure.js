
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
