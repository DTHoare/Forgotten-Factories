
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
    this.inMotion = 0;

    this.properties = {};

    for (var i = 0; i < objectConfig.properties.length; i++){
      var key = objectConfig.properties[i];
      this.properties[key["name"]] = key["value"];
    }

    this.setCollisionCategory(collision_block);
    //this.setCollidesWith([collision_block, collision_player]);

    this.scene.events.on("lever", function(key, moveX, moveY, lever) {
      if (this.properties["leverKey"] === key) {

        //levers deactivate while motion completes
        if(this.inMotion) {
          this.scene.events.emit("cancelLever", lever, key);
          return 0;
        }
        this.activate(moveX, moveY, lever);
      }
    }, this);

    this.scene.events.on("update", this.update, this);
  }

  /**
   * activate - move the door. slow property defines whether instant or not
   *     if slow is non-zero this gives the amount of time for motion to complete
   */
  activate(moveX, moveY, lever) {
    var slow = lever.properties["slow"];
    if(!slow) {
      if (lever.flipX) {
        this.y += 32 * moveY;
        this.x += 32 * moveX;
      } else {
        this.y -= 32 * moveY;
        this.x -= 32 * moveX;
      }
    }
    else if(slow) {
      this.inMotion = slow;
      if (lever.flipX) {
        this.yMotion = 32 * moveY / this.inMotion;
        this.xMotion = 32 * moveX / this.inMotion;
      } else {
        this.yMotion = - 32 * moveY / this.inMotion;
        this.xMotion =  -32 * moveX / this.inMotion;
      }
    }

  }


  /**
   * update - if slow motion needed, update the door
   *
   * @return {type}  return 1 if not in motion
   */
  update() {
    if(!this.inMotion) {
      return 1;
    }

    this.y += this.yMotion;
    this.x += this.xMotion;
    this.inMotion -= 1;

  }
}
