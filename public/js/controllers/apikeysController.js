/**
 * API keys page.
 */
angular.module('SearchNodeApp').controller('ApiKeysController', ['$scope', '$window', '$location', 'ngOverlay', 'dataService',
  function($scope, $window, $location, ngOverlay, dataService) {
    "use strict";

    // Check that the user is logged in.
    if (!$window.sessionStorage.token) {
      $location.path('');
    }

    /**
     * Load API keys.
     */
    function loadApikeys() {
      // Get user/api key information form the backend.
      dataService.fetch('get', '/api/admin/keys').then(
        function (data) {
          $scope.apikeys = data;

          // Get search indexes.
          dataService.fetch('get', '/api/admin/mappings').then(
            function (data) {
              $scope.mappings = data;
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
     * Remove API key.
     */
    $scope.remove = function remove(key) {
      var scope = $scope.$new(true);

      scope.title = 'Remove API key';
      scope.message = 'Remove the key "' + key + '". This can not be undone.';
      scope.okText = 'Remove';

      scope.confirmed = function confirmed() {
        dataService.fetch('delete', '/api/admin/key/' + key).then(
          function (data) {
            $scope.message = data;
            $scope.messageClass = 'alert-success';

            // Update index list.
            loadApikeys();

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
     * Add API key callback.
     */
    $scope.add = function add(index) {
      var scope = $scope.$new(true);

      // Add mapping information.
      scope.api = {
        "key": '',
        "name": '',
        "expire": 300,
        "access": 'rw',
        "indexes": []
      };

      // Update index name.
      scope.$watch("api.name", function(newValue, oldValue) {
        if (newValue.length > 0) {
          scope.api.key = CryptoJS.MD5(newValue + Math.random()).toString();
        }
        else {
          scope.api.key = '';
        }
      });

      // Get mappings.
      scope.mappings = [];
      for (var index in $scope.mappings) {
        scope.mappings.push({
          "id": index,
          "name": $scope.mappings[index].name
        });
      }

      /**
       * Save index callback.
       */
      scope.save = function save() {
        dataService.send('post', '/api/admin/key', { "api": scope.api }).then(
          function (data) {
            $scope.message = data;
            $scope.messageClass = 'alert-success';

            // Reload API keys.
            loadApikeys();

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
        template: "views/keyAdd.html",
        scope: scope
      });
    };

    /**
     * Edit API key callback.
     */
    $scope.edit = function edit(key) {
      dataService.fetch('get', '/api/admin/key/' + key).then(
        function (data) {
          var scope = $scope.$new(true);

          // Set API key information.
          scope.api = data;

          // Set key.
          scope.api.key = key;

          // Get mappings.
          scope.mappings = [];
          for (var index in $scope.mappings) {
            scope.mappings.push({
              "id": index,
              "name": $scope.mappings[index].name
            });
          }

          /**
           * Save API key callback.
           */
          scope.save = function save() {
            dataService.send('put', '/api/admin/key/' + key, { "api": scope.api }).then(
              function (data) {
                $scope.message = data;
                $scope.messageClass = 'alert-success';

                // Reload API key list.
                loadApikeys();

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
            template: "views/keyEdit.html",
            scope: scope
          });
        },
        function (reason) {
          $scope.message = reason.message;
          $scope.messageClass = 'alert-danger';
        }
      );
    };

    // Get the controller up and running.
    loadApikeys();
  }
]);