angular.module('sentio').directive('sentioLine', [ '$document', '$window', '$timeout', '$log', 
function($document, $window, $timeout, $log) {
	'use strict';

	return {
		restrict : 'A',
		scope : {
			model: '=sentioModel',
			axes: '=sentioAxes',
			markers: '=sentioMarkers',
			yExtent: '=sentioYExtent',
			xExtent: '=sentioXExtent',
			duration: '=sentioDuration',
			api: '=sentioApi',
			resizeWidth: '@sentioResizeWidth',
			resizeHeight: '@sentioResizeHeight',
			configureFn: '&sentioConfigureFn',
			interpolation: '@sentioInterpolation',
			pointHoverFn: '&sentioPointHoverFn',
			legendFn: '&sentioLegendFn',
			yLock: '=sentioYLock',
			stacked: '=sentioStacked',
			resetYAxisMax: '=sentioResetYAxisMax'
		},
		replace : false,
		link : function(scope, element, attrs, controller) {
			var lineElement = d3.select(element[0]);
			var line = sentio.line.line();

			// Extract the height and width of the chart
			var width = element[0].style.width;
			if(null != width && '' !== width) { 
				width = parseFloat(width.substring(0, width.length-2));
				if(null != width && !isNaN(width)) { line.width(width); }
			}
			var height = element[0].style.height;
			if(null != height && '' !== height) {
				height = parseFloat(height.substring(0, height.length-2));
				if(null != height && !isNaN(height)) { line.height(height); }
			}

			line.init(lineElement);
			line.interpolation(scope.interpolation);

			// Triggered when legend element is clicked in the view.
			scope.$on('legend-toggle', function(evt, param) {
				line.toggleSeries(param);
			});

			scope.$watch('stacked', function(n, o) {
				if (null === 0 && null == n) {return; }
				line.stacked(n);
			});

			scope.$watch('yLock', function(n, o) {
				if (null === 0 && null == n) {return; }
				line.yLock(n);
			});

			scope.$watch('configureFn', function(n, o){
				if(null != scope.configureFn){
					scope.configureFn({ line: line });
				}
			});

			scope.$watch('pointHoverFn', function(n, o) {
				if (null != scope.pointHoverFn) {
					line.pointHover(scope.pointHoverFn);
				}
			});

			scope.$watch('legendFn', function(n, o) {
				if (null != scope.legendFn) {
					line.legendFn(scope.legendFn);
				}
			});

			scope.$watchCollection('model', function(n, o){
				if(null == o && null == n){ return; }

				line.data(n, scope.resetYAxisMax);
				line.resize();
				redraw();
			});

			scope.$watchCollection('axes', function(n, o) {
				if(null == o && null == n){ return; }

				line.axes(n);
				redraw();
			});

			scope.$watchCollection('markers', function(n, o){
				if(null == o && null == n){ return; }

				line.markers(n);
				redraw();
			});

			scope.$watchCollection('yExtent', function(n, o){
				if(null == o && null == n){ return; }

				line.yExtent().overrideValue(n);
				redraw();
			});

			scope.$watchCollection('xExtent', function(n, o){
				if(null == o && null == n){ return; }

				line.xExtent().overrideValue(n);
				redraw();
			});

			scope.$watch('duration', function(n, o){
				if(null == o && null == n){ return; }

				line.duration(n);
			}, true);

			scope.$watch('api', function(n, o) {
				if(null != scope.api) {
					scope.api.start = line.start;
					scope.api.stop = line.stop;
					scope.api.restart = line.restart;
					scope.api.redraw = line.redraw;
					scope.api.resize = doResize;
				}
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
					line.redraw();
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
				var parentHeight = rawElement.attributes.height | rawElement.style.height | rawElement.clientHeight;

				// Calculate the new width/height based on the parent and the resize size
				var width = (resizeWidth)? parentWidth - attrs.sentioResizeWidth : undefined;
				var height = (resizeHeight)? parentHeight - attrs.sentioResizeHeight : undefined;

				// Reapply the old overflow setting
				body.style.overflow = overflow;

				$log.debug('resize rt.line height: ' + height + ' width: ' + width);

				// Apply the new width and height
				if(resizeWidth){ line.width(width); }
				if(resizeHeight){ line.height(height); }

				line.resize();
				redraw();
			};
			var delayResize = function(){
				if(undefined !== resizeTimer){
					$timeout.cancel(resizeTimer);
				}
				resizeTimer = $timeout(doResize, 200);
			};

			if(resizeWidth || resizeHeight){
				window.on('resize', delayResize);
				delayResize();
			}
			scope.$on('$destroy', function () {
				window.off('resize', delayResize);
			});
		}
	};
}]);