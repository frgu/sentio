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

				// chord.redraw();
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