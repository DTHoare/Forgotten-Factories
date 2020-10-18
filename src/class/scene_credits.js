class Scene_credits extends Phaser.Scene {

  constructor ()
  {
    super('Credits');
  }

  create () {
    //dumb method to get a black background...
    var bg = this.add.image(480, 360, 'bg_menu');
    bg.setTint(0x000000);
    this.add.bitmapText(100, 200, 'editundo', "Created by Daniel Hoare")

    this.add.bitmapText(100, 600, 'editundo', "Special thanks to Joellen for her patience")

    var text = this.add.bitmapText(300, 50, 'editundo', "Click to return")
    text.setTint(0xcf4ed8)

    this.input.on("pointerup", function() {
      this.scene.resume('MainMenu')
      this.scene.remove("Credits")
    }, this)

  }

}
