/**
* @file
* Defines the Angular JS application the run the administration frontend.
*/

// Define the angular application.
var app = angular.module('SearchNodeApp', [ 'ngRoute', 'ngCookies' ]);


app.controller('MainController', ['$scope', '$route', '$routeParams', '$location',
  function($scope, $route, $routeParams, $location) {

  }
]);

app.controller('LoginController', ['$scope', '$route', '$routeParams', '$location',
  function($scope, $route, $routeParams, $location) {
    alert('login');
  }
]);

app.controller('HomeController', ['$scope', '$route', '$routeParams', '$location',
  function($scope, $route, $routeParams, $location) {
    alert('home');
  }
]);


app.config(['$routeProvider', '$locationProvider', '$httpProvider',
  function ($routeProvider, $locationProvider, $httpProvider) {
 		$routeProvider
 		  .when('/', {
    		templateUrl: 'views/login.html',
    		controller: 'LoginController'
  		})
 		  .when('/home', {
    		templateUrl: 'views/home.html',
    		controller: 'HomeController'
  		})
	}
]);

app.factory('dataService', ['$http', '$q', function($http, $q) {
  "use strict";

  /**
   * Custom exception.
   *
   * @param status
   *   HTTP status code.
   * @param message
   *   Customer message.
   * @constructor
   */
  function DataException(status, message) {
    if (message === undefined) {
      message = 'Der opstod en fejl i kommunikation med serveren.';
    }

    this.status = status;
    this.message = message;
    this.name = 'DataException';
  }

  /**
   * Fetch content from the backend service.
   *
   * @param method
   *   HTTP method to use.
   * @param uri
   *   The URI to call.
   *
   * @returns {d.promise|promise|n.ready.promise|Tc.g.promise}
   */
  function fetch(method, uri) {
    var deferred = $q.defer();

    $http({method: method, url: uri}).
      success(function(data, status, headers, config) {
        if (status !== 200) {
          deferred.reject(status);
          throw new DataException(status);
        }

        // Resolve promise an return data.
        deferred.resolve(data);
      }).
      error(function(data, status, headers, config) {
        deferred.reject(status);
        throw new DataException(status);
      });

    return deferred.promise;
  }

  /**
   * Send data back to the server.
   *
   * @param method
   *   HTTP method to use.
   * @param uri
   *   The URI to call.
   * @param data
   *   The JSON data to send back.
   *
   * @returns {d.promise|promise|n.ready.promise|Tc.g.promise|qFactory.Deferred.promise}
   */
  function send(method, uri, data) {
    var deferred = $q.defer();

    $http({ "method": method, "url": uri, "data": data }).
      success(function(data, status, headers, config) {
        if (status !== 200) {
          deferred.reject(status);
          throw new DataException(status);
        }
        // Resolve promise.
        deferred.resolve(data);
      }).
      error(function(data, status, headers, config) {
        deferred.reject(status);
        throw new DataException(status);
      });

    return deferred.promise;
  }

  /**
   * Public functions exposed by this factory.
   */
  return {
    "fetch": fetch,
    "send": send,
  };
}]);
