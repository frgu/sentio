
sentio.chart.scatterLine = sentio_chart_scatter_line;
function sentio_chart_scatter_line() {
	'use strict';

	// Layout properties
	var _id = 'scatter_line' + Date.now();
	var _margin = { top: 20, right: 50, bottom: 20, left: 50 };
	var _width = 500;
	var _height = 500;
	var _lineGrouping = false;
	var _lineMethod = 'linear';
	var _showLegend = true;

	var _xBuffer = 1;
	var _yBuffer = 1;

	var _data = [];
	var _groups = {
		groups: [],
		hidden: []
	};
	var _paths = [];

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
		group: function(d) { return d[3]; }
	};

	var _tooltipCallback = null;

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
			.ticks(5),
		labels: {
			x: undefined,
			y: undefined
		}
	};

	// elements
	var _element = {
		div: undefined,
		svg: undefined,
		tooltip: undefined,
		g: {
			xAxis: undefined,
			yAxis: undefined,
			axisLabels: {
				x: undefined,
				y: undefined
			},
			points: undefined,
			pointFocus: {
				g: undefined,
				x: undefined,
				y: undefined
			},
			paths: undefined,
			pathPointer: undefined,
			legend: undefined
		}
	};

	var _line = d3.svg.line().interpolate('linear');
	_line.x(function(d) { return _scale.x(d[0]); });
	_line.y(function(d) { return _scale.y(d[1]); });

	var _generatePoint = function(x, eq) {
		var a, b, c;
		var ret = 0;
		a = eq.equation[0];
		b = eq.equation[1];	
		if (_lineMethod === 'linear') {
			ret = a * x + b;
		} else if (_lineMethod === 'logarithmic') {
			ret = a + b * Math.log(x);
		} else if (_lineMethod === 'power') {
			ret = a * Math.pow(x, b);
		} else if (_lineMethod === 'exponential') {
			ret = a * Math.pow(Math.E, (x*b));
		} else if (_lineMethod === 'polynomial') {
			c = eq.equation[2];
			ret = c*Math.pow(x,2) + b*x + a;
		}
		return ret;
	};

	var _generatePoints = function(eq) {
		var ret = [];
		var a, b, c;
		var x, y, i;
		var range, start, end, steps;

		a = eq.equation[0];
		b = eq.equation[1];
		start = eq.points[0][0]-(_xBuffer/2);
		end = eq.points[eq.points.length-1][0]+(_xBuffer/2);
		range = end-start;
		steps = Math.ceil((((end-start)/range)*(_width - _margin.left - _margin.right))/2);

		if (_lineMethod === 'linear') {
			ret.push([start, a * start + b]);
			ret.push([end, a * end + b]);
		} else if (_lineMethod === 'logarithmic') {
			for (i = 0; i < steps; i++) {
				x = start + (end - start) * (i/steps);
				if (x > 0) {
					y = a + b * Math.log(x);
					ret.push([x, y]);
				}
			}
		} else if (_lineMethod === 'power') {
			for (i = 0; i < steps; i++) {
				x = start + (end - start) * (i/steps);			
				y = a * Math.pow(x, b);
				if (y) {
					ret.push([x, y]);
				}
			}
		} else if (_lineMethod === 'exponential') {
			for (i = 0; i < steps; i++) {
				x = start + (end - start) * (i/steps);			
				y = a * Math.pow(Math.E, (x*b));
				if (y) {
					ret.push([x, y]);
				}
			}
		} else if (_lineMethod === 'polynomial') {
			c = eq.equation[2];
			for (i = 0; i < steps; i++) {
				x = start + (end - start) * (i/steps);			
				y = c*Math.pow(x,2) + b*x + a;
				if (y) {
					ret.push([x, y]);
				}
			}
		}
		return ret;
	};

	var gaussianElimination = function(a, o) {
		var i = 0, j = 0, k = 0, maxrow = 0, tmp = 0, n = a.length - 1, x = new Array(o);
		for (i = 0; i < n; i++) {
			maxrow = i;
			for (j = i + 1; j < n; j++) {
				if (Math.abs(a[i][j]) > Math.abs(a[i][maxrow]))
					maxrow = j;
			}
			for (k = i; k < n + 1; k++) {
				tmp = a[k][i];
				a[k][i] = a[k][maxrow];
				a[k][maxrow] = tmp;
			}
			for (j = i + 1; j < n; j++) {
				for (k = n; k >= i; k--) {
					a[k][j] -= a[k][i] * a[i][j] / a[i][i];
				}
			}
		}
		for (j = n - 1; j >= 0; j--) {
			tmp = 0;
			for (k = j + 1; k < n; k++)
				tmp += a[k][j] * x[k];
			x[j] = (a[n][j] - tmp) / a[j][j];
		}
		return (x);
	};

	var _regression_fn = {
		linear: function(data) {
			var sum = [0, 0, 0, 0, 0], n = 0, results = [];

			for (; n < data.length; n++) {
				if (data[n][2] != null) {
					sum[0] += _pointValue.x(data[n]);
					sum[1] += _pointValue.y(data[n]);
					sum[2] += _pointValue.x(data[n]) * _pointValue.x(data[n]);
					sum[3] += _pointValue.x(data[n]) * _pointValue.y(data[n]);
					sum[4] += _pointValue.y(data[n]) * _pointValue.y(data[n]);
				}
			}

			var gradient = (n * sum[3] - sum[0] * sum[1]) / (n * sum[2] - sum[0] * sum[0]);

			var intercept = (sum[1] / n) - (gradient * sum[0]) / n;
			// var correlation = (n * sum[3] - sum[0] * sum[1]) / Math.sqrt((n * sum[2] - sum[0] * sum[0]) * (n * sum[4] - sum[1] * sum[1]));

			for (var i = 0, len = data.length; i < len; i++) {
				var coordinate = [_pointValue.x(data[i]), _pointValue.x(data[i]) * gradient + intercept];
				results.push(coordinate);
			}
			results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ' + Math.round(gradient*100) / 100 + 'x + ' + Math.round(intercept*100) / 100;

			return {equation: [gradient, intercept], points: results, string: string};
		},
		logarithmic: function(data) {
			var sum = [0, 0, 0, 0], n = 0, results = [];

			for (len = data.length; n < len; n++) {
				if (_pointValue.y(data[n]) != null) {
					sum[0] += Math.log(_pointValue.x(data[n]));
					sum[1] += _pointValue.y(data[n]) * Math.log(_pointValue.x(data[n]));
					sum[2] += _pointValue.y(data[n]);
					sum[3] += Math.pow(Math.log(_pointValue.x(data[n])), 2);
				}
			}

			var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
			var A = (sum[2] - B * sum[0]) / n;

			for (var i = 0, len = data.length; i < len; i++) {
				var coordinate = [_pointValue.x(data[i]), A + B * Math.log(_pointValue.x(data[i]))];
				results.push(coordinate);
			}
			results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ' + Math.round(A*100) / 100 + ' + ' + Math.round(B*100) / 100 + ' ln(x)';

			return {equation: [A, B], points: results, string: string};
		},
		power: function(data) {
			var sum = [0, 0, 0, 0], n = 0, results = [];

			for (len = data.length; n < len; n++) {
            	if (_pointValue.y(data[n]) != null) {
            		sum[0] += Math.log(_pointValue.x(data[n]));
            		sum[1] += Math.log(_pointValue.y(data[n])) * Math.log(_pointValue.x(data[n]));
            		sum[2] += Math.log(_pointValue.y(data[n]));
            		sum[3] += Math.pow(Math.log(_pointValue.x(data[n])), 2);
            	}
            }
			var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
			var A = Math.pow(Math.E, (sum[2] - B * sum[0]) / n);

			for (var i = 0, len = data.length; i < len; i++) {
				var coordinate = [_pointValue.x(data[i]), A * Math.pow(_pointValue.x(data[i]), B)];
				results.push(coordinate);
			}
            results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ' + Math.round(A*100) / 100 + 'x^' + Math.round(B*100) / 100;

			return {equation: [A, B], points: results, string: string};
		},
		exponential: function(data) {
			var sum = [0, 0, 0, 0, 0, 0], n = 0, results = [];

			for (len = data.length; n < len; n++) {
				if (data[n][2] != null) {
					sum[0] += _pointValue.x(data[n]);
					sum[1] += _pointValue.y(data[n]);
					sum[2] += _pointValue.x(data[n]) * _pointValue.x(data[n]) * _pointValue.y(data[n]);
					sum[3] += _pointValue.y(data[n]) * Math.log(_pointValue.y(data[n]));
					sum[4] += _pointValue.x(data[n]) * _pointValue.y(data[n]) * Math.log(_pointValue.y(data[n]));
					sum[5] += _pointValue.x(data[n]) * _pointValue.y(data[n]);
				}
			}

			var denominator = (sum[1] * sum[2] - sum[5] * sum[5]);
			var A = Math.pow(Math.E, (sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
			var B = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;

			for (var i = 0, len = data.length; i < len; i++) {
				var coordinate = [_pointValue.x(data[i]), A * Math.pow(Math.E, B * _pointValue.x(data[i]))];
				results.push(coordinate);
			}
            results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ' + Math.round(A*100) / 100 + 'e^(' + Math.round(B*100) / 100 + 'x)';

			return {equation: [A, B], points: results, string: string};
		},
		polynomial: function(data, order) {
			if(typeof order == 'undefined'){
				order = 2;
			}
			var lhs = [], rhs = [], results = [], a = 0, b = 0, i = 0, k = order + 1, l, len;

			for (; i < k; i++) {
				for (l = 0, len = data.length; l < len; l++) {
					if (_pointValue.y(data[l]) != null) {
						a += Math.pow(_pointValue.x(data[l]), i) * _pointValue.y(data[l]);
					}
				}
				lhs.push(a);
				a = 0;
				var c = [];
				for (var j = 0; j < k; j++) {
					for (l = 0, len = data.length; l < len; l++) {
						if (_pointValue.y(data[l]) != null) {
							b += Math.pow(_pointValue.x(data[l]), i + j);
						}
					}
					c.push(b);
					b = 0;
				}
				rhs.push(c);
			}
			rhs.push(lhs);

			var equation = gaussianElimination(rhs, k);
			for (i = 0, len = data.length; i < len; i++) {
				var answer = 0;
				for (var w = 0; w < equation.length; w++) {
					answer += equation[w] * Math.pow(_pointValue.x(data[i]), w);
				}
				results.push([data[i][1], answer]);
			}
            results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ';
			for(i = equation.length-1; i >= 0; i--){
				if(i > 1) string += Math.round(equation[i] * Math.pow(10, i)) / Math.pow(10, i)  + 'x^' + i + ' + ';
				else if (i == 1) string += Math.round(equation[i]*100) / 100 + 'x' + ' + ';
				else string += Math.round(equation[i]*100) / 100;
			}
			return {equation: equation, points: results, string: string};
		}
	};

	function invokeTooltipCallback(d) { 
		if (null != _tooltipCallback) {
			return _tooltipCallback(d);
		}
	}

	// Chart create/init method
	function _instance(selection){}

	function handleSVGMove() {
		/*jshint validthis: true */
		var mouse = d3.mouse(this);
		var x = mouse[0] - _margin.right;
		var xValue = _scale.x.invert(x);
		var y = 0;

		_paths.forEach(function(p) {
			var opacity = 0;
			if (xValue >= p.data[0][0] && xValue <= p.data[p.data.length-1][0] ) {
				opacity = 1;
				y = _generatePoint(xValue, p.eq);
			}
			_element.g.paths.selectAll('circle')
				.filter(function(c) { return c.id === p.id; })
				.attr('cx', x)
				.attr('cy', _scale.y(y))
				.attr('opacity', opacity);
		});

		

	}

	function handleSVGLeave() {
		_element.g.paths.selectAll('circle')
			.attr('opacity', '0');
	}


	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container){
		// Create the DIV element
		_element.div = container.append('div').attr('class', 'sentio scatter-line');

		_element.svg = _element.div.append('svg')
			.on('mousemove', handleSVGMove)
			.on('mouseleave', handleSVGLeave);

		_element.g.container = _element.svg.append('g');

		_element.g.xAxis = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.yAxis = _element.g.container.append('g').attr('class', 'y axis');

		_element.g.axisLabels.x = _element.svg.append('text')
			.attr('class', 'scatter-axis-label')
			.attr('text-anchor', 'end');

		_element.g.axisLabels.y = _element.svg.append('text')
			.attr('class', 'scatter-axis-label')
			.attr('text-anchor', 'end')
			.attr('x', -30)
			.attr('y', 60)
			.attr('dy', '.75em')
			.attr('transform', 'rotate(-90)');

		_element.g.points = _element.g.container.append('g').attr('class', 'points');

		_element.g.pointFocus.g = _element.g.container.append('g')
			.attr('class', 'point-focus');
		_element.g.pointFocus.x = _element.g.pointFocus.g.append('line')
			.attr('stroke-width', '1')
			.attr('x1', '0' );
		_element.g.pointFocus.y = _element.g.pointFocus.g.append('line')
			.attr('stroke-width', '1')
			.attr('y1', _height - _margin.top - _margin.bottom + 5); // Dunno why this needs a 5

		_element.g.paths = _element.g.container.append('g').attr('class', 'scatter-plots');

		_element.g.legend = _element.g.container.append('g').attr('class', 'scatter-legend');

		_element.tooltip = _element.div.append('div').attr('class', 'sentio-tooltip');

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

	_instance.axes = function(v) {
		if(!arguments.length) { return _axis.labels; }
		_axis.labels.x = v.x;
		_axis.labels.y = v.y;
		_axis.labels.m = v.m;
		return _instance;
	};

	_instance.groups = function(v) {
		if(!arguments.length) { return _groups; }
		_groups.groups = v;
		_groups.hidden = [];
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

	function groupPoints(data) {
		var ret = {};
		data.forEach(function(d) {
			var groupName = _pointValue.group(d);
			if (!ret[groupName]) {
				ret[groupName] = [d];
			} else {
				ret[groupName].push(d);
			}
		});
		return ret;
	}

	function generatePaths(visibleData) {
		_paths = [];
		var eq, points;
		if (_lineGrouping) {
			var groupedData = groupPoints(visibleData);
			for (var groupName in groupedData) {
				if (groupedData[groupName].length > 1) {
					eq = _regression_fn[_lineMethod](groupedData[groupName]);
					points = _generatePoints(eq);
					_paths.push({id: groupName, data: points, color: _scale.color(groupName), eq: eq});
				}
			}
		} else {
			eq = _regression_fn[_lineMethod](visibleData);
			points = _generatePoints(eq);
			_paths.push({id: 'scatter_group_path', data: points, color: '#ff69b4', eq: eq});
		}
	}

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		var visibleData = _data.filter(function(d) {
			return _groups.hidden.indexOf(_pointValue.group(d)) === -1;
		});
		_paths = [];

		var xDomain = _extent.x.getExtent(visibleData);
		var yDomain = _extent.y.getExtent(visibleData);
		_xBuffer = xDomain[1] - xDomain[0] === 0 ? 5 : Math.ceil((xDomain[1] - xDomain[0]) * 0.1);
		_yBuffer = yDomain[1] - yDomain[0] === 0 ? 5 : Math.ceil((yDomain[1] - yDomain[0]) * 0.1);

		xDomain[0] -= _xBuffer;
		xDomain[1] += _xBuffer;
		_scale.x.domain(xDomain);

		yDomain[0] -= _yBuffer;
		yDomain[1] += _yBuffer;
		_scale.y.domain(yDomain);

		generatePaths(visibleData);

		updateAxes();
		updateLegend();
		updatePoints();
		updatePaths();

		return _instance;
	};

	function updateAxes() {
		// Update actual Axes
		_axis.x = _axis.x.innerTickSize(-(_height - _margin.top - _margin.bottom)).ticks(5);
		_axis.y = _axis.y.innerTickSize(-(_width - _margin.left - _margin.right)).ticks(5);

		_element.g.axisLabels.x
			.transition()
			.attr('x', _width - _margin.left - _margin.right + 35)
			.attr('y', _height - _margin.top - _margin.bottom + 10)
			.text(_axis.labels.x);

		_element.g.axisLabels.y
			.transition()
			.text(_axis.labels.y);

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
			.attr('opacity', function(d) { return _groups.hidden.indexOf(_pointValue.group(d)) === -1 ? '1' : '0'; })
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
			.attr('opacity', function(d) { return _groups.hidden.indexOf(_pointValue.group(d)) === -1 ? '1' : '0'; })
			.attr('y1', function(d) { return _scale.y(_pointValue.y(d)); })
			.attr('y2', function(d) { return _scale.y(_pointValue.y(d)); });

		yAxisTickJoin.exit().remove();
	}

	function handleLegendClick(d) {
		var idx = _groups.hidden.indexOf(d);
		if (idx === -1) {
			_groups.hidden.push(d);
		} else {
			_groups.hidden.splice(idx, 1);
		}
		if (_groups.hidden.length === _groups.groups.length) {
			_groups.hidden = [];
		}
		_instance.redraw();
	}

	function updateLegend() {
		var legendJoin = _element.g.legend
			.selectAll('.scatter-legend')
			.data(_groups.groups);

		var legendEnter = legendJoin.enter().append('g')
			.attr('class', 'scatter-legend')
			.on('click', handleLegendClick);

		legendJoin.transition()
			.attr('opacity', function(d) { 
				var ret;
				if (_showLegend) {
					ret = _groups.hidden.indexOf(d) === -1 ? '1' : '0.2'; 
				} else {
					ret = '0';
				}
				return ret;
			});


		var iconEnter = legendEnter.append('circle');
		var iconUpdate = legendJoin.select('circle');

		var labelEnter = legendEnter.append('text');
		var labelUpdate = legendJoin.select('text');

		iconEnter
			.attr('r', '8')
			.attr('stroke-width', '2')
			.attr('fill-opacity', '0.75');

		iconUpdate.transition().duration(100)
			.attr('cx', _width - _margin.right - _margin.left)
			.attr('cy', function(d, i) { return i * 25; })
			.attr('fill', function(d) { return _scale.color(d); })
			.attr('stroke', function(d) { return _scale.color(d); });

		labelEnter
			.attr('text-anchor', 'end');

		labelUpdate.transition().duration(100)
			.attr('x', _width - _margin.right - _margin.left - 20)
			.attr('y', function(d, i) { return (i * 25) + 3; })
			.text(function(d) { return d; });


		legendJoin.exit().remove();
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

		_element.tooltip.html(invokeTooltipCallback({d: d}));
		var tooltip_width = _element.tooltip.node().getBoundingClientRect().width;
		var tooltip_height = _element.tooltip.node().getBoundingClientRect().height;
		_element.tooltip
			.style('top', (_scale.y(_pointValue.y(d)) + 2*_margin.top+40 - tooltip_height) + 'px')
			.style('left', (_scale.x(_pointValue.x(d)) + 2*_margin.left-30 - tooltip_width) + 'px');
		_element.tooltip.transition().duration(1000).style('visibility', 'visible');
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


		_element.tooltip.transition().duration(1000).style('visibility', 'hidden');
	}

	function updatePoints() {
		var pointJoin = _element.g.points
			.selectAll('.point')
			.data(_data, function(d) { return _pointValue.id(d)+'_'+_pointValue.x(d)+'_'+_pointValue.y(d); });

		var pointEnter = pointJoin.enter().append('g')
			.attr('class', 'point')
			.attr('opacity', '1')
			.on('mouseover', handlePointEnter)
			.on('mouseleave', handlePointExit);

		pointJoin.transition()
			.attr('opacity', function(d) { return _groups.hidden.indexOf(_pointValue.group(d)) === -1 ? '1' : '0'; });

		var circleEnter = pointEnter.append('circle');
		var circleUpdate = pointJoin.select('circle');

		circleEnter
			.attr('r', '5')
			.attr('fill-opacity', '0.5')
			.attr('stroke-width', '1');

		circleUpdate.transition()
			.attr('fill', function(d, i) { return _scale.color(_pointValue.group(d)); })
			.attr('stroke', function(d, i) { return d3.rgb(_scale.color(_pointValue.group(d))).brighter(); })
			.attr('cx', function(d) { return _scale.x(_pointValue.x(d)); })
			.attr('cy', function(d) { return _scale.y(_pointValue.y(d)); });

		pointJoin.exit().remove();
	}

	function updatePaths() {

		var pathJoin = _element.g.paths
			.selectAll('.scatter-path')
			.data(_paths, function(d) { return d.id; });

		var pathEnter = pathJoin.enter().append('g')
			.attr('class', 'scatter-path')
			.attr('opacity', '1');

		var lineEnter = pathEnter.append('path');
		var lineUpdate = pathJoin.select('path');

		var pointEnter = pathEnter.append('circle');

		lineEnter
			.attr('stroke', function(d) { return d.color; })
			.attr('stroke-width', '1.5')
			.attr('fill', 'none');

		lineUpdate.transition()
			.attr('d', function(d) { return _line(d.data); });

		pointEnter
			.attr('r', '5')
			.attr('cx', '0')
			.attr('cy', '0')
			.attr('stroke-width', '.5')
			.attr('stroke', 'white')
			.attr('fill', function(d) { return d3.rgb(d.color).brighter(2); })
			.attr('opacity', '0');

		pathJoin.exit().transition().attr('opacity', '0').remove();
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
	_instance.lineGrouping = function(v) {
		if(!arguments.length) { return _lineMethod; }
		_lineGrouping = v;
		return _instance;
	};
	_instance.lineMethod = function(v) {
		if(!arguments.length) { return _lineMethod; }
		_lineMethod = v;
		return _instance;
	};
	_instance.showLegend = function(v) {
		if(!arguments.length) { return _showLegend; }
		_showLegend = v;
		return _instance;
	};
	_instance.tooltipCallback = function(v) { 
		if(!arguments.length) { return _tooltipCallback; }
		_tooltipCallback = v;
		return _instance;
	};

	return _instance;

}