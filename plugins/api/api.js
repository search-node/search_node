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
var API = function(app, logger, Search) {
  "use strict";

  var self = this;
  this.logger = logger;

  /**
   * Default get request.
   */
  app.get('/', function (req, res) {
    res.send('Please use /api');
  });

  /**
   * Add content to the search index.
   */
  app.post('/api', function(req, res) {
    if (self.validateCall(req.body)) {
      // Added the data to the search index (a side effect is that a new
      // index maybe created.). The id may not be given and is hence undefined.
      var instance = new Search(req.body.customer_id, req.body.type, req.body.id);

      instance.on('created', function (data) {
        self.logger.debug('Content added: status ' + data.status + ' : ' + data.index);

        // @TODO: find better error code to send back (201).
        res.send(200);
      });

      instance.on('error', function (data) {
        self.logger.error('Error in add content: status ' + data.status + ' : ' + data.res);

        // @TODO: find better error code to send back.
        res.send(data.status);
      });

      // Add the content.
      instance.add(req.body.data);
    }
    else {
      self.logger.error('Error: missing parameters in add content');

      // @TODO: find better error code to send back.
      res.send(500);
    }
  });

  /**
   * Update content to the search index.
   */
  app.put('/api', function(req, res) {
    if (self.validateCall(req.body)) {
      // Update the data in the search index (a side effect is that a new
      // index maybe created.).
      var instance = new Search(req.body.customer_id, req.body.type, req.body.id);

      instance.on('updated', function (data) {
        self.logger.debug('Content updated: status ' + data.status + ' : ' + data.index);
        res.send(200);
      });

      instance.on('error', function (data) {
        self.logger.error('Error in add content: status ' + data.status + ' : ' + data.res);

        // @TODO: find better error code to send back.
        res.send(data.status);
      });

      // Add the content.
      instance.update(req.body.data);
    }
    else {
      self.logger.error('Error: missing parameters in add content');

      // @TODO: find better error code to send back.
      res.send(500);
    }
  });

  /**
   * Remove content from the search index.
   */
  app.delete('/api', function(req, res) {
    if (self.validateCall(req.body)) {
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

        // @TODO: send error message with the status code.
        res.send(data.status);
      });

      // Send the request.
      instance.remove(req.body.data);
    }
    else {
      self.logger.error('Error: missing parameters in remove content');

      // @TODO: find better error code to send back.
      res.send(500);
    }
  });
};

/**
 * Validate that required parameters exists in an API call.
 *
 * @param body
 *   The request body from the express http request.
 */
API.prototype.validateCall = function validateCall(body) {
  "use strict";

  return (body.customer_id !== undefined) && (body.type !== undefined);
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Create the API routes using the API object.
  var api = new API(imports.app, imports.logger, imports.search);

  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
