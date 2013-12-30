
/**
 * @file
 * Generate Icon.
 *
 * @author Naoki Takimura <n.takimura@gmail.com>
 */

var path = require("path"),
    fs = require("fs"),
    domjs = require("dom-js"),
    imagemagick = require("imagemagick");

/**
 * Generate icon super class.
 * @constructor
 * @private
 */
function GenIcon() {
}
exports.GenIcon = GenIcon;

/**
 * Generate the icon files.
 *
 * @param {Function} clbk callback function.
 */
GenIcon.prototype.generate = function(clbk) {
  var self = this,
      src,
      platformDir,
      targets = self.target;

  if (clbk === undefined) {
    clbk = function(){};
  }

  src = (self.icon) ? self.icon : self.project + "/www/img/logo.png";
  platformDir = self.project + "/platforms";

  fs.readFile(self.project + "/www/config.xml", function(err, data) {
    if (err) {
      return clbk(err);
    }
    (new domjs.DomJS()).parse(data.toString(), function(err, dom) {
      if (err) {
        return clbk(err);
      }

      var name, i;
      for (i in dom.children) {
        if (dom.children[i].name === "name") {
          name = dom.children[i].children[0].text;
        }
      }

      fs.readdir(platformDir, function(err, platforms) {
        if (err) {
          return clbk(err);
        }

        if (targets.length === 0) {
          targets = [].concat(platforms);
        }

        (function _generate(err){
          if (err) {
            return clbk(err);
          }

          var target = targets.shift();
          if (target === null || target === undefined) {
            return clbk();
          }

          fs.exists(platformDir + "/" + target, function(exists) {
            if (exists) {
              if (!self.silent) {
                console.log();
                console.log("Generate " + target + " icon image files");
              }

              if (target === "android") {
                self.generateAndroidIcon(src, platformDir, function(err) {
                  _generate(err);
                });
              } else if (target === "ios") {
                self.generateIOSIcon(name, src, platformDir, function(err) {
                  _generate(err);
                });
              } else if (target === "amazon-fireos") {
                self.generateAmazonFireOSIcon(name, src, platformDir, function(err) {
                  _generate(err);
                });
              } else if (target === "firefoxos") {
                self.generateFirefoxOSIcon(name, src, platformDir, function(err) {
                  _generate(err);
                });
              }
            } else {
              console.log("platform \"" + target + "\" does not exist.");
              _generate();
            }
          });
        })();

      });

    });
  });

};

/**
 * Convert an image file.
 *
 * It converts the source image file to the dest image file.
 * The dest file image size is (width, height).
 *
 * @param {String} src source image file path.
 * @param {String} dest destination image file path.
 * @param {Number} width destination image width.
 * @param {Number} height destination image height.
 * @param {Object} options opitons.
 * @param {Function} clbk callback function.
 */
GenIcon.prototype.convert = function(src, dest, width, height, options, clbk) {
  if (this.verbose) {
    console.log();
  }
  if (!this.silent) {
    console.log(dest);
  }
  if (this.verbose) {
    console.log("resize");
    console.log("from  : " + src);
    console.log("dest  : " + dest);
    console.log("width : " + width);
    console.log("height: " + height);
  }

  if (clbk === undefined) {
    clbk = options;
    options = {};
  }

  var self = this,
      dir = path.dirname(dest);
  this.mkdir(dir, function(err) {
    if (err && err.code !== "EEXIST") {
      return clbk(err);
    }
    imagemagick.resize({
      srcPath: src,
      dstPath: dest,
      width: width,
      height: height + "!",
    }, function(err) {
      if (err) {
        clbk(err);
      }

      if (options && options.roundCorner === true ) {
        if (self.verbose) {
          console.log("convert round corner image");
          console.log("from  : " + dest);
          console.log("dest  : " + dest);
          console.log("round : " + (height / 6.4));
        }
        imagemagick.convert([
          "-size", width + "x" + height,
          "xc:none",
          "-fill", dest,
          "-draw",
          "roundRectangle 0,0 " + width + "," + height + " " + (width / 6.4) + "," + (height / 6.4),
          dest
        ], function(err) {
          clbk(err);
        });
      } else if (options && options.circle === true) {
        if (self.verbose) {
          console.log("convert circle image");
          console.log("from  : " + dest);
          console.log("dest  : " + dest);
          console.log("radius: " + (width / 2));
        }
        imagemagick.convert([
          "-size", width + "x" + height,
          "xc:none",
          "-fill", dest,
          "-draw",
          "circle " + (width / 2) + "," + (width / 2) + " " + (width / 2) + ",1",
          dest
        ], function(err) {
          clbk(err);
        });
      } else {
        clbk(err);
      }
    });
  });

};

/**
 * Resize to the image files.
 *
 * It resize the source image file to the destination image files.
 *
 * @param {String} src source image file path.
 * @param {String} dests destination image file set.
 * @param {Object} options opitons.
 * @param {Function} clbk callback function.
 */
GenIcon.prototype.resize = function(src, dests, options, clbk) {
  var self = this,
      targets = [].concat(dests);

  if (clbk === undefined) {
    clbk = options;
    options = undefined;
  }

  (function _resize(err) {
    if (err) {
      return clbk(err);
    }
    var target = targets.shift();
    if (target === null || target === undefined) {
      return clbk(err);
    }

    self.convert(src, target.dest, target.width, target.height, options, function(err) {
      _resize(err);
    });
  })();
};

/**
 * Make the directory recursively.
 * @param {String} dir directory path.
 * @param {Function} clbk callback function.
 */
GenIcon.prototype.mkdir = function(dir, clbk) {
  var self = this;
  fs.exists(path.dirname(dir), function(exists) {
    if (!exists) {
      self.mkdir(path.dirname(dir), function(err) {
        if (err) {
          return clbk(err);
        }
        self.mkdir(dir, function(err) {
          clbk(err);
        });
      });
    } else {
      fs.mkdir(dir, function(err) {
        clbk(err);
      });
    }
  });
};

// vim: ts=2 sw=2
