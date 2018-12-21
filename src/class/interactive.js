class Interactive extends Phaser.Physics.Matter.Image{

    constructor(scene, x, y, texture, id){
        super(scene.matter.world, x, y, texture, id);
        this.properties = {}
        this.setStatic(true);
        this.body.isSensor = true;

    }

    format() {
      if(this.properties["Text"]) {
        this.formattedText = this.addLineBreaks(this.properties["Text"], 28);
      }
    }

    addLineBreaks(text, maxLetters) {
      const split = text.split(/( )/g);
      let lines = [];

      function nextLine() {
        let newLine = "";
        while (`${newLine} ${split[0]}`.length < maxLetters && split.length) {
          newLine += split.shift();
        }
        lines.push(newLine.trim());
        if (split.length) {
          nextLine();
        }
      }

      nextLine();

      return lines.join("\n");
    }
}
