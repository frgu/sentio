angular.module('sentio').directive('sentioChordDiagram', ['$document', '$window', '$timeout', '$log',
function($document, $window, $timeout, $log) {
	'use strict';

	return {
		restrict: 'A',
		scope: {
			model: '=sentioModel'
		},
		replace: false,
		link: function(scope, element, attrs, controller) {
			var chordElement = d3.select(element[0]);
			var chord = sentio.chord.basic();

			chord.init(chordElement);

			scope.$watch('model', function(n, o) {
				if(null == o && null == n){ return; }

				chord.data(n);

				chord.redraw();
				// redraw();
			});
		}
	};
}]);