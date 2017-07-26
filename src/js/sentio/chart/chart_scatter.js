sentio.chart.scatter = sentio_chart_scatter;
function sentio_chart_scatter() {
	'use strict';
	
	var _id = 'scatter_' + Date.now();

	var _layout = {
		margin: { top: 50, right: 50, bottom: 50, left: 50 },
		width: 600,
		height: 600
	};

	var _config = {
		paddingRatio: 0.05,
		tickCount: 10
	};

	var _data = [[]];
	var _lineData = [];

	var _scale = {
		x: d3.scale.linear(),
		y: d3.scale.linear(),
		color: d3.scale.category10()
	};

	var _dispatch = d3.dispatch('onmouseover', 'onmouseout', 'onclick');

	var _pointValue = {
		id: function(d) { return d[0]; },
		x: function(d) { return d[1]; },
		y: function(d) { return d[2]; }
	};

	var _lineValue = {
		x: function(d) { return d[0]; },
		y: function(d) { return d[1]; }
	};

	var _extent = {
		x: sentio.util.extent({
			defaultValue: [0, 100],
			getValue: function(d) { return _pointValue.x(d); }
		}),
		y: sentio.util.extent({
			defaultValue: [0, 100],
			getValue: function(d) { return _pointValue.y(d); }
		})
	};
	var _multiExtent = sentio.util.multiExtent().values(function(d) { return d; });

	var _axis = {
		x: d3.svg.axis()
			.scale(_scale.x)
			.orient('bottom')
			.innerTickSize(-_layout.height)
			.ticks(_config.tickCount),
		y: d3.svg.axis()
			.scale(_scale.y)
			.orient('left')
			.innerTickSize(-_layout.width)
			.ticks(_config.tickCount),
		labels: ['',''] // Default empty axis labels
	};

	var _line = d3.svg.line().interpolate('basis');
	_line.x(function(d) { return _scale.x(_lineValue.x(d)); });
	_line.y(function(d) { return _scale.y(_lineValue.y(d)); });

	var _element = {
		div: undefined,
		svg: undefined,
		g: {
			container: undefined,
			axis: {
				x: undefined,
				xLabel: undefined,
				y: undefined,
				yLabel: undefined
			},
			lines: undefined,
			points: undefined
		}
	};

	var _fn = {
		multiExtent: function(data, extent) {
			return _multiExtent.extent(extent).getExtent(data);
		},
		onMouseOver: function(d, i, j) {
			_element.g.points.select('#id_'+_pointValue.id(d)).transition()
					.attr('r', '10')
					.attr('fill-opacity', '1');
			_element.g.axis.x.select('#id_'+_pointValue.id(d)).transition()
					.attr('stroke-width', '2')
					.attr('y2', '10');
			_element.g.axis.y.select('#id_'+_pointValue.id(d)).transition()
					.attr('stroke-width', '2')
					.attr('x1', '-10');
			
			_dispatch.onmouseover(d, i, j, this);
		},
		onMouseOut: function(d, i, j) {
			_element.g.points.select('#id_'+_pointValue.id(d)).transition()
					.attr('r', '5')
					.attr('fill-opacity', '0.5');
			_element.g.axis.x.select('#id_'+_pointValue.id(d)).transition()
					.attr('stroke-width', '1')
					.attr('y2', '6');
			_element.g.axis.y.select('#id_'+_pointValue.id(d)).transition()
					.attr('stroke-width', '1')
					.attr('x1', '-6');
			_dispatch.onmouseout(d, i, j, this);
		},
		onClick: function(d, i, j) {
			_dispatch.onclick(d, i, j, this);
		}
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio scatter');

		_element.svg = _element.div.append('svg');

		_element.g.container = _element.svg.append('g');

		_element.g.axis.x = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.axis.xLabel = _element.g.container.append('text').attr('class', 'scatter-axis-label').attr('text-anchor', 'end');
		_element.g.axis.y = _element.g.container.append('g').attr('class', 'y axis');
		_element.g.axis.yLabel = _element.g.container.append('text').attr('class', 'scatter-axis-label')
				.attr('text-anchor', 'end')
				.attr('x', -10).attr('y', 15)
				.attr('transform', 'rotate(-90)');

		_element.g.lines = _element.g.container.append('g').attr('class', 'lines');

		_element.g.points = _element.g.container.append('g').attr('class', 'point-groups');

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.svg.attr('width', _layout.width).attr('height', _layout.height);

		_scale.x.range([0, _layout.width - _layout.margin.right - _layout.margin.left]);
		_scale.y.range([_layout.height - _layout.margin.top - _layout.margin.bottom, 0]);

		_element.g.axis.x.attr('transform', 'translate(0,' + _scale.y.range()[0] + ')');

		_element.g.container.attr('transform', 'translate(' + _layout.margin.left + ',' + _layout.margin.top + ')');

		_axis.x.innerTickSize(-(_layout.height - _layout.margin.top - _layout.margin.bottom));
		_axis.y.innerTickSize(-(_layout.width - _layout.margin.left - _layout.margin.right));

		return _instance;
	};

	function updateTicks(axis) {
		var ticksJoin = _element.g.axis[axis]
				.selectAll('.point-ticks')
				.data(_data);

		ticksJoin.enter().append('g')
				.attr('class', 'point-ticks');

		var tickJoin = ticksJoin
				.selectAll('.point-tick')
				.data(function(d) { return d; });

		tickJoin.enter().append('line')
				.attr('class', 'point-tick')
				.attr('id', function(d) { return 'id_' + _pointValue.id(d); })
				.attr('stroke-width', '1');
		
		tickJoin.transition()
				.attr('y1', function(d) { return axis === 'x' ? 0 : _scale.y(_pointValue.y(d)); })
				.attr('y2', function(d) { return axis === 'x' ? 6 : _scale.y(_pointValue.y(d)); })
				.attr('x1', function(d) { return axis === 'y' ? -6 : _scale.x(_pointValue.x(d)); })
				.attr('x2', function(d) { return axis === 'y' ? 0 : _scale.x(_pointValue.x(d)); })
				.attr('stroke', function(d, i, j) { return _scale.color(j); });

		tickJoin.exit().remove();
		ticksJoin.exit().remove();
	}

	function updateAxes() {
		_element.g.axis.xLabel.transition()
				.attr('x', _layout.width - _layout.margin.left - _layout.margin.right - 10)
				.attr('y', _layout.height - _layout.margin.top - _layout.margin.bottom - 10)
				.text(_axis.labels[0]);

		_element.g.axis.yLabel.transition()
				.text(_axis.labels[1]);

		if (null != _axis.x) {
			_element.g.axis.x.transition()
					.call(_axis.x).selectAll('text')
					.attr('y', 10);
		}

		if (null != _axis.y) {
			_element.g.axis.y.transition()
					.call(_axis.y).selectAll('text')
					.attr('x', -10);
		}

		updateTicks('x');
		updateTicks('y');
	}

	function updatePoints() {
		var pointsJoin = _element.g.points
				.selectAll('.points')
				.data(_data);
		
		pointsJoin.enter().append('g')
				.attr('class', 'points');

		var pointJoin = pointsJoin
				.selectAll('.point')
				.data(function(d) { return d; });

		pointJoin.enter().append('circle')
				.attr('class', 'point')
				.attr('r', '5')
				.attr('fill-opacity', '0.5')
				.attr('stroke-width', '1')
				.on('mouseover', _fn.onMouseOver)
				.on('mouseout', _fn.onMouseOut)
				.on('click', _fn.onClick);

		pointJoin.transition()
				.attr('id', function(d) { return 'id_' + _pointValue.id(d); })
				.attr('cx', function(d) { return _scale.x(_pointValue.x(d)); })
				.attr('cy', function(d) { return _scale.y(_pointValue.y(d)); })
				.attr('fill', function(d, i, j) { return _scale.color(j); })
				.attr('stroke', function(d, i, j) { return _scale.color(j); });
		
		pointJoin.exit().remove();

		pointsJoin.exit().remove();
	}

	function updateLines() {
		var lineJoin = _element.g.lines
				.selectAll('.line')
				.data(_lineData);

		lineJoin.enter().append('path')
				.attr('class', 'line')
				.attr('stroke-width', '2px')
				.attr('fill-opacity', '0');

		lineJoin.transition()
				.attr('stroke', function(d, i) { return _scale.color(i); })
				.attr('d', function(d) { return _line(d); });

		lineJoin.exit().remove();
	}

	_instance.redraw = function() {

		var xDomain = _fn.multiExtent(_data, _extent.x);
		var xBuffer = Math.ceil((xDomain[1] - xDomain[0] - 1) * _config.paddingRatio);
		xDomain = [xDomain[0]-xBuffer, xDomain[1]+xBuffer];
		var yDomain = _fn.multiExtent(_data, _extent.y);
		var yBuffer = Math.ceil((yDomain[1] - yDomain[0] - 1) * _config.paddingRatio);
		yDomain = [yDomain[0]-yBuffer, yDomain[1]+yBuffer];

		_scale.x.domain(xDomain);
		_scale.y.domain(yDomain);

		updateAxes();
		updatePoints();
		updateLines();

		return _instance;
	};

	_instance.data = function(d) {
		if(!arguments.length) { return _data; }
		_data = d;
		return _instance;
	};
	_instance.lineData = function(d) {
		if(!arguments.length) { return _lineData; }
		_lineData = d;
		return _instance;
	};
	_instance.axes = function(a) {
		if(!arguments.length) { return _axis.labels; }
		_axis.labels = a;
		return _instance;
	};
	_instance.width = function(d) {
		if(!arguments.length) { return _layout.width; }
		_layout.width = d;
		return _instance;
	};
	_instance.height = function(d) {
		if(!arguments.length) { return _layout.height; }
		_layout.height = d;
		return _instance;
	};
	_instance.dispatch = function(d) {
		if(!arguments.length) { return _dispatch; }
		_dispatch = d;
		return _instance;
	};
	_instance.color = function(d) {
		if(!arguments.length) { return _scale.color; }
		_scale.color = d;
		return _instance;
	};

	return _instance;
}