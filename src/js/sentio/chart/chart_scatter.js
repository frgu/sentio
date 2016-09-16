sentio.chart.scatterLine = sentio_chart_scatter_line;
function sentio_chart_scatter_line() {
	'use strict';

	// Layout properties
	var _id = 'scatter_line' + Date.now();
	var _margin = { top: 20, right: 20, bottom: 20, left: 20 };
	var _width = 500;
	var _height = 500;

	// Default scales for x and y dimensions
	var _scale = {
		x: d3.scale.linear(),
		y: d3.scale.linear(),
		color: d3.scale.category10()
	};

	// Accessor functions for points
	var _pointValue = {
		id: function(d) { return d[0]; },
		x: function(d) { return d[1]; },
		y: function(d) { return d[2]; },
		group: function(d) { return d[3]; },
		label: function(d) { return d[4]; }
	};

	// Extents
	var _extent = {
		x: sentio.util.extent({
			defaultValue: [-100, 100],
			getValue: function(d) { return _pointValue.x(d); }
		}),
		y: sentio.util.extent({
			defaultValue: [-100, 100],
			getValue: function(d) { return _pointValue.y(d); }
		})
	};

	var _axis = {
		x: d3.svg.axis()
			.scale(_scale.x)
			.orient('bottom')
			.innerTickSize(-_height)
			.ticks(5),
		y: d3.svg.axis()
			.scale(_scale.y)
			.orient('left')
			.innerTickSize(-_width)
			.ticks(5)
	};

	// elements
	var _element = {
		div: undefined,
		svg: undefined,
		g: {
			xAxis: undefined,
			yAxis: undefined,
			tooltip: undefined,
			points: undefined,
			pointFocus: {
				g: undefined,
				x: undefined,
				y: undefined
			}
		}
	};

	var _data = [];

	// Chart create/init method
	function _instance(selection){}

	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container){
		// Create the DIV element
		_element.div = container.append('div').attr('class', 'sentio scatter-line');

		_element.svg = _element.div.append('svg');

		_element.g.container = _element.svg.append('g');

		_element.g.xAxis = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.yAxis = _element.g.container.append('g').attr('class', 'y axis');

		_element.g.points = _element.g.container.append('g').attr('class', 'points');

		_element.g.pointFocus.g = _element.g.container.append('g')
			.attr('class', 'point-focus');
		_element.g.pointFocus.x = _element.g.pointFocus.g.append('line')
			.attr('stroke-width', '1')
			.attr('x1', '0' );
		_element.g.pointFocus.y = _element.g.pointFocus.g.append('line')
			.attr('stroke-width', '1')
			.attr('y1', _height - _margin.top - _margin.bottom + 5); // Dunno why this needs a 5

		_element.g.tooltip = _element.div.append('div').attr('class', 'tooltip');

		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _data; }
		_data = v || [];

		return _instance;
	};

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		// Set up the x scale (y is fixed)
		_scale.x.range([0, _width - _margin.right - _margin.left]);
		_scale.y.range([_height - _margin.bottom - _margin.top, 0]);

		_element.svg.attr('width', _width).attr('height', _height);

		_element.g.xAxis.attr('transform', 'translate(0,' + _scale.y.range()[0] + ')');

		_element.g.container.attr('transform', 'translate('+_margin.left+','+_margin.top+')');

		return _instance;
	};

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		var xDomain = _extent.x.getExtent(_data);
		xDomain[0] -= Math.ceil((xDomain[1] - xDomain[0]) * 0.1);
		xDomain[1] += Math.ceil((xDomain[1] - xDomain[0]) * 0.1);
		_scale.x.domain(xDomain);

		var yDomain = _extent.y.getExtent(_data);
		yDomain[0] -= Math.ceil((yDomain[1] - yDomain[0]) * 0.1);
		yDomain[1] += Math.ceil((yDomain[1] - yDomain[0]) * 0.1);
		_scale.y.domain(yDomain);

		updateAxes();
		updatePoints();

		return _instance;
	};

	function updateAxes() {
		// Update actual Axes
		_axis.x = _axis.x.innerTickSize(-(_height - _margin.top - _margin.bottom));
		_axis.y = _axis.y.innerTickSize(-(_width - _margin.left - _margin.right));

		if (null != _axis.x) {
			_element.g.xAxis.transition()
				.call(_axis.x)
				.selectAll('text')
				.attr('y', 10);
		}
		if (null != _axis.y) {
			_element.g.yAxis.transition()
				.call(_axis.y)
				.selectAll('text')
				.attr('x', -10);
		}

		// Update point ticks on x axis
		var xAxisTickJoin = _element.g.xAxis
			.selectAll('.point-x-tick')
			.data(_data, function(d) { return _pointValue.id(d); });

		var xAxisTickEnter = xAxisTickJoin.enter().append('line');

		xAxisTickEnter
			.attr('class', 'point-x-tick')
			.attr('opacity', '1')
			.attr('y1', 0)
			.attr('y2', 6)
			.attr('stroke-width', '1')
			.attr('stroke', function(d) { return _scale.color(_pointValue.group(d)); });

		xAxisTickJoin.transition()
			.attr('x1', function(d) { return _scale.x(_pointValue.x(d)); })
			.attr('x2', function(d) { return _scale.x(_pointValue.x(d)); });

		xAxisTickJoin.exit().remove();


		// Update point ticks on y axis
		var yAxisTickJoin = _element.g.yAxis
			.selectAll('.point-y-tick')
			.data(_data, function(d) { return _pointValue.id(d); });

		var yAxisTickEnter = yAxisTickJoin.enter().append('line');

		yAxisTickEnter
			.attr('class', 'point-y-tick')
			.attr('opacity', '1')
			.attr('x1', -6)
			.attr('x2', 0)
			.attr('stroke-width', '1')
			.attr('stroke', function(d) { return _scale.color(_pointValue.group(d)); });

		yAxisTickJoin.transition()
			.attr('y1', function(d) { return _scale.y(_pointValue.y(d)); })
			.attr('y2', function(d) { return _scale.y(_pointValue.y(d)); });

		yAxisTickJoin.exit().remove();
	}

	function handlePointEnter(d) {
		// Hide other points
		_element.g.points.selectAll('.point')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '0.2');

		// Hide ticks for other points
		_element.g.xAxis.selectAll('.point-x-tick')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '0.2');
		_element.g.yAxis.selectAll('.point-y-tick')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '0.2');

		// Move and show point focus lines
		_element.g.pointFocus.x.transition().duration(100)
			.attr('opacity', '0.4')
			.attr('x2', _scale.x(_pointValue.x(d)) )
			.attr('y1', _scale.y(_pointValue.y(d)) )
			.attr('y2', _scale.y(_pointValue.y(d)) )
			.attr('stroke', _scale.color(_pointValue.group(d)) );
		_element.g.pointFocus.y.transition().duration(100)
			.attr('opacity', '0.4')
			.attr('x1', _scale.x(_pointValue.x(d)) )
			.attr('x2', _scale.x(_pointValue.x(d)) )
			.attr('y2', _scale.y(_pointValue.y(d)) )
			.attr('stroke', _scale.color(_pointValue.group(d)) );

		// Move and show tooltip
		_element.g.tooltip
	}

	function handlePointExit(d) {
		_element.g.points.selectAll('.point')
			.transition().duration(100)
			.attr('opacity', '1');

		_element.g.xAxis.selectAll('.point-x-tick')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '1');
		_element.g.yAxis.selectAll('.point-y-tick')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '1');

		_element.g.pointFocus.x.transition().duration(100)
			.attr('opacity', '0');
		_element.g.pointFocus.y.transition().duration(100)
			.attr('opacity', '0');

	}

	function updatePoints() {
		var pointJoin = _element.g.points
			.selectAll('.point')
			.data(_data, function(d) { return _pointValue.id(d); });

		var pointEnter = pointJoin.enter().append('g')
			.attr('class', 'point')
			.attr('opacity', '1')
			.on('mouseover', handlePointEnter)
			.on('mouseleave', handlePointExit);

		var circleEnter = pointEnter.append('circle');
		var circleUpdate = pointJoin.select('circle');

		circleEnter
			.attr('r', '5')
			.attr('fill', function(d) { return _scale.color(_pointValue.group(d)); })
			.attr('fill-opacity', '0.5')
			.attr('stroke', function(d) { return d3.rgb(_scale.color(_pointValue.group(d))).brighter(); })
			.attr('stroke-width', '1');

		circleUpdate.transition()
			.attr('cx', function(d) { return _scale.x(_pointValue.x(d)); })
			.attr('cy', function(d) { return _scale.y(_pointValue.y(d)); });

		pointJoin.exit().remove();
	}

	// Basic Getters/Setters
	_instance.width = function(v) {
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v) {
		if(!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};

	return _instance;

}