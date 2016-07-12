
/**
 * Search indexes page.
 */
angular.module('SearchNodeApp').controller('IndexesController', ['$scope', '$window', '$location', '$timeout', 'ngOverlay', 'dataService',
  function($scope, $window, $location, $timeout, ngOverlay, dataService) {
    "use strict";

    // Check that the user is logged in.
    if (!$window.sessionStorage.token) {
      $location.path('');
    }

    /**
     * Load indexes from the backend.
     */
    function loadIndexes() {
      // Get search indexes.
      dataService.fetch('get', '/api/admin/indexes').then(
        function (data) {
          $scope.activeIndexes = data;
          // Get mappings configuration.
          dataService.fetch('get', '/api/admin/mappings').then(
            function (mappings) {
              // Reset the scopes variables for mappings.
              $scope.activeMappings = {};
              $scope.inActiveMappings = {};

              // Filter out active indexes.
              for (var index in mappings) {
                if (!$scope.activeIndexes.hasOwnProperty(index)) {
                  $scope.inActiveMappings[index] = mappings[index];
                }
                else {
                  $scope.activeMappings[index] = mappings[index];
                }
              }
            },
            function (reason) {
              $scope.message = reason.message;
              $scope.messageClass = 'alert-danger';
            }
          );
        },
        function (reason) {
          $scope.message = reason.message;
          $scope.messageClass = 'alert-danger';
        }
      );
    }

    /**
     * Helper function to add table class base on cluster healt.
     */
    $scope.getClass = function getClass(healt) {
      // Default to green.
      var classname = 'success';
      if (healt == 'yellow') {
        classname = 'warning';
      }
      if (healt == 'red') {
        classname = 'danger';
      }

      return classname;
    };

    /**
     * Edit index callback.
     */
    $scope.edit = function edit(index) {
      dataService.fetch('get', '/api/admin/mapping/' + index).then(
        function (data) {
          var scope = $scope.$new(true);

          // Set index.
          scope.index = index;

          // Add mapping information.
          scope.mapping = data;

          /**
           * Save index callback.
           */
          scope.save = function save() {
            dataService.send('put', '/api/admin/mapping/' + index, scope.mapping).then(
              function (data) {
                $scope.message = data;
                $scope.messageClass = 'alert-success';

                // Reload indexes.
                loadIndexes();

                // Close overlay.
                overlay.close();
              },
              function (reason) {
                $scope.message = reason.message;
                $scope.messageClass = 'alert-danger';
              }
            );
          };

          /**
           * Add new date field to the index.
           */
          scope.addDate = function addDate() {
            scope.mapping.dates.push('');
          };

          /**
           * Remove date callback.
           *
           * @param index
           *   Index of the date to remove.
           */
          scope.removeDate = function removeDate(index) {
            var dates = [];

            // Loop over mapping dates and remove the selected one.
            for (var i in scope.mapping.dates) {
              if (Number(i) !== index) {
                dates.push(scope.mapping.dates[i]);
              }
            }

            // Update the dates array in mappings.
            scope.mapping.dates = dates;
          };

          /**
           * Add fields field to the index.
           */
          scope.addField = function addField() {
            scope.mapping.fields.push({
              "type": "string",
              "country": "DK",
              "language": "da",
              "default_analyzer": "string_index",
              "default_indexer": "analysed",
              "sort": false,
              "indexable": true,
              "raw": false,
              "geopoint": false
            });
          };

          scope.geoPointClicked = function geoPointClicked(index) {
            if (scope.mapping.fields[index].geopoint == true) {
              scope.mapping.fields[index].indexable = false;
              scope.mapping.fields[index].type = 'geo_point';
            }
          };

          /**
           * Remove field callback.
           *
           * @todo: this can be optimize with removeDate().
           *
           * @param index
           *   Index of the date to remove.
           */
          scope.removeField = function removeField(index) {
            var fields = [];

            // Loop over mapping fields and remove the selected one.
            for (var i in scope.mapping.fields) {
              if (Number(i) !== index) {
                fields.push(scope.mapping.fields[i]);
              }
            }

            // Update the fields array in mappings.
            scope.mapping.fields = fields;
          };

          // Open the overlay.
          var overlay = ngOverlay.open({
            template: "views/indexEdit.html",
            scope: scope
          });
        },
        function (reason) {
          $scope.message = reason.message;
          $scope.messageClass = 'alert-danger';
        }
      );
    };

    /**
     * Flush index callback.
     */
    $scope.flush = function flush(index) {
      var scope = $scope.$new(true);

      scope.title = 'Flush index';
      scope.message = 'Flush all the indexed data in the index "' + index + '". This can not be undone.';
      scope.okText = 'Flush';

      scope.confirmed = function confirmed() {
        dataService.fetch('get', '/api/admin/index/' + index + '/flush').then(
          function (data) {
            $scope.message = data;
            $scope.messageClass = 'alert-success';

            // Update index list (but give search an change to flush it).
            $timeout(function() {
              loadIndexes();
            }, 1000);

            // Close overlay.
            overlay.close();
          },
          function (reason) {
            $scope.message = reason.message;
            $scope.messageClass = 'alert-danger';
          }
        );
      };

      // Open the overlay.
      var overlay = ngOverlay.open({
        template: "views/confirm.html",
        scope: scope
      });
    };

    /**
     * Copy index mappings.
     */
     $scope.copy = function copy(index) {
       var scope = $scope.$new(true);

       scope.title = 'Copy mappings configuration';
       scope.message = 'This will copy the indexes configuration to a new index (but NOT the indexes content).';
       scope.okText = 'Copy';

       // Update index name.
       var newIndex = '';
       var name = '';
       scope.$watch("name", function(newValue, oldValue) {
         if (newValue.length > 0) {
           newIndex = CryptoJS.MD5(newValue + Math.random()).toString();
         }
         else {
           newIndex = '';
         }
       });

       // Comfiramtion callback.
       scope.confirmed = function confirmed() {
         // Load index.
         dataService.fetch('get', '/api/admin/mapping/' + index).then(
           function (data) {
             // Copy mapping information.
             var mapping = angular.copy(data);
             mapping.name = scope.name;

             // Save it at the server.
             dataService.send('post', '/api/admin/mapping/' + newIndex, mapping).then(
               function (data) {
                 $scope.message = data;
                 $scope.messageClass = 'alert-success';

                 // Reload indexes.
                 loadIndexes();

                 // Close overlay.
                 overlay.close();
               },
               function (reason) {
                 $scope.message = reason.message;
                 $scope.messageClass = 'alert-danger';

                 // Close overlay.
                 overlay.close();
               }
             );
           },
           function (reason) {
             $scope.message = reason.message;
             $scope.messageClass = 'alert-danger';

             // Close overlay.
             overlay.close();
           }
         );
       };

       // Open the overlay.
       var overlay = ngOverlay.open({
         template: "views/copyConfirm.html",
         scope: scope
       });
     };

    /**
     * Delete index callback.
     */
    $scope.deactivate = function deactivate(index) {
      var scope = $scope.$new(true);

      scope.title = 'Deactivate index';
      scope.message = 'Deactivate the index "' + index + '" will delete all indexed data. This can not be undone.';
      scope.okText = 'Deactivate';

      scope.confirmed = function confirmed() {
        dataService.fetch('delete', '/api/admin/index/' + index).then(
          function (data) {
            $scope.message = data;
            $scope.messageClass = 'alert-success';

            // Update index list.
            loadIndexes();

            // Close overlay.
            overlay.close();
          },
          function (reason) {
            $scope.message = reason.message;
            $scope.messageClass = 'alert-danger';
          }
        );
      };

      // Open the overlay.
      var overlay = ngOverlay.open({
        template: "views/confirm.html",
        scope: scope
      });
    };

    /**
     * Add index callback.
     */
    $scope.addMapping = function addMapping(index) {
      var scope = $scope.$new(true);

      // Add mapping information.
      scope.mapping = {
        "name": '',
        "fields": [],
        "dates": []
      };

      // Update index name.
      scope.$watch("mapping.name", function(newValue, oldValue) {
        if (newValue.length > 0) {
          scope.index = CryptoJS.MD5(newValue + Math.random()).toString();
        }
        else {
          scope.index = '';
        }
      });

      /**
       * Save index callback.
       */
      scope.save = function save() {
        dataService.send('post', '/api/admin/mapping/' + scope.index, scope.mapping).then(
          function (data) {
            $scope.message = data;
            $scope.messageClass = 'alert-success';

            /**
             * @TODO: Reload the index at the server.
             */

            // Reload indexes.
            loadIndexes();

            // Close overlay.
            overlay.close();
          },
          function (reason) {
            $scope.message = reason.message;
            $scope.messageClass = 'alert-danger';
          }
        );
      };

      /**
       * Add new date field to the index.
       */
      scope.addDate = function addDate() {
        scope.mapping.dates.push('');
      };

      /**
       * Remove date callback.
       *
       * @param index
       *   Index of the date to remove.
       */
      scope.removeDate = function removeDate(index) {
        var dates = [];

        // Loop over mapping dates and remove the selected one.
        for (var i in scope.mapping.dates) {
          if (Number(i) !== index) {
            dates.push(scope.mapping.dates[i]);
          }
        }

        // Update the dates array in mappings.
        scope.mapping.dates = dates;
      };

      /**
       * Add fields field to the index.
       */
      scope.addField = function addField() {
        scope.mapping.fields.push({
          "type": "string",
          "country": "DK",
          "language": "da",
          "default_analyzer": "string_index",
          "sort": false,
          "indexable": true,
          "raw": false,
          "geopoint": false
        });
      };

      /**
       * Remove field callback.
       *
       * @todo: this can be optimize with removeDate().
       *
       * @param index
       *   Index of the date to remove.
       */
      scope.removeField = function removeField(index) {
        var fields = [];

        // Loop over mapping fields and remove the selected one.
        for (var i in scope.mapping.fields) {
          if (Number(i) !== index) {
            fields.push(scope.mapping.fields[i]);
          }
        }

        // Update the fields array in mappings.
        scope.mapping.fields = fields;
      };

      // Open the overlay.
      var overlay = ngOverlay.open({
        template: "views/indexAdd.html",
        scope: scope
      });
    };

    /**
     * Import index/mapping callback.
     */
    $scope.importMapping = function importMapping() {
      var scope = $scope.$new(true);

      /**
       * Save index callback.
       */
      scope.save = function save() {
        var mappings = JSON.parse(scope.json);

        for (var index in mappings) {
          dataService.send('post', '/api/admin/mapping/' + index, mappings[index]).then(
            function (data) {
              $scope.message = data;
              $scope.messageClass = 'alert-success';

              // Reload indexes.
              loadIndexes();

              // Close overlay.
              overlay.close();
            },
            function (reason) {
              $scope.message = reason.message;
              $scope.messageClass = 'alert-danger';

              // Close overlay.
              overlay.close();
            }
          );
        }
      };

      // Open the overlay.
      var overlay = ngOverlay.open({
        template: "views/indexImport.html",
        scope: scope
      });
    };

    /**
     * Export index/mapping callback.
     */
    $scope.exportMapping = function exportMapping(index) {
      var scope = $scope.$new(true);

      dataService.fetch('get', '/api/admin/mapping/' + index).then(
        function (data) {
          // Copy mapping information.
          var mapping = {};
          mapping[index] = angular.copy(data);
          scope.json = JSON.stringify(mapping, null, 2);
        },
        function (reason) {
          $scope.message = reason.message;
          $scope.messageClass = 'alert-danger';

          // Close overlay.
          overlay.close();
        }
      );


      // Open the overlay.
      var overlay = ngOverlay.open({
        template: "views/indexExport.html",
        scope: scope
      });
    };

    /**
     * Remove mapping from configuration.
     */
    $scope.removeMapping = function removeMapping(index) {
      var scope = $scope.$new(true);

      scope.title = 'Remove mapping';
      scope.message = 'Remove the mapping "' + index + '" from configuration. This can not be undone.';
      scope.okText = 'Remove';

      scope.confirmed = function confirmed() {
        dataService.fetch('delete', '/api/admin/mapping/' + index).then(
          function (data) {
            $scope.message = data;
            $scope.messageClass = 'alert-success';

            // Update index list.
            loadIndexes();

            // Close overlay.
            overlay.close();
          },
          function (reason) {
            $scope.message = reason.message;
            $scope.messageClass = 'alert-danger';
          }
        );
      };

      // Open the overlay.
      var overlay = ngOverlay.open({
        template: "views/confirm.html",
        scope: scope
      });
    };

    /**
     * Activate callback.
     */
    $scope.activate = function activate(index) {
      // /api/admin/index/:index/activate
      dataService.fetch('get', '/api/admin/index/' + index + '/activate').then(
          function (data) {
            $scope.message = data;
            $scope.messageClass = 'alert-success';

            // Update index list (but give search an change to load it).
            $timeout(function() {
              loadIndexes();
            }, 1000);
          },
          function (reason) {
            $scope.message = reason.message;
            $scope.messageClass = 'alert-danger';
          }
        );
    };

    // Get the controller up and running.
    loadIndexes();
  }
]);
