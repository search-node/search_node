/**
 * @file
 * Handles communication between the client (socket.io) and search.
 */

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Get socket.
  var sio = imports.socket;

  // Get log.
  var logger = imports.logger;

  // New connection is made via sockets.
  sio.on('connection', function (socket) {
    // Log that connection was made.
    logger.info('Client have made connection: ' + socket.id);

    // Capture all "emit" to log them.
    socket.emitOrg = socket.emit;
    socket.emit = function emit(ev) {
      var profile = socket.client.request.decoded_token;
      var args = Array.prototype.slice.call(arguments);
      logger.socket('Emit <-> ' + ev, args);
      socket.emitOrg.apply(socket, args);
    }

    // Capture all "on" to log them.
    socket.onOrg = socket.on;
    socket.on = function on(ev) {
      var profile = socket.client.request.decoded_token;
      var args = Array.prototype.slice.call(arguments);
      logger.socket('On <-> ' + ev, args);
      socket.onOrg.apply(socket, args);
    }

    /**
     * Handle search message.
     */
    socket.on('search', function(query) {
      var uuid = query.hasOwnProperty('uuid') ? query.uuid : undefined;
      var callbacks = query.callbacks;

      // Send search message to monitor.io if enabled.
      if (options.monitor) {
        socket.monitor('search', JSON.stringify(query));
      }

      // @TODO: Check that index and type exists in the data.
      // Create new search instance.
      var instance = new imports.search(query.index, query.type);

      // Handle completed query.
      instance.once('hits', function (hits) {
        // Add uuid to hits if the current instance has one.

        if (uuid != undefined) {
          hits.uuid = uuid;
        }

        // Send data back.
        socket.emit(callbacks.hits, hits);
      });

      // Handle errors in the search.
      instance.once('error', function (data) {
        // Log error.
        logger.error('Search error: ' + data.message);

        // Add uuid to error if the current instance has one.
        if (uuid != undefined) {
          data.uuid = uuid;
        }

        // Send error to client.
        socket.emit(callbacks.error, data);
      });

      // Remove book-keeping variables from the search query.
      delete query.index;
      delete query.type;
      delete query.uuid;
      delete query.callbacks;

      // Send the query.
      instance.query(query);
    });

    /**
     * Handle search message.
     */
    socket.on('count', function(data) {

      // @TODO: Check that index and type exists in the data.
      // Create new search instance.
      var instance = new imports.search(data.index, data.type);

      // Handle completed query.
      instance.once('counts', function (counts) {
        // Send data back.
        socket.emit('counts', counts);
      });

      // Handle errors in the search.
      instance.once('error', function (data) {
        // Log error.
        logger.error('Search error: ' + data.message);

        // Send error to client.
        socket.emit('searchError', data);
      });

      // Remove customer ID and type.
      // @todo: finder better way to get customer id, store it in socket
      // connection.
      delete data.index;
      delete data.type;

      // Send the count query.
      instance.count(data);
    });
  });

  // This plugin extends the socket plugin and do not provide new services.
  register(null, null);
};
