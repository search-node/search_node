/**
 * @file
 * Handles communication with the search backend.
 */

// Node core modules required.
var util = require('util');
var eventEmitter = require('events').EventEmitter;

// Modules used to and by the search backend.
var elasticsearch = require('elasticsearch');
var sha1 = require('sha1');
var rename = require('rename-keys');

// Load configuration.
var config = require('./configuration');

// Get logger.
var logger = require('./logger');

// Holds connection to the search backend.
var es = elasticsearch.Client(config.get('search'));

// Link to the object (used in private functions).
var self;

/**********************
 * Private functions
 **********************/

/**
 * Generate index name.
 *
 * @param id
 *   Customer id.
 * @param type
 *   The type of data this index contains. This could be a entity type.
 */
var indexName = function indexName(id, type) {
  return sha1(id + ':' + type);
};

/**
 * Build new index in the search backend.
 *
 * @param index
 *   Name of the index.
 */
var buildNewIndex = function buildNewIndex(index) {
  es.indices.create({
    "index": index,
    "body": {
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
        "_default_": {
          "date_detection": false,
          "dynamic_templates": [{
            "dates": {
              "match": 'created_at|updated_at',
              "match_pattern": 'regex',
              "mapping": {
                "type": 'date'
              }
            }
          },
          {
            "tokens_plus_raw": {
              "match": '.*',
              "unmatch": 'created_at|updated_at',
              "match_pattern": 'regex',
              "match_mapping_type": "string",
              "mapping": {
                "type": "string",
                "analyzer": "string_index",
                "fields": {
                  "raw": {
                    "type":  "string",
                    "index": "not_analyzed"
                  }
                }
              }
            }
          }]
        }
      }
    }
  }, function (err, response, status) {
    if (status === 200) {
      self.emit('indexCreated', index);
    }
    else {
      self.emit('error', { 'status': status, 'res': response });
    }
  });
};

/**
 * @TODO This needs to match the setup for ES dynamic_templates - how do we best handle that?
 *
 * @param data
 * @returns {boolean}
 */
var isStringSort = function isStringSort(data) {
  var result = true;

  if(data.sort.hasOwnProperty('created_at') || data.sort.hasOwnProperty('updated_at')) {
    result = false;
  }

  return result;
};

/**
 * Post-fix string with ".raw".
 *
 * @TODO: Why ?
 */
var addRaw = function addRaw(str) {
  return str + '.raw';
};

/**
 * Add content/document to the search backend.
 *
 * @param index
 *   The index to use.
 * @param type
 *   Type of the index.
 * @param body
 *   The document to add.
 */
var addContent = function addContent(index, type, body) {
  es.create({
    "index": index,
    "type": type,
    "body": body
  }, function (err, response, status) {
    if (status === 201) {
      // 201 is created.
      self.emit('created', { 'status': status, 'index': index });
    }
    else {
      self.emit('error', { 'status': status, 'res' : response});
    }
  });
};


/*********************
 * The Search object
 *********************/

/**
 * Define the Search object (constructor).
 */
var Search = function (id, type) {
  self = this;

  this.id = id;
  this.type = type;
};

// Extend the object with event emitter.
util.inherits(Search, eventEmitter);

/**
 * Add content to the search backend.
 *
 * @param data
 *
 * @TODO: explain the data format { ???? }.
 */
Search.prototype.add = function add(data) {
  var self = this;

  // Log request to the debugger.
  logger.debug('Search: Add request for: ' + self.id + ' with type: ' + self.type);

  // Test if index is created.
  var index = indexName(self.id, self.type);

  es.indices.exists({
    "index": index
  }, function (err, response, status) {
    if (status === 404) {
      // Listen to index create event.
      self.once('indexCreated', function (i) {
        // Make sure that this is the index and not another index
        // created at the same time.
        if (i === index) {
          addContent(index, self.type, data);
        }
      });

      // Index not found. Lets create it.
      buildNewIndex(index);
    }
    else {
      // Index and mapping should be added. Just add our data.
      addContent(index, self.type, data);
    }
  });
}

/**
 * Remove document from the backend.
 *
 * @param data
 *
 * @TODO: explain the data format { ???? }.
 */
Search.prototype.remove = function remove(data) {
  var self = this;

  // Log request to the debugger.
  logger.debug('Search: Remove request for: ' + self.id + ' with type: ' + self.type);

  // Test if index is created.
  var index = indexName(self.id, self.type);

  // Remove content.
  es.deleteByQuery({
    "index": index,
    "body": {
      "query": {
        "term": {
          "id": data.id
        }
      }
    }
  }, function (err, response, status) {
    if (status === 200) {
      self.emit('removed', { 'id' : data.id })
    }
    else {
      self.emit('error', { 'id' : data.id, 'status': status, 'res' : response});
    }
  });
}

/**
 * Preform search query against the search engine.
 *
 * The client is sent into this functio to ensure that the right
 * async reply is sent to the client that requested it.
 *
 * @param client
 *   Client object that can be used to send results back.
 * @param data
 *   The data that should be queryed base on.
 */
Search.prototype.query = function query(data) {
  var self = this;

  // Log request to the debugger.
  logger.debug('Search: Query request for: ' + this.id + ' with type: ' + this.type);

  var options = {};

  // @TODO: This should be made dynamic. Maybe this could be done with Redis?
  if (data.hasOwnProperty('customer_id')) {
    // We get type from client.
    if (data.hasOwnProperty('type')) {
      options.type = data.type
    }
    else {
      // No type defined. Send an error.
      client.result('No type defined.');
      return false;
    }

    options.index = indexName(this.id, this.type);
  }
  else {
    client.result('No customer_id defined.');
    return false;
  }

  // Default size is 50. This is max too.
  options.size = 50;

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

  // Init the body element of the query.
  options.body = {};

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
    if (match !== undefined) {
      options.body.query.filtered.query = match;
    }
  }
  else {
    if (match !== undefined) {
      options.body.query = match;
    }
  }

  // Setup sorting.
  // Example input:
  // {created: 'asc'}
  // If it's date
  if (data.hasOwnProperty('sort')) {
    if (isStringSort(data)) {
      options.body.sort = data.sort;

      rename(options.body.sort, addRaw);
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

  // Execute the search.
  es.search(options).then(function (resp) {
    var hits = [];
    if (resp.hits.total > 0) {
      // We got hits, return only _source.
      for (var hit in resp.hits.hits) {
        hits.push(resp.hits.hits[hit]._source);
      }

      // Log number of hits found.
      logger.debug('Search: hits found: ' + resp.hits.total + ' items for id: ' + self.id + ' with type: ' + self.type);
    }

    // Emit hits.
    self.emit('hits', hits);
  });
}

// Export the object.
module.exports = Search;

