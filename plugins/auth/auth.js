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
  var secret = options.secret;

  // We are going to protect /api routes with JWT
  app.use('/api', expressJwt({ "secret": secret }));

  /**
   * Authentication for API access.
   */
  app.post('/authenticate', function (req, res, next) {
    if (!req.body.hasOwnProperty('apikey')) {
      res.status(404).json({ 'message': 'API key not found in the request.' });
    }
    else {
      // Load keys.
      imports.apikeys.get(req.body.apikey).then(
        function (info) {
          if (info) {
            // Create profile.
            var profile = {
              "role": 'api',
              "name": info.name,
              "apikey": req.body.apikey
            };

            // Default expire.
            var expire = 300 * 60;
            if (info.hasOwnProperty('expire')) {
              expire = info.expire;
            }

            // API key accepted, so send back token.
            var token = jwt.sign(profile, secret, { "expiresIn": expire});
            res.status(200).json({'token': token});
          }
          else {
            res.status(401).json({ 'message': 'API key could not be validated.' });
          }
        },
        function (error) {
          res.status(500).json({ 'error': error.message });
        }
      );
    }
  });

  /**
   * Administration login.
   */
  app.post('/login', function (req, res, next) {
    if (!req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('password')) {
      res.status(404).json({ 'message': 'Credentials not found in the request.' });
    }
    else {
      if (req.body.username == options.admin.username && req.body.password == options.admin.password) {
        var profile = {
          "role": 'admin'
        };

        // Generate token for access.
        var token = jwt.sign(profile, secret, {expiresInMinutes: 60 * 5});
        res.status(200).json({ 'token': token });
      }
      else {
        res.status(401).json({ 'message': 'Credentials could not be validated.' });
      }
    }
  });

  // This plugin extends the server plugin and do not provide new services.
  register(null, {'auth': {}});
};
