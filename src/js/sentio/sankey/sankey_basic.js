sentio.sankey.basic = sentio_sankey_basic;
function sentio_sankey_basic() {
	'use strict';

	var _id = 'sankey_basic_' + Date.now();

	var _margin = {top: 40, right: 40, bottom: 40, left: 40};
	var _width = 1500, _height = _width / 2;
	var _nodeWidth = 15, _nodePadding = 10;

	var _nodeValue = {
		name: function(n) { return n.name; },
		slug: function(n) { return n.slug; },
		value: function(n) { return n.value; }
	};

	var _linkValue = {
		source: function(l) { return l.source; },
		target: function(l) { return l.target; },
		value: function(l) { return l.value; }
	};

	var _scale = {
		color: d3.scale.category20()
	};

	var _data = {
		nodes: [],
		links: [],
		dispatch: d3.dispatch('onclick')
	};

	var _nodeMap = {};

	var _element = {
		div: undefined,
		svg: undefined,
		g: {
			nodes: undefined,
			links: undefined
		}
	};

	var _curvature = 0.5;

	var _path = function(d) {
		var x0 = d.source.x + d.source.dx,
			x1 = d.target.x,
			xi = d3.interpolateNumber(x0, x1),
			x2 = xi(_curvature),
			x3 = xi(1 - _curvature),
			y0 = d.source.y + d.sy + d.dy / 2,
			y1 = d.target.y + d.ty + d.dy / 2;

		return 'M' + x0 + ',' + y0 + 
			   'C' + x2 + ',' + y0 +
			   ' ' + x3 + ',' + y1 +
			   ' ' + x1 + ',' + y1;
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio sankey');

		_element.svg = _element.div.append('svg');

		_element.g.container = _element.svg.append('g');

		_element.g.nodes = _element.g.container.append('g').attr('class', 'nodes');
		_element.g.links = _element.g.container.append('g').attr('class', 'links');

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.svg.attr('width', _width).attr('height', _height);

		return _instance;
	};

	/**
	 * Helper functions
	 */
	
	function center(node) {
		return node.y + node.dy / 2;
	}

	function computeNodeMap() {
		_data.nodes.forEach(function(node) { _nodeMap[_nodeValue.name(node)] = node; });
		_data.links = _data.links.map(function(link) {
			return {
				source: (typeof link.source === 'string') ? _nodeMap[_linkValue.source(link)] : _linkValue.source(link),
				target: (typeof link.target === 'string') ? _nodeMap[_linkValue.target(link)] : _linkValue.target(link),
				value: _linkValue.value(link)
			};
		});
	}

	function computeNodeLinks() {
		_data.nodes.forEach(function(node) {
			node.sourceLinks = [];
			node.targetLinks = [];
		});
		_data.links.forEach(function(link) {
 			_linkValue.source(link).sourceLinks.push(link);
 			_linkValue.target(link).targetLinks.push(link);
		});
	}

	function computeNodeValues() {
		_data.nodes.forEach(function(node) {
			node.value = Math.max(
				d3.sum(node.sourceLinks, _linkValue.value),
				d3.sum(node.targetLinks, _linkValue.value)
			);
		});
	}

	function moveSinksRight(x) {
		_data.nodes.forEach(function(node) {
			if (!node.sourceLinks.length) {
				node.x = x - 1;
			}
		});
	}
	function scaleNodeBreadths(v) {
		_data.nodes.forEach(function(node) {
			node.x *= v;
		});
	}
	function computeNodeBreadths() {
		var remainingNodes = _data.nodes,
			nextNodes,
			x = 0;

		function nodeComputer(n) {
			n.x = x;
			n.dx = _nodeWidth;
			n.sourceLinks.forEach(function(link) {
				if (nextNodes.indexOf(_linkValue.target(link)) < 0) {
					nextNodes.push(_linkValue.target(link));
				}
			});
		}

		while(remainingNodes.length) {
			nextNodes = [];
			remainingNodes.forEach(nodeComputer);
			remainingNodes = nextNodes;
			++x;
		}

		moveSinksRight(x);
		scaleNodeBreadths((_width - _nodeWidth) / (x - 1));
	}

	function initializeNodeDepth(nodesByBreadth) {
		var ky = d3.min(nodesByBreadth, function(nodes) {
			return (_height - (nodes.length - 1) * _nodePadding) / d3.sum(nodes, _nodeValue.value);
		});

		nodesByBreadth.forEach(function(nodes) {
			nodes.forEach(function(node, i) {
				node.y = i;
				node.dy = node.value * ky;
			});
		});
		_data.links.forEach(function(link) {
			link.dy = link.value * ky;
		});
	}
	function ascendingDepth(a, b) { return a.y - b.y; }
	function resolveCollisions(nodesByBreadth) {
		nodesByBreadth.forEach(function(nodes) {
			var node, dy, y0 = 0, n = nodes.length, i;

			nodes.sort(ascendingDepth);
			for (i = 0; i < n; ++i) {
				node = nodes[i];
				dy = y0 - node.y;
				if (dy > 0) node.y += dy;
				y0 = node.y + node.dy + _nodePadding;
			}

			dy = y0 - _nodePadding - _height;
			if (dy > 0) {
				y0 = node.y -= dy;

				for (i = n-2; i >= 0; --i) {
					node = nodes[i];
					dy = node.y + node.dy + _nodePadding - y0;
					if (dy > 0) node.y -= dy;
					y0 = node.y;
				}
			}
		});
	}
	function relaxRightToLeft(nodesByBreadth, alpha) {
		nodesByBreadth.slice().reverse().forEach(function(nodes) {
			nodes.forEach(function(node) {
				if (node.sourceLinks.length) {
					var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, _linkValue.value);
					node.y += (y - center(node)) * alpha;
				}
			});
		});

		function weightedTarget(link) {
			return center(_linkValue.target(link) * _linkValue.value(link));
		}
	}
	function relaxLeftToRight(nodesByBreadth, alpha) {
		nodesByBreadth.forEach(function(nodes, breadth) {
			nodes.forEach(function(node) {
				if (node.targetLinks.length) {
					var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, _linkValue.value);
					node.y += (y - center(node)) * alpha;
				}
			});
		});

		function weightedSource(link) {
			return center(_linkValue.source(link) * _linkValue.value(link));
		}
	}
	function computeNodeDepths(iterations) {
		var nodesByBreadth = d3.nest()
			.key(function(d) { return d.x; })
			.sortKeys(d3.ascending)
			.entries(_data.nodes)
			.map(function(d) { return d.values; });

		initializeNodeDepth(nodesByBreadth);
		resolveCollisions(nodesByBreadth);

		for (var alpha = 1; iterations > 0; iterations--) {
			relaxRightToLeft(nodesByBreadth, alpha *= 0.99);
			resolveCollisions(nodesByBreadth);
			relaxLeftToRight(nodesByBreadth, alpha);
			resolveCollisions(nodesByBreadth);
		}
	}
	
	function computeLinkDepths() {
		_data.nodes.forEach(function(node) {
			node.sourceLinks.sort(ascendingTargetDepth);
			node.targetLinks.sort(ascendingSourceDepth);
		});

		_data.nodes.forEach(function(node) {
			var sy = 0, ty = 0;
			node.sourceLinks.forEach(function(link) {
				link.sy = sy;
				sy += link.dy;
			});
			node.targetLinks.forEach(function(link) {
				link.ty = ty;
				ty += link.dy;
			});
		});

		function ascendingTargetDepth(a, b) {
			return a.target.y - b.target.y;
		}

		function ascendingSourceDepth(a, b) {
			return a.source.y - b.source.y;
		}
	}

	function nodeClicked(d) {
		_data.dispatch.onclick(d);
	}

	function deepClone(obj) {
	    var copy;

	    // Handle the 3 simple types, and null or undefined
	    if (null == obj || "object" != typeof obj) return obj;

	    // Handle Array
	    if (obj instanceof Array) {
	        copy = [];
	        for (var i = 0, len = obj.length; i < len; i++) {
	            copy[i] = deepClone(obj[i]);
	        }
	        return copy;
	    }

	    // Handle Object
	    if (obj instanceof Object) {
	        copy = {};
	        for (var attr in obj) {
	            if (obj.hasOwnProperty(attr)) copy[attr] = deepClone(obj[attr]);
	        }
	        return copy;
	    }

	    throw new Error("Unable to copy obj! Its type isn't supported.");
	}

	_instance.model = function(v) {
		if(!arguments.length) { return _data.dispatch; }
		_data.nodes = deepClone(v.nodes);
		_data.links = deepClone(v.links);

		console.log(_data);

		return _instance;
	};

	_instance.redraw = function() {

		computeNodeMap();
		computeNodeLinks();
		computeNodeValues();
		computeNodeBreadths();
		computeNodeDepths(32);
		computeLinkDepths();

		if (_width > 0) {
			updateLinks();
			updateNodes();
		}

		return _instance;
	};

	function updateLinks() {
		var linkJoin = _element.g.links.selectAll('.link')
				.data(_data.links, function(d) { return ''+d.source.slug+'_'+d.target.slug; });

		linkJoin.enter().append('path')
				.attr('class', 'link')
				.attr('id', function(d) { return 'link-'+d.source.slug+'_'+d.target.slug; })
				.attr('d', _path)
				.style('stroke-width', function(d) { return Math.max(1, d.dy); })
				.sort(function(a, b) { return b.dy - a.dy; })
				.on('mouseover', function(d) {
					d3.select(this).style({'stroke-opacity': '0.5'});
				})
				.on('mouseout', function(d) {
					d3.select(this).style({'stroke-opacity': '0.2'});
				});


		linkJoin.transition()
				.attr('d', _path)
				.style('stroke-width', function(d) { return Math.max(1, d.dy); })
				.sort(function(a, b) { return b.dy - a.dy; });

		linkJoin.exit().remove();
	}

	function updateNodes() {

		var nodeJoin = _element.g.nodes.selectAll('.node')
			.data(_data.nodes, function(d) { return d.slug; });

		nodeJoin.enter().append('rect')
				.attr('class', 'node')
				.attr('id', function(d) { return 'node-'+d.slug; })
				.attr('x', function(d) { return d.x; })
				.attr('y', function(d) { return d.y; })
				.attr('height', function(d) { return d.dy; })
				.attr('width', _nodeWidth)
				.style('fill', function(d) { 
					d.color = _scale.color(d.slug); 
					return d.color;
				})
				.style('stroke', function(d) { return d3.rgb(d.color).darker(2); })
				.on('mouseover', function(d) {
					d.sourceLinks.forEach(function(sl) {
						_element.g.links.select('#link-'+sl.source.slug+'_'+sl.target.slug).style({'stroke-opacity': '0.5'});
					});
					d.targetLinks.forEach(function(tl) {
						_element.g.links.select('#link-'+tl.source.slug+'_'+tl.target.slug).style({'stroke-opacity': '0.5'});
					});
				})
				.on('mouseout', function(d) {
					d.sourceLinks.forEach(function(sl) {
						_element.g.links.select('#link-'+sl.source.slug+'_'+sl.target.slug).style({'stroke-opacity': '0.2'});
					});
					d.targetLinks.forEach(function(tl) {
						_element.g.links.select('#link-'+tl.source.slug+'_'+tl.target.slug).style({'stroke-opacity': '0.2'});
					});
				})
				.on('click', nodeClicked);

		nodeJoin.transition()
				.attr('x', function(d) { return d.x; })
				.attr('y', function(d) { return d.y; })
				.attr('height', function(d) { return d.dy; });

		nodeJoin.exit().remove();

	}

	_instance.width = function(v){
		if(!arguments.length) { return _width; }
		_width = v;
		_height = v/2;
		return _instance;
	};

	return _instance;
}