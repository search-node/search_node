/**
 * @file
 * Handles API keys manipulation and load.
 */

// Get the json easy file read/writer.
var jf = require('jsonfile');
var Q = require('q');

var ApiKeys = function ApiKeys(file, logger) {
  "use strict";

  this.file = file;
  this.keys = null;

  this.logger = logger;
};

/**
 * Load API keys form disk.
 *
 * @returns {*}
 *   Promise that either will resolve when the data is ready or reject with an
 *   error.
 */
ApiKeys.prototype.load = function load() {
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
 * Save API keys to disk.
 *
 * @returns {*}
 *   Promise that either will resolve when the data is saved or reject with an
 *   error.
 */
ApiKeys.prototype.save = function save() {
  "use strict";

  var deferred = Q.defer();

  // Check that api-keys have been load first.
  if (this.keys !== null) {
    jf.writeFile(this.file, this.keys, function (error) {
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
 * Adds a new API key and saves the file to disk.
 *
 * @param self
 *   Reference to the API keys object.
 * @param deferred
 *   Promise deferred object.
 * @param key
 *   The new API key.
 * @param info
 *   The API key information.
 */
function addAndSaveKey(self, deferred, key, info) {
  "use strict";

  // Check if key exists.
  if (!self.keys.hasOwnProperty(key)) {
    // Set the key info.
    self.keys[key] = info;

    // Save the keys to disk.
    self.save().then(function (status) {
        deferred.resolve(200);
      },
      function (error) {
        deferred.reject(error);
      });
  }
  else {
    deferred.reject(new Error('API key allready exists.'));
  }
}

/**
 * Add new API key.
 *
 * @param key
 *   API key to add.
 * @param info
 *   API key information.
 *
 * @returns {*}
 *   Promise that either will resolve when the key is added or reject with an
 *   error.
 */
ApiKeys.prototype.add = function add(key, info) {
  "use strict";

  var self = this;
  var deferred = Q.defer();

  // Check that API keys are loaded.
  if (this.keys === null) {
    // Load keys.
    this.load().then(function(status) {
			// Add and save the key to disk.
			addAndSaveKey(self, deferred, key, info);
    },
    function (error) {
      deferred.reject(error);
    });
  }
  else {
		// Add and save the key to disk.
    addAndSaveKey(self, deferred, key, info);
  }

  return deferred.promise;
};

/**
 * Updates an existing API key and saves the file to disk.
 *
 * @param self
 *   Reference to the API keys object.
 * @param deferred
 *   Promise deferred object.
 * @param key
 *   The API key to update.
 * @param info
 *   The API key information.
 */
function updateAndSaveKey(self, deferred, key, info) {
	"use strict";

	// Check if key exists.
	if (self.keys.hasOwnProperty(key)) {
		// Set the key info.
		self.keys[key] = info;

		// Save the keys to disk.
		self.save().then(function (status) {
				deferred.resolve(200);
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
		deferred.reject(new Error('API key do not exists.'));
	}
}

/**
 * Update API key.
 *
 * @param key
 *   API key to update.
 * @param info
 *   API key information.
 *
 * @returns {*}
 *   Promise that either will resolve when the key have been updated or reject
 *   with an error.
 */
ApiKeys.prototype.update = function update(key, info) {
  "use strict";

	var self = this;
	var deferred = Q.defer();

	// Check that API keys are loaded.
	if (this.keys === null) {
		// Load keys.
		this.load().then(function(status) {
				// Update and save the key to disk.
				updateAndSaveKey(self, deferred, key, info);
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
		// Update and save the key to disk.
		updateAndSaveKey(self, deferred, key, info);
	}

  return deferred.promise;
};

/**
 * Remove an existing API key and saves the file to disk.
 *
 * @param self
 *   Reference to the API keys object.
 * @param deferred
 *   Promise deferred object.
 * @param key
 *   The API key to remove.
 */
function removeAndSaveKey(self, deferred, key) {
	"use strict";

	// Check if key exists.
	if (self.keys.hasOwnProperty(key)) {
		// Remove api key.
		delete self.keys[key];

		// Save the keys to disk.
		self.save().then(function (status) {
				deferred.resolve(200);
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
		deferred.reject(new Error('API key do not exists.'));
	}
}

/**
 * Update API key.
 *
 * @param key
 *   API key to add.
 *
 * @returns {*}
 *   Promise that either will resolve when the key have been removed or reject
 *   with an error.
 */
ApiKeys.prototype.remove = function remove(key) {
	"use strict";

	var self = this;
	var deferred = Q.defer();

	// Check that API keys are loaded.
	if (this.keys === null) {
		// Load keys.
		this.load().then(function(status) {
				// Update and save the key to disk.
				removeAndSaveKey(self, deferred, key);
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
		// Update and save the key to disk.
		removeAndSaveKey(self, deferred, key);
	}

	return deferred.promise;
};

/**
 * Gets API key.
 *
 * @param key
 *   API key to check.
 *
 * @returns {*}
 *   Promise that either will resolve with the API keys info or false if it do
 *   not exists. If rejected it's do to api file errors.
 */
ApiKeys.prototype.get = function get(key) {
	"use strict";

	var self = this;
	var deferred = Q.defer();

	// Check that API keys are loaded.
	if (this.keys === null) {
		// Load keys.
		this.load().then(function(status) {
				if (self.keys.hasOwnProperty(key)) {
					deferred.resolve(self.keys[key]);
				}
				else {
					deferred.resolve(false);
				}
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
		if (self.keys.hasOwnProperty(key)) {
			deferred.resolve(self.keys[key]);
		}
		else {
			deferred.resolve(false);
		}
	}

	return deferred.promise;
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  var apikeys = new ApiKeys(options.file, imports.logger);

	// Register the plugin with the system.
  register(null, {
    "apikeys": apikeys
  });
};
