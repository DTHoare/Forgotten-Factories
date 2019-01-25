
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
      this.sound.play('winMusic')
      this.add.image(480, 360, 'bg_win');
      //this.add.bitmapText(220,180, 'editundo', 'Level ' + this.level + ' complete!');

      this.add.bitmapText(420,80, 'editundo', 'Congratulations!');

      this.add.bitmapText(480,150, 'editundo', 'This is truly a');
      this.add.bitmapText(465,180, 'editundo', 'very important find.');

      //this.add.bitmapText(420,230, 'editundo', 'You have proved yourself a true explorer.');

    }


    /**
     * update
     *
     */
    update () {



    }
}
