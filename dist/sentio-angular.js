/*! sentio Version: 0.7.7 */
angular.module('sentio', []);
angular.module('sentio.realtime', []);
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
angular.module('sentio').directive('sentioChordDiagram', ['$document', '$window', '$timeout', '$log',
function($document, $window, $timeout, $log) {
	'use strict';

	return {
		restrict: 'A',
		scope: {
			model: '=sentioModel',
			resizeWidth: '@sentioResizeWidth',
			resizeHeight: '@sentioResizeHeight'
		},
		replace: false,
		link: function(scope, element, attrs, controller) {
			var chordElement = d3.select(element[0]);
			var chord = sentio.chord.basic();

			// Extract the width of the chart
			var width = element[0].style.width;
			if(null != width && '' !== width) {
				width = parseFloat(width.substring(0, width.length-2));
				if(null != width && !isNaN(width)) {
					chord.width(width);
					// set height to match width in this case to keep the donut round
					chord.height(width);
				}
			}

			chord.init(chordElement);

			scope.$watch('model', function(n, o) {
				if(null == o && null == n){ return; }

				chord.data(n);

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
					chord.redraw();
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

				// Calculate the new width based on the parent and the resize size
				var width = (resizeWidth)? parentWidth - attrs.sentioResizeWidth : undefined;

				// Set height to match width to keep donut round
				var height = width;

				// Reapply the old overflow setting
				body.style.overflow = overflow;

				// Get the old widths and heights
				var oldHeight = chord.height();
				var oldWidth = chord.width();

				if (height !== oldHeight || width !== oldWidth) {
					$log.debug('resize donut.chart width: ' + width);
					$log.debug('resize donut.chart height: ' + height);

					// Apply the new height
					if(resizeHeight){ chord.height(height);}
					// Apply the new width
					if(resizeWidth){ chord.width(width); }
					chord.resize();
					redraw();
				} else {
					$log.debug('resize donut.chart width unchanged: ' + width);
					$log.debug('resize donut.chart height unchanged: ' + height);
				}
			};
			var delayResize = function(){
				if(undefined !== resizeTimer){
					$timeout.cancel(resizeTimer);
				}
				resizeTimer = $timeout(doResize, 0);
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
angular.module('sentio').directive('sentioDonutChart', [ '$document', '$window', '$timeout', '$log',
	function($document, $window, $timeout, $log) {
		'use strict';

		return {
			restrict : 'A',
			scope : {
				model: '=sentioModel',
				duration: '=sentioDuration',
				color: '=sentioColor',
				api: '=sentioApi',
				resizeWidth: '@sentioResizeWidth',
				resizeHeight: '@sentioResizeHeight',
				configureFn: '&sentioConfigureFn'
			},
			replace : false,
			link : function(scope, element, attrs, controller) {

				var chartElement = d3.select(element[0]);
				var chart = sentio.chart.donut();

				// Extract the width of the chart
				var width = element[0].style.width;
				if(null != width && '' !== width) {
					width = parseFloat(width.substring(0, width.length-2));
					if(null != width && !isNaN(width)) {
						chart.width(width);
						// set height to match width in this case to keep the donut round
						chart.height(width);
					}
				}


				chart.init(chartElement);

				scope.$watchCollection('model', function(n, o){
					if(null == o && null == n){ return; }

					chart.data(n);
					redraw();
				});


				scope.$watch('configureFn', function(n, o){
					if(null != scope.configureFn){
						scope.configureFn({ chart: chart });
					}
				});

				scope.$watch('duration', function(n, o){
					if(null == o && null == n){ return; }

					chart.duration(n);
				});

				scope.$watch('colorScale', function(n, o){
					if(null == o && null == n){ return; }

					chart.duration(n);
				}, true);

				scope.$watch('api', function(n, o) {
					if(null != scope.api) {
						scope.api.redraw = chart.redraw;
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

					// Calculate the new width based on the parent and the resize size
					var width = (resizeWidth)? parentWidth - attrs.sentioResizeWidth : undefined;

					// Set height to match width to keep donut round
					var height = width;

					// Reapply the old overflow setting
					body.style.overflow = overflow;

					// Get the old widths and heights
					var oldHeight = chart.height();
					var oldWidth = chart.width();

					if (height !== oldHeight || width !== oldWidth) {
						$log.debug('resize donut.chart width: ' + width);
						$log.debug('resize donut.chart height: ' + height);

						// Apply the new height
						if(resizeHeight){ chart.height(height);}
						// Apply the new width
						if(resizeWidth){ chart.width(width); }
						chart.resize();
						redraw();
					} else {
						$log.debug('resize donut.chart width unchanged: ' + width);
						$log.debug('resize donut.chart height unchanged: ' + height);
					}
				};
				var delayResize = function(){
					if(undefined !== resizeTimer){
						$timeout.cancel(resizeTimer);
					}
					resizeTimer = $timeout(doResize, 0);
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

angular.module('sentio').directive('sentioGanttChart', ['$document', '$window', '$timeout', '$log',
function($document, $window, $timeout, $log) {
	'use strict';

	return {
		restrict: 'A',
		scope: {
			model: '=sentioModel',
			resizeWidth: '@sentioResizeWidth',
			resizeHeight: '@sentioResizeHeight',
			configureFn: '&sentioConfigureFn',
			colorScale: '=sentioColorScale',
			dateRange: '=sentioDateRange'
		},
		replace: false,
		link: function(scope, element, attrs, controller) {

			var chartElement = d3.select(element[0]);
			var chart = sentio.chart.gantt();

			// Extract the width of the chart
			var width = element[0].style.width;
			if(null != width && '' !== width) { 
				width = parseFloat(width.substring(0, width.length-2));
				if(null != width && !isNaN(width)) { chart.width(width); }
			}

			chart.init(chartElement);

			scope.$watch('configureFn', function(n, o){
				if(null != scope.configureFn){
					scope.configureFn({ chart: chart });
				}
			});

			scope.$watchCollection('model', function(n, o){
				if(null == o && null == n){ return; }

				chart.data(n);
				delayResize();
			});

			scope.$watch('colorScale', function(n, o) {
				if(null == o && null == n){ return; }

				chart.colorScale(n);
				redraw();
			});

			scope.$watchCollection('dateRange', function(n, o) {
				if(null == o && null == n) { return; }
				chart.dateRange(n);
				delayResize();
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

				// Calculate the new width based on the parent and the resize size
				var width = (resizeWidth)? parentWidth - attrs.sentioResizeWidth : undefined;

				// Reapply the old overflow setting
				body.style.overflow = overflow;

				$log.debug('resize verticalBars.chart width: ' + width);

				// Apply the new width
				if(resizeWidth){ chart.width(width); }

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
angular.module('sentio').directive('sentioMatrixChart', [ '$document', '$window', '$timeout', '$log',
	function($document, $window, $timeout, $log) {
		'use strict';

		return {
			restrict : 'A',
			scope : {
				model: '=sentioModel',
				configureFn: '&sentioConfigureFn'
			},
			replace : false,
			link : function(scope, element, attrs, controller) {

				var chartElement = d3.select(element[0]);
				var chart = sentio.chart.matrix();

				chart.init(chartElement);

				scope.$watch('configureFn', function(n, o){
					if(null != scope.configureFn){
						scope.configureFn({ chart: chart });
					}
				});

				scope.$watchCollection('model', function(n, o){
					if(null == o && null == n){ return; }

					chart.data(n);
					redraw();
				});

				// Redraw (we don't support resize on the matrix)
				var redrawTimer;

				// Do the redraw only once when the $digest cycle has completed
				var redraw = function() {
					if (null != redrawTimer) {
						$timeout.cancel(redrawTimer);
					}
					redrawTimer = $timeout(function () {
						chart.redraw();
					}, 0);
				};

				scope.$on('$destroy', function () {
					if(null != redrawTimer) {
						$timeout.cancel(redrawTimer);
					}
				});
			}
		};
	}]);

angular.module('sentio.realtime').directive('sentioRtTimeline', [ '$document', '$window', '$timeout', '$log', 
function($document, $window, $timeout, $log) {
	'use strict';

	return {
		restrict : 'A',
		scope : {
			model: '=sentioModel',
			markers: '=sentioMarkers',
			markerHover: '=sentioMarkerHover',
			interval: '=sentioInterval',
			delay: '=sentioDelay',
			yExtent: '=sentioYExtent',
			fps: '=sentioFps',
			api: '=sentioApi',
			resizeWidth: '@sentioResizeWidth',
			resizeHeight: '@sentioResizeHeight',
			configure: '&sentioConfigureFn'
		},
		replace : false,
		link : function(scope, element, attrs, controller) {
			var timelineElement = d3.select(element[0]);
			var timeline = sentio.realtime.timeline();

			// Extract the height and width of the chart
			var width = element[0].style.width;
			if(null != width && '' !== width) { 
				width = parseFloat(width.substring(0, width.length-2));
				if(null != width && !isNaN(width)) { timeline.width(width); }
			}
			var height = element[0].style.height;
			if(null != height && '' !== height) {
				height = parseFloat(height.substring(0, height.length-2));
				if(null != height && !isNaN(height)) { timeline.height(height); }
			}

			timeline.init(timelineElement).data([]).start();

			// setup the marker callback method if one was provided
			if(null != scope.markerHover) {
				timeline.markerHover( scope.markerHover );
			}

			scope.$watch('configure', function(n, o){
				if(null != scope.configure){
					scope.configure({ timeline: timeline });
					timeline.redraw();
				}
			});

			// Only want to watch when the collection object changes
			scope.$watch('model', function(n, o){
				if(null == o && null == n){ return; }

				timeline.data(n).redraw();
			});

			// Only want to watch when the collection object changes
			scope.$watch('markers', function(n, o){
				if(null == o && null == n){ return; }

				timeline.markers(n).redraw();
			});

			scope.$watch('interval', function(n, o){
				if(null == o && null == n){ return; }

				timeline.interval(n).redraw();
			});

			scope.$watch('delay', function(n, o){
				if(null == o && null == n){ return; }

				timeline.delay(n).redraw();
			});

			scope.$watchCollection('yExtent', function(n, o){
				if(null == o && null == n){ return; }

				timeline.yExtent().overrideValue(n);
				timeline.redraw();
			});

			scope.$watch('fps', function(n, o){
				if(null == o && null == n){ return; }

				timeline.fps(n).redraw();
			});

			scope.$watch('api', function(n, o) {
				if(null != scope.api) {
					scope.api.start = timeline.start;
					scope.api.stop = timeline.stop;
					scope.api.restart = timeline.restart;
					scope.api.redraw = timeline.redraw;
					scope.api.resize = doResize;
				}
			});

			// Manage resizing the chart
			var resizeWidth = (null != attrs.sentioResizeWidth);
			var resizeHeight = (null != attrs.sentioResizeHeight);
			var resizeTimer;
			var window = angular.element($window);

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

				$log.debug('resize rt.timeline height: ' + height + ' width: ' + width);

				// Apply the new width and height
				if(resizeWidth){ timeline.width(width); }
				if(resizeHeight){ timeline.height(height); }

				timeline.resize().redraw();
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
			scope.$on('$destroy', function() {
				timeline.stop();
			});
		}
	};
}]);

angular.module('sentio').directive('sentioSankeyDiagram', ['$document', '$window', '$timeout', '$log',
function($document, $window, $timeout, $log) {'use strict';

	return {
		restrict : 'A',
		scope : {
			model: '=sentioModel',
			resizeWidth: '@sentioResizeWidth',
			configureFn: '&sentioConfigureFn',
			direction: '=sentioDirection'
		},
		replace : false,
		link : function(scope, element, attrs, controller) {
			var sankeyElement = d3.select(element[0]);
			var sankey = sentio.sankey.basic();

			sankey.init(sankeyElement);

			scope.$watch('direction', function(n, o) {
				if (null == o && null == n) { return; }
				sankey.direction(n);
				delayResize();
				sankey.redraw();
			});

			scope.$watchCollection('model', function(n, o){
				if(null == o && null == n){ return; }
				sankey.model(n);
				sankey.redraw();
			});

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
angular.module('sentio').directive('sentioTimeline', [ '$document', '$window', '$timeout', '$log', 
function($document, $window, $timeout, $log) {
	'use strict';

	return {
		restrict : 'A',
		scope : {
			model: '=sentioModel',
			markers: '=sentioMarkers',
			yExtent: '=sentioYExtent',
			xExtent: '=sentioXExtent',
			duration: '=sentioDuration',
			api: '=sentioApi',
			resizeWidth: '@sentioResizeWidth',
			resizeHeight: '@sentioResizeHeight',
			configureFn: '&sentioConfigureFn',
			filterFn: '&sentioFilterFn',
			filterState: '=sentioFilterState'
		},
		replace : false,
		link : function(scope, element, attrs, controller) {

			var timelineElement = d3.select(element[0]);
			var timeline = sentio.timeline.line();

			// Extract the height and width of the chart
			var width = element[0].style.width;
			if(null != width && '' !== width) { 
				width = parseFloat(width.substring(0, width.length-2));
				if(null != width && !isNaN(width)) { timeline.width(width); }
			}
			var height = element[0].style.height;
			if(null != height && '' !== height) {
				height = parseFloat(height.substring(0, height.length-2));
				if(null != height && !isNaN(height)) { timeline.height(height); }
			}

			// Check to see if filtering is enabled
			if (null != attrs.sentioFilterFn || attrs.sentioFilterState) {
				timeline.filter(true);
			}

			// Store the filter state outside the scope as well as inside, to compare
			var lastFilterState = null;

			scope.$watch('filterFn', function(n, o){
				timeline.filter().on('filterend', function(filterState){
					$timeout(function(){
						// Call the function callback
						scope.filterFn({ filterState: filterState });

						// Set the two-way-bound scope parameter
						scope.filterState = filterState;

						// Store the filter state locally so we can suppress updates on our own changes
						lastFilterState = filterState;
					});
				});
			});
			scope.$watch('filterState', function(n, o) {
				// If a filter was passed in and it is not the one we just set, do some updates
				if (null != n && n !== lastFilterState) {

					// If we're in the original format with 3 parameters, use the second two only
					// TODO: We should go ahead and get rid of the 3 parameter style
					if (n.length > 2) {
						// The first element indicates if we're disabled
						if (n[0]) {
							return;
						}
						n = n.slice(1, 3);
					}
					timeline.setFilter(n);
				}
			});

			timeline.init(timelineElement);

			scope.$watch('configureFn', function(n, o){
				if(null != scope.configureFn){
					scope.configureFn({ timeline: timeline });
				}
			});

			scope.$watchCollection('model', function(n, o){
				if(null == o && null == n){ return; }

				timeline.data(n);
				redraw();
			});

			scope.$watchCollection('markers', function(n, o){
				if(null == o && null == n){ return; }

				timeline.markers(n);
				redraw();
			});

			scope.$watchCollection('yExtent', function(n, o){
				if(null == o && null == n){ return; }

				timeline.yExtent().overrideValue(n);
				redraw();
			});

			scope.$watchCollection('xExtent', function(n, o){
				if(null == o && null == n){ return; }

				timeline.xExtent().overrideValue(n);
				redraw();
			});

			scope.$watch('duration', function(n, o){
				if(null == o && null == n){ return; }

				timeline.duration(n);
			}, true);

			scope.$watch('api', function(n, o) {
				if(null != scope.api) {
					scope.api.start = timeline.start;
					scope.api.stop = timeline.stop;
					scope.api.restart = timeline.restart;
					scope.api.redraw = timeline.redraw;
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
					timeline.redraw();
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

				$log.debug('resize rt.timeline height: ' + height + ' width: ' + width);

				// Apply the new width and height
				if(resizeWidth){ timeline.width(width); }
				if(resizeHeight){ timeline.height(height); }

				timeline.resize();
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

angular.module('sentio').directive('sentioVerticalBarChart', [ '$document', '$window', '$timeout', '$log', 
function($document, $window, $timeout, $log) {
	'use strict';

	return {
		restrict : 'A',
		scope : {
			model: '=sentioModel',
			widthExtent: '=sentioWidthExtent',
			duration: '=sentioDuration',
			api: '=sentioApi',
			resizeWidth: '@sentioResizeWidth',
			configureFn: '&sentioConfigureFn'
		},
		replace : false,
		link : function(scope, element, attrs, controller) {

			var chartElement = d3.select(element[0]);
			var chart = sentio.chart.verticalBars();

			// Extract the width of the chart
			var width = element[0].style.width;
			if(null != width && '' !== width) { 
				width = parseFloat(width.substring(0, width.length-2));
				if(null != width && !isNaN(width)) { chart.width(width); }
			}

			chart.init(chartElement);

			scope.$watch('configureFn', function(n, o){
				if(null != scope.configureFn){
					scope.configureFn({ chart: chart });
				}
			});

			scope.$watchCollection('model', function(n, o){
				if(null == o && null == n){ return; }

				chart.data(n);
				redraw();
			});

			scope.$watchCollection('widthExtent', function(n, o){
				if(null == o && null == n){ return; }

				chart.widthExtent().overrideValue(n);
				redraw();
			});

			scope.$watch('duration', function(n, o){
				if(null == o && null == n){ return; }

				chart.duration(n);
			}, true);

			scope.$watch('api', function(n, o) {
				if(null != scope.api) {
					scope.api.value = chart.value;
					scope.api.label = chart.label;
					scope.api.key = chart.key;
					scope.api.dispatch = chart.dispatch;
					scope.api.redraw = chart.redraw;
					scope.api.resize = doResize;
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

				// Calculate the new width based on the parent and the resize size
				var width = (resizeWidth)? parentWidth - attrs.sentioResizeWidth : undefined;

				// Reapply the old overflow setting
				body.style.overflow = overflow;

				$log.debug('resize verticalBars.chart width: ' + width);

				// Apply the new width
				if(resizeWidth){ chart.width(width); }

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
