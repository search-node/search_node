/**
 * @file
 * Handles mappings manipulation and load.
 */

// Get the json easy file read/writer.
var jf = require('jsonfile');
var Q = require('q');

var Mappings = function Mappings(file, logger) {
  "use strict";

  this.file = file;
  this.mappings = null;

  this.logger = logger;
};

/**
 * Load mappings form disk.
 *
 * @returns {*}
 *   Promise that either will resolve when the data is ready or reject with an
 *   error.
 */
Mappings.prototype.load = function load() {
  "use strict";

  var deferred = Q.defer();
  var self = this;

  jf.readFile(this.file, function(error, mappings) {
    if (error) {
      deferred.reject(new Error(error));
    }
    else {
      self.mappings = mappings;
      deferred.resolve(mappings);
    }
  });

  return deferred.promise;
};

/**
 * Save mappings to disk.
 *
 * @returns {*}
 *   Promise that either will resolve when the data is saved or reject with an
 *   error.
 */
Mappings.prototype.save = function save() {
  "use strict";

  var deferred = Q.defer();

  // Check that api-keys have been load first.
  if (this.mappings !== null) {
    jf.writeFile(this.file, this.mappings, function (error) {
      if (error) {
        deferred.reject(new Error(error));
      }
      else {
        deferred.resolve(200);
      }
    });
  }
  else {
    deferred.reject(new Error('The mappings have not been loaded yet and can therefor not be saved.'));
  }

  return deferred.promise;
};

/**
 * Adds a new mapping and saves the file to disk.
 *
 * @param self
 *   Reference to the mappings object.
 * @param deferred
 *   Promise deferred object.
 * @param index
 *   The new index.
 * @param info
 *   The mappings information.
 */
function addAndSaveMapping(self, deferred, index, info) {
  "use strict";

  // Check if mappings exists.
  if (!self.mappings.hasOwnProperty(index)) {
    // Set the mappings info.
    self.mappings[index] = info;

    // Save the mappings to disk.
    self.save().then(function (status) {
        deferred.resolve(200);
      },
      function (error) {
        deferred.reject(error);
      });
  }
  else if (index === undefined) {
    deferred.reject(new Error('Index not defined in addAndSaveMapping().'));
  }
  else {
    deferred.reject(new Error('Mappings already exists.'));
  }
}

/**
 * Add new mapping.
 *
 * @param index
 *  Index to add.
 * @param info
 *   Mappings information.
 *
 * @returns {*}
 *   Promise that either will resolve when the mappings is added or reject with
 *   an error.
 */
Mappings.prototype.add = function add(index, info) {
  "use strict";

  var self = this;
  var deferred = Q.defer();

  // Check that mappings are loaded.
  if (this.mappings === null) {
    // Load mappings.
    this.load().then(function (status) {
			// Add and save the mappings to disk.
			addAndSaveMapping(self, deferred, index, info);
    },
    function (error) {
      deferred.reject(error);
    });
  }
  else {
		// Add and save the mappings to disk.
    addAndSaveMapping(self, deferred, index, info);
  }

  return deferred.promise;
};

/**
 * Updates an existing mapping and saves the file to disk.
 *
 * @param self
 *   Reference to the mappings object.
 * @param deferred
 *   Promise deferred object.
 * @param index
 *   The index to update.
 * @param info
 *   Mapping information.
 */
function updateAndSaveMappings(self, deferred, index, info) {
	"use strict";

	// Check if mapping exists.
	if (self.mappings.hasOwnProperty(index)) {
		// Set the mapping info.
		self.mappings[index] = info;

		// Save the keys to disk.
		self.save().then(function (status) {
				deferred.resolve(200);
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
		deferred.reject(new Error('Mappings do not exists.'));
	}
}

/**
 * Update mapping.
 *
 * @param index
 *   Index to update.
 * @param info
 *   Mappings information.
 *
 * @returns {*}
 *   Promise that either will resolve when the mapping have been updated or
 *   reject with an error.
 */
Mappings.prototype.update = function update(index, info) {
  "use strict";

	var self = this;
	var deferred = Q.defer();

	// Check that mappings are loaded.
	if (this.mappings === null) {
		// Load mappings.
		this.load().then(function(status) {
				// Update and save the mappings to disk.
				updateAndSaveMappings(self, deferred, index, info);
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
    // Update and save the mappings to disk.
    updateAndSaveMappings(self, deferred, index, info);
	}

  return deferred.promise;
};

/**
 * Remove an existing mapping and saves the file to disk.
 *
 * @param self
 *   Reference to the mappings object.
 * @param deferred
 *   Promise deferred object.
 * @param index
 *   The index to remove.
 */
function removeAndSaveMapping(self, deferred, index) {
	"use strict";

	// Check if mapping exists.
	if (self.mappings.hasOwnProperty(index)) {
		// Remove the mappings information-
		delete self.mappings[index];

		// Save the mappings to disk.
		self.save().then(function (status) {
				deferred.resolve(200);
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
		deferred.reject(new Error('Mappings do not exists.'));
	}
}

/**
 * Remove mappings.
 *
 * @param index
 *   Index for mapping to remove.
 *
 * @returns {*}
 *   Promise that either will resolve when the mapping have been removed or
 *   reject with an error.
 */
Mappings.prototype.remove = function remove(index) {
	"use strict";

	var self = this;
	var deferred = Q.defer();

	// Check that mappings are loaded.
	if (this.mappings === null) {
		// Load mappings.
		this.load().then(function(status) {
				// Update and save the mappings to disk.
				removeAndSaveMapping(self, deferred, index);
			},
			function (error) {
				deferred.reject(error);
			});
	}
	else {
    // Update and save the mappings to disk.
    removeAndSaveMapping(self, deferred, index);
	}

	return deferred.promise;
};

/**
 * Gets mappings information.
 *
 * @param index
 *   Index to get mappings for.
 *
 * @returns {*}
 *   Promise that either will resolve with the mappings info or false if it do
 *   not exists. If rejected it's do to api file errors.
 */
Mappings.prototype.get = function get(index) {
	"use strict";

	var self = this;
	var deferred = Q.defer();

	// Check that API keys are loaded.
	if (this.mappings === null) {
		// Load mappings.
		this.load().then(function(status) {
				if (self.mappings.hasOwnProperty(index)) {
					deferred.resolve(self.mappings[index]);
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
    if (self.mappings.hasOwnProperty(index)) {
      deferred.resolve(self.mappings[index]);
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

  var mappings = new Mappings(options.file, imports.logger);

  // Register the plugin with the system.
  register(null, {
    "mappings": mappings
  });
};
