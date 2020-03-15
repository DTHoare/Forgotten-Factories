
/**
 * Level end screen
 */
class Scene_levelEnd extends Phaser.Scene {

    constructor () {
        super({ key: 'levelEndScene', active: true });

    }

    init (data) {
      this.level = data.level
      this.nextLevel = data.nextLevel
    }

    preload () {
      //this.load.bitmapFont('editundo', 'assets/font/editundo_0.png', 'assets/font/editundo.fnt');
      //this.load.image('ui', 'assets/UI_placeholder.png');
    }

    create () {
      this.winMusic = this.sound.play('winMusic')
      this.add.image(480, 360, 'bg_win');
      //this.add.bitmapText(220,180, 'editundo', 'Level ' + this.level + ' complete!');

      //this.add.bitmapText(420,80, 'editundo', 'Congratulations!');

      //this.add.bitmapText(480,150, 'editundo', 'This is truly a');
      //this.add.bitmapText(465,180, 'editundo', 'very important find.');

      //this.add.bitmapText(420,230, 'editundo', 'You have proved yourself a true explorer.');

      this.time.delayedCall(1000, this.addText, [405,80, 'editundo', 'Congratulations!', -70], this);
      this.time.delayedCall(3000, this.addText, [580,240, 'editundo', 'This is truly', -45], this);
      this.time.delayedCall(4500, this.addText, [470,340, 'editundo', 'a very important find.', -45], this);

      this.time.delayedCall(6500, this.addButton, [700,600, 'Main Menu', 'menu'], this);

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
        if(button.getData('index') === 'menu') {
          this.scene.add('MainMenu', new Scene_menu(), true)
          this.sound.stopAll()
          this.bgMusic = null;
          //game.scene.getScene('levelEndScene').bgMusic.stop()
          this.scene.remove('levelEndScene')
        }
      }, this);

    }

    /**
     * update
     *
     */
    update () {



    }

    addText(x, y, font, text, size) {
      text = this.add.bitmapText(x,y,font,text);
      text.setFontSize(size);
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
