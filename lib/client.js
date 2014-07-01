/**
 * @file
 * Client object to handle a client/screens connection and requests.
 */

var util = require('util');
var Base = require('./base');

/**
 * Client object as the module pattern that wrappes basic
 * socket.io communication for a given client/screen.
 */
var Client = (function() {

  /**
   * Client object to handle communication with the screen.
   */
  var Client = function(socketIO) {
    var self = this;

    // Call base class contructor.
    Base.call(this);

    // Store socket connetion.
    this.socket = socketIO;
    this.id = socketIO.id;

    // Handle disconnect event.
    this.socket.on('ping', function(data) {
      // This event could be handled her before sending it on
      // or handled and not send along.
      self.emit('ping', data);
    });

    // Handle disconnect event.
    this.socket.on('disconnect', function(data) {
      self.emit('disconnect', data);
    });

    // Handle heartbeat event.
    socketIO.conn.on('heartbeat', function(data) {
      self.emit('heartbeat');
    });
  }

  // Extend the object with event emitter.
  util.inherits(Client, Base);

  /**
   * Send pong to client.
   *
   * @param string msg
   *   Message to send with the pong.
   */
  Client.prototype.pong = function pong(msg) {
    this.log('Pong event send: ' + this.id);
    this.socket.emit('pong', { "msg": msg });
  }

  /**
   * Join socket.io groups.
   *
   * @param array groups
   *   Array of group names as strings.
   */
  Client.prototype.join = function join(groups) {
    var len = groups.length;
    for (var i = 0; i < len; i++) {
      this.socket.join(groups[i]);
    }
  }

  /**
   * Leave socket.io groups.
   *
   * @param array groups
   *   Array of group names as strings.
   */
  Client.prototype.leave = function leave(groups) {
    var len = groups.length;
    for (var i = 0; i < len; i++) {
      this.socket.leave(groups[i]);
    }
  }

  /**
   * Boardcast message and data to socket.io groups.
   *
   * @param array groups
   *   Array of group names as strings.
   * @param string event
   *   Name of the event to send.
   * @param array data
   *   Content formatted as described in the API documentation.
   */
  Client.prototype.boardcast = function boardcast(groups, event, data) {
    var len = groups.length;
    for (var i = 0; i < len; i++) {
      this.socket.in(groups[i]).emit(event, data);
    }
  }

  /**
   * Disconnect the client.
   */
  Client.prototype.disconnect = function disconnect() {
    this.socket.disconnect();
  }

  /**
   * Get the socket.io socket.
   *
   * @return socket
   *   The raw socket.io socket object.
   */
  Client.prototype.getSocket = function getSocket() {
    return this.socket;
  }

  /**
   * Get the id for the socket.
   */
  Client.prototype.getId = function getId() {
    return this.id;
  }

  return Client;

})();

// Export the object.
module.exports = Client;
