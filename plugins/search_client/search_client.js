/**
 * @file
 * Handles communication between the client (socket.io) and search.
 */

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  // Get socket.
  var sio = imports.socket;

  // Get log.
  var logger = imports.logger;

  // New connection is made via sockets.
  sio.on('connection', function (socket) {
    socket.on('search', function(data) {

      // @TODO: Check that customer_id and type exists in the data.
      var instance = new imports.search(data.customer_id, data.type);

      // Handle completed query.
      instance.once('hits', function (hits) {
        // Send data back.
        socket.emit('result', hits);
      });

      // Handle errors in the search.
      instance.once('error', function (data) {
        // Log and send error back.
      });

      // Remove customer ID and type.
      // @todo: finder better way to get customer id, store it in socket
      // connection.
      delete data.customer_id;
      delete data.type;

      // Send the query.
      instance.query(data);
    });
  });
}