/**
 * @file
 * Handles API keys manipulation and load.
 */

// Get the json easy file read/writer.
var jf = require('jsonfile');
var Q = require('q');

var Analysis = function Analysis(file, logger) {
  "use strict";

  this.file = file;
  this.keys = null;

  this.logger = logger;
};

/**
 * Load analysis form disk.
 *
 * @returns {*}
 *   Promise that either will resolve when the data is ready or reject with an
 *   error.
 */
Analysis.prototype.load = function load() {
  "use strict";

  var deferred = Q.defer();
  var self = this;

  jf.readFile(this.file, function(error, keys) {
    if (error) {
      deferred.reject(new Error(error));
    }
    else {
      self.keys = keys;
      deferred.resolve(keys);
    }
  });

  return deferred.promise;
};

/**
 * Save analysis to disk.
 *
 * @returns {*}
 *   Promise that either will resolve when the data is saved or reject with an
 *   error.
 */
Analysis.prototype.save = function save() {
  "use strict";

  var deferred = Q.defer();

  // Check that api-keys have been load first.
  if (this.keys !== null) {
    jf.writeFile(this.file, this.keys, {spaces: 2}, function (error) {
      if (error) {
        deferred.reject(new Error(error));
      }
      else {
        deferred.resolve(200);
      }
    });
  }
  else {
    deferred.reject(new Error('The API keys have not been loaded yet and can therefor not be saved.'));
  }

  return deferred.promise;
};

/**
 * Parse the analysis file and remove meta-data.
 *
 * @returns {*|promise}
 */
Analysis.prototype.parse = function parse() {
  var self = this;
  var deferred = Q.defer();

  self.load().then(
    function (data) {
      // Remove metadata from the analysis settings.
      for (var i in data) {
        // Type of analysis: analyzer, filter or tokenizer.
        var types = data[i];
        for (var key in types) {
          for (var attribute in types[key]) {
            if (attribute.indexOf('x_') === 0) {
              delete data[i][key][attribute];
            }
          }
        }
      }
      deferred.resolve(data);
    },
    function (error) {
      deferred.reject(error);
    }
  );

  return deferred.promise;
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  var analysis = new Analysis(options.file, imports.logger);

	// Register the plugin with the system.
  register(null, {
    "analysis": analysis
  });
};
