sentio.chart.gantt = sentio_gantt;
function sentio_gantt() {
	'use strict';

	var _id = 'gantt_' + Date.now();

	var _margin = {top: 60, right: 60, bottom: 60, left: 60};
	var _width = 1000, _height = 600;

	var _data = [];
	var _dateRange;

	var _barPaddingRatio = 0.05;
	var _minBarHeight = 30;

	var _scale = {
		x: d3.time.scale(),
		y: d3.scale.ordinal(),
		color: d3.scale.category10()
	};

	var _dispatch = d3.dispatch('onmouseover', 'onmouseout', 'onclick');

	var _dateFormat = d3.time.format.multi([
		['%e', function(d) { return d.getDay() && d.getDate() != 1; }],
		['%e', function(d) { return d.getDate() != 1; }],
		['%B', function(d) { return d.getMonth(); }],
		['%Y', function(d) { return true; }]
	]);

	var _axis = {
		x: d3.svg.axis().scale(_scale.x).orient('top').tickFormat(_dateFormat),
		y: d3.svg.axis().scale(_scale.y).orient('left')
	};

	var _bar = {
		label: function(d) { return d[0]; },
		start: function(d) { return d[1][0]; },
		end: function(d) { return d[d.length - 1][1]; }
	};

	var _segment = {
		start: function(d) { return d[0]; },
		end: function(d) { return d[1]; }
	};

	var now = Date.now();
	var _extent = {
		start: sentio.util.extent({
			defaultValue: [now - 60000*5, now],
			getValue: function(d) { return _bar.start(d); }
		}),
		end: sentio.util.extent({
			defaultValue: [now - 60000*5, now],
			getValue: function(d) { return _bar.end(d); }
		})
	};

	var _element = {
		div: undefined,
		svg: undefined,
		g: {
			container: undefined,
			bars: undefined,
			axis: {
				x: undefined,
				y: undefined
			}
		}
	};

	var _fn = {
		filterFn: function(e, i, a) {
			return a[i+1] ? Math.abs(a[i+1].getTime() - e.getTime()) > 0 : true;
		},
		sortFn: function(a, b) {
			return a.getTime() - b.getTime();
		},
		generateTicks: function(arrays) {
			var ret = [];
			var tickCount = Math.floor(_width / 60);

			var i = 0;
			do {
				ret = d3.merge([ret, arrays[i]]).sort(_fn.sortFn).filter(_fn.filterFn);  // Merge, sort, and remove duplicates
				i++;
			} while (i < arrays.length && ret.length + arrays[i].length < tickCount);

			return ret;
		},
		onMouseOver: function(d, i, j) {
			_dispatch.onmouseover(d, i, j, this);
		},
		onMouseOut: function(d, i, j) {
			_dispatch.onmouseout(d, i, j, this);
		},
		onClick: function(d, i, j) {
			_dispatch.onclick(d, i, j, this);
		}
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio gantt').style('overflow', 'scroll');

		_element.svg = _element.div.append('svg');

		_element.g.container = _element.svg.append('g');

		_element.g.bars = _element.g.container.append('g').attr('class', 'bars');

		_element.g.axis.x = _element.g.container.append('g').attr('class', 'axis x');
		_element.g.axis.y = _element.g.container.append('g').attr('class', 'axis y');

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.div.style('width', _width + 'px').style('height', _height + 'px');
		_element.svg.attr('width', _width).attr('height', _scale.y.rangeBand() < _minBarHeight ? _data.length * _minBarHeight + _margin.top + _margin.bottom : _height);

		_scale.x.range([0, Math.max(0, _width - _margin.left - _margin.right)]);
		_scale.y.rangeBands([0, Math.max(0, _height - _margin.top - _margin.bottom, _data.length * _minBarHeight)], _barPaddingRatio);

		_element.g.container.attr('transform', 'translate(' + _margin.left + ',' + _margin.top + ')');

		_axis.y.innerTickSize(-(_width - _margin.left - _margin.right));

		return _instance;
	};

	function updateAxes() {
		_element.g.axis.x.transition().call(_axis.x);

		// Emphasize ticks for the first of a month or the first of a year
		_element.g.axis.x.selectAll('text').transition()
			.attr('y', function(d) { return d.getDate() === 1 ? '-20' : '-6'; })
			.attr('font-weight', function(d) { return d.getDate() === 1 ? 'bold' : ''; })
			.attr('font-size', function(d) { return d.getMonth() === 0 && d.getDate() === 1 ? 'larger'  : 'inherit'; });
		_element.g.axis.x.selectAll('line').transition()
			.attr('y2', function(d) { return d.getDate() === 1 ? '-14' : '-6'; })
			.attr('y1', function(d) { 
				var ret = '';
				if (d.getDate() === 1) {
					ret = _scale.y.rangeBand() < _minBarHeight ? _data.length * _minBarHeight : _height - _margin.top - _margin.bottom;
				}
				return ret;
			});

		_element.g.axis.y.transition().call(_axis.y);

		_element.g.axis.y.selectAll('text').transition()
			.attr('x', '15')
			.attr('y', '15')
			.style('text-anchor', 'start');
	}

	function updateBars() {
		var barJoin = _element.g.bars.selectAll('.bar')
				.data(_data, function(d) { return _bar.label(d); });

		var barEnter = barJoin.enter().append('g')
				.attr('class', 'bar');

		var segmentEnter = barEnter.selectAll('.segment')
				.data(function(d) { return d.slice(1); });

		segmentEnter.enter().append('rect')
				.attr('class', 'segment')
				.attr('opacity', '0.8')
				.on('mouseover', _fn.onMouseOver)
				.on('mouseout', _fn.onMouseOut)
				.on('click', _fn.onClick);

		var barUpdate = barJoin.selectAll('.segment');

		barUpdate.transition()
				.attr('x', function(d, i, j) { return _scale.x(_segment.start(d)); })
				.attr('y', function(d, i, j) { return _scale.y(_bar.label(_data[j])) + _scale.y.rangeBand()/(2*(1-_barPaddingRatio)); })
				.attr('width', function(d, i, j) { return _scale.x(_segment.end(d)) - _scale.x(_segment.start(d)); })
				.attr('height', function(d, i, j) { return Math.max(_scale.y.rangeBand(), _minBarHeight); })
				.attr('fill', function(d, i, j) { return _scale.color(i); });
				
		barJoin.exit().remove();

	}

	_instance.redraw = function() {
		if (!_data) { return; }

		var startOfDomain = new Date(_extent.start.getExtent(_data)[0]);
		var endOfDomain = new Date(_extent.end.getExtent(_data)[1]);

		if (_dateRange) {
			startOfDomain = new Date(_dateRange[0]);
			endOfDomain = new Date(_dateRange[1]);
		}

		_scale.x.domain([startOfDomain, endOfDomain]);

		var dayTicks = _scale.x.ticks(d3.time.day, 1);
		var weekTicks = _scale.x.ticks(d3.time.week, 1);
		var monthTicks = _scale.x.ticks(d3.time.month, 1);
		var yearTicks = _scale.x.ticks(d3.time.year, 1);

		var ticks = _fn.generateTicks([yearTicks, monthTicks, weekTicks, dayTicks]);

		_axis.x.tickValues(ticks);

		var labels = _data.map(function(d) {
			return _bar.label(d);
		});
		labels.push('');
		_scale.y.domain(labels);
		_axis.y.tickValues(labels);

		updateAxes();
		updateBars();

		return _instance;
	};

	_instance.data = function(d) {
		if(!arguments.length) { return _data; }
		_data = d;
		return _instance;
	};
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
	_instance.dispatch = function(v) {
		if(!arguments.length) { return _dispatch; }
		return _instance;
	};
	_instance.colorScale = function(v) {
		if(!arguments.length) { return _scale.color; }
		_scale.color = d3.scale.ordinal().domain(d3.range(v.length)).range(v);
		return _instance;
	};
	_instance.dateRange = function(v) {
		if(!arguments.length) { return _dateRange; }
		_dateRange = v;
		return _instance;
	};


	return _instance;
}