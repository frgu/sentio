/**
 * Ref: https://bl.ocks.org/mbostock/4062006
 */

function chord() {
	
	var _width = 960;
    var _height = 960;
	var _margin = { top: 100, bottom: 100, right: 100, left: 100 };
	var _radius;
    var _innerRadiusRatio = 0.9;
    var _duration = 500;
    var _transitionDuration = 150;

    var _dispatch = d3.dispatch('arc:mouseover', 'arc:mouseout', 'arc:click', 'ribbon:mouseover', 'ribbon:mouseout', 'ribbon:click');

	var _data = [];

	var _labels = [];

	var _scale = {
        color: d3.scaleOrdinal(d3.schemeCategory20)
    };

    var _layout = {
        chord: d3.chord().padAngle(0.04).sortSubgroups(d3.descending).sortChords(d3.descending),
        arc: d3.arc(),
        ribbon: d3.ribbon()
    };

	var _element = {
		div: undefined,
		svg: undefined,
		gChart: undefined,
        gArcs: undefined,
        gRibbons: undefined
	};

    var _fn = {
        arc: {
            mouseover: function(d, i) {
                var secondaryArcs = [];
                _element.gRibbons.selectAll('path.ribbon')
                    .filter(function(ribbon) { 
                        if (ribbon.source.index === d.index) {
                            secondaryArcs.push(ribbon.target.index);
                        }
                        return ribbon.source.index !== d.index; 
                    })
                    .transition('arc:mouseover').duration(_transitionDuration)
                    .attr('opacity', '0.2');

                _element.gArcs.selectAll('g.arc')
                    .filter(function(arc) { return arc.index !== d.index && secondaryArcs.indexOf(arc.index) === -1; })
                    .transition('arc:mouseover').duration(_transitionDuration)
                    .attr('opacity', '0.2');

                _dispatch.call('arc:mouseover', this, d, i);
            },
            mouseout: function(d, i) {
                _element.gArcs.selectAll('g.arc')
                    .transition('arc:mouseout').duration(_transitionDuration)
                    .attr('opacity', '1');
                _element.gRibbons.selectAll('path.ribbon')
                    .filter(function(ribbon) { return ribbon.source.index !== d.index; })
                    .transition('arc:mouseout').duration(_transitionDuration)
                    .attr('opacity', '1');
                _dispatch.call('arc:mouseout', this, d, i);
            },
            click: function(d, i) {
                _dispatch.call('arc:click', this, d, i);
            },
            index: function(d) { return d.index; },
            label: function(d) { return _labels[_fn.arc.index(d)]; }
        },
        ribbon: {
            mouseover: function(d, i) {
                _element.gRibbons.selectAll('path.ribbon')
                    .filter(function(ribbon) { 
                        return d.source.index !== ribbon.source.index || d.target.index !== ribbon.target.index; 
                    }).transition('ribbon:mouseover').duration(_transitionDuration)
                    .attr('opacity', '0.2');

                _element.gArcs.selectAll('g.arc')
                    .filter(function(arc) {
                        return arc.index !== d.source.index && arc.index !== d.target.index;
                    }).transition('ribbon:mouseover').duration(_transitionDuration)
                    .attr('opacity', '0.2');

                _dispatch.call('ribbon:mouseover', this, d, i);
            },
            mouseout: function(d, i) {
                _element.gRibbons.selectAll('path.ribbon')
                    .filter(function(ribbon) { 
                        return d.source.index !== ribbon.source.index || d.target.index !== ribbon.target.index; 
                    }).transition('ribbon:mouseout').duration(_transitionDuration)
                    .attr('opacity', '1');

                _element.gArcs.selectAll('g.arc')
                    .filter(function(arc) {
                        return arc.index !== d.source.index || arc.index !== d.target.index;
                    }).transition('ribbon:mouseout').duration(_transitionDuration)
                    .attr('opacity', '1');
                _dispatch.call('ribbon:mouseout', this, d, i);
            },
            click: function(d, i) {
                _dispatch.call('ribbon:click', this, d, i);
            },
            initialState: function() { 
                return {
                    source: { startAngle: 0, endAngle: 0 }, 
                    target: { startAngle: 0, endAngle: 0 }
                }
            },
            sourceIndex: function(d) { return d.source.index; }
        }
    };

	function _instance(selection) { }

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio chord');

		_element.svg = _element.div.append('svg');

        _element.gChart = _element.svg.append('g').attr('class', 'chart');

        _element.gArcs = _element.gChart.append('g').attr('class', 'arcs');
        _element.gRibbons = _element.gChart.append('g').attr('class', 'ribbons');

		_instance.resize();

		return _instance;
	};

    _instance.data = function(v) {
        if(!arguments.length) { return _data; }
        _data = v || [];
        return _instance;
    };
    _instance.labels = function(v) { 
        if(!arguments.length) { return _labels; }
        _labels = v || [];
        return _instance;
    };

	_instance.resize = function() {
        var chartWidth = _width - _margin.right - _margin.left;
        var chartHeight = _height - _margin.top - _margin.bottom;
        _radius = (Math.min(chartHeight, chartWidth))/2;

		_element.svg
            .attr('width', _width)
            .attr('height', _height);

        _element.gChart
            .attr('transform', 'translate(' + (_margin.left + _radius) + ',' + (_margin.top + _radius) + ')');

        _layout.arc.innerRadius(_radius * _innerRadiusRatio).outerRadius(_radius);
        _layout.ribbon.radius(_radius * _innerRadiusRatio);
        
		return _instance;
	};

	_instance.redraw = function() {

        var formattedData = _layout.chord(_data);
        _element.gArcs.datum(formattedData);
        _element.gRibbons.datum(formattedData);

		updateArcs();
		updateRibbons();

		return _instance;
	};

	function updateArcs() {

		var arcGroup = _element.gArcs.selectAll('g.arc')
            .data(function(d) { return d.groups; });

        var arcGroupEnter = arcGroup.enter().append('g')
            .attr('class', 'arc')
            .on('mouseover', _fn.arc.mouseover)
            .on('mouseout', _fn.arc.mouseout)
            .on('click', _fn.arc.click);

        var path = arcGroupEnter
            .append('path')
            .each(function(d) { this._current = { startAngle: 0, endAngle: 0 }; });

        var text = arcGroupEnter
            .append('text');
        
        path.merge(arcGroup.select('path')).transition('arcs:update').duration(_duration)
            .attrTween('d', function(d) { 
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    return _layout.arc(interpolate(t));
                };
            })
            .attr('stroke', function(d) { return d3.rgb(_scale.color(_fn.arc.index(d))).darker(); })
            .attr('fill', function(d) { return _scale.color(_fn.arc.index(d)); });

        text.merge(arcGroup.select('text')).transition('arc:update').duration(_duration)
			.attr('transform', function(d) {
				return "rotate(" + (((d.startAngle + d.endAngle) / 2) * 180 / Math.PI - 90) + ")" + 
					   "translate(" + (_radius + 5) + ")" +
					   (((d.startAngle + d.endAngle) / 2) > Math.PI ? "rotate(180)" : "");
			})
			.style('text-anchor', function(d) { return ((d.startAngle + d.endAngle) / 2) > Math.PI ? "end" : null; })
            .text(function(d) { return _fn.arc.label(d); });

        arcGroup.exit().remove();

	}

	function updateRibbons() {
        var ribbon = _element.gRibbons.selectAll('path.ribbon')
            .data(function(d) { return d; });

        var ribbonEnter = ribbon.enter().append('path')
            .attr('class', 'ribbon')
            .on('mouseover', _fn.ribbon.mouseover)
            .on('mouseout', _fn.ribbon.mouseout)
            .on('click', _fn.ribbon.click)
            .each(function(d) { this._current = _fn.ribbon.initialState(); });

        ribbonEnter.merge(ribbon).transition('ribbon:update').duration(_duration)
            .attrTween('d', function(d) { 
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function(t) {
                    return _layout.ribbon(interpolate(t));
                };
            })
            .attr('stroke', function(d) { return d3.rgb(_scale.color(_fn.ribbon.sourceIndex(d))).darker(); })
            .attr('fill', function(d) { return _scale.color(_fn.ribbon.sourceIndex(d)); });

        ribbon.exit().remove();
	}

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

	return _instance;
}

export { chord };