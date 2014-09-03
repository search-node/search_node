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
    var instance = new Search(data.id, data.type);

    // Handle completed query.
    instance.once('hits', function (hits) {
      // Send data back.
      client.result(hits);
    });

    // Handle errors in the search.
    instance.once('error', function (data) {
      // Log and send error back.
    });

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


app.post('/api', function(req, res) {
  if (validateCall(req.body)) {
    var instance = new Search(req.body.app_id, req.body.type);
    instance.add(req.body.data);
    res.send(200);
  }
  else {
    // @TODO: find better error code to send back.
    res.send(500);
  }
});

app.delete('/api', function(req, res) {
  if (validateCall(req.body)) {
    var instance = new Search(req.body.app_id, req.body.type);

    // Handle completed
    instance.once('removed', function (data) {
      // Send back the id of the element that have been removed.
      res.send(data);
    });

    // Handle errors in the request.
    instance.once('error', function (data) {
      // @TODO: send error message with the status code.
      res.send(data.status);
    });

    // Send the request.
    instance.remove(req.body.data);
  }
  else {
    // @TODO: find better error code to send back.
    res.send(500);
  }
});

var validateCall = function validateCall(body) {
  if ((body.app_id !== undefined) && (body.app_secret !== undefined) && (body.type !== undefined)) {
    return true;
  }
};

