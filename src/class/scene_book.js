
/**
 * Scene used for displaying book text on user interaction
 */
class Scene_book extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'BookScene', active: true });
        this.text = "test";
        this.helpText = "Q to close"
        this.textLeft;
        this.textRight;
    }

    /**
     * textToPages - splits this.text into two pages of text stored in
     *     this.textLeft and this.textRight
     */
    textToPages() {
      const split = this.text.split(/\n|\r/g);
      let pages = [];
      var maxLines = 8;

      function nextLine() {
        let newPage = "";
        var i = 0;
        while (i < maxLines && split.length) {
          newPage += split.shift();
          newPage += "\n\n";
          //console.log(newPage);
          i ++;
        }
        pages.push(newPage);
        if (split.length) {
          nextLine();
        }
      }
      nextLine();
      this.textLeft = pages[0];
      this.textRight = pages[1];


    }

    preload () {
      this.load.image('book', 'assets/book_placeholder.png');
    }

    create () {
      //get text passed in through init
      this.text = this.sys.settings.data["text"];

      this.textToPages();
      this.add.image(480, 400, 'book');

      //make the first letter bigger - size is negative for some reason?
      var bookLetter = this.add.bitmapText(100, 170, 'editundo', this.textLeft.slice(0,1));
      bookLetter.setFontSize(-80);
      bookLetter.setTint(0x000000);

      var booktextL = this.add.bitmapText(100, 180, 'editundo', "   " + this.textLeft.slice(1,-1));
      booktextL.setTint(0x000000);
      var booktextR = this.add.bitmapText(500, 180, 'editundo', this.textRight);
      booktextR.setTint(0x000000);

      this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    }

    update () {
      //resume the game and close this scene
      if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
        game.scene.resume('GameScene');
        game.scene.getScene('GameScene').matter.world.resume();
        //this.scene.stop();
        game.scene.remove('BookScene');
      }

    }
}
