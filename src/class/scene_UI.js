class Scene_UI extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'UIScene', active: true });

        this.manaText;
        this.spellText;

    }

    preload ()
    {
      this.load.bitmapFont('editundo', 'assets/font/editundo_0.png', 'assets/font/editundo.fnt');
      this.load.image('ui', 'assets/UI_placeholder.png');
    }

    create ()
    {
      this.add.image(480, 30, 'ui');
      var text = this.add.bitmapText(20,20, 'editundo', 'Mage Cage');
      text.setTint(0xcf4ed8);
      this.manaText = this.add.bitmapText(200,20, 'editundo', 'Mana: ' + player.state.mana);
      this.manaText.setTint(0xcf4ed8);
      this.spellText = this.add.bitmapText(340,20, 'editundo', 'Spell: ' + player.state.spell);
      this.spellText.setTint(0xcf4ed8);

      //  Grab a reference to the Game Scene
      var ourGame = this.scene.get('GameScene');

      //  Listen for events from it
      // ourGame.events.on('addScore', function () {
      //
      //     manaText.setText("Mana: " + player.state.mana);
      //
      // }, this);
    }

    update () {
      this.manaText.setText("Mana: " + player.state.mana);
      this.spellText.setText("Spell: " + player.state.spell);

    }
}
