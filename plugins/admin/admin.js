/**
 * @file
 * Added API to the administration interface.
 */

/**
 * This object encapsulate the RESET API.
 *
 * @param options
 * @param app
 * @param logger
 * @param search
 * @param apikeys
 *
 * @constructor
 */
var Admin = function Admin(options, app, logger, search, apikeys) {
  "use strict";

  var self = this;
  this.logger = logger;

  // Get the json easy file read/writer.
  var jf = require('jsonfile');

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
      apikeys.load().then(
        function (keys) {
          res.json(keys);
        }, function (error) {
          res.send(error.message, 500);
        }
      );
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Get single API key.
   */
  app.get('/api/admin/key/:key', function (req, res) {
    if (self.validateCall(req)) {
      // Get info about API keys.
      apikeys.get(req.params.key).then(
        function (info) {
          if (info) {
            res.json(info);
          }
          else {
            res.send('The API key was not found.', 404);
          }
        }, function (error) {
          res.send(error.message, 500);
        }
      );
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Update API key.
   */
  app.put('/api/admin/key/:key', function (req, res) {
    if (self.validateCall(req)) {
      var info = req.body.api;
      var key = req.params.key;

      // Remove key form information.
      delete info.key;

      apikeys.update(key, info).then(
        function (status) {
          res.send('API key "' + key + '" have been updated.', 200);
        },
        function (error) {
          res.send(error.message, 500);
        }
      );
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Delete API keys.
   */
  app.delete('/api/admin/key/:key', function (req, res) {
    if (self.validateCall(req)) {
      var key = req.params.key;

      // Remove API key.
      apikeys.remove(key).then(
        function (status) {
          res.send('API key "' + key + '" have been removed.', 200);
        },
        function (error) {
          res.send(error.message, 500);
        }
      );
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Add API key.
   */
  app.post('/api/admin/key', function (req, res) {
    if (self.validateCall(req)) {
      var info = req.body.api;
      var key = req.body.api.key;

      // Remove key form information.
      delete info.key;

      // Add API key.
      apikeys.add(key, info).then(
        function (status) {
          res.send('API key "' + key + '" have been added.', 200);
        },
        function (error) {
          res.send(error.message, 500);
        }
      );
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
  app.delete('/api/admin/index/:index', function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Send response back when search engine have removed the index.
      search.once('removed', function (status) {
        if (status) {
          res.send('The index "' + index + '" have been removed from the search engine.', 200);
        }
        else {
          res.send('The index "' + index + '" could not be removed.', 500);
        }
      });

      // Request to remove the index.
      search.remove(index);
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Flush indexes (remove an re-add it).
   */
  app.get('/api/admin/index/:index/flush', function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Send response back when search engine have removed the index.
      search.once('removed', function (status) {
        if (status) {
          // Listen to the created index event.
          search.once('indexCreated', function (data) {
            res.send('The index "' + index + '" have been flushed.', 200);
          });
          search.addIndex(index);
        }
        else {
          res.send('The index "' + index + '" could not be flushed.', 500);
        }
      });

      // Request to remove the index.
      search.remove(index);
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Activate indexes (add configured mapping).
   */
  app.get('/api/admin/index/:index/activate', function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Listen to the created index event.
      search.once('indexCreated', function (data) {
        res.send('The index "' + index + '" have been activated.', 200);
      });

      // Listen to errors.
      search.once('indexNotCreated', function () {
        res.send('The index "' + index + '" have not been activated.', 500);
      });

      search.addIndex(index);
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Get mappings.
   */
  app.get('/api/admin/mappings', function (req, res) {
    if (self.validateCall(req)) {
      // Read the mappings file.
      jf.readFile(options.mappings, function(err, mappings) {
        res.json(mappings);
      });
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });

  /**
   * Get mapping configuration for an index.
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
          res.send('The index "' + index + '" was not found in mappings configuration on the server.', 404);
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
  app.post('/api/admin/mapping/:index', function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;
      var mapping = req.body;

      // Read the mappings file.
      jf.readFile(options.mappings, function(err, mappings) {
        // Test that the index exists.
        if (!mappings.hasOwnProperty(index)) {
          // Update the mappings
          mappings[index] = mapping;

          jf.writeFile(options.mappings, mappings, function(err) {
            if (err) {
              res.send('Mappings file could not be updated.', 500);
            }
            else {
              res.send('Mappings for the index "' + index + '" have been created.', 200);
            }
          });
        }
        else {
          res.send('The index "' + index + '" allready exists in mappings configuration on the server.', 404);
        }
      });
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
              res.send('Mappings for the index "' + index + '" have been updated.', 200);
            }
          });
        }
        else {
          res.send('The index "' + index + '" was not found in mappings configuration on the server.', 404);
        }
      });
    }
    else {
      res.send('You do not have the right role.', 401);
    }
  });



  /**
   * Delete mapping from configuration.
   */
  app.delete('/api/admin/mapping/:index', function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Read the mappings file.
      jf.readFile(options.mappings, function(err, mappings) {
        // Test that the index exists.
        if (mappings.hasOwnProperty(index)) {
          // Remove mapping.
          delete mappings[index];

          // Write mappings file.
          jf.writeFile(options.mappings, mappings, function(err) {
            if (err) {
              res.send('Mappings file could not be updated.', 500);
            }
            else {
              res.send('Mappings for the index "' + index + '" have been removed.', 200);
            }
          });
        }
        else {
          res.send('The index "' + index + '" was not found in mappings configuration on the server.', 404);
        }
      });
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

  // Create search instance (eg. connection to search engine).
  var instance = new imports.search('', '');

  // Create the API routes using the API object.
  var admin = new Admin(options, imports.app, imports.logger, instance, imports.apikeys);

  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
