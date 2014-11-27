/**
* @file
* Defines the Angular JS application the run the administration frontend.
*/

// Define the angular application.
var app = angular.module('SearchNodeApp', [ 'ngRoute' ]);

/**
 * Add autentication header to all AJAX requests.
 */
app.factory('authInterceptor', function ($rootScope, $q, $window) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        config.headers.Authorization = 'Bearer ' + $window.sessionStorage.token;
      }
      return config;
    },
    response: function (response) {
      if (response.status === 401) {
        // handle the case where the user is not authenticated
        alert('AUTH FAILED');
      }
      return response || $q.when(response);
    }
  };
});

/**
 * Configure routes and add auth interceptor.
 */
app.config(['$routeProvider', '$locationProvider', '$httpProvider',
  function ($routeProvider, $locationProvider, $httpProvider) {
 		$routeProvider
 		  .when('/', {
    		templateUrl: 'views/login.html',
    		controller: 'LoginController'
  		})
 		  .when('/apikeys', {
    		templateUrl: 'views/apikeys.html',
    		controller: 'ApiKeysController'
  		})
      .when('/logout', {
        templateUrl: 'views/logout.html',
        controller: 'LogoutController'
      });


    $httpProvider.interceptors.push('authInterceptor');
	}
]);
