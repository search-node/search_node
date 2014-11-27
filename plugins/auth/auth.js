/**
 * @file
 * Added Authentication before using the API.
 */

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Load token library.
  var jwt = require('jsonwebtoken');
  var expressJwt = require('express-jwt');

  // Get express app.
  var app = imports.app;

  // Get connected to the logger.
  var logger = imports.logger;


  // We are going to protect /api routes with JWT
  app.use('/api', expressJwt({ "secret": options.secret }));

  /**
   * Authentication for API access.
   */
  app.post('/authenticate', function(req, res, next) {
    if (!req.body.hasOwnProperty('apikey')) {
      res.send("API key not found in the request.", 404);
    }
    else {
      if (req.body.apikey == 1234567890) {
        var profile = {
          "role": 'api',
          "apikey": req.body.apikey
        };
        // API key accepted, so sen back token.
        var token = jwt.sign(profile, options.secret, { expiresInMinutes: 60 * 5 });
        res.json({ 'token': token });
      }
      else {
        res.send('API key could not be validated.', 401);
      }
    }
  });

  /**
   * Administration login.
   */
  app.post('/login', function(req, res, next) {
    if (!req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('password')) {
      res.send("Credentials not found in the request.", 404);
    }
    else {
      if (req.body.username == 'admin' && req.body.password == 'admin') {
        var profile = {
          "role": 'admin',
        };

        // Generate token for access.
        var token = jwt.sign(profile, options.secret, { expiresInMinutes: 60 * 5 });
        res.json({
          'token': token
        });
      }
      else {
        res.send('Credentials could not be validated.', 401);
      }
    }
  });

  // This plugin extends the server plugin and do not provide new services.
  register(null, { 'auth': {}});
};
