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

  // Get the json easy file read/writer.
  var jf = require('jsonfile')

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
   * Delete index.
   */
  app.get('/api/admin/index/:index/remove', function (req, res) {
    if (self.validateCall(req)) {
      if (search.remove(req.params.index)) {
        res.send('Index have been removed in the search engine.', 200);
      }
      else {
        res.send('Index could not be removed.', 500);
      }
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Get mappings configuration.
   */
  app.get('/api/admin/mapping/:index', function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Read the mappings file.
      jf.readFile(options.mappings, function(err, mappings) {
        // Test that the index exists.
        if (mappings.hasOwnProperty(index)) {
          res.json(mappings[index]);
        }
        else {
          res.send('Index not found in mappings configuration on the server.', 404);
        }
      });
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Create new mapping configuration.
   */
  app.post('/api/admin/mapping', function (req, res) {
    if (self.validateCall(req)) {

    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Update mappings configuration.
   */
  app.put('/api/admin/mapping/:index', function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;
      var mapping = req.body;

      // Read the mappings file.
      jf.readFile(options.mappings, function(err, mappings) {
        // Test that the index exists.
        if (mappings.hasOwnProperty(index)) {
          // Update the mappings
          mappings[index] = mapping;

          jf.writeFile(options.mappings, mappings, function(err) {
            if (err) {
              res.send('Mappings file could not be updated.', 500);
            }
            else {
              res.send('Mappings updated.', 200);
            }
          });
        }
        else {
          res.send('Index not found in mappings configuration on the server.', 404);
        }
      });
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Delete mappings configuration.
   */
  app.delete('/api/admin/mapping/:index', function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;
    }
    else {
      res.send('You do not have the right role.', 401);
    }
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
