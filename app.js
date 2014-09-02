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
var rename = require('rename-keys');

// Start the app.
var app = express();

// Load configuration.
var argv = require('minimist')(process.argv.slice(2));
var file = argv.config ? argv.config : 'config.json';
var config = require('nconf');
config.file({ "file": file, "search": true });

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

    //console.log("-- DATA --");
    //console.log(JSON.stringify(data, null, 4));

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

    // Setup boolean search
    var match;
    if (data.text !== '') {
      match = { 'multi_match' : {} };
      if (data.hasOwnProperty('fields')) {
        match.multi_match.fields = [ data.fields ];
      }

      match.multi_match.query = data.text;
      match.multi_match.analyzer = 'string_search';
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

      /**
       * @TODO Choose between fuzzy and boolean search, or provide both
       */

      /*
      if (fuzzy !== undefined) {
        options.body.query.filtered.query = fuzzy;
      }
      */
      if (match !== undefined) {
        options.body.query.filtered.query = match;
      }
    }
    else {
      // Not filtered search, so just send fuzzy.
      /*
      if (fuzzy !== undefined) {
        options.body.query = fuzzy;
      }
      */

      if (match !== undefined) {
        options.body.query = match;
      }
    }

    // Setup sorting.
    // Example input:
    // {created: 'asc'}
    // If it's date
    if (data.hasOwnProperty('sort') ) {

      if (app.isStringSort(data)) {
        options.body.sort = data.sort;

        rename(options.body.sort, app.addRaw);

      }
      else {
        options.body.sort = data.sort;
      }
    }

    // Setup size.
    if (data.hasOwnProperty('size')) {
      if (data.size > options.size) {
        options.size = data.size;
      }
    }

    //console.log("-- OPTIONS --");
    //console.log(JSON.stringify(options, null, 4));

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

  res.send(200);
});

app.delete('/api', function(req, res) {
  if (app.validateCall(req.body)) {
    // Test if index is created.
    var indexName = app.indexName(req.body.app_id, req.body.type);

    // Remove content.
    es.deleteByQuery({
      index: indexName,
      body: {
        query: {
          term: { id: req.body.data.id }
        }
      }
    }, function (err, response, status) {
      if (status === 200) {
        res.send(req.body);
      }
      else {
        // @TODO Send proper error to client or handle error somehow
        res.send(response);
      }
    });
  }
});

app.validateCall = function(body) {
  if ((body.app_id !== undefined) && (body.app_secret !== undefined) && (body.type !== undefined)) {
    return true;
  }
}

app.indexName = function(id, type) {
  return sha1(id + ':' + type);
}

app.buildNewIndex = function(name, type, body) {
  es.indices.create({
    index: name,
    body: {
      "settings" : {
        "analysis" : {
          "analyzer" : {
            "string_search" : {
              "tokenizer" : "whitespace",
              "filter" : ["lowercase"]
            },
            "string_index" : {
              "tokenizer" : "alpha_nummeric_only",
              "filter" : ["lowercase","ngram"]
            }
          },
          "tokenizer" : {
            "alpha_nummeric_only" : {
              "pattern" : "[^\\p{L}\\d]+",
              "type" : "pattern"
            }
          },
          "filter" : {
            "edge_ngram" : {
              "max_gram" : 20,
              "min_gram" : 1,
              "type" : "edgeNGram"
            },
            "ngram" : {
              "max_gram" : 20,
              "min_gram" : 1,
              "type" : "nGram"
            }
          }
        }
      },
      "mappings" : {
        _default_: {
          date_detection: false,
          dynamic_templates: [{
            dates: {
              match: 'created_at|updated_at',
              match_pattern: 'regex',
              mapping: {
                type: 'date'
              }
            }
          },{
            tokens_plus_raw : {
              match: '.*',
              unmatch: 'created_at|updated_at',
              match_pattern: 'regex',
              match_mapping_type : "string",
              mapping : {
                type:     "string",
                analyzer: "string_index",
                fields: {
                  raw: {
                    type:  "string",
                    index: "not_analyzed"
                  }
                }
              }
            }
          }]
        }
      }
    }
  }, function (err, response, status) {
    console.log(err);
    if (status === 200) {
      //app.buildMapping(name, type, body);
      app.addContent(name, type, body);
    }
  });
}

/**
 * @TODO This needs to match the setup for ES dynamic_templates - how do we best handle that?
 *
 * @param data
 * @returns {boolean}
 */
app.isStringSort = function(data) {
  var result = true;

  if(data.sort.hasOwnProperty('created_at') || data.sort.hasOwnProperty('updated_at')) {
    result = false;
  }

  return result;
}

app.addRaw = function(str) {
  return str + '.raw';
};

app.addContent = function(name, type, body) {
  es.create({
    index: name,
    type: type,
    body: body
  }, function (err, response, status) {
    console.log(err);
    if (status === 201) {
    }
  });
}
