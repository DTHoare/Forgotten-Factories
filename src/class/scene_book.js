class Scene_book extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'BookScene', active: true });
        this.text = "test";
        this.helpText = "Q to close"
        this.textLeft;
        this.textRight;


    }

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

    preload ()
    {
      //this.load.bitmapFont('editundo', 'assets/font/editundo_0.png', 'assets/font/editundo.fnt');
      this.load.image('book', 'assets/book_placeholder.png');
    }

    create ()
    {
      this.text = this.sys.settings.data["text"];
      this.textToPages();
      this.add.image(480, 400, 'book');
      var booktextL = this.add.bitmapText(100, 180, 'editundo', this.textLeft);
      booktextL.setTint(0x000000);
      var booktextR = this.add.bitmapText(500, 180, 'editundo', this.textRight);
      booktextR.setTint(0x000000);

      var helpertext = this.add.bitmapText(700, 20, 'editundo', this.helpText);

      //  Grab a reference to the Game Scene
      var game = this.scene.get('GameScene');
      this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    }

    update () {

      if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
        game.scene.resume('GameScene');
        //this.scene.stop();
        game.scene.remove('BookScene');
      }

    }
}
