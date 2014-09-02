/**
 * @file
 * This is a wrapper class to hande the configuation loaded from config.json.
 */

/**
 * Configuration object implemented as a singleton module pattern.
 */

var nconf = require('nconf');
var loaded = false;

// Check if commandline arg was given to use another config file.
var argv = require('minimist')(process.argv.slice(2));
var file = argv.config ? argv.config : 'config.json';

/**
 * Define the Configuration object (constructor).
 */
var Configuration = function() {
  // Ensure that the configutation is loaded.
  load();
}

/**
 * Load configutation file from disk.
 *
 * @private
 */
function load() {
  if (!loaded) {
    nconf.file({ "file": file, "search": true });
    loaded = true;
  }
}

/**
 * Get configuration value.
 *
 * @param property
 *   Get configutation with the name given.
 *
 * @return
 *   The value of the configuration option.
 */
Configuration.prototype.get = function get(property) {
  return nconf.get(property);
}

// Export the object (exports uses cache, hence singleton).
module.exports = new Configuration();
