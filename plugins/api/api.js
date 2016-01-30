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
    self.validateCall(req, res, 'rw').then(function (resolved) {
      // Added the data to the search index (a side effect is that a new
      // index maybe created.). The id may not be given and is hence undefined.
      var instance = new Search(req.body.index, req.body.type, req.body.id);

      // New document created.
      instance.on('created', function (data) {
        self.logger.debug('Content added: status ' + data.status + ' : ' + data.index);

        res.status(201).send('Content have been added.');
      });

      // Updated event (if document exists it's updated).
      instance.on('updated', function (data) {
        self.logger.debug('Content updated: status ' + data.status + ' : ' + data.index);

        res.status(data.status).send('Content have been updated.');
      });

      instance.on('error', function (data) {
        self.logger.error('Error in add content: status ' + data.status + ' : ' +  require('util').inspect(data.res, true, 10));

        // Send error back to client.
        if (data.hasOwnProperty('message')) {
          res.status(data.status).send(data.message);
        }
        else {
          res.status(data.status).send('Content have not been added.');
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
    self.validateCall(req, res, 'rw').then(function (resolved) {
      // Update the data in the search index (a side effect is that a new
      // index maybe created.).
      var instance = new Search(req.body.index, req.body.type, req.body.id);

      // Updated event.
      instance.on('updated', function (data) {
        self.logger.debug('Content updated: status ' + data.status + ' : ' + data.index);

        res.status(200).send('Content have been updated.');
      });

      // On error event.
      instance.on('error', function (data) {
        self.logger.error('Error in add content: status ' + data.status + ' : ' + require('util').inspect(data.res, true, 10));
        res.status(500).send(data.status);
      });

      // Add the content.
      instance.update(req.body.data);
    });
  });

  /**
   * Remove content from the search index.
   */
  app.delete('/api', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'rw').then(function (resolved) {
      var instance = new Search(req.body.index, req.body.type, req.body.id);

      // Handle completed
      instance.once('removed', function (data) {
        // Send back the id of the element that have been removed.
        res.status(200).send({ "id": data.id });
      });

      // Handle errors in the request.
      instance.once('error', function (data) {
        console.log('ERROR');
        self.logger.error('Error in add content with id: ' + data.id + ' status ' + data.status + ' : ' + require('util').inspect(data.res, true, 10));
        res.status(500).send({ "status": data.status });
      });

      // Send the request.
      instance.remove();
    });
  });

  /**
   * Flush content from the search index.
   */
  app.delete('/api/:index/flush', this.expressJwt({"secret": options.secret}), function (req, res) {
    // Check that the index is allowed based on the API key for the currently logged in user.
    self.apikeys.get(req.user.apikey).then(
      function (info) {
        if (info) {
          var indexes = info.indexes;

          // Check required access.
          if (info.access != 'rw') {
            res.status(401).send('Access denied.');
          }
          else {
            // Check that the index is in the API keys configuration.
            var index = req.params.index
            if (indexes.indexOf(index) !== -1) {;
              var instance = new Search(index, '', '');

              // Send response back when search engine have removed the index.
              instance.once('removed', function (status) {
                if (status) {
                  // Listen to the created index event.
                  instance.once('indexCreated', function (data) {
                    res.status(200).send('The index "' + index + '" have been flushed.');
                  });
                  instance.addIndex(index);
                }
                else {
                  res.status(500).send('The index "' + index + '" could not be flushed.');
                }
              });

              // Request to remove the index.
              instance.removeIndex(index);
            }
            else {
              // Index not found, access denied.
              res.status(401).send('Access denied index not allowed.');
            }
          }
        }
        else {
          res.status(404).send('API key was not found.');
        }
      },
      function (error) {
        res.status(500).send(error.message);
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
              res.status(500).send(error.message);
            }
          );
        }
        else {
          res.status(404).send('API key was not found.');
        }
      },
      function (error) {
        res.status(500).send(error.message);
      }
    );
  });

  /**
   * Search request to the search engine.
   */
  app.post('/api/search', this.expressJwt({"secret": options.secret}), function (req, res) {
    self.validateCall(req, res, 'r').then(function (resolved) {
      var instance = new Search(req.body.index, req.body.type);

      // Handle completed query.
      instance.once('hits', function (hits) {
        res.send(hits);
      });

      // Handle errors in the search.
      instance.once('error', function (data) {
        self.logger.error('Error in add content with id: ' + data.id + ' status ' + data.status + ' : ' + require('util').inspect(data.res, true, 10));
        res.status(500).send(data.status);
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
 *
 * @returns {*}
 *   Promise that either will resolve if valid else reject.
 */
API.prototype.validateCall = function validateCall(req, res, perm) {
  "use strict";

  var deferred = Q.defer();

  // Validate that minimum parameters is available.
  if (req.body.index !== undefined && (req.body.type !== undefined)) {
    // Check that the index is allowed based on the API key for the currently logged in user.
    this.apikeys.get(req.user.apikey).then(
      function (info) {
        if (info) {
          var indexes = info.indexes;

          // Check required access.
          if (perm != info.access) {
            res.status(401).send('Access denied.');
            deferred.reject(false);
          }
          else {
            // Check that the index is in the API keys configuration.
            if (indexes.indexOf(req.body.index) !== -1) {
              deferred.resolve(true);
            }
            else {
              // Index not found, access denied.
              res.status(401).send('Access denied index not allowed.');
              deferred.reject(false);
            }
          }
        }
        else {
          res.status(404).send('API key was not found.');
          deferred.reject(false);
        }
      },
      function (error) {
        res.status(500).send(error.message);
        deferred.reject(false);
      }
    );
  }
  else {
    res.status(500).send('Missing parameters in the request, please see the log for more information');

    deferred.reject(false);
  }

  return deferred.promise;
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
