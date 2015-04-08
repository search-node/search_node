/**
 * @file
 * Provide core http services by using express.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Get connected to the logger
  var logger = imports.logger;

  var raven = require('raven');

  // Connect to sentry server and send all exceptions.
  var client = new raven.Client(options.url);
  client.patchGlobal();

  // Send message that middleware have been loaded.
  client.captureMessage('The middleware have been laoded.');

  logger.info('Start the sentry connection.');

  // Register exposed function with architect.
  register(null, { });
};
