/**
 * Overlay module to display an overlay with modal window.
 */
(function (window, angular, undefined) {
  'use strict';

  var module = angular.module('ngOverlay', []);

  var $el = angular.element;
  var isDef = angular.isDefined;

  module.provider('ngOverlay', function () {
    // Default values.
    var defaults = this.defaults = {
      'templateUrl': 'overlay.html',
      'cache': true,
    };

    this.$get = ['$document', '$templateCache', '$compile', '$q', '$http', '$rootScope', '$timeout', '$window', '$controller',
      function ($document, $templateCache, $compile, $q, $http, $rootScope, $timeout, $window, $controller) {

        var $body = $document.find('body');

        return {
          /**
           * Open modal within an overlay.
           *
           * @param opts
           */
          "open": function open(opts) {
            var self = this;

            // Extend default options with the once passed to open.
            var options = angular.copy(defaults);
            opts = opts || {};
            angular.extend(options, opts);

            // Try to get scope from options or create new scope.
            var scope = angular.isObject(options.scope) ? options.scope : $rootScope.$new();
            var $dialog;
            var $dialogParent = $body;

            $q.when(loadTemplate(options.template)).then(function (template) {
              // Store the template in cache.
              $templateCache.put(options.template, template);

              // Build basic overlay and add content.
              self.$result = $dialog = $el('<div id="myModal" class="modal fade"><div class="modal-dialog"><div class="modal-content">');
              $('.modal-content', $dialog).html(template);

              // Check if controller have been given as options and init the
              // controller.
              if (options.controller && (angular.isString(options.controller) || angular.isArray(options.controller) || angular.isFunction(options.controller))) {
                // The scope set here can be accessed as $scope.$parent in the
                // controller.
                $controller(options.controller, {
                  $scope: scope,
                  $element: $dialog
                });
              }

              // Compile the content and add it to the page.
              $timeout(function () {
                // Render the dialog.
                $compile($dialog)(scope);
                $dialogParent.append($dialog);

                // Let bootstrap take over.
                var el = $("#myModal");
                el.modal('show');

                // Ensures that the modal code is removed on close. This will also
                // ensure that the modal is updated if open once more.
                el.on('hidden.bs.modal', function (e) {
                  angular.element(document.querySelector('#myModal')).remove();
                });
              });
            });

            /**
             * Load template file from URL.
             *
             * @param tmpl
             * @param config
             * @returns {*}
             */
            function loadTemplateUrl(tmpl, config) {
              return $http.get(tmpl, angular.extend({cache: false}, config || {})).then(function(res) {
                return res.data || '';
              });
            }

            /**
             * Load template from cache and fallback to URL.
             *
             * @param tmpl
             * @returns {*}
             */
            function loadTemplate(tmpl) {
              if (!tmpl) {
                return 'Empty template';
              }

              if (typeof options.cache === 'boolean' && !options.cache) {
                return loadTemplateUrl(tmpl, {cache: false});
              }

              return $templateCache.get(tmpl) || loadTemplateUrl(tmpl, {cache: false});
            }

            // Return overlay to enable chaining.
            return self;
          },
          /**
           * Close function to close the open modal window.
           */
          "close": function close() {
            $("#myModal").modal('hide');
          }
        };
      }
    ];
  });

})(window, window.angular);
