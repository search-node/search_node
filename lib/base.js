/**
 * @file
 * Defined base/super object used by the other library objects to inherit
 * basic methods.
 */

var util = require('util');
var eventEmitter = require('events').EventEmitter;

// Setup logger.
var fs = require('fs')
var Log = require('log')

/**
 * Base object as the module pattern.
 */
var Base = (function() {

  /**
   * Define the Base object.
   */
  var Base = function() {
    var self = this;

    // Load configuration.
    self.config = require('nconf');
    self.config.file({ file: 'config.json' });

    // Setup logger.
    self.logger = undefined;
    if (self.config.get('log')) {
      self.logger = new Log('info', fs.createWriteStream(self.config.get('log'), {'flags': 'a'}));
    }
  }

  // Extend the object with event emitter.
  util.inherits(Base, eventEmitter);

  /**
   * Emit error message.
   *
   * @private
   */
  Base.prototype.error = function error(code, message) {
    // Check that logger is defined.
    if (this.logger !== undefined) {
      this.logger.error(message);
    }
    this.emit('error', { code: code, message: message });
  }

  /**
   * Log message to log file.
   *
   * @param string message
   *   Message to log to send to the log file.
   */
  Base.prototype.log = function log(message) {
    // Check that logger is defined.
    if (this.logger !== undefined) {
      this.logger.info(message);
    }
  }

  /**
   * Generic get function to extract properties.
   */
  Base.prototype.get = function get(property) {
    var self = this;

    if (self.hasOwnProperty(property)) {
      return self[property];
    }

    self.error(500, 'Get - Property is not defined (' + property + ')');
  }

  /**
   * Generic set function to set properties.
   */
  Base.prototype.set = function set(property, value) {
    var self = this;

    if (self.hasOwnProperty(property)) {
      self[property] = value;
    }
    else {
      self.error(500, 'Set - Property is not defined (' + property + ')');
    }
  }

  // Return the inner object.
  return Base;

})();

// Export the object.
module.exports = Base;
