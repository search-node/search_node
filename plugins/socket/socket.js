/**
 * @file
 * Provides web-socket intergration through socket.io.
 */

// Private variables.
var sio;

/**
 * Function to add JWT handshake to the auth process.
 *
 * @TODO: Move this to an auth plugin.
 */
var secureConnect = function secureConnectEnable(secret) {
  var socketio_jwt = require('socketio-jwt');
  sio.set('authorization', socketio_jwt.authorize({
    secret: secret,
    handshake: true
  }));
};

/**
 * Default constructor.
 *
 * @param server
 *   The http server to attched socket.io.
 * @param secret
 *   The secret key decode security token.
 */
var SocketIO = function(server, secret) {
  var self = this;

  // Get socket.io started.
  sio = require('socket.io')(server);

  // Check if JWT security should be used.
  if (secret !== undefined) {
    secureConnectEnable(secret);
  }
}

/**
 * Sockets connection events etc.
 */
SocketIO.prototype.on = function on(eventName, callback) {
  sio.on(eventName, function() {
    var args = arguments;
    callback.apply(sio, args);
  });
}

/**
 * Sockets emit function.
 */
SocketIO.prototype.emit = function emit(eventName, data, callback) {
  sio.emit(eventName, data, function() {
    if (callback) {
      var args = arguments;
      callback.apply(sio, args);
    }
  });
}

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  // Runned here to esure that only exists one socket server.
  var socketIO = new SocketIO(imports.server, options.secret || undefined);

  // Register exposed function with architect.
  register(null, {
    onDestruct: function (callback) {
      server.close(callback);
      logger.debug('Express server stopped');
    },
    "socket": socketIO
  });
};