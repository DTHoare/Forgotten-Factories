
/**
 * Structure are objects in the environment that are not tiles
 */
class Structure extends Phaser.Physics.Matter.Image{

  constructor(scene, x, y, texture, objectConfig){
    super(scene.matter.world, x, y, texture);
    this.scene = scene;
    this.setStatic(true);
    this.activated = false;
    this.displayWidth = objectConfig["width"];
    this.displayHeight = objectConfig["height"];

    this.properties = {};
    this.properties["moveX"] = 0;
    this.properties["moveY"] = 0;

    for (var i = 0; i < objectConfig.properties.length; i++){
      var key = objectConfig.properties[i];
      this.properties[key["name"]] = key["value"];
    }

    this.setCollisionCategory(collision_block);
    //this.setCollidesWith([collision_block, collision_player]);

    this.scene.events.on("lever", function(key) {
      if (this.properties["leverKey"] === key) {
        this.activate();
      }
    }, this);
  }

  activate() {
    this.activated = !this.activated;
    if (this.activated) {
      this.y += 32 *this.properties["moveY"];
      this.x += 32 *this.properties["moveX"];
    } else {
      this.y -= 32 *this.properties["moveY"];
      this.x -= 32 *this.properties["moveX"];
    }
  }
}
