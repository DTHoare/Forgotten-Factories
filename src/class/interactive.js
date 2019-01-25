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
      x = x + (objectConfig.width / 2.)*Math.cos( (objectConfig.rotation-45.)*Math.PI/180.)*1.414;
      y = y + (objectConfig.height / 2.)*Math.sin( (objectConfig.rotation-45.)*Math.PI/180.)*1.414;
      super(scene.matter.world, x, y, texture, id);
      this.setAngle(objectConfig.rotation);
      this.scene = scene;
      this.properties = {};
      this.setStatic(true);
      this.body.isSensor = true;
      this.setCollisionCategory(collision_interactive);
      this.setCollidesWith([collision_player]);
      this.identity = x.toString() + " " + y.toString()

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
      this.formattedText = this.addLineBreaks(this.properties["text"], 27);
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
    const split = text.split(/( |\n)/g);
    console.log(text)
    console.log(split)
    let lines = [];

    function nextLine() {
      let newLine = "";
      while (`${newLine} ${split[0]}`.length < maxLetters && split.length && !newLine.includes("\n")) {
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

      this.isCancelled = false;

      //check for whether lever cannot be pulled
      this.scene.events.on("cancelLever", function(lever, key) {
        var check;

        //listen for other levers? Useful for linked levers
        if (!this.properties["listen"]) {
          check = this === lever;
        } else {
          check = this.properties["leverKey"].split(" ").includes(key);
        }
        //cancel the lever
        if(check && this.isCancelled === false) {
          this.setFlipX(!this.flipX);
          this.isCancelled = true;
        }
      }, this)

      this.scene.events.on("update", function() {this.isCancelled=false;}, this);

      //if levers are linked, they must listen for each others events
      if(this.properties["listen"]) {
        this.scene.events.on("lever", function(key, mx, my, lever) {
          if (this === lever) {
            return 0;
          } else if (this.properties["leverKey"].split(" ").includes(key)) {
            this.setFlipX(!this.flipX);
          }
        }, this)
      }
  }


  /**
   * activate - emit event with the key of the lever
   */
  activate() {
    this.setFlipX(!this.flipX);
    var moveX = "0";
    var moveY = "0";
    if (this.properties["moveX"]) {moveX = this.properties["moveX"];}
    if (this.properties["moveY"]) {moveY = this.properties["moveY"];}
    var keys = this.properties["leverKey"].split(" ");
    var mx = moveX.split(" ");
    var my = moveY.split(" ");
    for (var i = 0; i < keys.length; i++) {
      this.scene.events.emit("lever", keys[i], parseFloat(mx[i % mx.length]), parseFloat(my[i % my.length]), this);
    }


  }
}

class Goal extends Interactive{

  constructor(scene, x, y, texture, id, objectConfig){
      super(scene, x, y, texture, id, objectConfig);
  }


  /**
   * activate -
   */
  activate() {
    console.log("start level: " + this.properties["level"])
    this.scene.scene.restart({level: this.properties["level"]});
    //game.scene.add('levelEndScene', Scene_levelEnd, false, {level: this.scene.sys.settings.data.level, nextLevel: this.properties["level"]})
    //this.scene.scene.start('levelEndScene', {level: this.scene.sys.settings.data.level, nextLevel: this.properties["level"]});

  }
}

class Pickup extends Interactive{

  constructor(scene, x, y, texture, id, objectConfig){
      super(scene, x, y, texture, id, objectConfig);
  }


  /**
   * activate -
   */
  activate() {
    game.scene.add('levelEndScene', Scene_levelEnd, true)
    //this.scene.bgMusic.stop()
    this.scene.scene.remove('GameScene')
    //this.scene.scene.start('levelEndScene', {level: this.scene.sys.settings.data.level, nextLevel: this.properties["level"]});

  }
}
