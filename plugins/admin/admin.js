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
var Admin = function Admin(options, app, logger, search, apikeys, mappings, options) {
  "use strict";

  var self = this;
  this.logger = logger;

    // Get express JWT to validate access.
  this.expressJwt = require('express-jwt');

  /**
   * Default get request.
   */
  app.get('/api/admin', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      res.send('Please see documentation about using this administration api.');
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Get API keys.
   */
  app.get('/api/admin/keys', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      apikeys.load().then(
        function (keys) {
          res.json(keys);
        }, function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Get single API key.
   */
  app.get('/api/admin/key/:key', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      // Get info about API keys.
      apikeys.get(req.params.key).then(
        function (info) {
          if (info) {
            res.json(info);
          }
          else {
            res.status(404).send('The API key was not found.');
          }
        }, function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Update API key.
   */
  app.put('/api/admin/key/:key', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var info = req.body.api;
      var key = req.params.key;

      // Remove key form information.
      delete info.key;

      apikeys.update(key, info).then(
        function (status) {
          res.send('API key "' + key + '" have been updated.');
        },
        function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Delete API keys.
   */
  app.delete('/api/admin/key/:key', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var key = req.params.key;

      // Remove API key.
      apikeys.remove(key).then(
        function (status) {
          res.send('API key "' + key + '" have been removed.');
        },
        function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Add API key.
   */
  app.post('/api/admin/key', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var info = req.body.api;
      var key = req.body.api.key;

      // Remove key form information.
      delete info.key;

      // Add API key.
      apikeys.add(key, info).then(
        function (status) {
          res.send('API key "' + key + '" have been added.');
        },
        function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Get search indexes.
   */
  app.get('/api/admin/indexes', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {

      // Send response back when search engine have the results.
      search.once('indexes', function (indexes) {
        res.json(indexes);
      });

      // Get indexes from the search engine.
      search.getIndexes();
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Delete index.
   */
  app.delete('/api/admin/index/:index', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Send response back when search engine have removed the index.
      search.once('removed', function (status) {
        if (status) {
          res.send('The index "' + index + '" have been removed from the search engine.');
        }
        else {
          res.status(500).send('The index "' + index + '" could not be removed.');
        }
      });

      // Request to remove the index.
      search.removeIndex(index);
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Flush indexes (remove an re-add it).
   */
  app.get('/api/admin/index/:index/flush', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Send response back when search engine have removed the index.
      search.once('removed', function (status) {
        if (status) {
          // Listen to the created index event.
          search.once('indexCreated', function (data) {
            res.send('The index "' + index + '" have been flushed.');
          });
          search.addIndex(index);
        }
        else {
          res.status(500).send('The index "' + index + '" could not be flushed.');
        }
      });

      // Request to remove the index.
      search.removeIndex(index);
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Activate indexes (add configured mapping).
   */
  app.get('/api/admin/index/:index/activate', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Listen to the created index event.
      search.once('indexCreated', function (data) {
        res.send('The index "' + index + '" have been activated.');
      });

      // Listen to errors.
      search.once('indexNotCreated', function () {
        res.status(500).send('The index "' + index + '" have not been activated.');
      });

      search.addIndex(index);
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Get mappings.
   */
  app.get('/api/admin/mappings', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      mappings.load().then(
        function (mappings) {
          res.json(mappings);
        },
        function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Get mapping configuration for an index.
   */
  app.get('/api/admin/mapping/:index', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      // Read the mappings file.
      mappings.get(index).then(
        function (info) {
          if (info) {
            res.json(info);
          }
          else {
            res.status(404).send('The index "' + index + '" was not found in mappings configuration on the server.');
          }
        },
        function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Create new mapping configuration.
   */
  app.post('/api/admin/mapping/:index', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;
      var mapping = req.body;

      mappings.add(index, mapping).then(
        function (status) {
          res.send('Mappings for the index "' + index + '" have been created.');
        },
        function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Update mappings configuration.
   */
  app.put('/api/admin/mapping/:index', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;
      var mapping = req.body;

      mappings.update(index, mapping).then(
        function (status) {
          res.send('Mappings for the index "' + index + '" have been updated.');
        },
        function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
    }
  });

  /**
   * Delete mapping from configuration.
   */
  app.delete('/api/admin/mapping/:index', this.expressJwt({"secret": options.secret}), function (req, res) {
    if (self.validateCall(req)) {
      var index = req.params.index;

      mappings.remove(index).then(
        function (status) {
          res.send('Mappings for the index "' + index + '" have been removed.');
        },
        function (error) {
          res.status(500).send(error.message);
        }
      );
    }
    else {
      res.status(401).send('You do not have the right role.');
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
  var admin = new Admin(options, imports.app, imports.logger, instance, imports.apikeys, imports.mappings, options);

  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
