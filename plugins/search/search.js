/**
 * @file
 * Handles communication with the search backend.
 */

// Node core modules required.
var util = require('util');
var eventEmitter = require('events').EventEmitter;

// Modules used to and by the search backend.
var elasticsearch = require('elasticsearch');
var rename = require('rename-keys');

// Register the plugin.
module.exports = function (options, imports, register) {
  "use strict";

  // Re-use the connection to search.
  var global_es = elasticsearch.Client(options.hosts);

  /**
   * Build field mappings for a single field in the index.
   *
   * @param map
   *   Mapping information for the field from mappings.json.
   * @param body
   *   The index body json object.
   */
  function buildIndexMapping(map, body) {
    var field = {};

    // Check if field should be indexed/searchable.
    if (map.hasOwnProperty('indexable') && map.indexable === false) {
      // Disable analyse and indexing this field.
      field["field_" + map.field] = {
        "match": map.field,
        "match_pattern": 'regex',
        "match_mapping_type": map.type,
        "mapping": {
          "type": map.type,
          "index": 'no'
        }
      };
    }
    else {
      field["field_" + map.field] = {
        "match": map.field,
        "match_pattern": 'regex',
        "match_mapping_type": map.type,
        "mapping": {
          "type": map.type
        }
      };

      // Add field default analyzer (eg. ngram string indexer).
      if (map.hasOwnProperty('default_analyzer')) {
        field["field_" + map.field].mapping.analyzer = 'string_index';
      }

      var analyzer = 'ducet_sort';
      // If language and country is defined, create new filter
      if (map.hasOwnProperty('language') && map.hasOwnProperty('country')) {
        // Update language in filter.
        body.settings.analysis.filter.search_language.language = map.language;
        body.settings.analysis.filter.search_language.country = map.country;

        // Change analyzer to use language sort.
        analyzer = 'language_sort';
      }

      // Add sort field if required as an analyzer not filter as above.
      if (map.hasOwnProperty('sort') && map.sort) {
        field["field_" + map.field].mapping.fields = {
          "sort": {
            "type":  map.type,
            "analyzer": analyzer
          }
        };
      }
    }

    // Add the new field to templates.
    body.mappings._default_.dynamic_templates.push(field);
  }

  /**
   * Helper function to create default mappings if they do not exists.
   *
   * @param body
   *   The body element to sent to the search engine when build a new index.
   */
  function addDefaultMapping(body) {
    // Check if mapping exists.
    if (!body.hasOwnProperty('mappings')) {
      // Add mappings.
      body.mappings = {
        "_default_": {
          "date_detection": false,
          "dynamic_templates": []
        }
      };
    }
  }

  /**
   * Build new index in the search backend.
   *
   * @param self
   *   Reference to the current search object.
   * @param logger
   *   Reference to logger object.
   * @param map
   *   Mapping information for the index.
   * @param index
   *   The index to build.
   */
  function buildNewIndex(self, logger, map, index) {
    var body = {
      "settings": {
        "analysis": {
          "analyzer": {
            "string_search" : {
              "tokenizer" : "whitespace",
              "filter" : ["lowercase"]
            },
            "string_index": {
              "tokenizer": "alpha_nummeric_only",
              "filter": [ "lowercase", "ngram" ]
            },
            "ducet_sort": {
              "tokenizer": "keyword",
              "filter": [ "icu_collation" ]
            },
            "language_sort": {
              "tokenizer": "keyword",
              "filter": [ "search_language" ]
            }
          },
          "tokenizer" : {
            "alpha_nummeric_only": {
              "pattern": "[^\\p{L}\\d]+",
              "type": "pattern"
            }
          },
          "filter": {
            "ngram": {
              "max_gram": 20,
              "min_gram": 1,
              "type": "nGram"
            },
            "search_language": {
              "type":     "icu_collation",
              "language": "en",
              "country":  "UK"
            }
          }
        }
      }
    };

    // Setup dynamic mappings for language and sorting.
    if (map.hasOwnProperty('fields')) {
      addDefaultMapping(body);

      // Loop over sorts and add theme.
      for (var i in map.fields) {
        buildIndexMapping(map.fields[i], body);
      }
    }

    // Setup mappings for dates.
    if (map.hasOwnProperty('dates')) {
      addDefaultMapping(body);

      // Add dates mappings.
      body.mappings._default_.dynamic_templates.push({
        "dates": {
          "match": map.dates.join('|'),
          "match_pattern": 'regex',
          "mapping": {
            "type": 'date'
          }
        }
      });
    }

    // Create the index.
    self.es.indices.create({
      "index": index,
      "body": body
    }, function (err, response, status) {
      if (status === 200) {
        logger.info('New index have been created: ' + index);
        self.emit('indexCreated', index);
      }
      else {
        self.emit('error', { 'status': status, 'res': response });
      }
    });
  }

  /**
   * Add content/document to the search backend.
   *
   * @param self
   *   Reference to the current search object.
   * @param index
   *   The index to use.
   * @param type
   *   Type of the index.
   * @param body
   *   The document to add.
   * @param id
   *   The documents unique id.
   */
  function addContent(self, index, type, body, id) {
    self.es.create({
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
  }

  /**
   * Append ".sort" to a string.
   *
   * Used in the query build to ensure that the sort field is used to sort on
   * based on the mappings loaded.
   *
   * @param property
   *
   * @returns {string}
   */
  function addSort(property) {
    return property + '.sort';
  }

  /*********************
   * The Search object
   *********************/

  /**
   * Define the Search object (constructor).
   *
   * @param index
   *   The unique id to identify the index to use.
   * @param type !optional
   *   The type of documents to search or manipulate.
   * @param id !optional
   *   The documents unique id.
   */
  var Search = function Search(index, type, id) {
    // Set internal variables.
    this.index = index;
    this.type = type;
    this.id = id;
    
    // Connection to Elasticsearch.
    this.es = global_es;

    // Set logger for the object (other plugin).
    this.logger = imports.logger;

    // Set mapping (other plugin).
    this.mappings = imports.mappings;
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
    var self = this;

    // Log request to the debugger.
    self.logger.debug('Search: Add request for: ' + self.index + ' with type: ' + self.type);

    self.es.indices.exists({
      "index": self.index
    }, function (err, response, status) {
      if (status === 404) {
        self.logger.error('Search: Add request for unkown index: ' + self.index + ' with type: ' + self.type);
      }
      else {
        // Index and mapping exists, so just add the document.
        addContent(self, self.index, self.type, body, self.id);
      }
    });
  };

  /**
   * Update content to the search backend.
   *
   * @param doc
   *   The data to update in the index.
   *
   * @TODO: explain the data format.
   */
  Search.prototype.update = function update(doc) {
    var self = this;

    // Log request to the debugger.
    self.logger.debug('Search: Update request for: ' + self.index + ' with type: ' + self.type);

    self.es.update({
      "index": self.index,
      "type": self.type,
      "id": self.id,
      "body": {
        "doc": doc
      }
    }, function (err, response, status) {
      if (status === 200) {
        self.emit('updated', { 'status': status, 'index': self.index });
      }
      else {
        self.emit('error', { 'status': status, 'res' : response});
      }
    });
  };

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
    self.logger.debug('Search: Remove request from: ' + self.index + ' with type: ' + self.type);

    // Remove content.
    self.es.deleteByQuery({
      "index": self.index,
      "body": {
        "query": {
          "term": {
            "id": data.id
          }
        }
      }
    }, function (err, response, status) {
      if (status === 200) {
        self.emit('removed', { 'id' : data.id });
      }
      else {
        self.emit('error', { 'id' : data.id, 'status': status, 'res' : response});
      }
    });
  };

  /**
   * Preform search query against the search engine.
   *
   * @param data
   *   The data that should be queried base on.
   */
  Search.prototype.query = function query(data) {
    var self = this;

    // Log request to the debugger.
    self.logger.info('Search: Query request in: ' + self.index + ' with type: ' + self.type);

    self.mappings.get(self.index).then(
      function (map) {
        // Use mappings to fix sort on strings.
        if (data.hasOwnProperty('sort')) {
          for (var i in map.fields) {
            if (data.sort.hasOwnProperty(map.fields[i].field)) {
              // Rename the property by adding .sort to switch sorting to using the fully
              // indexed string for the field.
              rename(data.sort, addSort);
            }
          }
        }

        // Add the sort search query.
        var search_query = {
          "type": self.type,
          "index": self.index,
          "body": data
        };

        /**
         * @TODO: Validate the search JSON request for safety reasons.
         */

          // Execute the search.
        self.es.search(search_query).then(function (resp) {
          var hits = [];
          if (resp.hits.total > 0) {
            // We got hits, return only _source.
            for (var hit in resp.hits.hits) {
              hits.push(resp.hits.hits[hit]._source);
            }

            // Log number of hits found.
            self.logger.debug('Search: hits found: ' + resp.hits.total + ' items for ' + self.index + ' with type: ' + self.type);
          }

          // Emit hits.
          self.emit('hits', {
            'hits': resp.hits.total,
            'results': hits
          });
        });
      },
      function (error) {
        self.logger.debug("Search error: " + error.message);
      }
    );
  };

  /**
   * Get indexes available on the server.
   */
  Search.prototype.getIndexes = function getIndexes() {
    var self = this;

    self.es.cat.indices(function (err, response, status) {
      if (status === 200) {
        var indexes = {};
        if (response !== undefined) {
          var lines = response.split(/\n/g);
          for (var i in lines) {
            var parts = lines[i].match(/[\w\.\d]+/g);
            if (parts !== null) {
              indexes[parts[1]] = {
                "health": parts[0],
                "index": parts[1],
                "pri": parts[2],
                "rep": parts[3],
                "count": parts[4],
                "deleted": parts[5],
                "size": parts[6],
                "prisize": parts[7]
              };
            }
          }
        }

        // Emit indexes.
        self.emit('indexes', indexes);
      }
      else {
        self.logger.error('Index error: ' + require('util').inspect(response, true, 10));
      }
    });
  };

  /**
   * Add new index (requires mappings have been created).
   */
  Search.prototype.addIndex = function addIndex(index) {
    var self = this;

    self.mappings.get(index).then(
      function (map) {
        buildNewIndex(self, self.logger, map, index);
      },
      function (error) {
        // Send not created event.
        self.emit('indexNotCreated', error);
      }
    );
  };

  /**
   * Remove index from the server.
   */
  Search.prototype.removeIndex = function removeIndex(index) {
    var self = this;

    self.es.indices.delete({
      "index": index
    }, function (err, response, status) {
      if (err) {
        self.emit('error', { 'id' : data.id, 'status': status, 'res' : response});
      }
      else {
        // Emit removed status.
        self.emit('removed', index);
      }
    });
  };

  // Register the plugin with the system.
  register(null, {
    'search': Search
  });
};
