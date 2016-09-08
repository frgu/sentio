sentio.chord.basic = sentio_chord_basic;
function sentio_chord_basic() {
	'use strict';

	var _id = 'chord_basic_' + Date.now();

	// var _margin = {top: 40, right: 40, bottom: 40, left: 40};
	var _width = 960, _height = 960;
	var _outerRadius = _width / 2;
	var _innerRadius = _outerRadius - 80;

	// var _data;
	var _data = [];

	var _labels = [];

	var _colorScale = d3.scale.category20c();

	var _chord = d3.layout.chord()
			.padding(0.04)
			.sortSubgroups(d3.descending)
			.sortChords(d3.descending);

	var _arc = d3.svg.arc()
			.innerRadius(_innerRadius)
			.outerRadius(_innerRadius + 20);

	var _element = {
		div: undefined,
		svg: undefined,
		g: undefined,
		tooltip: undefined
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio chord');

		_element.svg = _element.div.append('svg');

		_element.g = _element.svg.append('g');

		_element.tooltip = _element.svg.append('div')
			.attr('class', 'chord-tooltip')
			.style('opacity', '0');

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.svg.attr('width', _width).attr('height', _height);

		_outerRadius = _width / 2 - 20;
		_innerRadius = _outerRadius - 80;

		_element.g.attr("transform", "translate(" + (_outerRadius+10) + "," + (_outerRadius+10) + ")");

		_arc = d3.svg.arc()
			.innerRadius(_innerRadius)
			.outerRadius(_innerRadius + 20);

		return _instance;
	};

	function getRelevantSources(d) {
		var ret = [d.index];
		
		_chord.chords().forEach(function(chord) {
			if (chord.source.index === d.index) {
				if (ret.indexOf(chord.target.index) === -1) {
					ret.push(chord.target.index);
				}
			}
		});

		return ret;
	}

	function updateSources() {

		var sourceJoin = _element.g.selectAll('.group')
				.data(_chord.groups);

		var sourceEnter = sourceJoin.enter().append('g')
				.attr('class', 'group')
				.attr('opacity', '1');

		var sourceArcEnter = sourceEnter.append('path');
		var sourceLabelEnter = sourceEnter.append('text');

		sourceArcEnter
			.attr('class', 'source')
			.style('fill', function(d) { return _colorScale(d.index); })
			.style('stroke', function(d) { return _colorScale(d.index); })
			.on('mouseover', function(d) {
				_element.g.selectAll('.link')
					.filter(function(l) { return l.source.index !== d.index; })
					.transition().duration(100)
					.style('opacity', '0.1');

				// Get all node indicies to hide
				var toShow = getRelevantSources(d);

				_element.g.selectAll('.group')
					.filter(function(s) {
						return toShow.indexOf(s.index) === -1;
					})
					.transition().duration(100)
					.style('opacity', '0.1');
				_element.tooltip
					.style('opacity', '0.9')
					.html(_labels[d.index] + "<br/>" + d.value);
			})
			.on('mousemove', function(d) {
				var mouse = d3.mouse(this);
				// console.log(d3.event);
				_element.tooltip
					.style('left', (mouse[0] + _width / 2) + 'px')
					.style('top', (mouse[1] + _height / 2) + 'px');
			})
			.on('mouseout', function(d) {
				_element.g.selectAll('.link')
					.transition().duration(100)
					.style('opacity', '1');
				_element.g.selectAll('.group')
					.transition().duration(100)
					.style('opacity', '1');
				_element.tooltip.transition().duration(100)
					.style('opacity', '0');
			});
		
		sourceLabelEnter
			.attr('class', 'source-label');


		var sourceArcUpdate = sourceJoin.select('.source');
		var sourceLabelUpdate = sourceJoin.select('.source-label');

		sourceArcUpdate.transition().duration(100)
			.attr('d', _arc);

		sourceLabelUpdate.transition().duration(100)
			.each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
			.attr('transform', function(d) {
				return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + 
					   "translate(" + (_innerRadius + 26) + ")" +
					   (d.angle > Math.PI ? "rotate(180)" : "");
			})
			.style('text-anchor', function(d) { return d.angle > Math.PI ? "end" : null; })
			.text(function(d) { return _labels[d.index]; });

		
		var sourceExit = sourceJoin.exit().remove();

	}

	function updateChords() {
		var chordJoin = _element.g.selectAll('.link')
			.data(_chord.chords);

		var chordEnter = chordJoin.enter().append('g')
			.attr('class', 'link')
			.style('opacity', '1');

		var linkEnter = chordEnter.append('path');

		linkEnter
			.attr('class', 'link-path')
			.style("stroke", function(d) { return d3.rgb(_colorScale(d.source.index)).darker(); })
			.style("fill", function(d) { return _colorScale(d.source.index); })
			.on('mouseover', function(d) {
				_element.g.selectAll('.link')
					.filter(function(p) { return p !== d; })
					.transition().duration(100)
					.style('opacity', '0.1');
				_element.g.selectAll('.group')
					.filter(function(s) { return s.index !== d.source.index && s.index !== d.target.index; })
					.transition().duration(100)
					.style('opacity', '0.1');
			})
			.on('mouseout', function(d, i) {
				_element.g.selectAll('.link')
					.transition().duration(100)
					.style('opacity', '1');
				_element.g.selectAll('.group')
					.transition().duration(100)
					.style('opacity', '1');
				_element.tooltip.transition().duration(100)
					.style('opacity', '0');
			});

		var linkUpdate = chordJoin.select('.link-path');

		linkUpdate.transition().duration(100)
			.attr("d", d3.svg.chord().radius(_innerRadius));

		var chordExit = chordJoin.exit().remove();
	}

	_instance.redraw = function() {

		_chord.matrix(_data);

		updateSources();
		updateChords();

		return _instance;
	};

	_instance.data = function(d) {
		if(!arguments.length) { return _data; }
		_labels = d.pop();
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


	return _instance;
}