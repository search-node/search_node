/**
 * @file
 * Added API to send content into the search engine
 */

/**
 * This object encapsulate the RESET API.
 *
 * @param app
 * @param logger
 * @param Search
 * @constructor
 */
var API = function (app, logger, Search, apikeys, options) {
  "use strict";

  var self = this;
  this.logger = logger;

  // Save options.
  this.options = options;

  // Store link to api keys.
  this.apikeys = apikeys;

  /**
   * Default get request.
   */
  app.get('/api', function (req, res) {
    res.send('Please see documentation about using this api.');
  });

  /**
   * Add content to the search index.
   */
  app.post('/api', function (req, res) {
    if (self.validateCall(req, res)) {
      // Added the data to the search index (a side effect is that a new
      // index maybe created.). The id may not be given and is hence undefined.
      var instance = new Search(req.body.customer_id, req.body.type, req.body.id);

      instance.on('created', function (data) {
        self.logger.debug('Content added: status ' + data.status + ' : ' + data.index);

        res.send('Content have been added.', 201);
      });

      instance.on('error', function (data) {
        self.logger.error('Error in add content: status ' + data.status + ' : ' + data.res);

        // Send error back to client.
        res.send('Content have not been added.', data.status);
      });

      // Add the content.
      instance.add(req.body.data);
    }
    else {
      // Log error, validate has send response to client.
      self.logger.error('Error: missing parameters in add content');
    }
  });

  /**
   * Update content to the search index.
   */
  app.put('/api', function (req, res) {
    if (self.validateCall(req, res)) {
      // Update the data in the search index (a side effect is that a new
      // index maybe created.).
      var instance = new Search(req.body.customer_id, req.body.type, req.body.id);

      // Updated event.
      instance.on('updated', function (data) {
        self.logger.debug('Content updated: status ' + data.status + ' : ' + data.index);

        res.send('Content have been updated.', 200);
      });

      // On error event.
      instance.on('error', function (data) {
        self.logger.error('Error in add content: status ' + data.status + ' : ' + data.res);
        res.send(data.status, 500);
      });

      // Add the content.
      instance.update(req.body.data);
    }
    else {
      // Log error, validate has send response to client.
      self.logger.error('Error: missing parameters in add content');
    }
  });

  /**
   * Remove content from the search index.
   */
  app.delete('/api', function (req, res) {
    if (self.validateCall(req, res)) {
      var instance = new Search(req.body.customer_id, req.body.type);

      // Handle completed
      instance.once('removed', function (data) {
        self.logger.debug('Removed: ' + data.id);

        // Send back the id of the element that have been removed.
        res.send(data);
      });

      // Handle errors in the request.
      instance.once('error', function (data) {
        self.logger.error('Error in add content with id: ' + data.id + ' status ' + data.status + ' : ' + data.res);
        res.send(data.status, 500);
      });

      // Send the request.
      instance.remove(req.body.data);
    }
    else {
      // Log error, validate has send response to client.
      self.logger.error('Error: missing parameters in remove content');
    }
  });

  /**
   * List indexes for the currently logged in user.
   */
  app.get('/api/indexes', function (req, res) {
    var key = req.user.apikey;
    var keys = self.loadKeys();

    self.apikeys.get().then(
      function (info) {
        if (info) {
          res.json(info.indexes);
        }
        else {
          res.send('API key was not found.', 404);
        }
      },
      function (error) {
        res.send(error.message, 500);
      }
    );
  });

  /**
   * Search request to the search engine.
   */
  app.post('/api/search', function (req, res) {
    if (self.validateCall(req, res)) {
      var instance = new Search(req.body.customer_id, req.body.type);

      // Handle completed query.
      instance.once('hits', function (hits) {
        res.send(hits);
      });

      // Handle errors in the search.
      instance.once('error', function (data) {
        self.logger.error('Error in add content with id: ' + data.id + ' status ' + data.status + ' : ' + data.res);
        res.send(data.status, 500);
      });

      // Send the query.
      instance.query(req.body.query);
    }
    else {
      self.logger.error('Error: missing parameters in remove content');
    }
  });
};

/**
 * Validate that required parameters exists in an API call.
 *
 * @param req
 *   The request from the express.
 * @param res
 *   The response to express.
 *
 * @return bool
 *   If valid true else false.
 */
API.prototype.validateCall = function validateCall(req, res) {
  "use strict";

  // Validate that minimum parameters is available.
  if (req.body.customer_id !== undefined && (req.body.type !== undefined)) {
    // Check that the index is allowed based on the API key for the currently logged in user.
    this.apikeys.get(req.user.apikey).then(
      function (info) {
        if (info) {
          var indexes = info.indexes;

          // Check that the index is in the API keys configuration.
          if (indexes.indexOf(req.body.customer_id) !== -1) {
            return true;
          }
          else {
            // Index not found, access denied.
            res.send('Access denied index not allowed.', 401);
          }
        }
        else {
          res.send('API key was not found.', 404);
        }
      },
      function (error) {
        res.send(error.message, 500);
      }
    );
  }

  // Missing parameters.
  res.send('Missing parameters in the request, please see the log for more information', 500);

  // The request was not valid.
  return false;
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Create the API routes using the API object.
  var api = new API(imports.app, imports.logger, imports.search, imports.apikeys, options);

  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
