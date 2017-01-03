/**
 * .
 */
angular.module('SearchNodeApp').controller('AnalysisController', ['$scope', '$window', '$location', 'ngOverlay', 'dataService',
  function($scope, $window, $location, ngOverlay, dataService) {
    "use strict";

    /**
     * Load analysis.
     */
    function loadAnalysis() {
      dataService.fetch('get', '/api/admin/analysis').then(
        function (data) {
          $scope.analysis = data;
        },
        function (reason) {
          $scope.message = reason.message;
          $scope.messageClass = 'alert-danger';
        }
      );
    }

    /**
     * Add analyser callback.
     */
    $scope.addAnalyzer = function addAnalyzer() {
      var scope = $scope.$new(true);

      scope.save = function save() {
        // dataService.send('post', '/api/admin/mapping/' + scope.index, scope.mapping).then(
        //   function (data) {
        //     $scope.message = data;
        //     $scope.messageClass = 'alert-success';
        //
        //     // Reload data.
        //     loadAnalysis();
        //
        //     // Close overlay.
        //     overlay.close();
        //   },
        //   function (reason) {
        //     $scope.message = reason.message;
        //     $scope.messageClass = 'alert-danger';
        //   }
        // );
      };

      // Open the overlay.
      var overlay = ngOverlay.open({
        template: "views/analysis/analysers/add.html",
        scope: scope
      });
    };

    /**
     * Add analyser callback.
     */
    $scope.addTokenizer = function addTokenizer() {
      var scope = $scope.$new(true);

      scope.tokenizer = {
        "name" : "alpha_nummeric_only",
        "x_description": "Alpha nummeric only",
        "x_locked": true,
        "options" : [
          [ "type", "pattern" ],
          [ "pattern", "[^\\p{L}\\d]+" ]
        ]
      };

      scope.save = function save() {
        // dataService.send('post', '/api/admin/mapping/' + scope.index, scope.mapping).then(
        //   function (data) {
        //     $scope.message = data;
        //     $scope.messageClass = 'alert-success';
        //
        //     // Reload data.
        //     loadAnalysis();
        //
        //     // Close overlay.
        //     overlay.close();
        //   },
        //   function (reason) {
        //     $scope.message = reason.message;
        //     $scope.messageClass = 'alert-danger';
        //   }
        // );
      };

      // Open the overlay.
      var overlay = ngOverlay.open({
        template: "views/analysis/tokenizer/add.html",
        scope: scope
      });
    };

    // Get the controller up and running.
    loadAnalysis();
  }
]);
