class Scene_message extends Phaser.Scene {

  constructor ()
  {
    super('Message');
  }

  create () {
    this.add.bitmapText(200, 150, 'editundo', "You must prove yourself.")
    this.add.bitmapText(200, 250, 'editundo', "Explore the world.")
    this.add.bitmapText(200, 350, 'editundo', "Return with something of value.")

    var text = this.add.bitmapText(300, 550, 'editundo', "Click to Continue")
    text.setTint(0xcf4ed8)

    this.input.on("pointerup", function() {
      game.scene.add('GameScene', new Scene_game(), true)
      game.scene.add('UIScene', new Scene_UI(), true)
      this.scene.remove("Message")
    }, this)

  }

}
