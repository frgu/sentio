angular.module('sentio').directive('sentioSankeyDiagram', ['$document', '$window', '$timeout', '$log',
function($document, $window, $timeout, $log) {'use strict';

	return {
		restrict : 'A',
		scope : {
			model: '=sentioModel'
		},
		replace : false,
		link : function(scope, element, attrs, controller) {
			var sankeyElement = d3.select(element[0]);
			var sankey = sentio.sankey.basic();

			// Extract the height and width of the chart
			var width = element[0].style.width;
			if(null != width && '' !== width) { 
				width = parseFloat(width.substring(0, width.length-2));
				// if(null != width && !isNaN(width)) { line.width(width); }
			}
			var height = element[0].style.height;
			if(null != height && '' !== height) {
				height = parseFloat(height.substring(0, height.length-2));
				// if(null != height && !isNaN(height)) { line.height(height); }
			}
			sankey.init(sankeyElement);

			scope.$watchCollection('model', function(n, o){
				if(null == o && null == n){ return; }
				sankey.model(n);
				sankey.redraw();
			});
		}
	};

}]);