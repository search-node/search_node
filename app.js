#!/usr/bin/env node

/**
 * @file
 * First alpha test of a search proxy.
 */

// Setup the basic variables need to create the server
var path = require('path');
var express = require('express');
var fs = require('fs');

// Start the app.
var app = express();

// Load configuration.
var config = require('./lib/configuration');

// Get logger.
var logger = require('./lib/logger');

// Start the http server.
var http = require('http');
var server = http.createServer(app);

// Add socket.io to the mix.
var connection = require('./lib/connection');
connection.connect(server, config.get('debug'), config.get('secret'));

// Set express app configuration.
app.set('port', config.get('port'));
app.use(express.favicon());
app.use(express.urlencoded());
app.use(express.json());
app.use(app.router);

// Log express requests.
if (config.get('debug')) {
  app.use(express.logger('dev'));
};

// Start the server.
server.listen(app.get('port'), function (){
  if (config.get('debug')) {
    console.log('Express server with socket.io is listening on port ' + app.get('port'));
  }
});

/************************************
 * Socket events
 *
 * This could also be handle in the lib/client.js and there by be
 * removed from the main file. This would make the client easier to
 * swap with another one. But for test it's easier to see what
 * happens for now.
 ***************/
var Search = require('./lib/search');
connection.on('connection', function (client) {
  client.on('search', function(data) {

    // @TODO: Check that customer_id and type exists in the data.

    var instance = new Search(data.customer_id, data.type);

    // Handle completed query.
    instance.once('hits', function (hits) {
      // Send data back.
      client.result(hits);
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

/************************************
 * Application routes
 ********************/
app.get('/', function (req, res) {
  res.send('Please use /api');
});

/**
 * Add content to the search index.
 */
app.post('/api', function(req, res) {
  if (validateCall(req.body)) {
    // Added the data to the search index (a side effect is that a new
    // index maybe created.). The id may not be given and is hence undefined.
    var instance = new Search(req.body.customer_id, req.body.type, req.body.id);

    instance.on('created', function (data) {
      logger.debug('Content added: status ' + data.status + ' : ' + data.index);

      // @TODO: find better error code to send back (201).
      res.send(200);
    });

    instance.on('error', function (data) {
      logger.error('Error in add content: status ' + data.status + ' : ' + data.res);

      // @TODO: find better error code to send back.
      res.send(data.status);
    });

    // Add the content.
    instance.add(req.body.data);
  }
  else {
    logger.error('Error: missing parameters in add content');

    // @TODO: find better error code to send back.
    res.send(500);
  }
});

/**
 * Update content to the search index.
 */
app.put('/api', function(req, res) {
  if (validateCall(req.body)) {
    // Update the data in the search index (a side effect is that a new
    // index maybe created.).
    var instance = new Search(req.body.customer_id, req.body.type, req.body.id);

    instance.on('updated', function (data) {
      logger.debug('Content updated: status ' + data.status + ' : ' + data.index);
      res.send(200);
    });

    instance.on('error', function (data) {
      logger.error('Error in add content: status ' + data.status + ' : ' + data.res);

      // @TODO: find better error code to send back.
      res.send(data.status);
    });

    // Add the content.
    instance.update(req.body.data);
  }
  else {
    logger.error('Error: missing parameters in add content');

    // @TODO: find better error code to send back.
    res.send(500);
  }
});

/**
 * Remove content from the search index.
 *
 * @TODO: rename customer_id to custom_id.
 */
app.delete('/api', function(req, res) {
  if (validateCall(req.body)) {
    var instance = new Search(req.body.customer_id, req.body.type);

    // Handle completed
    instance.once('removed', function (data) {
      logger.debug('Removed: ' + data.id);

      // Send back the id of the element that have been removed.
      res.send(data);
    });

    // Handle errors in the request.
    instance.once('error', function (data) {
      logger.error('Error in add content with id: ' + data.id + ' status ' + data.status + ' : ' + data.res);

      // @TODO: send error message with the status code.
      res.send(data.status);
    });

    // Send the request.
    instance.remove(req.body.data);
  }
  else {
    logger.error('Error: missing parameters in remove content');

    // @TODO: find better error code to send back.
    res.send(500);
  }
});

/**
 * Helper to validate that required parameters exists in API calls.
 */
var validateCall = function validateCall(body) {
  if ((body.customer_id !== undefined) && (body.type !== undefined)) {
    return true;
  }

  return false;
};
