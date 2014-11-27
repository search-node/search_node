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
        });
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
 *
 */
app.controller('ApiKeysController', ['$scope', '$window', '$location',
  function($scope, $window, $location) {
    if (!$window.sessionStorage.token) {
      $location.path('');
    }
  }
]);
