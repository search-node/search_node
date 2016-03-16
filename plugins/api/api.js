/**
 * @file
 * Added API to send content into the search engine
 */

var Q = require('q');

/**
 * This object encapsulate the RESET API.
 *
 * @param app
 * @param logger
 * @param Search
 * @param apikeys
 * @param mappings
 * @param options
 *
 * @constructor
 */
var API = function (app, logger, Search, apikeys, mappings, options) {
  "use strict";

  var self = this;
  this.logger = logger;

  // Store link to api keys.
  this.apikeys = apikeys;

  // Store link to mappings.
  this.mappings = mappings;

  // Get express JWT to validate access.
  this.expressJwt = require('express-jwt');

  /**
   * Default get request.
   */
  app.get('/api', function (req, res) {
    res.send('Please see documentation about using this api.');
  });

  /**
   * Add content to the search index.
   */
  app.post('/api', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'rw', ['index', 'type']).then(function (resolved) {
      // Added the data to the search index (a side effect is that a new
      // index maybe created.). The id may not be given and is hence undefined.
      var instance = new Search(req.body.index, req.body.type, req.body.id);

      // New document created.
      instance.on('created', function (data) {
        self.logger.debug('Content added: status ' + data.status + ' : ' + data.index);

        res.status(201).json({ 'message': 'Content have been added.' });
      });

      // Updated event (if document exists it's updated).
      instance.on('updated', function (data) {
        self.logger.debug('Content updated: status ' + data.status + ' : ' + data.index);

        res.status(data.status).json({ 'message': 'Content have been updated.' });
      });

      instance.on('error', function (data) {
        self.logger.error('Error in add content: status ' + data.status + ' : ' +  require('util').inspect(data.res, true, 10));

        // Send error back to client.
        if (data.hasOwnProperty('message')) {
          res.status(data.status).json({ 'error': 'data.message' });
        }
        else {
          res.status(data.status).json({ 'error': 'Content have not been added.' });
        }
      });

      // Add the content.
      instance.add(req.body.data);
    });
  });

  /**
   * Update content to the search index.
   */
  app.put('/api', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'rw', ['index', 'type']).then(function (resolved) {
      // Update the data in the search index (a side effect is that a new
      // index maybe created.).
      var instance = new Search(req.body.index, req.body.type, req.body.id);

      // Updated event.
      instance.on('updated', function (data) {
        self.logger.debug('Content updated: status ' + data.status + ' : ' + data.index);

        res.status(200).json({ 'message': 'Content have been updated.' });
      });

      // On error event.
      instance.on('error', function (data) {
        self.logger.error('Error in add content: status ' + data.status + ' : ' + require('util').inspect(data.res, true, 10));
        res.status(500).json({ 'error': data.status });
      });

      // Add the content.
      instance.update(req.body.data);
    });
  });

  /**
   * Remove content from the search index.
   */
  app.delete('/api', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'rw', ['index', 'type']).then(function (resolved) {
      var instance = new Search(req.body.index, req.body.type, req.body.id);

      // Handle completed
      instance.once('removed', function (data) {
        // Send back the id of the element that have been removed.
        res.status(200).json({ "id": data.id });
      });

      // Handle errors in the request.
      instance.once('error', function (data) {
        console.log('ERROR');
        self.logger.error('Error in add content with id: ' + data.id + ' status ' + data.status + ' : ' + require('util').inspect(data.res, true, 10));
        res.status(500).json({ "status": data.status });
      });

      // Send the request.
      instance.remove();
    });
  });

  /**
   * Flush content from the search index.
   */
  app.delete('/api/:index/flush', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'rw', []).then(function (resolved) {
        var index = req.params.index;
        var instance = new Search(index, '', '');

        // Send response back when search engine have removed the index.
        instance.once('removed', function (status) {
          if (status) {
            // Listen to the created index event.
            instance.once('indexCreated', function (data) {
              res.status(200).json({ 'message': 'The index "' + index + '" has been flushed.' });
            });
            instance.addIndex(index);
          }
          else {
            res.status(500).json({ 'error': 'The index "' + index + '" could not be flushed.' });
          }
        });

        // Handle errors in remove index.
        instance.once('error', function (data) {
          self.logger.error('Error in remove index: ' + data.id + ' status ' + data.status + ' : ' + require('util').inspect(data.res, true, 10));
          res.status(500).json({ 'error': data.status });
        });

        // Request to remove the index.
        instance.removeIndex(index);
      },
      function (error) {
        res.status(500).json({ 'error': error.message });
      }
    );
  });

  /**
   * Activate mapping (index).
   */
  app.get('/api/:index/activate', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'rw', []).then(function (resolved) {
      var index = req.params.index;
      var instance = new Search(index, '', '');

      // Listen to the created index event.
      instance.once('indexCreated', function (data) {
        res.status(200).json({ 'message': 'The index "' + index + '" has been flushed.' });
      });

      instance.once('indexNotCreated', function (error) {
        res.status(500).json({ 'error': error });
      });

      instance.once('error', function (status, response) {
        res.status(500).json({ 'error': status, 'res': response });
      });

      instance.addIndex(index);
    },
      function (error) {
        res.status(500).json({ 'error': error.message });
      }
    );
  });

  /**
   * Create new mapping (index).
   */
  app.post('/api/:index/create', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'rw', []).then(function (resolved) {
      var index = req.params.index;
      var mapping = req.body;
      var apikey = req.user.apikey;

      mappings.add(index, mapping).then(
        function (status) {
          // Add mapping to API key.
          apikeys.get(apikey).then(
            function (info) {
              if (info) {
                // Add index to api key.
                info.indexes.push(req.params.index);
                apikeys.update(apikey, info).then(
                  function (status) {
                    res.json({'message': 'Mappings for the index "' + index + '" have been created.'});
                  },
                  function (error) {
                    res.status(500).json({ error: error.message });
                  }
                );
              }
              else {
                res.status(404).json({ 'error': 'The API key was not found.' });
              }
            }, function (error) {
              res.status(500).json({ 'error': error.message });
            }
          );
        },
        function (error) {
          res.status(500).json({ error: error.message });
        }
      );
    });
  });

  /**
   * Remove the index.
   */
  app.delete('/api/:index/remove', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'rw', []).then(function (resolved) {
        var index = req.params.index;
        var instance = new Search(index, '', '');
        var apikey = req.user.apikey;

        // Send response back when search engine have removed the index.
        instance.once('removed', function (status) {
          if (status) {
            mappings.remove(index).then(
              function (status) {
                // Add mapping to API key.
                apikeys.get(apikey).then(
                  function (info) {
                    if (info) {
                      // Add index to api key.
                      var indexes = [];
                      for (var i in info.indexes) {
                        if (info.indexes[i] !== index) {
                          indexes.push(info.indexes[i]);
                        }
                      }
                      info.indexes = indexes;
                      apikeys.update(apikey, info).then(
                        function (status) {
                          res.json({'message': 'Mappings for the index "' + index + '" have been removed.'});
                        },
                        function (error) {
                          res.status(500).json({ error: error.message });
                        }
                      );
                    }
                    else {
                      res.status(404).json({ 'error': 'The API key was not found.' });
                    }
                  }, function (error) {
                    res.status(500).json({ 'error': error.message });
                  }
                );
              },
              function (error) {
                res.status(500).json({ error: error.message });
              }
            );
          }
          else {
            res.status(500).json({ 'error': 'The index "' + index + '" could not be removed.' });
          }
        });

        // Handle errors in remove index.
        instance.once('error', function (data) {
          self.logger.error('Error in remove index: ' + data.id + ' status ' + data.status + ' : ' + require('util').inspect(data.res, true, 10));
          res.status(500).json({ 'error': data.status });
        });

        // Request to remove the index.
        instance.removeIndex(index);
      },
      function (error) {
        res.status(500).json({ 'error': error.message });
      }
    );
  });

  /**
   * List indexes for the currently logged in user.
   */
  app.get('/api/indexes', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.apikeys.get(req.user.apikey).then(
      function (info) {
        if (info) {
          // Load mappings to get index names.
          self.mappings.load().then(
            function (mappings) {
              var indexes = [];

              // Loop over indexes to get names.
              for (var i in info.indexes) {
                var index = info.indexes[i];
                indexes.push({
                  "index": index,
                  "name": mappings[index].name,
                  "tag": mappings[index].tag
                });
              }

              // Send indexes.
              res.json(indexes);
            },
            function (error) {
              res.status(500).json({ 'error': error.message });
            }
          );
        }
        else {
          res.status(404).json({ 'message': 'API key was not found.' });
        }
      },
      function (error) {
        res.status(500).json({ 'error': error.message });
      }
    );
  });

  /**
   * Search request to the search engine.
   */
  app.post('/api/search', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'r', ['index', 'type']).then(function (resolved) {
      var instance = new Search(req.body.index, req.body.type);

      // Handle completed query.
      instance.once('hits', function (hits) {
        res.json(hits);
      });

      // Handle errors in the search.
      instance.once('error', function (data) {
        self.logger.error('Error in add content with id: ' + data.id + ' status ' + data.status + ' : ' + require('util').inspect(data.res, true, 10));
        res.status(500).json({ 'error': data.status });
      });

      // Send the query.
      instance.query(req.body.query);
    });
  });
};

