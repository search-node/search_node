/**
 * @file
 * Provides web-socket integration through socket.io.
 */

// Private variables.
var sio;

/**
 * Function to add JWT handshake to the auth process.
 *
 * @TODO: Move this to an auth plugin.
 */
var secureConnectEnable = function secureConnectEnable(secret) {
  "use strict";

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
 *   The http server to attached socket.io.
 * @param secret
 *   The secret key decode security token.
 */
var SocketIO = function(server, secret) {
  "use strict";

  // Get socket.io started.
  sio = require('socket.io')(server);

  // Check if JWT security should be used.
  if (secret !== undefined) {
    secureConnectEnable(secret);
  }
};

/**
 * Sockets connection events etc.
 */
SocketIO.prototype.on = function on(eventName, callback) {
  "use strict";

  sio.on(eventName, function() {
    callback.apply(sio, arguments);
  });
};

/**
 * Sockets emit function.
 */
SocketIO.prototype.emit = function emit(eventName, data, callback) {
  "use strict";

  sio.emit(eventName, data, function() {
    if (callback) {
      callback.apply(sio, arguments);
    }
  });
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Ensure that only one socket server exists.
  var socketIO = new SocketIO(imports.server, options.secret || undefined);

  // Register exposed function with architect.
  register(null, {
    onDestruct: function (callback) {
      imports.server.close(callback);
      imports.logger.debug('Express server stopped');
    },
    "socket": socketIO
  });
};
