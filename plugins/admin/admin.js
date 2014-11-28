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
var Admin = function Admin(options, app, logger, Auth, search) {
  "use strict";

  var self = this;
  this.logger = logger;

  /**
   * Default get request.
   */
  app.get('/api/admin', function (req, res) {
    if (self.validateCall(req)) {
      res.send('Please see documentation about using this administration api.');
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Get API keys.
   */
  app.get('/api/admin/keys', function (req, res) {
    if (self.validateCall(req)) {
      res.send('KEYS');
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Get search indexes.
   */
  app.get('/api/admin/indexes', function (req, res) {
    if (self.validateCall(req)) {

      // Send response back when search engine have the results.
      search.once('indexes', function (indexes) {
        res.json(indexes);
      });

      // Get indexes from the search engine.
      search.getIndexes();
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Get mappings configuration.
   */
  app.get('/api/admin/config', function (req, res) {

  });

  /**
   * Create new mapping configuration.
   */
  app.post('/api/admin/config/', function (req, res) {

  });

  /**
   * Update mappings configuration.
   */
  app.put('/api/admin/config/:id', function (req, res) {
    var id = req.params.id;
  });

  /**
   * Delete mappings configuration.
   */
  app.delete('/api/admin/config/:id', function (req, res) {
    var id = req.params.id;
  });
};

/**
 * Validate that the role is admin.
 *
 * @param req
 *   Express request object.
 */
Admin.prototype.validateCall = function validateCall(req) {
  "use strict";

  return (req.hasOwnProperty('user')) && (req.user.role === 'admin');
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  var instance = new imports.search('', '');

  // Create the API routes using the API object.
  var admin = new Admin(options, imports.app, imports.logger, imports.auth, instance);

  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
