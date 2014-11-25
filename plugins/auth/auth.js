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
        console.log('YES!');
        return done(null, { 'apikey': '1234567890' }, { 'message': 'API key accepted' });
      }
      else {
        console.log('NO!');
        return done(null, false, { 'message': 'API key not valid' });
      }
    }
  ));

  passport.serializeUser(function(user, done) {
    done(null, user.apikey);
  });
 
  passport.deserializeUser(function(apikey, done) {
    done(null, { 'apikey': apikey });
  });

  app.post('/api/auth', function(req, res, next) {
    passport.authenticate('localapikey', function(err, user, info) {
      console.log(info);
      if (err) {
        // System errors (first parameter in done)
        return next(err);       
      } 
      if (!user) {
        // Log info object.

        ///
        /// HERE
        ///


        // API key not validated.
        res.send(403);
      }
      else {
        // API key accepted, so sen back token.
        var token = jwt.sign(user, 'jwt_secret', { expiresInMinutes: 60*24*365 });
        res.json({ 'token': token });
      }      
    })(req, res, next);
  });


  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
