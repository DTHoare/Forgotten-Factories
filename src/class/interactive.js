/**
 * Interactive objects in the environment, player can acess
 */
class Interactive extends Phaser.Physics.Matter.Image{

  /**
   * constructor - creates image that is static and is a sensor
   *
   * @param  {type} scene   scene for object
   * @param  {type} x       spawn position x
   * @param  {type} y       spawn position y
   * @param  {type} texture spritesheet texture to use
   * @param  {type} id      tile id to use from texture
   */
  constructor(scene, x, y, texture, id, objectConfig){
      super(scene.matter.world, x, y, texture, id);
      this.scene = scene;
      this.properties = {};
      this.setStatic(true);
      this.body.isSensor = true;

      for (var i = 0; i < objectConfig.properties.length; i++){
        var key = objectConfig.properties[i];
        this.properties[key["name"]] = key["value"];
      }
  }
}


/**
 * Books are objects which can be read
 */
class Book extends Interactive{

  constructor(scene, x, y, texture, id, objectConfig){
      super(scene, x, y, texture, id, objectConfig);
      this.format();
  }

  /**
   * format - convert text property into this.formattedText
   *
   */
  format() {
    if(this.properties["text"]) {
      this.formattedText = this.addLineBreaks(this.properties["text"], 28);
    }
  }

  /**
   * addLineBreaks - description
   *
   * @param  {string} text       Plain text input
   * @param  {number} maxLetters maximum number of letters per line
   * @return {string}            text formatted into lines
   */
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

/**
 * Lever is an object with a state that controls something else
 */
class Lever extends Interactive{

  constructor(scene, x, y, texture, id, objectConfig){
      super(scene, x, y, texture, id, objectConfig);
  }


  /**
   * activate - emit event with the key of the lever
   */
  activate() {
    this.setFlipX(!this.flipX);
    this.scene.events.emit("lever", this.properties["leverKey"]);
  }
}
