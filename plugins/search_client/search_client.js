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

    /**
     * Handle search message.
     */
    socket.on('search', function(query) {
      // @TODO: Check that index and type exists in the data.
      // Create new search instance.
      var instance = new imports.search(query.index, query.type);

      // Handle completed query.
      instance.once('hits', function (hits) {

        // Add uuid to hits if the current instance has one.
        var uuid = instance.getUuid();
        if (uuid != undefined) {
          hits.uuid = uuid;
        }

        // Send data back.
        socket.emit('result', hits);
      });

      // Handle errors in the search.
      instance.once('error', function (data) {
        // Log error.
        logger.error('Search error: ' + data.message);

        // Add uuid to error if the current instance has one.
        var uuid = instance.getUuid();
        if (uuid != undefined) {
          data.uuid = uuid;
        }

        // Send error to client.
        socket.emit('searchError', data);
      });

      // Remove customer ID and type.
      // @todo: finder better way to get customer id, store it in socket
      // connection.
      delete query.index;
      delete query.type;

      // Set uuid for the search instance.
      if (query.hasOwnProperty('uuid')) {
        instance.setUuid(query.uuid);

        // Remove it form the query to ensure search works.
        delete query.uuid;
      }

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
