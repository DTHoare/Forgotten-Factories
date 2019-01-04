class Scene_menu extends Phaser.Scene {

  constructor ()
  {
    super('MainMenu');
  }

  create() {
    this.addButton(600, 300, "start", "start")
    this.addButton(600, 400, "credits", "credits")

    this.input.on('gameobjectover', function (pointer, button)
    {
        button.setFrame(1);
    }, this);
    this.input.on('gameobjectout', function (pointer, button)
    {
        button.setFrame(0);
    }, this);

    this.input.on('gameobjectup', function (pointer, button)
    {
      if(button.getData('index') === 'start') {
        game.scene.add('GameScene', new Scene_game(), true)
        game.scene.add('UIScene', new Scene_UI(), true)
        this.scene.remove('MainMenu')
      } else if (button.getData('index') === 'credits') {
        game.scene.add('Credits', new Scene_credits(), true)
        this.scene.stop('MainMenu')
      }


    }, this);
  }

  update () {
    // game.scene.add('GameScene', new Scene_game(), true)
    // game.scene.add('UIScene', new Scene_UI(), true)
  }

  addButton(x, y, text, scene) {
    var button = this.add.sprite(x, y, 'button', 0).setInteractive()
    button.setData('index', scene)
    var startText = this.add.bitmapText(x, y, 'editundo', text)
    startText.setOrigin(0.5,0.5)
  }

}
