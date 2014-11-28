/**
 * @file
 * The applications controllers.
 */

/**
 * Main application controller.
 */
app.controller('MainController', ['$scope', '$route', '$routeParams', '$location',
  function($scope, $route, $routeParams, $location) {

  }
]);

/**
 * Login page.
 */
app.controller('LoginController', ['$scope', '$http', '$window', '$location',
  function($scope, $http, $window, $location) {
    $scope.login = function login() {
      $http.post('/login', $scope.user)
        .success(function (data, status, headers, config) {
          // Store token in session.
          $window.sessionStorage.token = data.token;

          $location.path('apikeys');
        })
        .error(function (data, status, headers, config) {
          // Erase the token if the user fails to log in
          delete $window.sessionStorage.token;

          // Handle login errors here
          $scope.message = 'Error: Invalid user or password';
        }
      );
    };
  }
]);

/**
 * Logout page.
 */
app.controller('LogoutController', ['$scope', '$window',
  function($scope, $window) {
    delete $window.sessionStorage.token;
  }
]);


/**
 * Navigation helpers.
 */
app.controller('NavigationController', ['$scope', '$location',
  function($scope, $location) {
     $scope.isActive = function (viewLocation) {
        return viewLocation === $location.path();
    };
  }
]);

/**
 * API keys page.
 */
app.controller('ApiKeysController', ['$scope', '$window', '$location', 'dataService',
  function($scope, $window, $location, dataService) {
    // Check that the user is logged in.
    if (!$window.sessionStorage.token) {
      $location.path('');
    }

    // Get user/api key information form the backend.
    dataService.fetch('get', '/api/admin/keys').then(
      function (data) {
        console.log(data);
      },
      function (reason) {
        $scope.message = reason.message;
        $scope.messageClass = 'alert-danger';
      }
    );
  }
]);

/**
 * Search indexes page.
 */
app.controller('IndexesController', ['$scope', '$window', '$location', '$timeout', 'ngOverlay', 'dataService',
  function($scope, $window, $location, $timeout, ngOverlay, dataService) {
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

                /**
                 * @TODO: Reload the index at the server.
                 */

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
          }

          /**
           * Add fields field to the index.
           */
          scope.addField = function addField() {
            scope.mapping.fields.push({
              "type": "string",
              "country": "DK",
              "language": "da",
              "default_analyzer": "string_index",
              "sort": false
            });
          }

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
            template: "views/editIndex.html",
            scope: scope
          });
        },
        function (reason) {
          $scope.message = reason.message;
          $scope.messageClass = 'alert-danger';
        }
      );
    };

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
     * Delete index callback.
     */
    $scope.remove = function remove(index) {
      var scope = $scope.$new(true);

      scope.title = 'Remove index';
      scope.message = 'Remove the index "' + index + '" and all indexed data. This can not be undone.';
      scope.okText = 'Remove';

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

    // Get the controller up and running.
    loadIndexes();
  }
]);
