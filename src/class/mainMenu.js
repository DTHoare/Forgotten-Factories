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

    this.bgMusic = this.sound.add('titleMusic', {loop: true})
    this.bgMusic.play();

    if (mute) {
      var soundButton = this.addButton(800, 650, "Unmute", "Mute")
    } else {
      var soundButton = this.addButton(800, 650, "Mute", "Mute")
    }

    if (invincible) {
      var invincibleButton = this.addButton(800, 700, "Turn off invincible", "Invincible")
    } else {
      var invincibleButton = this.addButton(800, 700, "Turn on invincible", "Invincible")
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
        this.bgMusic.stop();
        this.scene.remove('MainMenu')
      } else if (button.getData('index') === 'level select') {
        game.scene.add('LevelSelect', new Scene_levelSelect(), true)
        this.scene.pause('MainMenu')
      } else if (button.getData('index') === 'credits') {
        game.scene.add('Credits', new Scene_credits(), true)
        this.scene.pause('MainMenu')
      } else if(button.getData('index') === 'Mute') {
        if(mute) {
          mute = false
          soundButton.setText("Mute")
        } else {
          mute = true
          soundButton.setText("Unmute")
        }
      }
      else if(button.getData('index') === 'Invincible') {
        if(invincible) {
          invincible = false
          invincibleButton.setText("Turn on invincible")
        } else {
          invincible = true
          invincibleButton.setText("Turn off invincible")
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

  destroy() {
    this.bgMusic.stop();
    console.log("Main menu stopped");
  }

}
