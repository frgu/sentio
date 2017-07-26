angular.module('sentio').directive('sentioScatterChart', ['$document', '$window', '$timeout', '$log',
function($document, $window, $timeout,$log) {
	'use strict';

	return {
		restrict: 'A',
		scope: {
			model: '=sentioModel',
			lineModel: '=sentioLineModel',
			axes: '=sentioAxes',
			resizeWidth: '@sentioResizeWidth',
			resizeHeight: '@sentioResizeHeight',
			configureFn: '&sentioConfigureFn',
			colorScale: '=sentioColorScale'
		},
		replace: false,
		link: function(scope, element, attrs, controller) {

			var chartElement = d3.select(element[0]);
			var chart = sentio.chart.scatter();

			// Extract the width of the chart
			var width = element[0].style.width;
			if(null != width && '' !== width) { 
				width = parseFloat(width.substring(0, width.length-2));
				if(null != width && !isNaN(width)) { chart.width(width); }
			}
			var height = element[0].style.height;
			if(null != height && '' !== height) { 
				height = parseFloat(height.substring(0, height.length-2));
				if(null != height && !isNaN(height)) { chart.height(height); }
			}

			chart.init(chartElement);

			scope.$watchGroup(['model', 'lineModel'], function(n, o) {
				if(null == o[0] && null == n[0] &&
				   null == o[1] && null == n[1]){ return; }
				chart.data(n[0]);
				chart.lineData(n[1]);
				redraw();
			});

			scope.$watch('axes', function(n, o) {
				if(null == o && null == n){ return; }
				chart.axes(n);
				redraw();
			});

			scope.$watch('configureFn', function(n, o) {
				if(null != scope.configureFn) {
					scope.configureFn({ chart: chart });
				}
			});

			scope.$watch('colorScale', function(n, o) {
				if(null == o && null == n){ return; }
				chart.color(n);
				redraw();
			});

			// Manage resizing the chart
			var resizeWidth = (null != attrs.sentioResizeWidth);
			var resizeHeight = (null != attrs.sentioResizeHeight);
			var resizeTimer;
			var redrawTimer;
			var window = angular.element($window);

			// Do the redraw only once when the $digest cycle has completed
			var redraw = function() {
				if (null != redrawTimer) {
					$timeout.cancel(redrawTimer);
				}
				redrawTimer = $timeout(function () {
					chart.redraw();
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
				// Derive width of the parent (there are several ways to do this depending on the parent)
				var parentWidth = rawElement.attributes.width | rawElement.style.width | rawElement.clientWidth;
				var parentHeight = rawElement.attributes.height | rawElement.style.height | rawElement.clientHeight;

				// Calculate the new width based on the parent and the resize size
				var width = (resizeWidth)? parentWidth - attrs.sentioResizeWidth : undefined;
				var height = (resizeHeight)? parentHeight - attrs.sentioResizeHeight : undefined;

				// Reapply the old overflow setting
				body.style.overflow = overflow;

				// Apply the new width
				if(resizeWidth){ chart.width(width); }
				if(resizeHeight){ chart.height(height); }

				chart.resize();
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