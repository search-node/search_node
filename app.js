#!/usr/bin/env node

/**
 * @file
 * First alpha test of a search proxy.
 */

// Setup the basic variables need to create the server
var path = require('path');
var express = require('express');
var fs = require('fs');
var elasticsearch = require('elasticsearch');

// Start the app.
var app = express();

// Load configuration.
var config = require('nconf');
config.file({ file: 'config.json' });

// Add logger.
var Log = require('log')
var logger = new Log('info', fs.createWriteStream(config.get('log'), {'flags': 'a'}));

// Start the http server.
var http = require('http');
var server = http.createServer(app);

// Add socket.io to the mix.
var connection = require('./lib/connection');
connection.connect(server, config.get('debug'), config.get('secret'));

// Set express app configuration.
app.set('port', config.get('port'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
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

var es = elasticsearch.Client({
  hosts: [
  'localhost:9200'
  ]
});

/************************************
 * Socket events
 *
 * This could also be handle in the lib/client.js and there by be
 * removed from the main file. This would make the client easier to
 * swap with another one. But for test it's easier to see what
 * happens for now.
 ***************/
connection.on('connection', function(client) {
  client.on('search', function(data) {
    if (data.search.length === 0) {
      return
    }

    var options = {};
    options.index = 'indholdskanalen';
    options.size = 50;
    options.type = 'Indholdskanalen\\MainBundle\\Entity\\Slide';

    options.body = {};
    
    options.body.query = {};
    options.body.query.flt = {};
    options.body.query.flt.fields = data.fields;
    options.body.query.flt.like_text = data.search;

    if (data.sort.length > 0) {
      options.body.sort = data.sort;
    }

    es.search(options).then(function (resp) {
      if (resp.hits.total > 0) {
        var hits = [];
        for (var hit in resp.hits.hits) {
          hits.push(resp.hits.hits[hit]._source);
        }
        client.result(hits);
      }
    });
  });
});

/************************************
 * Application routes
 ********************/
var routes = require('./routes');
app.get('/', routes.index);
