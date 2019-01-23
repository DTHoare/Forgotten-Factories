class Scene_levelSelect extends Phaser.Scene {

  constructor ()
  {
    super('LevelSelect');
  }

  create() {
    this.add.image(480, 360, 'bg_menu');
    this.addButton(250, 50, "return", "return")
    for(var i = 0; i <= 5; i++) {
      this.addButton(450, 150+30*i, "Level "+i, "level "+i)
    }


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
      if(button.getData('index') === 'return') {
        this.scene.launch('MainMenu')
        this.scene.remove('LevelSelect')
      } else if (button.getData('index').includes('level')) {
        game.scene.add('GameScene', new Scene_game(), true, {level: button.getData('index').split(" ")[1]})
        game.scene.add('UIScene', new Scene_UI(), true)
        this.scene.remove('LevelSelect')
        //launch and then remove scene to prevent crash on stopping a paused matter physics
        this.scene.launch('MainMenu')
        this.scene.remove('MainMenu')
      }


    }, this);
  }

  addButton(x, y, text, scene) {
    var button = this.add.sprite(x, y, 'button', 0).setInteractive()
    button.setData('index', scene)
    var startText = this.add.bitmapText(x, y, 'editundo', text)
    button.displayWidth = startText.width*1.3
    startText.setOrigin(0.5,0.5)
  }

  destroy() {
    this.destroyed = true;
    this.events.off("shutdown", this.destroy, this);
    this.events.off("destroy", this.destroy, this);

    this.input.off('gameobjectover', function (pointer, button){})
    this.input.off('gameobjectout', function (pointer, button){})
    this.input.off('gameobjectup', function (pointer, button){})
  }

}