/**
 * Validate that required parameters exists in an API call.
 *
 * @param req
 *   The request from the express.
 * @param res
 *   The response to express.
 * @param perm
 *   The permission required: "rw" or "r".
 * @param required
 *   Array with the fields required. If empty no fields are required in the body
 *   of the request.
 *
 * @returns {*}
 *   Promise that either will resolve if valid else reject.
 */
API.prototype.validateCall = function validateCall(req, res, perm, required) {
  "use strict";

  var deferred = Q.defer();

  // Set JSON to be returned. This will se header for all API calls that uses
  // validate call.
  res.append('Content-Type', 'application/json');

  // Validate that minimum parameters is available.
  //if (req.body.index !== undefined && (req.body.type !== undefined)) {
  if (required.length === 0 || this.validateRequired(req, required)) {
    // Check that the index is allowed based on the API key for the currently logged in user.
    this.apikeys.get(req.user.apikey).then(
      function (info) {
        if (info) {
          // Check required access, that the permission asked for is a part of the apikey access.
          // If indexOf(perm) returns -1, the perm is not a part of the apikeys access.
          if (info.access.indexOf(perm) === -1) {
            res.status(401).json({'error': 'Access denied.'});
            deferred.reject(false);
          }
          else if (required.hasOwnProperty('index')) {
            // Index access needs to be checked.
            var indexes = info.indexes;

            // Check that the index is in the API keys configuration.
            if (indexes.indexOf(req.body.index) !== -1) {
              deferred.resolve(true);
            }
            else {
              // Index not found, access denied.
              res.status(401).json({'error': 'Access denied index not allowed.'});
              deferred.reject(false);
            }
          }
          else {
            // API key valid and access permissions is valid.
            deferred.resolve(true);
          }
        }
        else {
          res.status(404).json({ 'error': 'API key was not found.' });
          deferred.reject(false);
        }
      },
      function (error) {
        res.status(500).json({ 'error': error.message });
        deferred.reject(false);
      }
    );
  }
  else {
    res.status(500).json({ 'error': 'Missing parameters in the request.' });

    deferred.reject(false);
  }

  return deferred.promise;
};

/**
 * Validate that required fields exists in the request.
 *
 * @param req
 *   The request object.
 * @param required
 *   The required fields.
 *
 * @returns {boolean}
 *   If the required fields exists true else false.
 */
API.prototype.validateRequired = function validateRequired(req, required) {
  if (required.constructor === Array && req.hasOwnProperty('body')) {
    var len = required.length;
    for (var i = 0; i < len; i++) {
      var field = required[i];
      if (!req.body.hasOwnProperty(field) || req.body[field] === undefined) {
        return false;
      }
    }

    return true;
  }

  return false;
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Create the API routes using the API object.
  var api = new API(imports.app, imports.logger, imports.search, imports.apikeys, imports.mappings, options);

  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
