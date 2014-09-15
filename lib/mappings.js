/**
 * @file
 *
 */
var nconf = require('nconf');
var loaded = false;

var file = 'mappings.json';

/**
 * Load mappings file from disk.
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
 * Defines the mappings object.
 */
var Mappings = function() {
  // Ensure that the mappings is loaded.
  load();
}

/**
 * Get all mappings.
 */
Mappings.prototype.getMappings = function getMappings() {
  return nconf.get('mappings');
}

/**
 * Get mappings for a single customer.
 */
Mappings.prototype.getCustomerMappings = function getCustomerMappings(customer_id) {
  var mappings = this.getMappings();
  if (mappings.hasOwnProperty(customer_id)) {
    return mappings[customer_id];
  }
  return false;
}

// Export the object (exports uses cache, hence singleton).
module.exports = new Mappings();