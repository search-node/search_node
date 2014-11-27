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

  // Configuring Passport.
  var passport = require('passport');
  app.use(passport.initialize());
  app.use(passport.session());

  // Get local API key strategy.
  var LocalAPIKeyStrategy = require('passport-localapikey').Strategy;

  // Use passport to auth the API key.
  passport.use(new LocalAPIKeyStrategy(
    function(apikey, done) {
      if (apikey === '1234567890') {
        return done(null, { 'apikey': '1234567890' }, { 'message': 'API key accepted' });
      }
      else {
        return done(null, false, { 'message': 'API key not valid' });
      }
    }
  ));

  /**
   * Store API key in the session.
   */
  passport.serializeUser(function(user, done) {
    done(null, user.apikey);
  });

  /**
   * Restore the API key from the session.
   *
   * It's available in req.user after deserialization.
   */
  passport.deserializeUser(function(apikey, done) {
    done(null, { 'apikey': apikey });
  });

  // We are going to protect /api routes with JWT
  app.use('/api', expressJwt({secret: secret}));

  app.post('/authenticate', function(req, res, next) {
    passport.authenticate('localapikey', function(err, user, info) {
      if (err) {
        logger.error(err);
        res.send(500);
      }
      if (!user) {
        // Log info object.
        logger.info(info);

        // API key not validated.
        res.send(403);
      }
      else {
        // Call to login ensures that a session is created.
        req.logIn(user, function(err) {
          if (err) {
            return next(err);
          }

          // Log auth request.
          logger.info('Authenticated ' + user.apikey + ' from ' + req.ip);

          // API key accepted, so sen back token.
          var token = jwt.sign(user, options.secret, { expiresInMinutes: 60*24*365 });
          res.json({ 'token': token });
        });
      }
    })(req, res, next);
  });


  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
