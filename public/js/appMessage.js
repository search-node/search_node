/**
 * Overlay module to display an overlay with modal window with a message.
 */
(function (window, angular, undefined) {
  'use strict';

  var module = angular.module('appMessage', []);

  module.provider('appMessage', function () {

    this.$get = ['$rootScope', 'ngOverlay', function ($rootScope, ngOverlay) {
        // The overlay to use.
        var overlay = false;

        return {
          /**
           * Open modal within an overlay with the message.
           *
           * @param message
           *   The message to display.
           */
          "display": function display(message) {
            // Create new scope and add message to it.
            var scope = $rootScope.$new();
            scope.message = message;

            // Add close function to the scope.
            scope.close = this.close;

            // Open overlay with the message.
            overlay = ngOverlay.open({
              template: 'views/message.html',
              scope: scope
            });
          },
          /**
           * Close function to close the open modal window.
           */
          "close": function close() {
            if (overlay) {
              overlay.close();
            }
          }
        };
      }
    ];
  });

})(window, window.angular);
