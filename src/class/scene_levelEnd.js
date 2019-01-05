
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
      //this.add.bitmapText(220,180, 'editundo', 'Level ' + this.level + ' complete!');

      //this.add.bitmapText(220,380, 'editundo', 'Press space for the next level.');

      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }


    /**
     * update
     *
     */
    update () {
      if (Phaser.Input.Keyboard.JustUp(this.keySpace)) {
        this.scene.start('GameScene', {level: this.nextLevel});
      }


    }
}
