angular.module('sentio').directive('sentioSankeyDiagram', ['$document', '$window', '$timeout', '$log',
function($document, $window, $timeout, $log) {'use strict';

	return {
		restrict : 'A',
		scope : {
			model: '=sentioModel',
			resizeWidth: '@sentioResizeWidth',
			configureFn: '&sentioConfigureFn'
		},
		replace : false,
		link : function(scope, element, attrs, controller) {
			var sankeyElement = d3.select(element[0]);
			var sankey = sentio.sankey.basic();

			sankey.init(sankeyElement);

			scope.$watch('model', function(n, o){
				if(null == o && null == n){ return; }
				sankey.model(n);
				sankey.redraw();
			}, true);

			scope.$watch('configureFn', function(n, o){
				if(null != scope.configureFn){
					scope.configureFn({ sankey: sankey });
				}
			});

			// Manage resizing the chart
			var resizeWidth = (null != attrs.sentioResizeWidth);
			var resizeTimer;
			var redrawTimer;
			var window = angular.element($window);

			// Do the redraw only once when the $digest cycle has completed
			var redraw = function() {
				if (null != redrawTimer) {
					$timeout.cancel(redrawTimer);
				}
				redrawTimer = $timeout(function () {
					sankey.redraw();
				}, 0);
			};

			var doResize = function() {

				// Get the raw body element
				var body = $document[0].body;

				// Cache the old overflow style
				var overflow = body.style.overflow;
				body.style.overflow = 'hidden';

				// Get the raw parent
				var rawElement = element[0];
				// Derive height/width of the parent (there are several ways to do this depending on the parent)
				var parentWidth = rawElement.attributes.width | rawElement.style.width | rawElement.clientWidth;

				// Calculate the new width/height based on the parent and the resize size
				var width = (resizeWidth)? parentWidth - attrs.sentioResizeWidth : undefined;

				// Reapply the old overflow setting
				body.style.overflow = overflow;

				$log.debug('resize sankey width: ' + width);

				// Apply the new width and height
				if(resizeWidth){ sankey.width(width); }

				sankey.resize();
				redraw();
			};
			var delayResize = function(){
				if(undefined !== resizeTimer){
					$timeout.cancel(resizeTimer);
				}
				resizeTimer = $timeout(doResize, 200);
			};
			if(resizeWidth){
				window.on('resize', delayResize);
				delayResize();
			}
			scope.$on('$destroy', function () {
				window.off('resize', delayResize);
			});
		}
	};

}]);