/**
 * @file
 * The applications controllers.
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
app.controller('IndexesController', ['$scope', '$window', '$location', 'ngOverlay', 'dataService',
  function($scope, $window, $location, ngOverlay, dataService) {
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
          $scope.indexes = data;
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
          console.log(data);
          // Add mapping information.
          scope.mapping = data;

          // Set index.
          scope.index = index;

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

          }

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
      console.log(index);
    };

    /**
     * Delete index callback.
     */
    $scope.remove = function remove(index) {
      dataService.fetch('get', '/api/admin/index/' + index + '/remove').then(
        function (data) {
          $scope.message = reason.message;
          $scope.messageClass = 'alert-success';

          // Update index list.
          loadIndexes();
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
