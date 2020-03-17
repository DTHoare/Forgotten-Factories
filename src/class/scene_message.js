class Scene_message extends Phaser.Scene {

  constructor ()
  {
    super('Message');
  }

  create () {
    //this.add.bitmapText(200, 150, 'editundo', "You must prove yourself.")
    //this.add.bitmapText(200, 250, 'editundo', "Explore the world.")
    //this.add.bitmapText(200, 350, 'editundo', "Return with something of value.")

    var text = this.add.bitmapText(300, 550, 'editundo', "Click to Skip")
    text.setTint(0xcf4ed8)

    this.input.on("pointerup", function() {
      game.scene.add('GameScene', new Scene_game(), true)
      game.scene.add('UIScene', new Scene_UI(), true)
      this.scene.remove("Message")
    }, this)

    this.time.delayedCall(300, this.addText, [95,120, 'editundo', 'You are a novice adventurer.', -40], this);
    this.time.delayedCall(2500, this.addText, [95,220, 'editundo', 'You must prove yourself.', -40], this);
    this.time.delayedCall(5500, this.addText, [95,290, 'editundo', 'Explore the ruins of the fallen Empire.', -40], this);
    this.time.delayedCall(8000, this.addText, [95,410, 'editundo', 'Return with something of value.', -40], this);

    this.time.delayedCall(10000, text.setText, ["Click to Start"], text);
    this.time.delayedCall(10000, text.setFontSize, [-60], text);

  }

  fadein(text) {
    var tween = this.tweens.add({
      targets: text,
      alpha: 1,
      ease: 'Linear',       // 'Cubic', 'Elastic', 'Bounce', 'Back'
      duration: 1500,
      repeat: 0,            // -1: infinity
      yoyo: false
    });
  }

  fadeout(text) {
    var tween = this.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0 },
      ease: 'Linear',       // 'Cubic', 'Elastic', 'Bounce', 'Back'
      duration: 1500,
      repeat: 0,            // -1: infinity
      yoyo: false
    });
    text.destroy();
  }

  addText(x, y, font, text, size) {
    text = this.add.bitmapText(x,y,font,text);
    text.setFontSize(size);
    text.setAlpha(0);
    this.fadein(text);
  }

}
