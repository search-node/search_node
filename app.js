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
var sha1 = require('sha1');

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
app.use(express.json());
app.use(express.bodyParser());
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
    console.log(data);
    var options = {};
    // TODO: This should be made dynamic. Maybe this could be done with Redis?
    if (data.hasOwnProperty('app_id')) {
      // We get type from client.
      if (data.hasOwnProperty('type')) {
        options.type = data.type
      }
      else {
        // No type defined. Send an error.
        client.result('No type defined.');
        return false;
      }

      options.index = app.indexName(data.app_id, data.type);
    }
    else {
      client.result('No app_id defined.');
      return false;
    }

    // Default size is 50. This is max too.
    options.size = 50;

    options.body = {};

    // Setup fuzzy search.
    var fuzzy;
    if (data.text !== '') {
      fuzzy = { 'flt' : {} };
      // Search on fiels, else every field.
      if (data.hasOwnProperty('fields')) {
        fuzzy.flt.fields = [ data.fields ];
      }

      fuzzy.flt.like_text = data.text;
    }

    // Setup filter.
    if (data.hasOwnProperty('filter')) {
      options.body.query = {
        "filtered": {
          "filter": {
            "bool": {
              "must": { "term": data.filter }
            }
          }
        }
      };

      if (fuzzy !== undefined) {
        options.body.query.filtered.query = fuzzy;
      }

    }
    else {
      // Not filtered search, so just send fuzzy.
      if (fuzzy !== undefined) {
        options.body.query = fuzzy;
      }
    }

    // Setup sorting.
    // Example input:
    // {created: 'asc'}
    if (data.hasOwnProperty('sort')) {
      options.body.sort = data.sort;
    }

    // Setup size.
    if (data.hasOwnProperty('size')) {
      if (data.size > options.size) {
        options.size = data.size;
      }
    }

    // Execute the search.
    es.search(options).then(function (resp) {
      var hits = [];
      if (resp.hits.total > 0) {
        // We got hits, return only _source.
        for (var hit in resp.hits.hits) {
          hits.push(resp.hits.hits[hit]._source);
        }
      }
      client.result(hits);
    });
  });
});

/************************************
 * Application routes
 ********************/
app.get('/', function (req, res) {
  res.send('Please use /api');
});

app.post('/api', function(req, res) {
  if (app.validateCall(req.body)) {
    // Test if index is created.
    var indexName = app.indexName(req.body.app_id, req.body.type);

    es.indices.exists({
      index: indexName
    }, function (err, response, status) {
      if (status === 404) {
        // Index not found. Lets create it.
        app.buildNewIndex(indexName, req.body.type, req.body.data);
      }
      else {
        // Index and mapping should be added. Just add our data.
        app.addContent(indexName, req.body.type, req.body.data);
      }
    });
  }
  res.send('OK 200');
});

app.delete('/api', function(req, res) {
  if (app.validateCall(req.body)) {
    // Test if index is created.
    var indexName = app.indexName(req.body.app_id, req.body.type);

    // Remove content.
    es.delete({
      index: indexName,
      type: req.body.type,
      id: req.body.id
    }, function (err, response, status) {
      console.log(err);
      if (status === 200) {
        res.send(req.body);
      }
    });
  }

});

app.validateCall = function(body) {
  if ( (body.app_id !== undefined) &&
    (body.app_secret !== undefined) &&
    (body.type !== undefined) ) {
    return true;
  }
}

app.indexName = function(id, type) {
  return sha1(id + ':' + type);
}

app.buildNewIndex = function(name, type, body) {
  es.indices.create({
    index: name,
  }, function (err, response, status) {
    if (status === 200) {
      app.buildMapping(name, type, body);
    }
  });
}

app.buildMapping = function (name, type, body) {
  // Index created. Now add mapper.
  es.indices.putMapping({
    index: name,
    type: '_default_',
    body: {
      _default_: {
        date_detection: false,
        dynamic_templates: [{
          dates: {
            match: '.*Date|date|created|changed',
            match_pattern: 'regex',
            mapping: {
              type: 'date'
            }
          }
        }]
      }
    }
  }, function (err, response, status) {
    if (status === 200) {
      // Mapping added. Now add data.
      app.addContent(name, type, body);
    }
  });
}

app.addContent = function(name, type, body) {
  es.create({
    index: name,
    type: type,
    body: body
  }, function (err, response, status) {
    if (status === 201) {
    }
  });
}