sentio.chord.basic = sentio_chord_basic;
function sentio_chord_basic() {
	'use strict';

	var _id = 'sankey_basic_' + Date.now();

	// var _margin = {top: 40, right: 40, bottom: 40, left: 40};
	var _width = 960, _height = 960;
	var _outerRadius = _width / 2;
	var _innerRadius = _outerRadius - 80;

	// var _data;
	var _data = [[11975,  5871, 8916, 2868],
				 [ 1951, 10048, 2060, 6171],
 				 [ 8010, 16145, 8090, 8045],
 				 [ 1013,   990,  940, 6907]];

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
		g: undefined
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio chord');

		_element.svg = _element.div.append('svg');

		_element.g = _element.svg.append('g')
    		.attr("transform", "translate(" + _outerRadius + "," + _outerRadius + ")");

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.svg.attr('width', _width).attr('height', _height);

		return _instance;
	};

	function getRelevantSources(d) {
		var ret = [];
		
		_chord.chords().forEach(function(chord) {
			if (chord.source.index === d.index) {
				if (ret.indexOf(chord.target.index) === -1) {
					ret.push(chord.target.index);
				}
			}
		});

		return ret;
	}

	_instance.redraw = function() {

		_chord.matrix(_data);

		var g = _element.g.selectAll('.group')
				.data(_chord.groups)
			.enter().append('g')
				.attr('class', 'group');

		g.append('path')
			.attr('class', 'source')
			.style('fill', function(d) { return _colorScale(d.index); })
			.style('stroke', function(d) { return _colorScale(d.index); })
			.style('opacity', '1')
			.attr('d', _arc)
			.on('mouseover', function(d) {
				g.selectAll('.link')
					.filter(function(l) { return l.source.index !== d.index; })
					.transition().duration(100)
					.style('opacity', '0.1');

				// Get all node indicies to hide
				var toShow = getRelevantSources(d);

				g.selectAll('.source')
					.filter(function(s) {
						return toShow.indexOf(s.index) === -1;
					})
					.transition().duration(100)
					.style('opacity', '0.1');
			})
			.on('mouseout', function(d) {
				g.selectAll('.link')
					.transition().duration(100)
					.style('opacity', '1');
				g.selectAll('.source')
					.transition().duration(100)
					.style('opacity', '1');
			});

		var chord = g.selectAll('.chord')
				.data(_chord.chords)
			.enter().append('path')
				.attr('class', 'link')
				.style("stroke", function(d) { return d3.rgb(_colorScale(d.source.index)).darker(); })
				.style("fill", function(d) { return _colorScale(d.source.index); })
				.style('opacity', '1')
				.attr("d", d3.svg.chord().radius(_innerRadius))
				.on('mouseover', function(d) {
					g.selectAll('.link')
						.filter(function(p) { return p !== d; })
						.transition().duration(100)
						.style('opacity', '0.1');
					g.selectAll('.source')
						.filter(function(s) { return s.index !== d.source.index && s.index !== d.target.index; })
						.transition().duration(100)
						.style('opacity', '0.1');
				})
				.on('mouseout', function(d, i) {
					g.selectAll('.link')
						.transition().duration(100)
						.style('opacity', '1');
					g.selectAll('.source')
						.transition().duration(100)
						.style('opacity', '1');
				});

		return _instance;
	};

	_instance.data = function(d) {
		// if(!arguments.length) { return _data; }
		// _data = d || [];
		return _instance;
	};


	return _instance;
}