/**
 * @file
 * This is a wrapper class to hande the system logger.
 */

// Node core modules.
var fs = require('fs');

// NPM modules.
var Log = require('log');

// Holds the log object.
var log;

/**
 * Define the Base object (constructor).
 */
var Logger = function Logger(filename, debug) {
  // If true debug messages are logged.
  this.log_debug = debug

  // Set logger.
  log = new Log('debug', fs.createWriteStream(filename, {'flags': 'a'}));
}

/**
 * Log error message.
 *
 * @param message
 *   The message to send to the logger.
 */
Logger.prototype.error = function error(message) {
  if (log !== undefined) {
    log.error(message);
  }
}

/**
 * Log info message.
 *
 * @param message
 *   The message to send to the logger.
 */
Logger.prototype.info = function info(message) {
  if (log !== undefined) {
    log.info(message);
  }
}

/**
 * Log debug message.
 *
 * @param message
 *   The message to send to the logger.
 */
Logger.prototype.debug = function debug(message) {
  if (log !== undefined && this.log_debug == true) {
    log.debug(message);
  }
}

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  var logger = new Logger(options.filename, options.debug || false);

  register(null, {
    "logger": logger
  });
}
