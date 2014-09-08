/**
 * @file
 * This is a wrapper class to hande the system logger.
 */

// Node core modules.
var fs = require('fs');

// NPM modules.
var Log = require('log');

// Custom modules.
var config = require('./configuration');

// Holds the log object.
var log;

/**
 * Define the Base object (constructor).
 */
var Logger = function() {
  // Set logger.
  log = new Log('debug', fs.createWriteStream(config.get('log'), {'flags': 'a'}));
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
  if (log !== undefined) {
    log.debug(message);
  }
}

// Export the object (exports uses cache, hence singleton).
module.exports = new Logger();
