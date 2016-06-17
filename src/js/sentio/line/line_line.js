sentio.line.line = sentio_line_line;
function sentio_line_line() {
	'use strict';

	// Layout properties
	var _id = 'line_line_' + Date.now();
	// var _margin = { top: 20, right: 200, bottom: 50, left: 40 };

	var _margin = { top: 20, right: 40, bottom: 50, left: 40 };
	var _height = 100, _width = 800;

	var lockYAxis = true;	// Set whether the Y axis will automatically change as data changes.
	var lockedY = 1;		// Set default max Y axis value.
	var stacked = false;	// Set whether different series will stack on top of eachother rather than overlay.
	var showMarkers = true;	// Set default boolean for showing markers
	var max_ticks = 30;		// Set default max number of ticks for the x axis.
	var x_ticks = 30;		// Set default number of ticks for the x axis.

	/*
	 * Callback function for hovers over the markers. Invokes this function
	 * with the data from the marker payload
	 */
	var _markerHoverCallback = null;

	/*
	 * Callback function for hovers over plot points.
	 */
	var _pointCallback = null;

	var _legendCallback = null;

	// Default accessors for the dimensions of the data
	var _value = {
		x: function(d, i) { return d[0]; },
		y: function(d, i) { return d[1]; }
	};

	var _pointValue = {
		x: function(d, i) { return d[0]; },
		y: function(d, i) { return d[1]; },
		series: function(d, i) { return d[2]; }
	};

	// Accessors for the positions of the markers
	var _markerValue = {
		label: function(d, i) { return d[0]; },
		slug: function(d, i) { return d[1]; },
		start: function(d, i) { return d[2]; },
		end: function(d, i) { return d[3]; }
	};

	var now = Date.now();
	var _extent = {
		x: sentio.util.extent({
			defaultValue: [now - 60000*5, now],
			getValue: function(d) { return d[0]; }
		}),
		y: sentio.util.extent({
			getValue: function(d) { return d[1]; }
		})
	};
	var _multiExtent = sentio.util.multiExtent().values(function(d) { return d.data; });

	// Default scales for x and y dimensions
	var _scale = {
		x: d3.time.scale(),
		y: d3.scale.linear(),
		color: d3.scale.category20()
	};

	// Default Axis definitions
	var _axis = {
		x: d3.svg.axis().scale(_scale.x).orient('bottom').ticks(x_ticks).tickFormat(d3.time.format("%m/%d/%y")),
		y: d3.svg.axis().scale(_scale.y).orient('left').ticks(10)
	};

	// g elements
	var _element = {
		svg: undefined,
		g: {
			clickCapture: undefined,
			clickLine: undefined,
			container: undefined,
			markers: undefined,
			plots: undefined,
			xAxis: undefined,
			yAxis: undefined,
			points: undefined,
			brush: undefined
		},
		plotClipPath: undefined,
		markerClipPath: undefined,
		pointClipPath: undefined
	};

	// Line generator for the plot
	var _line = d3.svg.line().interpolate('basis');
	_line.x(function(d, i) {
		return _scale.x(_value.x(d, i));
	});
	_line.y(function(d, i) {
		return _scale.y(_value.y(d, i));
	});

	// Area generator for the plot
	var _area = d3.svg.area().interpolate('basis');
	_area.x(function(d, i) {
		return _scale.x(_value.x(d, i));
	});
	_area.y1(function(d, i) {
		return _scale.y(_value.y(d, i));
	});

	// Brush filter
	var _filter = {
		enabled: false,
		brush: d3.svg.brush(),
		dispatch: d3.dispatch('filter', 'filterstart', 'filterend')
	};

	// Array for various plot data
	var _data = [];
	var _raw_data = [];
	var _stack_data = [];

	var _points = [];

	var _markers = {
		values: [],
		dispatch: d3.dispatch('onclick')
	};

	function brushstart() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filterstart([isEmpty, min, max]);
	}
	function brush() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filter([isEmpty, min, max]);
	}
	function brushend() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filterend([isEmpty, min, max]);
	}

	var tooltip = d3.select("body")
	    .append("div")
	    .style("position", "absolute")
	    .style("z-index", "10")
	    .style("visibility", "hidden")
	    .style('background-color', 'rgba(0,0,0,0.8')
	    .style('border-radius', '5px')
	    .style('padding', '3px')
	    .style('pointer-events', 'none');

	// Chart create/init method
	function _instance(selection){}

	var cx, cy, targetX;
	var selected = {
		points: [],
		markers: []
	};
	function handleMouseMove() {
		cx = d3.event.offsetX;
		cy = d3.event.y;
		targetX = cx;
		selected.points = [];
		selected.markers = [];

		// bind to a point if it exists
		d3.selectAll('.point')
			.each(function(d) {
				if (Math.abs(_scale.x(_pointValue.x(d)) - cx) < 5) {
					targetX = _scale.x(_pointValue.x(d));
					selected.points.push(d);
				}
			});

		// Find any markers in that range
		d3.selectAll('.marker')
			.each(function(d) {
				if (targetX >= _scale.x(_markerValue.start(d)) && targetX <= _scale.x(_markerValue.end(d))) {
					selected.markers.push(d);
				}
			});

		if (selected.points.length > 0) {
			tooltip.style("visibility", "visible");
			tooltip.style("top", cy+"px").style("left",d3.event.x+"px");
			tooltip.html(invokePointCallback({d: selected}));
		} else {
			tooltip.style("visibility", "hidden");
		}

		_element.g.clickLine
			.attr('x1', targetX)
			.attr('x2', targetX);
	}

	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container){
		// Create a container div
		_element.div = container.append('div').attr('class', 'sentio line');

		// Create the SVG element
		_element.svg = _element.div.append('svg');

		// Add the defs and add the clip path definition
		_element.markerClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'marker_' + _id).append('rect');
		_element.plotClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'plot_' + _id).append('rect');
		_element.pointClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'point_' + _id).append('rect');

		// Append a container for everything
		_element.g.container = _element.svg.append('g')
			.attr('class', 'g-main')
			.on("mousemove", function () {
				handleMouseMove();
			})
			.on("mouseover", function () {
				_element.g.clickLine.style('display', 'block');
			})
			.on("mouseout", function () {
				_element.g.clickLine.style('display', 'none');
				tooltip.style("visibility", "hidden");
			})

		_element.g.clickCapture = _element.g.container.append('rect')
			.attr('class', 'click-capture')
			.style('visibility', 'hidden')
			.attr('x', '0')
			.attr('y', '0');

		_element.g.clickLine = _element.g.container.append('line')
			.attr('class', 'line-over')
			.attr('x1', '10')
			.attr('y1', '0')
			.attr('x2', '10')
			.style('stroke', 'gray')
			.attr('stroke-dasharray', ('5,5'))
			.style('stroke-width', '1.5')
			.style('display', 'none');

		// Append a group for the markers
		_element.g.markers = _element.g.container.append('g').attr('class', 'markers').attr('clip-path', 'url(#marker_' + _id + ')');

		// Append the path group (which will have the clip path and the line path
		_element.g.plots = _element.g.container.append('g').attr('class', 'plots').attr('clip-path', 'url(#plot_' + _id + ')');

		_element.g.points = _element.g.container.append('g').attr('class', 'points').attr('clip-path', 'url(#point_' + _id + ')');

		// If the filter is enabled, add it
		if(_filter.enabled) {
			_element.g.brush = _element.g.container.append('g').attr('class', 'x brush');
			_element.g.brush.call(_filter.brush)
				.selectAll('rect').attr('y', -6);
			_filter.brush
				.on('brushend', brushend)
				.on('brushstart', brushstart)
				.on('brush', brush);
		}

		// Append groups for the axes
		_element.g.xAxis = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.yAxis = _element.g.container.append('g').attr('class', 'y axis');

		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _raw_data; }
		_raw_data = v;

		return _instance;
	};

	/*
	 * Set the markers data
	 */
	_instance.markers = function(v) {
		if(!arguments.length) { return _markers.dispatch; }
		_markers.values = v;
		return _instance;
	};

	/*
	 * Accepts the hovered element and conditionally invokes
	 * the marker hover callback if both the function and data
	 * are non-null
	 */
	function invokeMarkerCallback(d) {
		// fire an event with the payload
		if(null != _markerHoverCallback) {
			_markerHoverCallback(d);
		}
	}

	function markerClicked(d) {
		_markers.dispatch.onclick(d);
	}

	function invokePointCallback(d) {
		if(null != _pointCallback) {
			return _pointCallback(d);
		}
	}

	function invokeLegendCallback(d) {
		if (null != _legendCallback) {
			return _legendCallback(d);
		}
	}

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		var now = Date.now();

		// Set up the scales
		_scale.x.range([0, Math.max(0, _width - _margin.left - _margin.right)]);
		_scale.y.range([Math.max(0, _height - _margin.top - _margin.bottom), 0]);

		_element.g.clickCapture
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));

		_element.g.clickLine
			.attr('y2', function(d) { return _scale.y.range()[0]; });

		// Append the clip path
		_element.plotClipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));
		_element.markerClipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));
		_element.pointClipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right + 5))
			.attr('height', Math.max(0, _height - _margin.bottom));

		// Now update the size of the svg pane
		_element.svg.attr('width', _width).attr('height', _height);

		// Update the positions of the axes
		_element.g.xAxis.attr('transform', 'translate(0,' + _scale.y.range()[0] + ')');
		_element.g.yAxis.attr('class', 'y axis');

		// update the margins on the main draw group
		_element.g.container.attr('transform', 'translate(' + _margin.left + ',' + _margin.top + ')');

		max_ticks = parseInt(_width / 20);

		return _instance;
	};

	// Multi Extent Combiner
	function multiExtent(data, extent) {
		return _multiExtent.extent(extent).getExtent(data);
	}

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {
		// Need to grab the filter extent before we change anything
		var filterExtent = getFilter();


		//stack data when needed and assign to data container
		if (stacked) {
			_stack_data = JSON.parse(JSON.stringify(_raw_data));
			for (var i = 0; i < _stack_data.length; i++) {
				if (i === 0) continue;
				for (var j = 0; j < _stack_data[i].data.length; j++) {
					_stack_data[i].data[j][1] += _stack_data[i-1].data[j][1];
				}
			}
			_data = _stack_data;
		} else {
			_data = _raw_data;
		}

		// Update the x domain (to the latest time window)
		_scale.x.domain(multiExtent(_data, _extent.x));

		// Update the y domain (based on configuration and data)
		var y = multiExtent(_data, _extent.y)[1];
		if (lockYAxis) { y = y > lockedY ? y : lockedY; }
		lockedY = y;
		_scale.y.domain([0,y]);

		// Update the plot elements
		updateAxes();
		updateLine();
		updateMarkers();
		updatePoints();
		updateLegend2();
		// updateLegend();
		updateFilter(filterExtent);

		return _instance;
	};

	function updateAxes() {
		// Prevent x axis labels from overlapping by limiting tick count.
		_axis.x = _axis.x.ticks(x_ticks > max_ticks ? max_ticks : x_ticks);

		if(null != _axis.x) {
			_element.g.xAxis
				.transition().call(_axis.x)
				.selectAll("text")
				.style("text-anchor", "end")
				.attr("transform", "rotate(-45)");
		}
		if(null != _axis.y) {
			_element.g.yAxis
				.transition().call(_axis.y);
		}
	}

	/*
	 * Line data format:
	 * 	_line = [
	 *		{ key: 'series_1',
	 		  data: [[x1,y1], [x2,y2], ...],
	 		  name: 'series 1',
	 		  total: 1000
	 		},
	 		{ key: 'series_2'
	 		  data: [[x3,y3], ...],
			  name: 'series 2',
			  total: 3000
	 		},
	 		...	
	 *	]
	 */
	
	function updateLine() {

		// Join
		var plotJoin = _element.g.plots
			.selectAll('.plot')
			.data(_data, function(d) { return d.key; });

		var plotEnter = plotJoin.enter().append('g')
			.attr('class', 'plot');

		// Enter
		plotEnter.append('g').append('path')
			.attr('class', 'blank-line')
			.attr('id', function(d) { return 'path-'+d.key; })
			.attr('stroke', function(d) { return _scale.color(d.key); })
			.attr('stroke-width', '2px')
			.attr('stroke-opacity', '0.9')
			.attr('fill', 'none');
			// .datum(function(d) { 
			// 	return d.data.map(function(p) { return [d.data[d.data.length-1][0], p[1]]; }); 
			// }).attr('d', _line);
		plotEnter.append('g').append('path')
			.attr('class', 'blank-area')
			.attr('id', function(d) { return 'area-'+d.key; })
			.attr('stroke', 'none')
			.attr('fill', function(d) { return _scale.color(d.key); })
			.attr('fill-opacity', '0.05');
			// .datum(function(d) { 
			// 	return d.data.map(function(p) { return [d.data[d.data.length-1][0], p[1]]; }); 
			// }).attr('d', _area.y0(_scale.y.range()[0]));


		var lineUpdate = plotJoin.select('.blank-line');
		var areaUpdate = plotJoin.select('.blank-area');

		// // Update
		lineUpdate.datum(function(d) { return d.data; }).transition().duration(500).attr('d', _line);
		areaUpdate.datum(function(d) { return d.data; }).transition().duration(500).attr('d', _area.y0(_scale.y.range()[0]));

		plotJoin.exit().select('.blank-line')
			// .datum(function(d) { 
			// 	return d.data.map(function(p) { return [d.data[d.data.length-1][0], p[1]]; }); 
			// }).transition().duration(500)
			.attr('d', _line);

		plotJoin.exit().select('.blank-area')
			// .datum(function(d) { 
			// 	return d.data.map(function(p) { return [d.data[d.data.length-1][0], p[1]]; }); 
			// }).transition().duration(500)
			.attr('d', _area.y0(_scale.y.range()[0]));

		// Exit
		var plotExit = plotJoin.exit()
			.transition().duration(500).remove();
	}

	function updateLegend() {
		var legendJoin = _element.legend_g.legends
			.selectAll('.legend')
			.data(_data, function(d) {
				return d.key;
			});

		var legendEnter = legendJoin.enter().append('g')
			.attr('class', 'legend');

		legendEnter
			.on('click', function(d, i) {
				// Toggle data visibility
				var targetPath = d3.select('#path-'+d.key);
				targetPath.transition().style('stroke-opacity', targetPath.style('stroke-opacity') == '0' ? '0.9' : '0');
				var targetArea = d3.select('#area-'+d.key);
				targetArea.transition().style('fill-opacity', targetArea.style('fill-opacity') == '0' ? '0.05' : '0');
				var targetPoints = d3.selectAll('.pt-'+d.key);
				targetPoints.transition().style('stroke-opacity', targetPoints.style('stroke-opacity') == '0' ? '1' : '0');

				// Toggle legend visibility
				var legendRect = legendEnter.select('#lRect-'+i);
				var legendLabel = legendEnter.select('#lLbl-'+i);
				legendRect.transition().style('opacity', legendRect.style('opacity') == 0.5 ? 1 : 0.5);
				legendLabel.transition().style('opacity', legendLabel.style('opacity') == 0.5 ? 1 : 0.5);
			});

		var rectEnter = legendEnter.append('rect');
		var labelEnter = legendEnter.append('text');

		var rectUpdate = legendJoin.select('rect');
		var labelUpdate = legendJoin.select('text');

		labelEnter
			.attr('id', function(d, i) { return 'lLbl-'+i; })
			.attr('opacity', 1)
			.attr('x', (_width - _margin.right)+70)
			.attr('font-size', 13)
			.text(function(d) { return d.name + ' ('+d.total+')'; })
			.attr('y', 0)
			.transition().duration(200)
			.attr('y', function(d, i) { 
				return 27+(i * 20); 
			});

		rectEnter
			.attr('id', function(d, i) { return 'lRect-'+i; })
			.attr('opacity', 1)
			.attr('x', (_width - _margin.right)+20)
			.attr('width', 40)
			.attr('height', 15)
			.attr('stroke', function(d) {return _scale.color(d.key);})
			.attr('fill', function(d) {return _scale.color(d.key);})
			.attr('y', 0)
			.transition().duration(200)
			.attr('y', function(d, i) { return 15+(i * 20); });

		rectUpdate.transition().duration(500)
			.attr('x', (_width - _margin.right)+20)
			.attr('y', function(d, i) { return 15+(i * 20); });

		labelUpdate.transition().duration(500)
			.text(function(d) { return d.name + ' ('+d.total+')'; })
			.attr('x', (_width - _margin.right)+70)
			.attr('y', function(d, i) { return 27+(i * 20); });

		// exit
		legendJoin.exit().select('rect')
			.transition().duration(200)
			.attr('y', 0);

		legendJoin.exit().select('text')
			.transition().duration(200)
			.attr('y', 0);

		var legendExit = legendJoin.exit()
			.transition().duration(200).remove();
	}

	var legend_content = {
		series: undefined,
		markers: undefined,
	}
	function updateLegend2() {
		legend_content.series = _data.map(function(series) {
			return [series.key, series.name, series.total, _scale.color(series.key)];
		})

		invokeLegendCallback({d: legend_content});
	}

	/*
	 * _points format (After conversion from line data)
	 * 	_points = [
	 *				[x1, y1, 'series_1', 'series 1'],
	 *				[x2, y2, 'series_2', 'series 2'],
	 *				...
	 *	]
	 */
	function updatePoints() {
		// Create points from line data 
		_points = [];
		for (var i = 0; i < _data.length; i++) {
			for (var j = 0; j < _data[i].data.length; j++) {
				_points.push([_data[i].data[j][0], _data[i].data[j][1], _data[i].key, _data[i].name]);
			}
		}

		var pointJoin = _element.g.points
			.selectAll('.point')
			.data(_points, function(d) {
				return 'pt-'+_pointValue.series(d)+'-'+_pointValue.x(d);
			});

		var pointEnter = pointJoin.enter().append('g')
			.attr('class', 'point');

		var circleEnter = pointEnter.append('circle');
		var circleUpdate = pointJoin.select('circle');

		circleEnter
			.attr('class', function(d) { return 'pt-'+_pointValue.series(d); })
			.attr('r', 3)
			.attr('stroke', 'white')
			.attr('stroke-opacity', '1')
			.attr('stroke-width', 2)
			.attr('fill', 'white')
			.attr('fill-opacity', 0);
			// .attr('cx', 0)
			// .transition().duration(500)		// slide point from left
			// .attr('cx', function(d) {return _scale.x(_pointValue.x(d));});

		circleUpdate.transition().duration(500)
			.attr('class', function(d) { return 'pt-'+_pointValue.series(d); })
			.attr('cx', function(d) {return _scale.x(_pointValue.x(d));})
			.attr('cy', function(d) {return _scale.y(_pointValue.y(d));});


		// pointJoin.exit()
		// 	.select('circle')
		// 	.transition()
		// 	.duration(500)
		// 	.attr('cx', 0);

		//exit
		pointJoin.exit()
			// .transition()
			// .duration(500)
			.remove();
	}

	function toggleMarkers() {
		_element.g.markers
			.selectAll('.marker')
			.transition().duration(200)
			.attr('opacity', showMarkers ? '1' : '0');
	}

	/* 
	 * _marker format:
	 * 	_marker = {
	 *		values: 
	 *			[
	 *				['label1', 'slug_1', start_x1, end_x1],
	 *				['label2', 'slug_2', start_x2, end_x2]
	 *				...
	 *			]
	 *  }
	 */
	function updateMarkers() {
		// Join
		var markerJoin = _element.g.markers
			.selectAll('.marker')
			.data(_markers.values, function(d) {
				return _markerValue.slug(d); 
			});

		// Enter
		var markerEnter = markerJoin.enter().append('g')
			.attr('class', 'marker');

		var areaEnter = markerEnter.append('rect');
		var startEnter = markerEnter.append('line');
		var endEnter = markerEnter.append('line');
		var startIndEnter = markerEnter.append('circle');
		var endIndEnter = markerEnter.append('circle');

		var areaUpdate = markerJoin.select('rect');
		var startUpdate = markerJoin.select('.start');
		var endUpdate = markerJoin.select('.end');
		var startIndUpdate = markerJoin.select('.start-ind');
		var endIndUpdate = markerJoin.select('.end-ind');

		startIndEnter
			.attr('class', 'start-ind')
			.attr('r', '3')
			.attr('stroke', function(d) {return _scale.color(_markerValue.slug(d));})
			.attr('stroke-opacity', '1')
			.attr('stroke-width', '2')
			.attr('fill', 'white')
			.attr('fill-opacity', '0')
			.attr('cx', function(d) { return _scale.x(_markerValue.start(d)); });

		endIndEnter
			.attr('class', 'end-ind')
			.attr('r', '3')
			.attr('stroke', function(d) {return _scale.color(_markerValue.slug(d));})
			.attr('stroke-opacity', '1')
			.attr('stroke-width', '2')
			.attr('fill', 'white')
			.attr('fill-opacity', '0')
			.attr('cx', function(d) { return _scale.x(_markerValue.end(d)); });

		startEnter
			.attr('class', 'start')
			.attr('y1', function(d) { return _scale.y.range()[1]; })
			.attr('y2', function(d) { return _scale.y.range()[0]; })
			.attr('stroke', function(d) {return _scale.color(_markerValue.slug(d));})
			.attr('x1', function(d) { return _scale.x(_markerValue.start(d)); })
			.attr('x2', function(d) { return _scale.x(_markerValue.start(d)); });

		endEnter
			.attr('class', 'end')
			.attr('x1', function(d) { return _scale.x(_markerValue.end(d)); })
			.attr('x2', function(d) { return _scale.x(_markerValue.end(d)); })
			.attr('y1', function(d) { return _scale.y.range()[1]; })
			.attr('y2', function(d) { return _scale.y.range()[0]; })
			.attr('stroke', function(d) {return _scale.color(_markerValue.slug(d));});

		areaEnter
			.attr('y', '0')
			.attr('x', function(d) { return _scale.x(_markerValue.start(d)); })
			.attr('width', function(d) { 
				return _scale.x(_markerValue.end(d)) - _scale.x(_markerValue.start(d));
			})
			.attr('height', function(d) { return _scale.y.range()[0]; })
			.attr('fill', function(d) {return _scale.color(_markerValue.slug(d));})
			.attr('fill-opacity', '0.1');

		startIndUpdate.transition().duration(500)
			.attr('cx', function(d) { return _scale.x(_markerValue.start(d)); });

		endIndUpdate.transition().duration(500)
			.attr('cx', function(d) { return _scale.x(_markerValue.end(d)); });

		startUpdate.transition().duration(500)
			.attr('x1', function(d) { return _scale.x(_markerValue.start(d)); })
			.attr('x2', function(d) { return _scale.x(_markerValue.start(d)); });

		endUpdate.transition().duration(500)
			.attr('x1', function(d) { return _scale.x(_markerValue.end(d)); })
			.attr('x2', function(d) { return _scale.x(_markerValue.end(d)); });

		areaUpdate.transition().duration(500)
			.attr('x', function(d) { return _scale.x(_markerValue.start(d)); })
			.attr('width', function(d) { 
				return _scale.x(_markerValue.end(d)) - _scale.x(_markerValue.start(d));
			});

		// Exit
		var markerExit = markerJoin.exit().remove();

	}

	/*
	 * Get the current state of the filter
	 * Returns undefined if the filter is disabled or not set, millsecond time otherwise
	 */
	function getFilter() {
		var extent;
		if(_filter.enabled && !_filter.brush.empty()) {
			extent = _filter.brush.extent();
			if(null != extent) {
				extent = [ extent[0].getTime(), extent[1].getTime() ];
			}
		}

		return extent;
	}

	/*
	 * Set the state of the filter, firing events if necessary
	 */
	function setFilter(newExtent, oldExtent) {
		// Fire the event if the extents are different
		var suppressEvent = newExtent == oldExtent || newExtent == null || oldExtent == null || (newExtent[0] == oldExtent[0] && newExtent[1] == oldExtent[1]);
		var clearFilter = (null == newExtent || newExtent[0] >= newExtent[1]);

		// either clear the filter or assert it
		if(clearFilter) {
			_filter.brush.clear();
		} else {
			_filter.brush.extent([ new Date(newExtent[0]), new Date(newExtent[1]) ]);
		}

		// fire the event if anything changed
		if(!suppressEvent) {
			_filter.brush.event(_element.g.brush);
		}
	}

	/*
	 * Update the state of the existing filter (if any) on the plot.
	 * 
	 * This method accepts the extent of the brush before any plot changes were applied
	 * and updates the brush to be redrawn on the plot after the plot changes are applied.
	 * There is also logic to clip the brush if the extent has moved such that the brush
	 * has moved partially out of the plot boundaries, as well as to clear the brush if it
	 * has moved completely outside of the boundaries of the plot.
	 */
	function updateFilter(extent) {
		// Don't need to do anything if filtering is not enabled
		if(_filter.enabled) {
			// Reassert the x scale of the brush (in case the scale has changed)
			_filter.brush.x(_scale.x);

			// Derive the overall plot extent from the collection of series
			var plotExtent = multiExtent(_data, _extent.x);

			// If there was no previous extent, then there is no brush to update
			if(null != extent) {
				// Clip extent by the full extent of the plot (this is in case we've slipped off the visible plot)
				var nExtent = [ Math.max(plotExtent[0], extent[0]), Math.min(plotExtent[1], extent[1]) ];
				setFilter(nExtent, extent);
			}

			_element.g.brush
				.call(_filter.brush)
				.selectAll('rect')
					.attr('height', _height - _margin.top - _margin.bottom + 7);
		}
	}

	_instance.toggleSeries = function(s) {

		var targetPath = d3.select('#path-'+s);
		targetPath.transition().style('stroke-opacity', targetPath.style('stroke-opacity') == '0' ? '0.9' : '0');
		var targetArea = d3.select('#area-'+s);
		targetArea.transition().style('fill-opacity', targetArea.style('fill-opacity') == '0' ? '0.05' : '0');
		var targetPoints = d3.selectAll('.pt-'+s);
		targetPoints.transition().style('stroke-opacity', targetPoints.style('stroke-opacity') == '0' ? '1' : '0');

	};

	// Basic Getters/Setters
	_instance.xTicks = function(t) {
		if(!arguments.length) { return x_ticks; }
		x_ticks = t;
		return _instance;
	};
	_instance.yLock = function(l) {
		if(!arguments.length) { return lockYAxis; }
		lockYAxis = l;
		_instance.redraw();
		return _instance;
	};
	_instance.stacked = function(s) {
		if(!arguments.length) { return stacked; }
		stacked = s;
		_instance.redraw();
		return _instance;
	};
	_instance.showMarkers = function(b) {
		if (!arguments.length) { return showEvents; }
		showMarkers = b;
		toggleMarkers();
		return _instance;
	}
	_instance.width = function(v){
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v){
		if(!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};
	_instance.margin = function(v){
		if(!arguments.length) { return _margin; }
		_margin = v;
		return _instance;
	};
	_instance.interpolation = function(v){
		if(!arguments.length) { return _line.interpolate(); }
		_line.interpolate(v);
		_area.interpolate(v);
		return _instance;
	};
	_instance.xAxis = function(v){
		if(!arguments.length) { return _axis.x; }
		_axis.x = v;
		return _instance;
	};
	_instance.yAxis = function(v){
		if(!arguments.length) { return _axis.y; }
		_axis.y = v;
		return _instance;
	};
	_instance.xScale = function(v){
		if(!arguments.length) { return _scale.x; }
		_scale.x = v;
		if(null != _axis.x) {
			_axis.x.scale(v);
		}
		return _instance;
	};
	_instance.yScale = function(v){
		if(!arguments.length) { return _scale.y; }
		_scale.y = v;
		if(null != _axis.y) {
			_axis.y.scale(v);
		}
		return _instance;
	};
	_instance.xValue = function(v){
		if(!arguments.length) { return _value.x; }
		_value.x = v;
		return _instance;
	};
	_instance.yValue = function(v){
		if(!arguments.length) { return _value.y; }
		_value.y = v;
		return _instance;
	};
	_instance.yExtent = function(v){
		if(!arguments.length) { return _extent.y; }
		_extent.y = v;
		return _instance;
	};
	_instance.xExtent = function(v){
		if(!arguments.length) { return _extent.x; }
		_extent.x = v;
		return _instance;
	};
	_instance.markerXValue = function(v){
		if(!arguments.length) { return _markerValue.x; }
		_markerValue.x = v;
		return _instance;
	};
	_instance.markerLabelValue = function(v){
		if(!arguments.length) { return _markerValue.label; }
		_markerValue.label = v;
		return _instance;
	};
	_instance.markerHover = function(v) {
		if(!arguments.length) { return _markerHoverCallback; }
		_markerHoverCallback = v;
		return _instance;
	};
	_instance.pointHover = function(v) {
		if(!arguments.length) { return _pointCallback; }
		_pointCallback = v;
		return _instance;
	};
	_instance.legendFn = function(v) {
		if (!arguments.length) { return _legendCallback; }
		_legendCallback = v;
		return _instance;
	}
	_instance.filter = function(v) {
		if(!arguments.length) { return _filter.dispatch; }
		_filter.enabled = v;
		return _instance;
	};

	// Expects milliseconds time
	_instance.setFilter = function(extent) {
		var oldExtent = getFilter();
		if(null != extent && extent.length === 2) {
			// Convert to Dates and assert filter
			if(extent[0] instanceof Date) {
				extent[0] = extent[0].getTime();
			}
			if(extent[1] instanceof Date) {
				extent[1] = extent[1].getTime();
			}
		}

		setFilter(extent, oldExtent);
		_instance.redraw();
		return _instance;
	};

	return _instance;
}