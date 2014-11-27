/**
 * @file
 * Added API to the administration interface.
 */

/**
 * This object encapsulate the RESET API.
 *
 * @param app
 * @param logger
 * @param Auth
 * @constructor
 */
var Admin = function Admin(app, logger, Auth) {
  "use strict";

  var self = this;
  this.logger = logger;

  /**
   * Default get request.
   */
  app.get('/api/admin', function (req, res) {
    res.send('Please see documentation about using this administration api.');
  });

  /**
   * Get API keys.
   */
  app.get('/api/admin/keys', function (req, res) {
    res.send('KEYS');
  });

  /**
   * Get search indexes.
   */
  app.get('/api/admin/indexes', function (req, res) {
    res.send('indexes');
  });
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Create the API routes using the API object.
  var admin = new Admin(imports.app, imports.logger, imports.auth);

  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
