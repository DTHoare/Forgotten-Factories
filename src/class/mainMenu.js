class Scene_menu extends Phaser.Scene {

  constructor ()
  {
    super('MainMenu');
  }

  create() {
    this.add.image(480, 360, 'bg_menu');
    this.addButton(550, 200, "start", "start")
    this.addButton(550, 250, "level select", "level select")
    this.addButton(550, 300, "credits", "credits")

    if (mute) {
      var soundButton = this.addButton(550, 350, "Unmute", "Mute")
    } else {
      var soundButton = this.addButton(550, 350, "Mute", "Mute")
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
      if(button.getData('index') === 'start') {
        game.scene.add('Message', new Scene_message(), true)
        this.scene.remove('MainMenu')
      } else if (button.getData('index') === 'level select') {
        game.scene.add('LevelSelect', new Scene_levelSelect(), true)
        this.scene.stop('MainMenu')
      } else if (button.getData('index') === 'credits') {
        game.scene.add('Credits', new Scene_credits(), true)
        this.scene.stop('MainMenu')
      } else if(button.getData('index') === 'Mute') {
        if(mute) {
          mute = false
          soundButton.setText("Mute")
        } else {
          mute = true
          soundButton.setText("Unmute")
        }
      }


    }, this);
  }

  addButton(x, y, text, scene) {
    var button = this.add.sprite(x, y, 'button', 0).setInteractive()
    button.setData('index', scene)
    var startText = this.add.bitmapText(x, y, 'editundo', text)
    button.displayWidth = startText.width*1.3
    startText.setOrigin(0.5,0.5)
    var buttonObj = {
      button: button,
      text: startText,
      setText(str) {
        this.text.setText(str);
        this.button.displayWidth = this.text.width*1.3;
      }
    }
    return buttonObj
  }

}
