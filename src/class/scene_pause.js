
/**
 * Scene used for displaying book text on user interaction
 */
class Scene_pause extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'PauseScene', active: true });
        this.text = "test";
        this.helpText = "Q to close"
        this.textLeft;
        this.textRight;
    }

    preload () {
      this.load.image('book', 'assets/book_placeholder.png');
    }

    create () {
      this.add.image(480, 400, 'book');

      var bookLetter = this.add.bitmapText(100, 170, 'editundo', "PAUSED");
      bookLetter.setFontSize(-80);
      bookLetter.setTint(0x000000);

      var text = this.add.bitmapText(100, 270, 'editundo', "Options");
      text.setTint(0x000000);

      this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);



      // Buttons on menu
      //

      this.addButton(690, 350, "Resume", "Resume")
      this.addButton(690, 380, "Main Menu", "Main Menu")
      if (mute) {
        var soundButton = this.addButton(150, 350, "Unmute", "Mute")
      } else {
        var soundButton = this.addButton(150, 350, "Mute", "Mute")
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
        if(button.getData('index') === 'Resume') {
          pointer.justUp = false;
          game.scene.resume('GameScene');
          game.scene.getScene('GameScene').matter.world.resume();
          //this.scene.stop();
          game.scene.remove('PauseScene');
        } else if (button.getData('index') === 'Main Menu') {
          game.scene.add('MainMenu', new Scene_menu(), true)
          this.scene.remove('PauseScene')
          //launch and then remove scene to prevent crash on stopping a paused matter physics
          this.scene.launch('GameScene')
          if(game.scene.getScene('GameScene').bgMusic) {
            game.scene.getScene('GameScene').bgMusic.stop()
            game.scene.getScene('GameScene').bgMusic = null;
          }
          this.scene.remove('GameScene')
          game.scene.remove('UIScene');
        } else if(button.getData('index') === 'Mute') {
          if(mute) {
            mute = false
            soundButton.setText("Mute")
          } else {
            mute = true
            soundButton.setText("Unmute")
          }
          game.scene.getScene('GameScene').events.emit("checkSound")
        }


      }, this);

    }

    update () {
      //resume the game and close this scene
      if (Phaser.Input.Keyboard.JustDown(this.keyQ) || Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        game.scene.resume('GameScene');
        game.scene.getScene('GameScene').matter.world.resume();
        //this.scene.stop();
        game.scene.remove('PauseScene');
      }

    }

    addButton(x, y, text, scene) {
      var button = this.add.sprite(x, y, 'button', 0).setInteractive()
      button.setData('index', scene)
      var startText = this.add.bitmapText(x, y, 'editundo', text)
      button.displayWidth = startText.width*1.3
      startText.setOrigin(0.5,0.5)
      startText.setTint(0x000000);
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
      this.destroyed = true;
      this.events.off("shutdown", this.destroy, this);
      this.events.off("destroy", this.destroy, this);

      this.input.off('gameobjectover', function (pointer, button){})
      this.input.off('gameobjectout', function (pointer, button){})
      this.input.off('gameobjectup', function (pointer, button){})
    }
}
