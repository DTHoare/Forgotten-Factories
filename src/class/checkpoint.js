class Checkpoint {

  constructor(scene, objectConfig){
    this.x = objectConfig.x + (objectConfig.width / 2)*Math.cos(objectConfig.rotation*Math.PI/180.);
    this.y = objectConfig.y + (objectConfig.height / 2)*Math.cos(objectConfig.rotation*Math.PI/180.);
    this.scene = scene;
    this.destroyed = false;

    this.body = this.scene.matter.add.rectangle(
      this.x,
      this.y,
      objectConfig.width,
      objectConfig.height,
      {
        isSensor: true,
        isStatic: true
      }
    )
    this.body.gameObject = this

    this.body.collisionFilter.category = collision_block ;

    this.scene.events.on("shutdown", this.destroy, this);
    this.scene.events.on("destroy", this.destroy, this);
  }

  destroy() {
    this.destroyed = true;
    this.scene.events.off("shutdown", this.destroy, this);
    this.scene.events.off("destroy", this.destroy, this);
  }
}
