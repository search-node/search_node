/**
 * @file
 * Provide core http services by using express.
 */
module.exports = function (options, imports, register) {
  // Get connected to the logger
  var logger = imports.logger;

  // Load modules required.
  var express = require('express');
  var http = require('http');

  // Start the express app.
  var app = express();

  // Start the http server.
  var server = http.createServer(app);

  // Set express app configuration.
  app.set('port', options.port || 3000);
  app.use(express.favicon());
  app.use(express.urlencoded());
  app.use(express.json());

  // Enable route.
  var route = options.route || false;
  if (route) {
    app.use(app.router);
  }

  // Set static path (absolute path in the filesystem).
  if (options.path !== undefined) {
    app.use(express.static(options.path));
  }

  // Start the server.
  server.listen(app.get('port'), function () {
    console.log('Express server with socket.io is listening on port ' + app.get('port'));
  });

  // Log express requests.
  app.use(express.logger({
    stream: {
      write: logger.info
    }
  }));

  // Register exposed function with architect.
  register(null, {
    onDestruct: function (callback) {
      server.close(callback);
      logger.debug('Express server stopped');
    },
    app: app,
    server: server
  });
};