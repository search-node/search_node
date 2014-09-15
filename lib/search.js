/**
 * @file
 * Handles communication with the search backend.
 */

// Node core modules required.
var util = require('util');
var eventEmitter = require('events').EventEmitter;

// Get helper functions (mostly debug).
var helpers = require('./helpers');

// Modules used to and by the search backend.
var elasticsearch = require('elasticsearch');

// Load configuration.
var config = require('./configuration');

// Get logger.
var logger = require('./logger');

// Mappings.
var mappings = require('./mappings');
var rename = require('rename-keys');

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
 */
var indexName = function indexName(customer_id) {
  return customer_id;
};

/**
 * Build new index in the search backend.
 *
 * @param index
 *   Name of the index.
 */
var buildNewIndex = function buildNewIndex(index) {
  var body = {
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
            "match": '',
            "match_pattern": 'regex',
            "mapping": {
              "type": 'date'
            }
          }
        },
        {
          "tokens_plus_raw": {
            "match": '',
            "unmatch": '',
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
  };

  // Get customer mappings.
  var map = mappings.getCustomerMappings(index);

  // Update "raw" fields.
  body.mappings._default_.dynamic_templates[1].tokens_plus_raw.match = map.raws.join('|');

  // Update dates.
  body.mappings._default_.dynamic_templates[0].dates.match = map.dates.join('|');

  // Create the index.
  es.indices.create({
    "index": index,
    "body": body
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

  if (data.sort.hasOwnProperty('created_at') || data.sort.hasOwnProperty('updated_at')) {
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
 * @param id
 *   The documents unique id.
 */
var addContent = function addContent(index, type, body, id) {
  es.create({
    "index": index,
    "type": type,
    "id": id,
    "body": body
  }, function (err, response, status) {
    if (status === 201) {
      // Status "201" is created.
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
 *
 * @param customer_id
 *   The unique id to identify the customer (index) to use.
 * @param type !optional
 *   The type of documents to search or manipulate.
 * @param id !optional
 *   The documents unique id.
 */
var Search = function (customer_id, type, id) {
  self = this;

  this.customer_id = customer_id;
  this.type = type;
  this.id = id;
};

// Extend the object with event emitter.
util.inherits(Search, eventEmitter);

/**
 * Add content to the search backend.
 *
 * @param body
 *
 * @TODO: explain the data format { ???? }.
 */
Search.prototype.add = function add(body) {
  // Log request to the debugger.
  logger.debug('Search: Add request for: ' + self.customer_id + ' with type: ' + self.type);

  // Get index name from customer id.
  var index = indexName(self.customer_id);

  es.indices.exists({
    "index": index
  }, function (err, response, status) {
    if (status === 404) {
      // Listen to index create event.
      self.once('indexCreated', function (i) {
        // Make sure that this is the index and not another index
        // created at the same time.
        if (i === index) {
          addContent(index, self.type, body, self.id);
        }
      });

      // Index not found. Lets create it.
      buildNewIndex(index);
    }
    else {
      // Index and mapping exists, so just add the document.
      addContent(index, self.type, body, self.id);
    }
  });
}

/**
 * Update content to the search backend.
 *
 * @param doc
 *   The data to update in the index.
 *
 * @TODO: explain the data format.
 */
Search.prototype.update = function update(doc) {
  // Log request to the debugger.
  logger.debug('Search: Update request for: ' + self.customer_id + ' with type: ' + self.type);

  // Get index name from customer id.
  var index = indexName(self.customer_id);

  es.update({
    "index": index,
    "type": self.type,
    "id": self.id,
    "body": {
      "doc": doc
    }
  }, function (err, response, status) {
    if (status === 200) {
      self.emit('updated', { 'status': status, 'index': index });
    }
    else {
      self.emit('error', { 'status': status, 'res' : response});
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
  // Log request to the debugger.
  logger.debug('Search: Remove request from: ' + self.custommer_id + ' with type: ' + self.type);

  // Get index name from customer id.
  var index = indexName(self.customer_id);

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
 * @param data
 *   The data that should be queryed base on.
 */
Search.prototype.query = function query(data) {
  // Log request to the debugger.
  logger.debug('Search: Query request in: ' + self.customer_id + ' with type: ' + self.type);

  // Use mappings to fix sort on strings.
  if (data.hasOwnProperty('sort')) {
    var map = mappings.getCustomerMappings(self.customer_id);
    for (var i in map.raws) {
      if (data.sort.hasOwnProperty(map.raws[i])) {
        // Rename the property by adding .raw to swith sorting to using the fully
        // indexed string for the field.
        rename(data.sort, function(property) {
          return property + '.raw';
        });
      }
    }
  }

  // Add the raw search query.
  var query = {
    "type": self.type,
    "index": indexName(self.customer_id),
    "body": data
  };

  /**
   * @TODO: Validate the search JSON request for safety reasons.
   */

  // Execute the search.
  es.search(query).then(function (resp) {
    var hits = [];
    if (resp.hits.total > 0) {
      // We got hits, return only _source.
      for (var hit in resp.hits.hits) {
        hits.push(resp.hits.hits[hit]._source);
      }

      // Log number of hits found.
      logger.debug('Search: hits found: ' + resp.hits.total + ' items for ' + self.customer_id + ' with type: ' + self.type);
    }

    // Emit hits.
    self.emit('hits', hits);
  });
}

// Export the object.
module.exports = Search;

