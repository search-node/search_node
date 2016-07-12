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


    // Get the controller up and running.
    loadAnalysis();
  }
]);
